/* Swar-Sadhika Avatar Lip-Sync Part 2
 * Adds a non-invasive visual-mouth driver to ordinary Browser SpeechSynthesis.
 * It listens to utterance events without replacing the app's existing onstart/onend
 * handlers. Where boundary events are sparse, movement is estimated from text timing.
 * This is approximate animation, not acoustic/phoneme-accurate lip-sync.
 */
(() => {
  'use strict';

  const VERSION = '1.0.0';
  const win = window;
  const synth = win.speechSynthesis;
  const stage = () => win.SwarSadhikaStage;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0));
  const now = () => Number(win.performance?.now?.()) || Date.now();
  const VOWELS = /[अआइईउऊऋॠऌॡएऐओऔािीुूृॄॢॣेैोौंःँ]/u;
  const CONSONANTS = /[क-हक़ख़ग़ज़ड़ढ़फ़ऱऴग-नप-रव-ह]/u;
  const LATIN_VOWELS = /[aeiouy]/iu;
  const WORD_SYMBOLS = /[\p{L}\p{M}\p{N}]/u;

  let active = null;
  let frameHandle = null;
  let lastSource = 'idle';

  function setMouth(level) {
    try {
      if (typeof stage()?.setMouthLevel === 'function') stage().setMouthLevel(clamp(level, 0, 1));
      else if (typeof stage()?.setMouthVisualState === 'function') stage().setMouthVisualState(clamp(level, 0, 1));
    } catch (error) {
      console.warn('[Swar-Sadhika LipSync Part 2] Mouth update failed:', error);
    }
  }

  function cancelFrame() {
    if (frameHandle === null) return;
    if (typeof win.cancelAnimationFrame === 'function') win.cancelAnimationFrame(frameHandle);
    else win.clearTimeout?.(frameHandle);
    frameHandle = null;
  }

  function scheduleFrame() {
    if (frameHandle !== null || !active || !active.started || active.paused) return;
    const request = typeof win.requestAnimationFrame === 'function'
      ? win.requestAnimationFrame.bind(win)
      : callback => win.setTimeout(() => callback(now()), 30);
    frameHandle = request(drawFrame);
  }

  function segmentText(text) {
    try {
      if (win.Intl?.Segmenter) {
        return Array.from(new win.Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text), part => part.segment);
      }
    } catch (_) {}
    // Array.from avoids splitting surrogate pairs on older WebViews.
    return Array.from(text);
  }

  function levelForUnit(unit, phase) {
    if (!unit || /^\s+$/u.test(unit) || /^[।॥,.;:!?—–-]+$/u.test(unit)) return 0.025;
    const hasOpenVowel = VOWELS.test(unit) || LATIN_VOWELS.test(unit);
    const hasConsonant = CONSONANTS.test(unit) || /[b-df-hj-np-tv-z]/iu.test(unit);
    let base = hasOpenVowel ? 0.68 : hasConsonant ? 0.34 : WORD_SYMBOLS.test(unit) ? 0.38 : 0.1;
    if (unit.includes('्')) base *= 0.56;
    if (/[ंःँ]/u.test(unit)) base = Math.max(base, 0.43);
    // Gentle per-grapheme articulation pulse, not a claimed phoneme match.
    return clamp(base * (0.66 + 0.34 * Math.sin(Math.PI * phase)), 0.025, 0.82);
  }

  function estimatedLevel(state) {
    const rate = clamp(state.rate, 0.5, 2.5) || 1;
    const slotMs = 1000 / (7.0 * rate);
    const indexFloat = state.elapsedMs / slotMs;
    const index = Math.floor(indexFloat);
    if (index >= state.units.length) return 0.08;
    const phase = indexFloat - index;
    return levelForUnit(state.units[index], phase);
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

    let level = estimatedLevel(active);
    if (active.lastBoundaryAt !== null) {
      const sinceBoundary = active.elapsedMs - active.lastBoundaryAt;
      if (sinceBoundary >= 0 && sinceBoundary < 140) {
        const pulse = 0.4 + 0.32 * Math.sin(Math.PI * sinceBoundary / 140);
        level = Math.max(level, pulse);
        lastSource = 'boundary-assisted-estimate';
      }
    }
    setMouth(level);
    scheduleFrame();
  }

  function stopActive(reason = 'stopped') {
    cancelFrame();
    active = null;
    lastSource = reason;
    setMouth(0);
  }

  function trackUtterance(utterance) {
    if (!utterance || typeof utterance.addEventListener !== 'function') return;

    // Existing `utterance.onstart`, `onend`, and `onerror` handlers remain untouched.
    const state = {
      utterance,
      text: String(utterance.text || ''),
      units: segmentText(String(utterance.text || '')),
      rate: Number(utterance.rate) || 1,
      started: false,
      paused: false,
      elapsedMs: 0,
      lastFrameAt: null,
      lastBoundaryAt: null
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

    utterance.addEventListener('boundary', () => {
      if (active !== state || !state.started || state.paused) return;
      state.lastBoundaryAt = state.elapsedMs;
      lastSource = 'boundary-assisted-estimate';
    });

    utterance.addEventListener('pause', () => {
      if (active !== state) return;
      state.paused = true;
      state.lastFrameAt = null;
      cancelFrame();
      setMouth(0);
    });

    utterance.addEventListener('resume', () => {
      if (active !== state) return;
      state.paused = false;
      state.lastFrameAt = now();
      scheduleFrame();
    });

    const finish = () => {
      if (active === state) stopActive('utterance-ended');
    };
    utterance.addEventListener('end', finish);
    utterance.addEventListener('error', finish);
  }

  function wrapMethod(owner, name, beforeCall) {
    if (!owner || typeof owner[name] !== 'function') return false;
    const original = owner[name];
    try {
      owner[name] = function (...args) {
        beforeCall?.apply(this, args);
        return original.apply(this, args);
      };
      if (owner[name] !== original) return true;
    } catch (_) {}
    return false;
  }

  if (!synth || typeof synth.speak !== 'function') {
    lastSource = 'speech-synthesis-unavailable';
    console.info('[Swar-Sadhika LipSync Part 2] Browser SpeechSynthesis is unavailable; avatar hook was not installed.');
  } else if (win.__swarSadhikaAvatarLipSyncPart2Installed) {
    lastSource = 'already-installed';
  } else {
    const speakWrapped = wrapMethod(synth, 'speak', function (utterance) {
      trackUtterance(utterance);
    });
    const cancelWrapped = wrapMethod(synth, 'cancel', function () {
      stopActive('speech-cancelled');
    });
    const pauseWrapped = wrapMethod(synth, 'pause', function () {
      if (active) {
        active.paused = true;
        active.lastFrameAt = null;
        cancelFrame();
        setMouth(0);
      }
    });
    const resumeWrapped = wrapMethod(synth, 'resume', function () {
      if (active && active.started) {
        active.paused = false;
        active.lastFrameAt = now();
        scheduleFrame();
      }
    });

    if (speakWrapped) {
      win.__swarSadhikaAvatarLipSyncPart2Installed = true;
      lastSource = 'installed';
      if (!cancelWrapped || !pauseWrapped || !resumeWrapped) {
        console.warn('[Swar-Sadhika LipSync Part 2] Some SpeechSynthesis controls could not be wrapped; utterance events will still be observed.');
      }
    } else {
      lastSource = 'speak-hook-unavailable';
      console.warn('[Swar-Sadhika LipSync Part 2] Browser blocked the speak() hook; ordinary TTS lip animation is unavailable.');
    }
  }

  // Small read-only diagnostic surface for smoke tests and debugging.
  win.SwarSadhikaAvatarLipSyncPart2 = Object.freeze({
    version: VERSION,
    get installed() { return Boolean(win.__swarSadhikaAvatarLipSyncPart2Installed); },
    get active() { return Boolean(active && active.started && !active.paused); },
    get source() { return lastSource; },
    stop: () => stopActive('manual-stop')
  });
})();
