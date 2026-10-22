/* Swar-Sadhika Avatar Lip-Sync Part 2
 * Registry-loaded module. It observes normal Browser SpeechSynthesis without
 * replacing the app's utterance.onstart/onend/onerror property handlers.
 * Motion is a text/time estimate assisted by optional browser boundary events;
 * it is not acoustic or phoneme-accurate lip-sync.
 */
const MODULE_ID = 'avatar-lipsync';
const GLOBAL_CONTROLLER = 'SwarSadhikaAvatarLipSyncPart2';
const INSTALLED_FLAG = '__swarSadhikaAvatarLipSyncPart2Installed';

const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0));
const VOWELS = /[अआइईउऊऋॠऌॡएऐओऔािीुूृॄॢॣेैोौंःँ]/u;
const CONSONANTS = /[क-हक़ख़ग़ज़ड़ढ़फ़ऱऴग-नप-रव-ह]/u;
const LATIN_VOWELS = /[aeiouy]/iu;
const WORD_SYMBOLS = /[\p{L}\p{M}\p{N}]/u;

export function registerSwarSadhikaModule(api) {
  const win = globalThis.window;
  const synth = win?.speechSynthesis;
  const stage = () => win?.SwarSadhikaStage;

  if (!win || !synth || typeof synth.speak !== 'function') {
    api?.emitStatus?.('इस ब्राउज़र में SpeechSynthesis उपलब्ध नहीं है; मौजूदा ऐप अपरिवर्तित रहेगा।', 'warning');
    return () => {};
  }

  if (win[INSTALLED_FLAG] || win[GLOBAL_CONTROLLER]?.installed) {
    throw new Error('Avatar Lip-Sync Part 2 पहले से सक्रिय है; duplicate hook नहीं जोड़ा गया।');
  }

  if (typeof stage()?.setMouthLevel !== 'function' && typeof stage()?.setMouthVisualState !== 'function') {
    throw new Error('मौजूदा SwarSadhikaStage mouth renderer उपलब्ध नहीं है; Part 2 सक्रिय नहीं किया गया।');
  }

  let active = null;
  let frameHandle = null;
  let lastSource = 'initialising';
  const wrappedMethods = [];

  const now = () => Number(win.performance?.now?.()) || Date.now();

  function setMouth(level) {
    const amount = clamp(level, 0, 1);
    try {
      if (typeof stage()?.setMouthLevel === 'function') stage().setMouthLevel(amount);
      else stage().setMouthVisualState(amount);
    } catch (error) {
      console.warn('[Swar-Sadhika Avatar Lip-Sync Part 2] Mouth update failed:', error);
    }
  }

  function cancelFrame() {
    if (frameHandle === null) return;
    if (typeof win.cancelAnimationFrame === 'function') win.cancelAnimationFrame(frameHandle);
    else win.clearTimeout?.(frameHandle);
    frameHandle = null;
  }

  function stopActive(reason = 'stopped') {
    cancelFrame();
    active = null;
    lastSource = reason;
    setMouth(0);
  }

  function scheduleFrame() {
    if (frameHandle !== null || !active || !active.started || active.paused) return;
    const request = typeof win.requestAnimationFrame === 'function'
      ? win.requestAnimationFrame.bind(win)
      : (callback) => win.setTimeout(() => callback(now()), 30);
    frameHandle = request(drawFrame);
  }

  function segmentText(text) {
    try {
      if (win.Intl?.Segmenter) {
        return Array.from(new win.Intl.Segmenter('hi', { granularity: 'grapheme' }).segment(text), item => item.segment);
      }
    } catch (_) {
      // Older WebViews fall back to code points; text remains unchanged.
    }
    return Array.from(text);
  }

  function levelForUnit(unit, phase) {
    if (!unit || /^\s+$/u.test(unit) || /^[।॥,.;:!?—–-]+$/u.test(unit)) return 0.025;
    const openVowel = VOWELS.test(unit) || LATIN_VOWELS.test(unit);
    const consonant = CONSONANTS.test(unit) || /[b-df-hj-np-tv-z]/iu.test(unit);
    let base = openVowel ? 0.68 : consonant ? 0.34 : WORD_SYMBOLS.test(unit) ? 0.38 : 0.1;
    if (unit.includes('्')) base *= 0.56;
    if (/[ंःँ]/u.test(unit)) base = Math.max(base, 0.43);
    return clamp(base * (0.66 + 0.34 * Math.sin(Math.PI * phase)), 0.025, 0.82);
  }

  function estimatedLevel(state) {
    const rate = clamp(state.rate, 0.5, 2.5) || 1;
    const slotMs = 1000 / (6.8 * rate);
    let indexFloat = state.elapsedMs / slotMs;
    if (state.boundaryUnitIndex !== null && state.boundaryElapsedMs !== null) {
      const sinceBoundary = state.elapsedMs - state.boundaryElapsedMs;
      if (sinceBoundary >= 0 && sinceBoundary < 420) {
        indexFloat = state.boundaryUnitIndex + sinceBoundary / slotMs;
      }
    }
    const index = Math.floor(indexFloat);
    if (index >= state.units.length) return 0.025;
    return levelForUnit(state.units[index], indexFloat - index);
  }

  function drawFrame(timestamp) {
    frameHandle = null;
    if (!active || !active.started || active.paused) {
      setMouth(0);
      return;
    }
    const time = Number.isFinite(timestamp) ? timestamp : now();
    if (active.lastFrameAt !== null) active.elapsedMs += Math.max(0, Math.min(100, time - active.lastFrameAt));
    active.lastFrameAt = time;
    setMouth(estimatedLevel(active));
    scheduleFrame();
  }

  function trackUtterance(utterance) {
    if (!utterance || typeof utterance.addEventListener !== 'function') {
      stopActive('utterance-events-unavailable');
      lastSource = 'utterance-events-unavailable';
      return;
    }

    stopActive('new-utterance');
    const text = String(utterance.text || '');
    const state = {
      utterance,
      text,
      units: segmentText(text),
      rate: Number(utterance.rate) || 1,
      started: false,
      paused: false,
      elapsedMs: 0,
      lastFrameAt: null,
      boundaryUnitIndex: null,
      boundaryElapsedMs: null
    };
    active = state;
    lastSource = 'waiting-for-start';

    utterance.addEventListener('start', () => {
      if (active !== state) return;
      state.started = true;
      state.paused = false;
      state.elapsedMs = 0;
      state.lastFrameAt = now();
      lastSource = 'timed-grapheme-estimate';
      scheduleFrame();
    });

    utterance.addEventListener('boundary', event => {
      if (active !== state || !state.started || state.paused) return;
      const charIndex = Number(event?.charIndex);
      if (Number.isFinite(charIndex) && charIndex >= 0 && charIndex <= state.text.length) {
        state.boundaryUnitIndex = segmentText(state.text.slice(0, charIndex)).length;
        state.boundaryElapsedMs = state.elapsedMs;
      }
      lastSource = 'boundary-assisted-estimate';
    });

    utterance.addEventListener('pause', () => {
      if (active !== state) return;
      state.paused = true;
      state.lastFrameAt = null;
      cancelFrame();
      setMouth(0);
      lastSource = 'paused';
    });

    utterance.addEventListener('resume', () => {
      if (active !== state) return;
      state.paused = false;
      state.lastFrameAt = now();
      lastSource = 'resumed';
      scheduleFrame();
    });

    const finish = () => {
      if (active === state) stopActive('utterance-ended');
    };
    utterance.addEventListener('end', finish);
    utterance.addEventListener('error', () => {
      if (active === state) stopActive('utterance-error');
    });
  }

  function wrapMethod(name, beforeCall, required = false) {
    const original = synth[name];
    if (typeof original !== 'function') {
      if (required) throw new Error(`speechSynthesis.${name} उपलब्ध नहीं है।`);
      return false;
    }
    const hadOwn = Object.prototype.hasOwnProperty.call(synth, name);
    const ownDescriptor = hadOwn ? Object.getOwnPropertyDescriptor(synth, name) : null;
    const wrapper = function (...args) {
      try { beforeCall?.apply(this, args); }
      catch (error) { console.warn(`[Swar-Sadhika Avatar Lip-Sync Part 2] ${name} hook failed:`, error); }
      try {
        return Reflect.apply(original, this, args);
      } catch (error) {
        if (name === 'speak') stopActive('speak-call-failed');
        throw error;
      }
    };
    try {
      synth[name] = wrapper;
      if (synth[name] !== wrapper) throw new Error(`speechSynthesis.${name} hook assignment rejected`);
      wrappedMethods.push({ name, original, wrapper, hadOwn, ownDescriptor });
      return true;
    } catch (error) {
      if (required) throw error;
      console.warn(`[Swar-Sadhika Avatar Lip-Sync Part 2] ${name} control hook unavailable:`, error);
      return false;
    }
  }

  const speakWrapped = wrapMethod('speak', utterance => trackUtterance(utterance), true);
  if (!speakWrapped) throw new Error('सामान्य Browser TTS का speak hook उपलब्ध नहीं है।');
  wrapMethod('cancel', () => stopActive('speech-cancelled'));
  wrapMethod('pause', () => {
    if (!active) return;
    active.paused = true;
    active.lastFrameAt = null;
    cancelFrame();
    setMouth(0);
    lastSource = 'paused';
  });
  wrapMethod('resume', () => {
    if (!active || !active.started) return;
    active.paused = false;
    active.lastFrameAt = now();
    lastSource = 'resumed';
    scheduleFrame();
  });

  Object.defineProperty(win, INSTALLED_FLAG, { value: true, writable: true, configurable: true });
  const diagnostics = Object.freeze({
    moduleId: MODULE_ID,
    version: '2.0.0',
    get installed() { return Boolean(win[INSTALLED_FLAG]); },
    get active() { return Boolean(active && active.started && !active.paused); },
    get source() { return lastSource; },
    stop: () => stopActive('manual-stop')
  });
  Object.defineProperty(win, GLOBAL_CONTROLLER, { value: diagnostics, writable: false, configurable: true });
  setMouth(0);
  api?.emitStatus?.('Avatar Lip-Sync Part 2 मौजूदा Module Loader से सक्रिय है। मुख-गति अनुमानित है।', 'success');

  // Module Loader runs this cleanup on shutdown, restoring every native method it wrapped.
  return () => {
    stopActive('module-shutdown');
    for (const entry of wrappedMethods.reverse()) {
      if (synth[entry.name] !== entry.wrapper) continue;
      try {
        if (entry.hadOwn && entry.ownDescriptor) Object.defineProperty(synth, entry.name, entry.ownDescriptor);
        else delete synth[entry.name];
      } catch (error) {
        console.warn(`[Swar-Sadhika Avatar Lip-Sync Part 2] ${entry.name} restore failed:`, error);
      }
    }
    if (win[GLOBAL_CONTROLLER] === diagnostics) delete win[GLOBAL_CONTROLLER];
    if (win[INSTALLED_FLAG] === true) delete win[INSTALLED_FLAG];
    api?.emitStatus?.('Avatar Lip-Sync Part 2 बंद हुआ; मूल SpeechSynthesis methods बहाल किए गए।', 'info');
  };
}
