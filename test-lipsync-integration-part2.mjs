import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const exists = (relativePath) => fs.existsSync(path.join(root, relativePath));
const html = read('index.html');
const worker = read('service-worker.js');
const engineSource = read('lipsync-engine.js');
const moduleSource = read('swar-sadhika-avatar-lipsync-part2.js');
const registry = JSON.parse(read('swar-sadhika-module-registry-part2.json'));
const packageJson = JSON.parse(read('package.json'));

// 1) Static checks verify the integration uses the existing module architecture.
assert.equal(
  (html.match(/<script type="module" src="\.\/swar-sadhika-app-bootstrap-part2\.js"><\/script>/gu) || []).length,
  1,
  'The existing single Part 2 bootstrap reference must remain present'
);
assert.equal(
  (html.match(/<script src="\.\/lipsync-engine\.js"><\/script>/gu) || []).length,
  1,
  'The existing lip-sync renderer reference must remain present exactly once'
);
assert.doesNotMatch(
  html,
  /<script[^>]+src=["']\.\/swar-sadhika-avatar-lipsync-part2\.js["']/u,
  'Avatar Part 2 must not be added as a separate index.html script tag'
);
assert.match(html, /src="\.\/swar-sadhika-avatar-photo\.jpg"/u,
  'The default avatar must use the supplied photo asset');
assert.match(html, /utterance\.onstart=/u, 'The existing Browser TTS start handler must remain');
assert.match(html, /utterance\.onend=/u, 'The existing Browser TTS end handler must remain');
assert.match(html, /utterance\.onerror=/u, 'The existing Browser TTS error handler must remain');
assert.match(html, /window\.SwarSadhikaLipSync\?\.setLevel\(amount\)/u,
  'The existing Stage mouth control must still call the original lip-sync renderer');
assert.ok(exists('swar-sadhika-avatar-photo.jpg'), 'The avatar photo asset must exist in the repository root');
assert.ok(fs.statSync(path.join(root, 'swar-sadhika-avatar-photo.jpg')).size > 20_000,
  'The avatar photo asset must not be an empty/tiny placeholder');
assert.equal(registry.schema, 'swar-sadhika-module-registry/v1');
assert.ok(registry.modules.some(item => item.id === 'sanskrit-brain-ui'),
  'The existing Sanskrit Brain module must remain registered');
const avatarEntry = registry.modules.find(item => item.id === 'avatar-lipsync');
assert.ok(avatarEntry, 'Avatar Lip-Sync Part 2 must be registered');
assert.equal(avatarEntry.path, 'swar-sadhika-avatar-lipsync-part2.js');
assert.equal(avatarEntry.enabled, true);
assert.equal(avatarEntry.required, false,
  'Failure of the add-on must not block the core app from loading');
assert.ok(exists(avatarEntry.path), 'The registered Avatar module path must exist');
assert.equal(packageJson.scripts['test:avatar-lipsync-part2'], 'node ./test-lipsync-integration-part2.mjs');

// Every same-origin shell file must exist; catches install-time cache.addAll failures.
assert.match(worker, /swar-sadhika-female-chant-shell-v11/u,
  'The service worker shell cache name must be bumped');
assert.doesNotMatch(worker, /\.\/swar-sadhika-user-photo\.jpg/u,
  'The obsolete absent user-photo JPEG must not be required for install');
const shellBlock = worker.match(/const SHELL_FILES = \[([\s\S]*?)\];/u)?.[1];
assert.ok(shellBlock, 'Service Worker shell list must be discoverable');
const shellPaths = [...shellBlock.matchAll(/'([^']+)'/gu)].map(match => match[1]);
assert.equal(new Set(shellPaths).size, shellPaths.length,
  'Service Worker shell paths must not contain duplicates');
for (const relativePath of shellPaths) {
  const cleaned = relativePath === './' ? '.' : relativePath.replace(/^\.\//u, '');
  assert.ok(exists(cleaned), `Service Worker shell path must exist: ${relativePath}`);
}
for (const requiredPath of [
  './swar-sadhika-avatar-photo.jpg',
  './swar-sadhika-avatar-lipsync-part2.js',
  './swar-sadhika-app-bootstrap-part2.js',
  './swar-sadhika-module-loader-part2.js',
  './swar-sadhika-module-registry-part2.json'
]) {
  assert.ok(shellPaths.includes(requiredPath), `Offline shell must cache ${requiredPath}`);
}
assert.match(moduleSource, /export function registerSwarSadhikaModule\(api\)/u,
  'Avatar Part 2 must expose the Module Loader activation contract');
assert.match(moduleSource, /addEventListener\('boundary'/u,
  'The module should observe optional browser boundary events');
assert.doesNotMatch(moduleSource, /utterance\.onstart\s*=/u,
  'The module must not overwrite the app start handler');
assert.doesNotMatch(moduleSource, /utterance\.onend\s*=/u,
  'The module must not overwrite the app end handler');

// 2) Use a small fake DOM to execute the REAL lipsync-engine.js and verify the mouth bridge.
class FakeElement {
  constructor(id, classNames = []) {
    this.id = id;
    this.style = {};
    this.hidden = false;
    this.attributes = new Map();
    const names = new Set(classNames);
    this.classList = { contains: name => names.has(name), add: name => names.add(name), remove: name => names.delete(name) };
  }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  removeAttribute(name) { this.attributes.delete(name); }
}

const elementIds = [
  'avatar-mouth-layer', 'avatar-mouth', 'avatar-teeth', 'avatar-upper-lip',
  'avatar-lower-lip', 'avatar-mouth-patch'
];
const elements = new Map(elementIds.map(id => [id, new FakeElement(id)]));
elements.set('avatar-default', new FakeElement('avatar-default', ['active']));
const fakeDocument = { getElementById: id => elements.get(id) || null };
let clock = 100;
let nextFrameId = 1;
const pendingFrames = new Map();
const stageMouthLevels = [];
const spoken = [];
let cancelCalls = 0;
let pauseCalls = 0;
let resumeCalls = 0;

class FakeUtterance {
  constructor(text) {
    this.text = text;
    this.rate = 1;
    this.onstart = null;
    this.onend = null;
    this.onerror = null;
    this.listeners = new Map();
  }
  addEventListener(type, callback) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type).add(callback);
  }
  dispatch(type, event = {}) {
    for (const callback of this.listeners.get(type) || []) callback({ type, ...event });
    const propertyHandler = this[`on${type}`];
    if (typeof propertyHandler === 'function') propertyHandler({ type, ...event });
  }
}

const fakeSynth = {
  speak(utterance) { spoken.push(utterance); },
  cancel() { cancelCalls += 1; },
  pause() { pauseCalls += 1; },
  resume() { resumeCalls += 1; }
};
const fakeWindow = {
  speechSynthesis: fakeSynth,
  Intl,
  performance: { now: () => clock },
  requestAnimationFrame(callback) { const id = nextFrameId++; pendingFrames.set(id, callback); return id; },
  cancelAnimationFrame(id) { pendingFrames.delete(id); },
  setTimeout(callback) { const id = nextFrameId++; pendingFrames.set(id, () => callback(clock)); return id; },
  clearTimeout(id) { pendingFrames.delete(id); },
  dispatchEvent() {},
  console
};

const originalFetch = globalThis.fetch;
const originalWindow = globalThis.window;
const originalDocument = globalThis.document;
const originalCustomEvent = globalThis.CustomEvent;
const tempRegistryPath = path.join(root, '.swar-sadhika-avatar-lipsync-test-registry.json');
let loader = null;
let didBoot = false;

function runOneFrame(time) {
  clock = time;
  const entry = pendingFrames.entries().next();
  assert.equal(entry.done, false, 'An animation frame should be scheduled');
  const [id, callback] = entry.value;
  pendingFrames.delete(id);
  callback(time);
}
function latestStageLevel() { return stageMouthLevels.at(-1); }

try {
  // Execute the existing audio-reactive mouth renderer, not a substitute implementation.
  globalThis.window = fakeWindow;
  globalThis.document = fakeDocument;
  vm.runInNewContext(engineSource, {
    window: fakeWindow,
    document: fakeDocument,
    console,
    Math,
    Number,
    String,
    Object
  }, { filename: 'lipsync-engine.js' });
  assert.equal(typeof fakeWindow.SwarSadhikaLipSync?.setLevel, 'function',
    'The existing renderer must expose setLevel');

  // Reproduce index.html's existing Stage-to-renderer bridge.
  fakeWindow.SwarSadhikaStage = {
    setMouthLevel(level) {
      stageMouthLevels.push(Number(level));
      fakeWindow.SwarSadhikaLipSync.setLevel(level);
    },
    setMouthVisualState(level) { stageMouthLevels.push(Number(level)); }
  };

  // The Loader fetches the registry using fetch(). Stub only file:// registry reads.
  const testRegistry = {
    schema: registry.schema,
    version: registry.version,
    modules: [avatarEntry]
  };
  fs.writeFileSync(tempRegistryPath, JSON.stringify(testRegistry, null, 2) + '\n');
  globalThis.fetch = async input => {
    const url = new URL(typeof input === 'string' ? input : input.url);
    if (url.protocol !== 'file:') throw new Error(`Unexpected network request in test: ${url.href}`);
    const body = fs.readFileSync(fileURLToPath(url));
    return new Response(body, { status: 200, headers: { 'content-type': 'application/json' } });
  };

  loader = await import('./swar-sadhika-module-loader-part2.js');
  const report = await loader.boot({ registryUrl: pathToFileURL(tempRegistryPath).href, context: { test: true } });
  didBoot = true;
  assert.equal(report.ok, true, 'Loader boot should succeed for the Avatar-only test registry');
  assert.deepEqual(report.failed, [], 'Avatar module should not fail activation');
  assert.ok(report.loaded.some(item => item.id === 'avatar-lipsync' && item.state === 'active'),
    'The real Module Loader should activate Avatar Part 2 from the Registry');
  assert.equal(loader.loaderStatus().modules.find(item => item.id === 'avatar-lipsync')?.state, 'active');
  assert.equal(fakeWindow.SwarSadhikaAvatarLipSyncPart2?.installed, true,
    'Activation should publish diagnostics showing the module is installed');

  // Verify the native/app handlers are preserved while the module observes events.
  let existingStartCalls = 0;
  let existingEndCalls = 0;
  let existingErrorCalls = 0;
  const utterance = new FakeUtterance('ॐ नमः शिवाय');
  const originalOnStart = () => { existingStartCalls += 1; };
  const originalOnEnd = () => { existingEndCalls += 1; };
  const originalOnError = () => { existingErrorCalls += 1; };
  utterance.onstart = originalOnStart;
  utterance.onend = originalOnEnd;
  utterance.onerror = originalOnError;
  fakeSynth.speak(utterance);

  assert.equal(spoken.at(-1), utterance, 'Wrapped speak must still call native/original speak');
  assert.equal(utterance.onstart, originalOnStart, 'Existing app onstart handler must remain untouched');
  assert.equal(utterance.onend, originalOnEnd, 'Existing app onend handler must remain untouched');
  assert.equal(utterance.onerror, originalOnError, 'Existing app onerror handler must remain untouched');

  utterance.dispatch('start');
  assert.equal(fakeWindow.SwarSadhikaAvatarLipSyncPart2.active, true,
    'Avatar motion state should activate on TTS start');
  runOneFrame(180);
  assert.ok(latestStageLevel() > 0.05, 'TTS motion level should reach the existing Stage API');
  assert.ok(Number(elements.get('avatar-mouth').getAttribute('rx')) > 14,
    'Existing SVG mouth renderer should receive a changing mouth level');
  assert.ok(Number(elements.get('avatar-mouth-layer').style.opacity) > 0,
    'Existing SVG mouth layer should become visible while speaking');
  assert.equal(elements.get('avatar-mouth').getAttribute('cx'), '680',
    'The mouth overlay should be aligned to the new supplied avatar photo');

  utterance.dispatch('boundary', { charIndex: 3, charLength: 2, name: 'word' });
  assert.match(fakeWindow.SwarSadhikaAvatarLipSyncPart2.source, /boundary-assisted/u,
    'Optional browser boundary events should be observed');
  runOneFrame(220);

  fakeSynth.pause();
  assert.equal(pauseCalls, 1, 'The original pause method must still execute');
  assert.equal(latestStageLevel(), 0, 'Mouth should close on pause');
  assert.equal(fakeWindow.SwarSadhikaAvatarLipSyncPart2.active, false);

  fakeSynth.resume();
  assert.equal(resumeCalls, 1, 'The original resume method must still execute');
  runOneFrame(260);
  assert.ok(latestStageLevel() > 0, 'Mouth animation should resume');

  utterance.dispatch('end');
  assert.equal(existingEndCalls, 1, 'Original end handler should still execute');
  assert.equal(fakeWindow.SwarSadhikaAvatarLipSyncPart2.active, false);
  assert.equal(latestStageLevel(), 0, 'Mouth should close after end');

  const failedUtterance = new FakeUtterance('मन्त्र परीक्षण');
  failedUtterance.onerror = originalOnError;
  fakeSynth.speak(failedUtterance);
  failedUtterance.dispatch('start');
  runOneFrame(300);
  failedUtterance.dispatch('error', { error: 'test-error' });
  assert.equal(existingErrorCalls, 1, 'Original error handler should still execute');
  assert.equal(fakeWindow.SwarSadhikaAvatarLipSyncPart2.active, false);
  assert.equal(latestStageLevel(), 0, 'Mouth should close on error');

  const cancelledUtterance = new FakeUtterance('रद्द परीक्षण');
  fakeSynth.speak(cancelledUtterance);
  cancelledUtterance.dispatch('start');
  runOneFrame(340);
  fakeSynth.cancel();
  assert.equal(cancelCalls, 1, 'The original cancel method must still execute');
  assert.equal(fakeWindow.SwarSadhikaAvatarLipSyncPart2.active, false);
  assert.equal(latestStageLevel(), 0, 'Mouth should close on cancel');

  console.log('Avatar Lip-Sync Part 2 Registry integration: PASS');
  console.log('Verified: real loader activation, registry entry, photo asset, offline paths, existing SVG renderer bridge, TTS start/boundary/pause/resume/end/error/cancel, and preservation of app event handlers.');
  console.log('Limit: simulated SpeechSynthesis lifecycle; Android device playback and speech/phoneme accuracy require a real-device test.');
} finally {
  if (didBoot && loader) {
    try { await loader.shutdown(); } catch (error) { console.error('Loader cleanup warning:', error); }
  }
  if (fs.existsSync(tempRegistryPath)) fs.unlinkSync(tempRegistryPath);
  if (originalFetch) globalThis.fetch = originalFetch;
  else delete globalThis.fetch;
  if (originalWindow === undefined) delete globalThis.window;
  else globalThis.window = originalWindow;
  if (originalDocument === undefined) delete globalThis.document;
  else globalThis.document = originalDocument;
  if (originalCustomEvent === undefined) delete globalThis.CustomEvent;
  else globalThis.CustomEvent = originalCustomEvent;
}
