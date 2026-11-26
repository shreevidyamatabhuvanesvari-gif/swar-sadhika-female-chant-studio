/**
 * Swar-Sadhika Vocal Singing Engine — Part 2
 * Additive adapter for the existing VagdhenuWebEngine facade.
 * Preserves the caller's Sanskrit text and all explicitly selected controls.
 * This tunes supported synthesis parameters; it does not retrain model weights
 * or claim to synthesize a new human/feminine timbre.
 */
import { VagdhenuWebEngine } from '../index.js';

const VERSION = '2.0.0';
const PATCH_FLAG = '__swarSadhikaVocalSingingPart2';
const GLOBAL_NAME = 'SwarSadhikaVocalSingingEnginePart2';
const PROFILE = 'devotional-natural';
const DEFAULTS = Object.freeze({ nfe: 8, speed: 0.90, cfg: 3.0 });
const state = { installed: false, lastPlan: null, original: null, wrapped: null, controls: [] };

function getDeviceBudget() {
  const nav = typeof navigator === 'object' ? navigator : {};
  const cores = Number(nav.hardwareConcurrency) || 0;
  const memory = Number(nav.deviceMemory) || 0;
  const lowPower = (memory > 0 && memory <= 4) || (cores > 0 && cores <= 4);
  const highPerformance = !lowPower && memory >= 8 && cores >= 8;
  return Object.freeze({
    cores: cores || null,
    memoryGiB: memory || null,
    tier: lowPower ? 'mobile-balanced' : highPerformance ? 'high-performance' : 'quality-balanced',
    recommendedNfe: lowPower ? 4 : highPerformance ? 8 : 6
  });
}

function sourceTextOf(value) {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && value.every(part => typeof part === 'string')) return value.join('\n');
  return '';
}

function makeSingingPlan(text, options = {}) {
  const input = options && typeof options === 'object' && !Array.isArray(options) ? options : {};
  const device = getDeviceBudget();
  const effective = { ...input };
  if (effective.nfe === undefined || effective.nfe === null) effective.nfe = device.recommendedNfe;
  if (effective.speed === undefined || effective.speed === null) effective.speed = DEFAULTS.speed;
  if (effective.cfg === undefined || effective.cfg === null) effective.cfg = DEFAULTS.cfg;
  const source = sourceTextOf(text);
  const marks = /[\u0951-\u0954\u1CD0-\u1CFF\uA8E0-\uA8FF]/u.test(source);
  const summary = Object.freeze({
    version: VERSION,
    profile: PROFILE,
    deviceTier: device.tier,
    recommendedNfe: device.recommendedNfe,
    effectiveNfe: Number(effective.nfe),
    effectiveSpeed: Number(effective.speed),
    effectiveCfg: Number(effective.cfg),
    meter: String(effective.meter || 'auto'),
    noSandhi: effective.noSandhi === true,
    textLength: Array.from(source).length,
    padaBreakCount: (source.match(/[।॥\n]/gu) || []).length,
    containsVedicMarks: marks,
    sourceTextModified: false,
    voiceIdentityControlAvailable: false
  });
  return { options: effective, summary };
}

function dispatchPlan(summary) {
  if (typeof window !== 'object' || typeof CustomEvent !== 'function') return;
  try {
    window.dispatchEvent(new CustomEvent('swar-sadhika:vocal-singing-plan', { detail: summary }));
  } catch { /* Diagnostic events must never interrupt audio generation. */ }
}

function listenForUserChoice(control, eventName) {
  if (!control) return;
  const mark = event => {
    if (event.isTrusted) control.dataset.vocalSingingUserChoice = 'true';
  };
  control.addEventListener(eventName, mark);
  state.controls.push(() => control.removeEventListener(eventName, mark));
}

function applyDefaultControls() {
  if (typeof document !== 'object') return;
  const budget = getDeviceBudget();
  const nfe = document.querySelector('#ss-ai-nfe');
  const speed = document.querySelector('#ss-ai-speed');
  const speedValue = document.querySelector('#ss-ai-speed-value');

  listenForUserChoice(nfe, 'change');
  listenForUserChoice(speed, 'input');

  if (nfe && !nfe.dataset.vocalSingingPresetApplied && !nfe.dataset.vocalSingingUserChoice) {
    const recommended = String(budget.recommendedNfe);
    if (Array.from(nfe.options || []).some(option => option.value === recommended)) {
      nfe.value = recommended;
      nfe.dataset.vocalSingingPresetApplied = 'true';
      nfe.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  if (speed && !speed.dataset.vocalSingingPresetApplied && !speed.dataset.vocalSingingUserChoice) {
    speed.value = String(DEFAULTS.speed);
    speed.dataset.vocalSingingPresetApplied = 'true';
    if (speedValue) speedValue.textContent = DEFAULTS.speed.toFixed(2);
  }
}

export function getVocalSingingStatus() {
  return Object.freeze({
    version: VERSION,
    installed: state.installed,
    profile: PROFILE,
    device: getDeviceBudget(),
    lastPlan: state.lastPlan,
    capabilities: Object.freeze({
      adaptiveNfePreset: true,
      naturalPacingPreset: true,
      preservesOriginalText: true,
      modelRetraining: false,
      independentPitchOrFormantControl: false,
      verifiedHumanVoiceQuality: false
    })
  });
}

export function registerSwarSadhikaModule(api) {
  if (state.installed) return getVocalSingingStatus();
  const prototype = VagdhenuWebEngine && VagdhenuWebEngine.prototype;
  if (!prototype || typeof prototype.synthesizeInBrowser !== 'function') {
    throw new Error('VagdhenuWebEngine.prototype.synthesizeInBrowser() उपलब्ध नहीं है।');
  }
  if (prototype[PATCH_FLAG]) {
    throw new Error('Vocal Singing Engine Part 2 पहले से किसी अन्य instance द्वारा patch किया गया है।');
  }

  const original = prototype.synthesizeInBrowser;
  const wrapped = async function vocalSingingSynthesize(text, options = {}, onProgress = null) {
    const plan = makeSingingPlan(text, options);
    state.lastPlan = plan.summary;
    this.lastVocalSingingPlan = plan.summary;
    dispatchPlan(plan.summary);
    return original.call(this, text, plan.options, onProgress);
  };

  Object.defineProperty(prototype, PATCH_FLAG, { value: true, configurable: true });
  prototype.synthesizeInBrowser = wrapped;
  state.original = original;
  state.wrapped = wrapped;
  state.installed = true;

  applyDefaultControls();

  const publicApi = Object.freeze({
    version: VERSION,
    getStatus: getVocalSingingStatus,
    getLastPlan: () => state.lastPlan,
    getRecommendedPreset: getDeviceBudget
  });
  if (typeof window === 'object' && !window[GLOBAL_NAME]) {
    Object.defineProperty(window, GLOBAL_NAME, {
      value: publicApi,
      configurable: true,
      enumerable: false,
      writable: false
    });
  }

  api?.emitStatus?.('स्वर-साधिका प्राकृतिक-गायन प्रोफ़ाइल सक्रिय: डिवाइस के अनुसार NFE और मध्यम गति चुनी गई; आपकी मैनुअल सेटिंग हमेशा मान्य रहेगी।', 'info');
  api?.registerCleanup?.(() => {
    for (const remove of state.controls.splice(0)) {
      try { remove(); } catch { /* Keep cleanup best-effort. */ }
    }
    if (prototype.synthesizeInBrowser === wrapped) prototype.synthesizeInBrowser = original;
    try { delete prototype[PATCH_FLAG]; } catch { /* Ignore non-configurable host objects. */ }
    if (typeof window === 'object' && window[GLOBAL_NAME] === publicApi) {
      try { delete window[GLOBAL_NAME]; } catch { /* Ignore host restrictions. */ }
    }
    state.installed = false;
    state.original = null;
    state.wrapped = null;
  });

  return getVocalSingingStatus();
}

export const activateSwarSadhikaModule = registerSwarSadhikaModule;
export default registerSwarSadhikaModule;
