import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runTextModuleSelfTests, splitPadas, analyzeVerse } from '../vagdhenu-text.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const required = [
  'index.html', 'app.js', 'index.js', 'studio-enhancements.js', 'model-cache.js',
  'vagdhenu-onnx.js', 'vagdhenu-text.js', 'service-worker.js', 'manifest.webmanifest',
  'icon.svg', '.nojekyll', 'README.md', 'DEPLOY-GITHUB-PAGES-HINDI.md',
  '.github/workflows/pages.yml', 'docs/THIRD-PARTY-AND-MODEL-NOTES.md',
  'sanskrit-knowledge-index.json', 'baked_bank.json',
  'vendor/vagdhenu-upstream/vagdhenu-onnx.js'
];
for (const rel of required) {
  const full = path.join(root, rel);
  assert.ok(fs.existsSync(full), `Required file missing: ${rel}`);
  if (!fs.statSync(full).isFile()) continue;
}
assert.ok(fs.statSync(path.join(root, 'index.html')).size > 3000, 'index.html must be non-empty and at repository root');

const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.webmanifest'), 'utf8'));
assert.equal(manifest.start_url, './');
assert.ok(manifest.icons?.some(icon => icon.src === './icon.svg'));
JSON.parse(fs.readFileSync(path.join(root, 'baked_bank.json'), 'utf8'));
JSON.parse(fs.readFileSync(path.join(root, 'sanskrit-knowledge-index.json'), 'utf8'));

const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const appCode = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const allMarkupSources = `${html}\n${appCode}`;
for (const id of [
  'panel-studio','panel-library','panel-models','panel-queue','panel-voice','panel-photo',
  'panel-videos','panel-audio','panel-export','panel-ai','library-title','library-text',
  'library-save','library-command','library-command-sing','library-export','library-import',
  'models-search','models-cache-official','ss-ai-text','ss-ai-nfe','ss-ai-cache-models',
  'stage','overlay-text','text-position','record-start','record-stop','record-download'
]) assert.ok(allMarkupSources.includes(`id=\"${id}\"`) || html.includes(`id="${id}"`), `Expected HTML/template id missing: ${id}`);
const staticIds = [...html.matchAll(/\bid=["']([^"']+)["']/gu)].map(match => match[1]);
const duplicateIds = staticIds.filter((id, index) => staticIds.indexOf(id) !== index);
assert.deepEqual([...new Set(duplicateIds)], [], `Duplicate HTML IDs detected: ${duplicateIds.join(', ')}`);
assert.ok(html.includes('studio-enhancements.js'), 'enhancements script is not referenced');
assert.ok(html.includes('aspect-ratio:9/16'), '9:16 stage CSS should be present');

const workflow = fs.readFileSync(path.join(root, '.github/workflows/pages.yml'), 'utf8');
for (const fragment of ['actions/checkout@v4', 'actions/upload-pages-artifact@v3', 'actions/deploy-pages@v4', 'node --check studio-enhancements.js']) {
  assert.ok(workflow.includes(fragment), `Pages workflow missing ${fragment}`);
}

const selfTests = runTextModuleSelfTests();
assert.equal(selfTests.ok, true, JSON.stringify(selfTests.tests.filter(test => !test.pass)));
assert.ok(selfTests.passed >= 10, `Unexpectedly few parser tests: ${selfTests.passed}`);

const verse = `नमामीशमीशान निर्वाणरूपं\nविभुं व्यापकं ब्रह्मवेदस्वरूपम्।\nनिजं निर्गुणं निर्विकल्पं निरीहं\nचिदाकाशमाकाशवासं भजेऽहम्॥१॥`;
const padas = splitPadas(verse);
assert.equal(padas.length, 4, `Rudrashtakam first verse should split into 4 padas, got ${padas.length}`);
assert.ok(!padas.some(item => /^[०-९0-9]+$/u.test(item)), 'Verse number must not become a standalone vocal item');
assert.ok(padas.every(item => item.trim()), 'No empty pada pieces allowed');
const analysis = analyzeVerse(verse);
assert.ok(analysis && Array.isArray(analysis.padas), 'Text analysis should return padas');

const enhancementCode = fs.readFileSync(path.join(root, 'studio-enhancements.js'), 'utf8');
assert.ok(appCode.includes('getAiAudioTrack'), 'Audio-track handoff should be wired');
assert.ok(enhancementCode.includes('indexedDB.open(DB_NAME, DB_VERSION)'), 'Local IndexedDB storage should be wired');
assert.ok(enhancementCode.includes('https://huggingface.co/api/models'), 'Official Model Hub search should be wired');
assert.ok(enhancementCode.includes('मॉडल weights को इससे retrain नहीं किया गया'), 'Must not imply automatic model training');

console.log(JSON.stringify({
  status: 'PASS',
  projectRoot: root,
  requiredFiles: required.length,
  json: '2 JSON files parsed',
  textUtilityTests: { passed: selfTests.passed, total: selfTests.passed + selfTests.failed },
  rudrashtakamRegression: { firstVersePadas: padas.length, verseNumberStandalonePiece: false },
  structureChecks: 'PASS',
  explicitlyNotTested: ['ONNX inference', 'female voice quality', 'device playback', 'video export audio decoding', 'phoneme-accurate lip sync']
}, null, 2));
