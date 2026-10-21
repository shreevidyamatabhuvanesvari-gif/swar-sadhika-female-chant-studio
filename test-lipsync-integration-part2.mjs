
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

// Part 2 companion test.
// Keeps the existing test-lipsync-integration.mjs untouched.
const root = path.dirname(fileURLToPath(import.meta.url));

const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const jsPath = path.join(root, 'swar-sadhika-avatar-lipsync-part2.js');
const source = fs.readFileSync(jsPath, 'utf8');
const worker = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');

// Verify HTML integration and preserve existing script references.
assert.equal(
  (html.match(/<script src="\.\/swar-sadhika-avatar-lipsync-part2\.js"><\/script>/gu) || []).length,
  1,
  'Part 2 script must be included exactly once in index.html'
);

assert.equal(
  (html.match(/<script src="\.\/lipsync-engine\.js"><\/script>/gu) || []).length,
  1,
  'Original lip-sync engine reference must remain exactly once'
);

assert.equal(
  (html.match(/swar-sadhika-app-bootstrap-part2\.js/gu) || []).length,
  1,
  'Existing bootstrap module reference must remain exactly once'
);

assert.equal(
  (html.match(/studio-enhancements\.js/gu) || []).length,
  1,
  'Existing studio enhancements reference must remain exactly once'
);

assert.match(html, /function speakNext\(token\)/u,
  'Normal Browser TTS queue should remain present');

assert.match(html, /utterance\.onstart=/u,
  'Existing TTS start handler should remain present');

assert.match(html, /utterance\.onend=/u,
  'Existing TTS end handler should remain present');

// Verify Service Worker cache integration.
assert.match(worker, /swar-sadhika-female-chant-shell-v11/u,
  'Service Worker shell cache should be updated for this asset change');

assert.match(worker, /'\.\/swar-sadhika-avatar-lipsync-part2\.js'/u,
  'Part 2 should be included in the offline shell cache');

assert.doesNotMatch(worker, /'\.\/swar-sadhika-user-photo\.jpg'/u,
  'Offline install must not require the absent legacy JPG');

// Every cached shell file must exist.
const shellBlock = worker.match(/const SHELL_FILES = \[([\s\S]*?)\];/u)?.[1];

assert.ok(shellBlock, 'Service Worker SHELL_FILES list should be readable');

for (const [, relativePath] of shellBlock.matchAll(/'([^']+)'/gu)) {
  const fullPath = relativePath === './'
    ? root
    : path.join(root, relativePath.replace(/^\.\//u, ''));

  assert.ok(
    fs.existsSync(fullPath),
    `Service Worker shell path must exist: ${relativePath}`
  );
}

// Verify the Part 2 implementation does not overwrite app event handlers.
assert.match(source, /addEventListener\('boundary'/u,
  'Part 2 should observe optional boundary events');

assert.match(source, /timed-grapheme-estimate/u,
  'Part 2 should identify its approximate fallback mode');

assert.doesNotMatch(source, /utterance\.onstart\s*=/u,
  'Part 2 must not overwrite the app onstart handler');

assert.doesNotMatch(source, /utterance\.onend\s*=/u,
  'Part 2 must not overwrite the app onend handler');

// Compile the JavaScript before running the simulated lifecycle.
const script = new vm.Script(source, {
  filename: path.basename(jsPath)
});

let clock = 100;
let nextFrameId = 1;

const pendingFrames = new Map();
const mouthLevels = [];
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
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }

    this.listeners.get(type).add(callback);
  }

  dispatch(type, event = {}) {
    for (const callback of this.listeners.get(type) || []) {
      callback({ type, ...event });
    }

    const propertyHandler = this[`on${type}`];

    if (typeof propertyHandler === 'function') {
      propertyHandler({ type, ...event });
    }
  }
}

const fakeSynth = {
  speak(utterance) {
    spoken.push(utterance);
  },

  cancel() {
    cancelCalls += 1;
  },

  pause() {
    pauseCalls += 1;
  },

  resume() {
    resumeCalls += 1;
  }
};

const fakeWindow = {
  speechSynthesis: fakeSynth,

  SpeechSynthesisUtterance: FakeUtterance,

  SwarSadhikaStage: {
    setMouthLevel(level) {
      mouthLevels.push(Number(level));
    },

    setMouthVisualState(level) {
      mouthLevels.push(Number(level));
    }
  },

  Intl,

  performance: {
    now: () => clock
  },

  requestAnimationFrame(callback) {
    const id = nextFrameId++;
    pendingFrames.set(id, callback);
    return id;
  },

  cancelAnimationFrame(id) {
    pendingFrames.delete(id);
  },

  setTimeout(callback) {
    const id = nextFrameId++;
    pendingFrames.set(id, () => callback(clock));
    return id;
  },

  clearTimeout(id) {
    pendingFrames.delete(id);
  },

  console,

  __swarSadhikaAvatarLipSyncPart2Installed: false
};

function runOneFrame(time) {
  clock = time;

  const first = pendingFrames.entries().next();

  assert.equal(
    first.done,
    false,
    'Expected an animation frame to be scheduled'
  );

  const [id, callback] = first.value;

  pendingFrames.delete(id);
  callback(time);
}

function latestMouthLevel() {
  return mouthLevels[mouthLevels.length - 1];
}

script.runInNewContext({
  window: fakeWindow,
  console,
  Date,
  Math,
  Number,
  String,
  Boolean,
  Array,
  Object,
  Intl
});

const api = fakeWindow.SwarSadhikaAvatarLipSyncPart2;

assert.ok(api, 'Part 2 diagnostic API should be available');
assert.equal(api.version, '1.0.0');
assert.equal(api.installed, true,
  'SpeechSynthesis speak hook should be installed');

assert.equal(typeof fakeSynth.speak, 'function');

// Test normal Browser TTS event lifecycle.
let existingOnStartCalls = 0;
let existingOnEndCalls = 0;

const utterance = new FakeUtterance('ॐ नमः शिवाय');

const originalOnStart = () => {
  existingOnStartCalls += 1;
};

const originalOnEnd = () => {
  existingOnEndCalls += 1;
};

utterance.onstart = originalOnStart;
utterance.onend = originalOnEnd;

fakeSynth.speak(utterance);

assert.equal(spoken.at(-1), utterance,
  'Wrapped speak must call the original synth method');

assert.equal(utterance.onstart, originalOnStart,
  'Part 2 must preserve the existing onstart handler');

assert.equal(utterance.onend, originalOnEnd,
  'Part 2 must preserve the existing onend handler');

utterance.dispatch('start');

assert.equal(api.active, true,
  'Avatar sync should become active at utterance start');

runOneFrame(180);

assert.ok(latestMouthLevel() > 0.05,
  'Mouth should animate while a nonempty utterance is speaking');

utterance.dispatch('boundary', {
  charIndex: 3,
  charLength: 3,
  name: 'word'
});

runOneFrame(220);

assert.match(api.source, /boundary-assisted/u,
  'Boundary event should be recognized when provided by browser');

// Test pause and resume.
fakeSynth.pause();

assert.equal(pauseCalls, 1,
  'Original pause method should still execute');

assert.equal(latestMouthLevel(), 0,
  'Mouth should close when speech is paused');

fakeSynth.resume();

assert.equal(resumeCalls, 1,
  'Original resume method should still execute');

runOneFrame(250);

assert.ok(latestMouthLevel() > 0,
  'Mouth animation should resume with speech');

// Test normal end.
utterance.dispatch('end');

assert.equal(existingOnEndCalls, 1,
  'Existing onend handler should still execute');

assert.equal(api.active, false,
  'Avatar sync should end when utterance ends');

assert.equal(latestMouthLevel(), 0,
  'Mouth should close when utterance ends');

// Test speech error.
const failedUtterance = new FakeUtterance('मन्त्र परीक्षण');

fakeSynth.speak(failedUtterance);
failedUtterance.dispatch('start');
runOneFrame(300);
failedUtterance.dispatch('error', { error: 'test-error' });

assert.equal(api.active, false,
  'Avatar sync should stop on utterance error');

assert.equal(latestMouthLevel(), 0,
  'Mouth should close on utterance error');

// Test explicit cancellation.
const cancelledUtterance = new FakeUtterance('परीक्षण');

fakeSynth.speak(cancelledUtterance);
cancelledUtterance.dispatch('start');
runOneFrame(340);
fakeSynth.cancel();

assert.equal(cancelCalls, 1,
  'Original cancel method should still execute');

assert.equal(api.active, false,
  'Avatar sync should stop when speech is cancelled');

assert.equal(latestMouthLevel(), 0,
  'Mouth should close when speech is cancelled');

api.stop();

assert.equal(latestMouthLevel(), 0,
  'Manual stop should leave mouth closed');

console.log(
  'Avatar Lip-Sync Part 2 integration smoke test: PASS.'
);

console.log(
  'Scope: simulated SpeechSynthesis lifecycle and HTML integration; ' +
  'not a real browser, Android, voice-quality, or phoneme-accuracy test.'
);
