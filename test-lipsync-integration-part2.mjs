import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const worker = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');
const js = fs.readFileSync(path.join(root, 'lipsync-engine.js'), 'utf8');
const photo = fs.readFileSync(path.join(root, 'swar-sadhika-avatar-photo.jpg'));

assert.ok(
  photo.length > 20_000,
  'The supplied avatar photo must not be empty or a tiny placeholder'
);
assert.match(html, /id="avatar-mouth-layer"/);
assert.doesNotMatch(
  html.match(/<svg id="avatar-mouth-layer"[^>]*>/)?.[0] || '',
  /\shidden(?:\s|>)/,
  'Mouth SVG must not ship hidden'
);
assert.match(html, /id="avatar-mouth"/);
assert.match(html, /src="\.\/swar-sadhika-avatar-photo\.jpg"/);
assert.match(html, /src="\.\/lipsync-engine\.js"/);
assert.match(app, /window\.SwarSadhikaLipSync\?\.setLevel\(level\)/);
assert.match(html, /window\.SwarSadhikaLipSync\?\.drawToCanvas\(ctx,w,h\)/);
assert.match(worker, /swar-sadhika-female-chant-shell-v11/);
assert.match(worker, /'\.\/lipsync-engine\.js'/);
assert.match(worker, /'\.\/swar-sadhika-avatar-photo\.jpg'/);

// Execute the existing renderer with a minimal DOM and recording-canvas fake.
const elements = new Map();

function shape(id) {
  if (!elements.has(id)) {
    elements.set(id, {
      id,
      attrs: {},
      style: {},
      hidden: false,
      classList: {
        contains(name) {
          return id === 'avatar-default' && name === 'active';
        }
      },
      setAttribute(k, v) {
        this.attrs[k] = String(v);
      }
    });
  }
  return elements.get(id);
}

for (const id of [
  'avatar-mouth-layer',
  'avatar-mouth',
  'avatar-teeth',
  'avatar-upper-lip',
  'avatar-lower-lip',
  'avatar-mouth-patch',
  'avatar-default'
]) {
  shape(id);
}

const win = {};

vm.runInNewContext(
  js,
  {
    window: win,
    document: { getElementById: shape },
    Math,
    Number,
    String,
    Boolean
  }
);

assert.equal(typeof win.SwarSadhikaLipSync.setLevel, 'function');
assert.equal(typeof win.SwarSadhikaLipSync.drawToCanvas, 'function');

win.SwarSadhikaLipSync.setLevel(0.8);

assert.ok(
  Number(elements.get('avatar-mouth').attrs.ry) > 1.15,
  'mouth should open when level rises'
);
assert.ok(
  Number(elements.get('avatar-mouth-layer').style.opacity) > 0,
  'mouth overlay should appear with audio'
);

let draws = 0;

const ctx = {
  save() {},
  restore() {},
  createRadialGradient() {
    return { addColorStop() {} };
  },
  beginPath() {},
  ellipse() {},
  fill() {
    draws++;
  },
  stroke() {
    draws++;
  },
  set globalAlpha(v) {},
  set fillStyle(v) {},
  set strokeStyle(v) {},
  set lineWidth(v) {}
};

assert.equal(
  win.SwarSadhikaLipSync.drawToCanvas(ctx, 1080, 1920),
  true
);
assert.ok(
  draws >= 2,
  'canvas lip overlay should draw during recording frames'
);

win.SwarSadhikaLipSync.setLevel(0);

assert.equal(
  win.SwarSadhikaLipSync.getLevel(),
  0,
  'mouth should close when stopped'
);

console.log('Lip-sync integration smoke tests: 18 assertions passed.');
