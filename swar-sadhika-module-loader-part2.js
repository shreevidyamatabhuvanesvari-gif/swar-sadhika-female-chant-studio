/* Swar-Sadhika Part 2 module loader.
 * Additive only: it does not overwrite, patch, or remove existing app modules.
 */
const SCHEMA = 'swar-sadhika-module-registry/v1';
const ROOT = new URL('./', import.meta.url);
const DEFAULT_REGISTRY = new URL('./swar-sadhika-module-registry-part2.json', ROOT);
const MODULE_ID_RE = /^[a-z0-9][a-z0-9._-]{0,79}$/u;
const SAFE_PATH_RE = /^[A-Za-z0-9._/-]+$/u;
const records = new Map();
let bootPromise = null;
let shutdownPromise = null;
let lastReport = null;
let activeRegistry = null;

function emit(type, detail = {}) {
  try {
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function' && typeof CustomEvent === 'function') {
      window.dispatchEvent(new CustomEvent(`swar-sadhika:part2:${type}`, { detail }));
    }
  } catch (error) {
    console.warn('[Swar-Sadhika Part 2] Event dispatch failed:', error);
  }
}

function idIsValid(value) {
  return typeof value === 'string' && MODULE_ID_RE.test(value);
}

function resolveAppLocalURL(value, extension, label) {
  if (typeof value !== 'string' || value.length === 0 || !SAFE_PATH_RE.test(value)) {
    throw new Error(`${label}: केवल सरल, स्थानीय ऐप-पथ अनुमत है: ${String(value)}`);
  }
  const normalized = value.startsWith('./') ? value.slice(2) : value;
  const segments = normalized.split('/');
  if (!normalized || normalized.startsWith('/') || segments.some((part) => !part || part === '.' || part === '..')) {
    throw new Error(`${label}: अमान्य या असुरक्षित पथ: ${value}`);
  }
  let url;
  try {
    url = new URL(normalized, ROOT);
  } catch {
    throw new Error(`${label}: URL मान्य नहीं है: ${value}`);
  }
  if (
    url.protocol !== ROOT.protocol ||
    url.origin !== ROOT.origin ||
    !url.pathname.startsWith(ROOT.pathname) ||
    !url.pathname.endsWith(extension) ||
    url.search !== '' ||
    url.hash !== ''
  ) {
    throw new Error(`${label}: केवल इसी ऐप के भीतर की स्थानीय ${extension} फ़ाइल अनुमत है: ${value}`);
  }
  return url;
}

function resolveRegistryURL(value) {
  let url;
  try {
    url = new URL(value, ROOT);
  } catch {
    throw new Error(`Registry URL मान्य नहीं है: ${String(value)}`);
  }
  if (
    url.protocol !== ROOT.protocol ||
    url.origin !== ROOT.origin ||
    !url.pathname.startsWith(ROOT.pathname) ||
    !url.pathname.endsWith('.json') ||
    url.search !== '' ||
    url.hash !== ''
  ) {
    throw new Error('Registry भी इसी ऐप के भीतर की स्थानीय .json फ़ाइल होनी चाहिए।');
  }
  return url;
}

function validateAndOrderRegistry(data) {
  if (!data || data.schema !== SCHEMA || !Array.isArray(data.modules)) {
    throw new Error('Part 2 registry का schema अमान्य है।');
  }
  if (data.version !== undefined && (!Number.isInteger(data.version) || data.version < 1)) {
    throw new Error('Registry version सकारात्मक integer होना चाहिए।');
  }

  const byId = new Map();
  for (const item of data.modules) {
    if (!item || typeof item !== 'object' || Array.isArray(item) || !idIsValid(item.id) || byId.has(item.id)) {
      throw new Error(`Registry में अमान्य/दोहराई गई module ID: ${item?.id}`);
    }
    resolveAppLocalURL(item.path, '.js', `Module ${item.id}`);
    if (item.enabled !== undefined && typeof item.enabled !== 'boolean') {
      throw new Error(`Module ${item.id}: enabled boolean होना चाहिए।`);
    }
    if (item.required !== undefined && typeof item.required !== 'boolean') {
      throw new Error(`Module ${item.id}: required boolean होना चाहिए।`);
    }
    if (item.dependsOn !== undefined && (!Array.isArray(item.dependsOn) || item.dependsOn.some((dep) => !idIsValid(dep)))) {
      throw new Error(`Module ${item.id}: dependsOn सूची अमान्य है।`);
    }
    if (new Set(item.dependsOn || []).size !== (item.dependsOn || []).length) {
      throw new Error(`Module ${item.id}: dependsOn में duplicate dependency है।`);
    }
    if ((item.dependsOn || []).includes(item.id)) {
      throw new Error(`Module ${item.id}: module स्वयं पर निर्भर नहीं हो सकता।`);
    }
    byId.set(item.id, item);
  }

  for (const item of data.modules) {
    for (const dep of item.dependsOn || []) {
      if (!byId.has(dep)) throw new Error(`Module ${item.id} ऐसी dependency बताता है जो registry में नहीं है: ${dep}`);
    }
  }

  // Stable depth-first topological ordering: dependencies always precede dependents.
  const visiting = new Set();
  const visited = new Set();
  const ordered = [];
  function visit(item) {
    if (visited.has(item.id)) return;
    if (visiting.has(item.id)) throw new Error(`Registry में dependency cycle मिला: ${item.id}`);
    visiting.add(item.id);
    for (const dep of item.dependsOn || []) visit(byId.get(dep));
    visiting.delete(item.id);
    visited.add(item.id);
    ordered.push(item);
  }
  for (const item of data.modules) visit(item);
  return { data, ordered };
}

export async function readRegistry(url = DEFAULT_REGISTRY.href) {
  const safeURL = resolveRegistryURL(url);
  const response = await fetch(safeURL.href, { cache: 'no-cache', credentials: 'same-origin' });
  if (!response.ok) throw new Error(`Part 2 registry नहीं पढ़ी गई (HTTP ${response.status}): ${safeURL.href}`);
  const data = await response.json();
  validateAndOrderRegistry(data);
  return data;
}

function freezeReport(report) {
  for (const key of ['loaded', 'skipped', 'failed', 'warnings', 'order']) {
    for (const item of report[key] || []) {
      if (item && typeof item === 'object') Object.freeze(item);
    }
    if (Array.isArray(report[key])) Object.freeze(report[key]);
  }
  return Object.freeze(report);
}

async function runCleanups(record, errors, reason) {
  const callbacks = record.cleanups.splice(0).reverse();
  for (const callback of callbacks) {
    try {
      await callback({ moduleId: record.id, reason });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push({ module: record.id, message });
      console.error(`[Swar-Sadhika Part 2] ${record.id} cleanup विफल:`, error);
    }
  }
}

function apiFor(record, registry, context) {
  return Object.freeze({
    schema: SCHEMA,
    rootUrl: ROOT.href,
    registry,
    context,
    getLoadedModule: (id) => {
      const found = records.get(id);
      return found?.state === 'active' ? found.namespace : null;
    },
    getModuleState: (id) => records.get(id)?.state || 'not-loaded',
    emitStatus: (message, kind = 'info') => emit('status', { module: record.id, message: String(message), kind }),
    registerCleanup: (fn) => {
      if (typeof fn !== 'function') throw new TypeError('Cleanup callback function होना चाहिए।');
      if (record.state !== 'activating' && record.state !== 'active') {
        throw new Error(`Module ${record.id} सक्रिय होने की अवस्था में नहीं है; cleanup register नहीं किया जा सकता।`);
      }
      record.cleanups.push(fn);
    },
  });
}

async function activateOne(item, registry, context) {
  if (item.enabled === false) return { id: item.id, state: 'disabled', path: item.path };

  for (const dep of item.dependsOn || []) {
    if (records.get(dep)?.state !== 'active') {
      throw new Error(`आवश्यक dependency सक्रिय नहीं है: ${dep}`);
    }
  }

  const url = resolveAppLocalURL(item.path, '.js', `Module ${item.id}`);
  const namespace = await import(url.href);
  const record = { id: item.id, state: 'activating', namespace, path: item.path, cleanups: [], result: null };
  records.set(item.id, record);

  const candidate =
    namespace.registerSwarSadhikaModule ||
    namespace.activateSwarSadhikaModule ||
    namespace.activate ||
    namespace.default?.registerSwarSadhikaModule ||
    namespace.default?.activate ||
    (typeof namespace.default === 'function' ? namespace.default : null);

  if (typeof candidate !== 'function') {
    records.delete(item.id);
    throw new Error(`${item.path} से registerSwarSadhikaModule(api) या activate(api) export होना चाहिए।`);
  }

  try {
    const result = await candidate(apiFor(record, registry, context));
    if (typeof result === 'function') record.cleanups.push(result);
    record.result = typeof result === 'function' ? null : (result ?? null);
    record.state = 'active';
    emit('module-active', { id: item.id, path: item.path });
    return { id: item.id, state: 'active', path: item.path };
  } catch (error) {
    record.state = 'failed';
    const cleanupErrors = [];
    await runCleanups(record, cleanupErrors, 'activation-failed');
    const message = error instanceof Error ? error.message : String(error);
    const wrapped = new Error(message);
    wrapped.cleanupErrors = cleanupErrors;
    throw wrapped;
  }
}

export function getLoadedModule(id) {
  const record = records.get(id);
  return record?.state === 'active' ? record.namespace : null;
}

export function boot({ registryUrl = DEFAULT_REGISTRY.href, context = {} } = {}) {
  if (shutdownPromise) return shutdownPromise.then(() => boot({ registryUrl, context }));
  if (bootPromise) return bootPromise;
  const safeContext = Object.freeze(context && typeof context === 'object' ? { ...context } : {});

  bootPromise = (async () => {
    const report = {
      ok: true,
      schema: SCHEMA,
      registryUrl,
      startedAt: new Date().toISOString(),
      loaded: [],
      skipped: [],
      failed: [],
      warnings: [],
      order: [],
    };

    try {
      const safeRegistryURL = resolveRegistryURL(registryUrl);
      const response = await fetch(safeRegistryURL.href, { cache: 'no-cache', credentials: 'same-origin' });
      if (!response.ok) throw new Error(`Part 2 registry नहीं पढ़ी गई (HTTP ${response.status}): ${safeRegistryURL.href}`);
      const json = await response.json();
      const validated = validateAndOrderRegistry(json);
      activeRegistry = validated.data;
      report.order = validated.ordered.map((item) => item.id);

      for (const item of validated.ordered) {
        try {
          const result = await activateOne(item, activeRegistry, safeContext);
          if (result.state === 'disabled') report.skipped.push(result);
          else report.loaded.push(result);
        } catch (error) {
          const issue = {
            id: item.id,
            path: item.path,
            message: error instanceof Error ? error.message : String(error),
            required: item.required === true,
            cleanupErrors: Array.isArray(error?.cleanupErrors) ? error.cleanupErrors : [],
          };
          report.failed.push(issue);
          if (issue.required) report.ok = false;
          else report.warnings.push({ ...issue, message: `वैकल्पिक मॉड्यूल ${item.id} सक्रिय नहीं हुआ: ${issue.message}` });
          emit('module-failed', issue);
          console.error(`[Swar-Sadhika Part 2] ${item.id} लोड नहीं हुआ:`, error);
        }
      }
    } catch (error) {
      report.ok = false;
      report.registryError = error instanceof Error ? error.message : String(error);
      console.error('[Swar-Sadhika Part 2] Loader/registry error:', error);
    }

    report.finishedAt = new Date().toISOString();
    lastReport = freezeReport(report);
    emit('boot-complete', lastReport);
    return lastReport;
  })();
  return bootPromise;
}

export function shutdown() {
  if (shutdownPromise) return shutdownPromise;
  shutdownPromise = (async () => {
    // Let in-flight activation settle before cleaning the state it created.
    if (bootPromise) {
      try { await bootPromise; } catch { /* boot normally resolves a report; remain defensive */ }
    }
    const errors = [];
    const reverseRecords = [...records.values()].reverse();
    for (const record of reverseRecords) {
      await runCleanups(record, errors, 'shutdown');
      record.state = 'stopped';
    }
    records.clear();
    activeRegistry = null;
    lastReport = null;
    bootPromise = null;
    emit('shutdown', { errors });
    return Object.freeze({ ok: errors.length === 0, errors: Object.freeze(errors) });
  })().finally(() => { shutdownPromise = null; });
  return shutdownPromise;
}

export function loaderStatus() {
  return Object.freeze({
    schema: SCHEMA,
    rootUrl: ROOT.href,
    registryLoaded: Boolean(activeRegistry),
    started: Boolean(bootPromise),
    shuttingDown: Boolean(shutdownPromise),
    report: lastReport,
    modules: Object.freeze([...records.values()].map((record) => Object.freeze({ id: record.id, path: record.path, state: record.state }))),
  });
}

export const SwarSadhikaModuleLoaderPart2 = Object.freeze({ readRegistry, boot, getLoadedModule, shutdown, loaderStatus });
if (typeof window !== 'undefined' && !window.SwarSadhikaModuleLoaderPart2) {
  Object.defineProperty(window, 'SwarSadhikaModuleLoaderPart2', {
    value: SwarSadhikaModuleLoaderPart2,
    writable: false,
    configurable: false,
    enumerable: false,
  });
}
