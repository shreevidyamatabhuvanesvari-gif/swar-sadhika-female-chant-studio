/**
 * Swar-Sadhika Female Chant Studio — persistent text library, Hub discovery,
 * local personalization, and guided AI-audio video recording.
 *
 * This module does not train or modify model weights. User text, ratings, and
 * preferred inference settings are stored locally in IndexedDB. Real female-
 * voice quality and accurate lip-sync require separate model/audio validation.
 */
import { analyzeVerse, runTextModuleSelfTests } from './vagdhenu-text.js';

const $ = (id) => document.getElementById(id);
const DB_NAME = 'swar-sadhika-female-chant-studio';
const DB_VERSION = 1;
const MAX_ENTRY_LENGTH = 200_000;
const HF_API = 'https://huggingface.co/api/models';
const HF_BASE = 'https://huggingface.co';

const OFFICIAL_MODELS = [
  {
    id: 'gnumanth/sanskrit-tts-onnx',
    title: 'Vāgdhenu Sanskrit Chant — ONNX / WebGPU',
    purpose: 'संस्कृत श्लोक-गायन के लिए आधिकारिक मॉडल-संसाधन। स्त्री-स्वर प्रमाणित नहीं।',
    url: 'https://huggingface.co/gnumanth/sanskrit-tts-onnx',
    backend: 'onnx',
    supported: true
  },
  {
    id: 'gnumanth/sanskrit-tts-wasm',
    title: 'Vāgdhenu Sanskrit Chant — WASM SIMD',
    purpose: 'मोबाइल/ब्राउज़र CPU backend; आवश्यक फाइलें पहली बार डाउनलोड की जाती हैं। स्त्री-स्वर प्रमाणित नहीं।',
    url: 'https://huggingface.co/gnumanth/sanskrit-tts-wasm',
    backend: 'wasm',
    supported: true
  },
  {
    id: 'hemanth/sanskrit-tts-web',
    title: 'आधिकारिक browser source',
    purpose: 'इंजन का स्रोत और तकनीकी संदर्भ। यह स्वयं डाउनलोड किया जाने वाला voice model नहीं है।',
    url: 'https://github.com/hemanth/sanskrit-tts-web',
    backend: null,
    supported: false
  }
];

const MODEL_FILES = [
  { name: 'vagdhenu_cond_q8.onnx', size: 'लगभग 20.6 MB' },
  { name: 'vagdhenu_dit_step_q8.onnx', size: 'लगभग 191.6 MB' },
  { name: 'vagdhenu_vocos_q8.onnx', size: 'लगभग 55.6 MB' },
  { name: 'baked_bank.bin', size: 'लगभग 2.84 MB' },
  { name: 'baked_bank.json', size: 'लगभग 62 KB' }
];

let dbPromise;
let currentRecord = null;
let lastAnalysis = null;
let guidedRecording = false;
let waitingForRecordingStop = false;

function setStatus(id, text, kind = 'warn') {
  const el = $(id);
  if (!el) return;
  el.textContent = String(text);
  el.classList.remove('good', 'warn', 'bad');
  el.classList.add(kind);
}

function titleKey(value) {
  return String(value ?? '').normalize('NFC').trim().toLocaleLowerCase('hi-IN').replace(/\s+/gu, ' ');
}

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('इस browser में IndexedDB उपलब्ध नहीं है; स्थानीय स्थायी संग्रह नहीं खुल सका।'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('texts')) {
        const store = db.createObjectStore('texts', { keyPath: 'id', autoIncrement: true });
        store.createIndex('titleKey', 'titleKey', { unique: false });
        store.createIndex('updatedAt', 'updatedAt', { unique: false });
      }
      if (!db.objectStoreNames.contains('feedback')) {
        const store = db.createObjectStore('feedback', { keyPath: 'id', autoIncrement: true });
        store.createIndex('createdAt', 'createdAt', { unique: false });
        store.createIndex('recordId', 'recordId', { unique: false });
      }
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('IndexedDB खोलने में विफलता।'));
    req.onblocked = () => reject(new Error('स्थानीय डेटाबेस upgrade अवरुद्ध है; इस ऐप के दूसरे खुले टैब बंद करके फिर खोलें।'));
  });
  return dbPromise;
}

function requestPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('स्थानीय डेटाबेस अनुरोध विफल।'));
  });
}

async function getAll(storeName) {
  const db = await openDb();
  const tx = db.transaction(storeName, 'readonly');
  return requestPromise(tx.objectStore(storeName).getAll());
}

function transactionDone(tx, failureMessage) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error(failureMessage));
    tx.onabort = () => reject(tx.error || new Error('डेटाबेस transaction रद्द हुआ।'));
  });
}

async function putItem(storeName, item) {
  const db = await openDb();
  const tx = db.transaction(storeName, 'readwrite');
  const done = transactionDone(tx, 'डेटाबेस में सहेजना विफल।');
  const request = tx.objectStore(storeName).put(item);
  const id = await requestPromise(request);
  await done;
  return id;
}

async function addItem(storeName, item) {
  const db = await openDb();
  const tx = db.transaction(storeName, 'readwrite');
  const done = transactionDone(tx, 'डेटाबेस में जोड़ना विफल।');
  const request = tx.objectStore(storeName).add(item);
  const id = await requestPromise(request);
  await done;
  return id;
}

async function deleteItem(storeName, id) {
  const db = await openDb();
  const tx = db.transaction(storeName, 'readwrite');
  tx.objectStore(storeName).delete(id);
  await new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error || new Error('डेटाबेस से मिटाना विफल।'));
    tx.onabort = () => reject(tx.error || new Error('डेटाबेस transaction रद्द हुआ।'));
  });
}

function inferTextForm(text, report) {
  const source = String(text || '');
  const lines = source.split(/\r?\n/u).filter((x) => x.trim());
  const padaCount = Array.isArray(report?.padas) ? report.padas.length : 0;
  const hasDanda = /[।॥]/u.test(source);
  const candidate = Boolean(report?.meter?.candidates?.length);
  if (candidate) return { form: 'पद्य जैसा पाठ', note: `छन्द का संभावित संकेत: ${report.meter.name}` };
  if (hasDanda && (padaCount >= 2 || lines.length > 1)) return { form: 'पद्य/पाठ — अनुमान', note: 'दण्ड/पंक्ति-विभाजन मिला; शास्त्रीय छन्द का निर्णय प्रमाणित नहीं।' };
  if (lines.length > 1) return { form: 'बहुपंक्ति पाठ — अनिर्णीत', note: 'कई पंक्तियाँ मिलीं; यह गद्य या पद्य हो सकता है।' };
  return { form: 'गद्य/एकल पंक्ति — अनुमान', note: 'स्पष्ट पद्य/छन्द का पर्याप्त संकेत नहीं मिला।' };
}

function runAnalysis(text) {
  const report = analyzeVerse(text);
  const shape = inferTextForm(text, report);
  return { report, shape };
}

function showAnalysis(result) {
  lastAnalysis = result;
  const r = result.report;
  const padas = r.padas.map((p) => `पाद ${p.index + 1}: लगभग ${p.estimatedSyllableCount} अक्षर-स्वर केंद्र`).join(' · ');
  const meter = r.meter?.name || 'अनिर्धारित';
  const warning = r.warnings?.length ? ` चेतावनी: ${r.warnings.slice(0, 2).join(' ')}` : '';
  setStatus('library-analysis', `${result.shape.form}\n${result.shape.note}\nछन्द संकेत: ${meter}; अनुमानित स्वर-केंद्र: ${r.estimatedSyllableCount}. ${padas}${warning}\nसीमा: यह स्वचालित अनुमान है, प्रामाणिक छन्द/शुद्ध पाठ प्रमाण नहीं।`, r.validation?.valid ? 'good' : 'warn');
}

function safeAnchor(url, label) {
  const a = document.createElement('a');
  a.href = url;
  a.textContent = label;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  return a;
}

function renderCuratedModels() {
  const root = $('models-curated');
  if (!root) return;
  root.replaceChildren();
  for (const model of OFFICIAL_MODELS) {
    const card = document.createElement('div');
    card.className = 'model-result';
    const title = document.createElement('h3');
    title.textContent = model.title;
    const meta = document.createElement('p');
    meta.textContent = `${model.id} · ${model.supported ? 'इस प्रोजेक्ट में Vāgdhenu backend से संबद्ध' : 'स्रोत जानकारी; direct integration नहीं'}`;
    const purpose = document.createElement('p');
    purpose.textContent = model.purpose;
    const actions = document.createElement('div');
    actions.className = 'enhancement-actions';
    actions.append(safeAnchor(model.url, 'आधिकारिक स्रोत खोलें'));
    if (model.supported) {
      const select = document.createElement('button');
      select.className = 'btn secondary';
      select.type = 'button';
      select.textContent = model.backend === 'onnx' ? 'ONNX backend चुनें' : 'WASM backend चुनें';
      select.addEventListener('click', () => {
        const backend = $('ss-ai-backend');
        if (backend) {
          backend.value = model.backend;
          backend.dispatchEvent(new Event('change', { bubbles: true }));
        }
        refreshModelCacheStatus();
        setStatus('models-cache-status', `${model.backend.toUpperCase()} backend चुना गया। स्त्री-स्वर इस चयन से प्रमाणित नहीं होता।`, 'warn');
      });
      actions.append(select);
    }
    card.append(title, meta, purpose, actions);
    root.append(card);
  }
}

function renderModelFileLinks() {
  const root = $('models-files');
  if (!root) return;
  root.replaceChildren();
  for (const file of MODEL_FILES) {
    const li = document.createElement('li');
    const name = document.createElement('strong');
    name.textContent = file.name;
    const size = document.createElement('span');
    size.textContent = ` — ${file.size} · `;
    const link = safeAnchor(`${HF_BASE}/gnumanth/sanskrit-tts-onnx/resolve/main/${encodeURIComponent(file.name)}?download=true`, 'आधिकारिक डाउनलोड लिंक');
    li.append(name, size, link);
    root.append(li);
  }
}

async function refreshModelCacheStatus() {
  const target = $('models-cache-status');
  if (!target) return;
  try {
    const backend = String($('ss-ai-backend')?.value || 'wasm').toLowerCase();
    const moduleUrl = new URL('./model-cache.js', import.meta.url).href;
    const mod = await import(moduleUrl);
    const status = await mod.getVagdhenuModelCacheStatus(backend);
    target.className = `status ${status.complete ? 'good' : 'warn'}`;
    target.textContent = `${backend.toUpperCase()} cache: ${status.cachedCount}/${status.total} फ़ाइलें सत्यापित कैश में हैं। ${status.complete ? 'सभी आवश्यक संसाधन कैश में हैं; यह सफल inference/आवाज़ का प्रमाण नहीं।' : 'पूर्ण डाउनलोड के लिए इंटरनेट, पर्याप्त स्टोरेज और सही integrity metadata आवश्यक हैं।'} स्त्री-स्वर अभी प्रमाणित नहीं है।`;
  } catch (error) {
    target.className = 'status warn';
    target.textContent = `कैश स्थिति अभी नहीं पढ़ी जा सकी: ${error.message || error}. AI परीक्षण पैनल में भी विवरण देखें।`;
  }
}

async function searchModelHub() {
  const query = String($('models-query')?.value || '').trim();
  if (!query) {
    setStatus('models-search-status', 'खोज के लिए मॉडल/उपयोग का शब्द लिखें।', 'warn');
    return;
  }
  const button = $('models-search');
  const results = $('models-results');
  if (button) button.disabled = true;
  if (results) results.replaceChildren();
  setStatus('models-search-status', `Hugging Face Model Hub पर “${query}” खोज रहे हैं…`, 'warn');
  try {
    const url = new URL(HF_API);
    url.searchParams.set('search', query);
    url.searchParams.set('limit', '12');
    url.searchParams.set('sort', 'downloads');
    url.searchParams.set('direction', '-1');
    const response = await fetch(url, { headers: { Accept: 'application/json' }, cache: 'no-store' });
    if (!response.ok) throw new Error(`Hub API ने HTTP ${response.status} लौटाया।`);
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error('Hub API का परिणाम सूची के रूप में नहीं आया।');
    if (!data.length) {
      setStatus('models-search-status', 'कोई परिणाम नहीं मिला। अलग शब्द या आधिकारिक लिंक आज़माएँ।', 'warn');
      return;
    }
    for (const model of data) {
      const card = document.createElement('div');
      card.className = 'model-result';
      const title = document.createElement('h3');
      title.textContent = model.modelId || model.id || 'मॉडल नाम उपलब्ध नहीं';
      const task = document.createElement('p');
      task.textContent = `Task: ${model.pipeline_tag || 'अघोषित'} · Downloads: ${Number(model.downloads || 0).toLocaleString()} · Likes: ${Number(model.likes || 0).toLocaleString()}`;
      const tags = document.createElement('p');
      tags.textContent = `Tags: ${(Array.isArray(model.tags) ? model.tags : []).slice(0, 8).join(', ') || 'कोई टैग नहीं'}`;
      const note = document.createElement('p');
      note.textContent = 'यह केवल खोज परिणाम है। महिला-स्वर, संस्कृत उच्चारण, singing capability, license तथा इस engine से संगतता स्वतः प्रमाणित नहीं हैं।';
      const actions = document.createElement('div');
      actions.className = 'enhancement-actions';
      const id = String(model.modelId || model.id || '').trim();
      if (id) actions.append(safeAnchor(`${HF_BASE}/${id}`, 'मॉडल कार्ड / फाइलें खोलें'));
      card.append(title, task, tags, note, actions);
      results.append(card);
    }
    setStatus('models-search-status', `${data.length} मॉडल परिणाम मिले। इन्हें खोज के परिणाम के रूप में देखें, सत्यापित महिला-संस्कृत-गायन मॉडल के रूप में नहीं।`, 'good');
  } catch (error) {
    setStatus('models-search-status', `Model Hub खोज विफल: ${error.message || error}. सीधे आधिकारिक Hugging Face खोज पेज पर जाएँ; मौजूदा ऐप में केवल Vāgdhenu backend का integration उपलब्ध है।`, 'bad');
    const link = safeAnchor(`https://huggingface.co/models?search=${encodeURIComponent(query)}`, 'यही खोज Hugging Face वेबसाइट पर खोलें');
    results?.append(link);
  } finally {
    if (button) button.disabled = false;
  }
}

async function cacheOfficialModels() {
  const button = $('ss-ai-cache-models');
  if (!button) {
    setStatus('models-cache-status', 'AI मॉडल-कैश नियंत्रण अभी उपलब्ध नहीं हुआ। पृष्ठ reload करके फिर प्रयास करें।', 'bad');
    return;
  }
  const backend = String($('ss-ai-backend')?.value || 'wasm').toUpperCase();
  setStatus('models-cache-status', `${backend} मॉडल की आधिकारिक फ़ाइलें जाँचना/डाउनलोड करना शुरू होगा। लगभग 280 MB डेटा और स्थानीय storage लग सकती है।`, 'warn');
  button.click();
  // Cache manager reports its own byte/integrity/download result in the existing AI panel.
  const cacheStatus = $('ss-ai-cache-status');
  if (cacheStatus) {
    const observer = new MutationObserver(() => {
      setStatus('models-cache-status', cacheStatus.textContent, cacheStatus.classList.contains('good') ? 'good' : cacheStatus.classList.contains('bad') ? 'bad' : 'warn');
    });
    observer.observe(cacheStatus, { childList: true, subtree: true, characterData: true });
    window.setTimeout(() => observer.disconnect(), 30 * 60 * 1000);
  }
}

function sanitizeImportedRecord(record) {
  if (!record || typeof record !== 'object') throw new Error('बैकअप में अमान्य रिकॉर्ड है।');
  const title = String(record.title || '').trim();
  const text = String(record.text ?? '');
  if (!title || !text.trim()) throw new Error('बैकअप का प्रत्येक रिकॉर्ड title और text रखे।');
  if (title.length > 240 || text.length > MAX_ENTRY_LENGTH) throw new Error('बैकअप का कोई रिकॉर्ड निर्धारित लंबाई से अधिक है।');
  const analysis = runAnalysis(text);
  return {
    title,
    titleKey: titleKey(title),
    text,
    category: String(record.category || 'अन्य').slice(0, 80),
    note: String(record.note || '').slice(0, 1500),
    form: analysis.shape.form,
    analysis: {
      meterName: analysis.report.meter?.name || 'अनिर्धारित',
      padas: analysis.report.padas.map(p => p.estimatedSyllableCount),
      estimatedSyllableCount: analysis.report.estimatedSyllableCount,
      warnings: analysis.report.warnings.slice(0, 20)
    },
    useCount: Number.isSafeInteger(record.useCount) ? record.useCount : 0,
    preferredSettings: record.preferredSettings && typeof record.preferredSettings === 'object' ? record.preferredSettings : null,
    createdAt: Number(record.createdAt) || Date.now(),
    updatedAt: Date.now(),
    lastUsedAt: Number(record.lastUsedAt) || 0
  };
}

async function saveTextRecord() {
  const title = String($('library-title')?.value || '').trim();
  const text = String($('library-text')?.value ?? '');
  const category = String($('library-category')?.value || 'अन्य');
  const note = String($('library-note')?.value || '').trim();
  if (!title || !text.trim()) {
    setStatus('library-status', 'सहेजने से पहले नाम और पूरा पाठ दोनों भरें।', 'warn');
    return;
  }
  if (title.length > 240 || text.length > MAX_ENTRY_LENGTH) {
    setStatus('library-status', `शीर्षक अधिकतम 240 अक्षर और पाठ अधिकतम ${MAX_ENTRY_LENGTH.toLocaleString()} UTF-16 units का हो।`, 'bad');
    return;
  }
  try {
    const records = await getAll('texts');
    const match = records.find(r => r.titleKey === titleKey(title));
    const existingAnalysis = runAnalysis(text);
    const now = Date.now();
    const record = {
      ...(match || {}),
      title,
      titleKey: titleKey(title),
      category,
      text,
      note,
      form: existingAnalysis.shape.form,
      analysis: {
        meterName: existingAnalysis.report.meter?.name || 'अनिर्धारित',
        candidates: existingAnalysis.report.meter?.candidates || [],
        padas: existingAnalysis.report.padas.map(p => p.estimatedSyllableCount),
        estimatedSyllableCount: existingAnalysis.report.estimatedSyllableCount,
        containsVedicMarks: Boolean(existingAnalysis.report.vedicMarks?.hasVedicMarks),
        warnings: existingAnalysis.report.warnings.slice(0, 20)
      },
      createdAt: match?.createdAt || now,
      updatedAt: now,
      useCount: Number(match?.useCount || 0),
      lastUsedAt: Number(match?.lastUsedAt || 0),
      preferredSettings: match?.preferredSettings || null
    };
    const id = await putItem('texts', record);
    currentRecord = { ...record, id };
    setStatus('library-status', match ? `“${title}” का मौजूदा रिकॉर्ड नए पाठ से अपडेट हुआ। मूल संस्कृत पाठ उसी रूप में रखा गया।` : `“${title}” स्थानीय IndexedDB में सुरक्षित हुआ।`, 'good');
    showAnalysis(existingAnalysis);
    await renderLibrary();
  } catch (error) {
    setStatus('library-status', `स्थानीय संग्रह में सहेजना विफल: ${error.message || error}. JSON बैकअप या browser storage की जाँच करें।`, 'bad');
  }
}

function fillTextFields(record) {
  currentRecord = record;
  $('library-title').value = record.title || '';
  $('library-category').value = record.category || 'अन्य';
  $('library-text').value = record.text || '';
  $('library-note').value = record.note || '';
  $('library-command').value = record.title || '';
  const analysis = runAnalysis(record.text || '');
  showAnalysis(analysis);
  setStatus('library-status', `“${record.title}” खोला गया। उपयोग: ${Number(record.useCount || 0)} बार।`, 'good');
}

function actionButton(label, handler, className = 'small-btn') {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  button.textContent = label;
  button.addEventListener('click', handler);
  return button;
}

async function loadRecordIntoAi(record, options = {}) {
  if (!record?.text) {
    setStatus('library-status', 'चुने हुए रिकॉर्ड में पाठ उपलब्ध नहीं है।', 'bad');
    return;
  }
  const aiText = $('ss-ai-text');
  if (!aiText) {
    setStatus('library-status', 'AI panel अभी खुला नहीं है। पृष्ठ reload कर फिर प्रयास करें।', 'bad');
    return;
  }
  const records = await getAll('texts');
  const refreshed = records.find(r => r.id === record.id) || record;
  refreshed.useCount = Number(refreshed.useCount || 0) + 1;
  refreshed.lastUsedAt = Date.now();
  await putItem('texts', refreshed);
  currentRecord = refreshed;
  aiText.value = refreshed.text;
  aiText.dispatchEvent(new Event('input', { bubbles: true }));
  const studioText = $('text-input');
  if (studioText) {
    studioText.value = refreshed.text;
    studioText.dispatchEvent(new Event('input', { bubbles: true }));
  }
  applyPreferredSettings(refreshed);
  await renderLibrary();
  if (options.queue) {
    const queueAdd = $('queue-add');
    if (queueAdd) {
      queueAdd.click();
      setStatus('library-status', `“${refreshed.title}” की पंक्तियाँ Browser Voice/preview कतार में भेजी गईं। यह AI गायन नहीं है।`, 'good');
    }
    $('panel-studio')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }
  $('panel-ai')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  setStatus('library-status', `“${refreshed.title}” AI बॉक्स में भेजा गया। Generate दबाकर वास्तविक inference शुरू करें।`, 'good');
  if (options.generate) {
    const generate = $('ss-ai-generate');
    if (generate && !generate.disabled) generate.click();
    else setStatus('library-status', 'पाठ AI बॉक्स में है; Generate अभी उपलब्ध नहीं। AI panel खोलकर स्थिति जाँचें।', 'warn');
  }
}

function applyPreferredSettings(record) {
  const settings = record?.preferredSettings;
  if (!settings || typeof settings !== 'object') return;
  if (['wasm', 'onnx'].includes(settings.backend) && $('ss-ai-backend')) $('ss-ai-backend').value = settings.backend;
  if ([3, 4, 6, 8].includes(Number(settings.nfe)) && $('ss-ai-nfe')) $('ss-ai-nfe').value = String(settings.nfe);
  const speed = Number(settings.speed);
  if (Number.isFinite(speed) && speed >= 0.55 && speed <= 1.25 && $('ss-ai-speed')) {
    $('ss-ai-speed').value = String(speed);
    $('ss-ai-speed').dispatchEvent(new Event('input', { bubbles: true }));
  }
  const meter = String(settings.meter || 'auto');
  if ($('ss-ai-meter') && Array.from($('ss-ai-meter').options).some(o => o.value === meter)) $('ss-ai-meter').value = meter;
}

async function resolveCommandRecords() {
  const query = titleKey($('library-command')?.value || '');
  const all = await getAll('texts');
  if (!query) return [];
  const cleaned = query.replace(/(?:कृपया|गाओ|गायन|गाना|चलाओ|पढ़ो|पढ़िए|गायें|गाइए|सुनाओ|सुनाएँ|please|sing|play|chant|singing)/giu, ' ').replace(/\s+/gu, ' ').trim();
  const q = cleaned || query;
  const exact = all.filter(r => r.titleKey === q);
  if (exact.length) return exact;
  return all.filter(r => r.titleKey.includes(q) || q.includes(r.titleKey) || titleKey(`${r.title} ${r.category}`).includes(query));
}

async function searchCommand(showStatus = true) {
  try {
    const matches = await resolveCommandRecords();
    const container = $('library-records');
    if (matches.length) {
      currentRecord = matches[0];
      if (showStatus) setStatus('library-status', `${matches.length} मिलान मिले। पहले रिकॉर्ड को चुनें या AI गायन प्रयास दबाएँ।`, 'good');
      renderLibrary(matches);
    } else {
      if (showStatus) setStatus('library-status', 'यह नाम स्थानीय संग्रह में नहीं मिला। ऐप बिना स्रोत के शास्त्रीय पाठ का अनुमान लगाकर नहीं गाएगा। पहले नाम और प्रमाणित मूल पाठ को संग्रह में सहेजें या JSON बैकअप आयात करें।', 'warn');
      await renderLibrary();
    }
  } catch (error) {
    setStatus('library-status', `नाम खोजने में त्रुटि: ${error.message || error}`, 'bad');
  }
}

async function renderLibrary(preloaded = null) {
  const root = $('library-records');
  if (!root) return;
  let records;
  try { records = preloaded || await getAll('texts'); }
  catch (error) {
    setStatus('library-status', `स्थानीय डेटाबेस उपलब्ध नहीं: ${error.message || error}`, 'bad');
    return;
  }
  const filter = titleKey($('library-search')?.value || '');
  const command = titleKey($('library-command')?.value || '');
  const query = filter || '';
  records = records.filter(r => !query || r.titleKey.includes(query) || titleKey(`${r.category} ${r.text}`).includes(query));
  records.sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0));
  root.replaceChildren();
  if (!records.length) {
    const empty = document.createElement('div');
    empty.className = 'status warn';
    empty.textContent = query ? 'इस खोज से कोई सहेजा पाठ नहीं मिला।' : 'अभी कोई पाठ सहेजा नहीं गया। ऊपर नाम और मूल संस्कृत पाठ भरकर सुरक्षित करें।';
    root.append(empty);
    return;
  }
  for (const record of records.slice(0, 100)) {
    const card = document.createElement('article');
    card.className = 'saved-card';
    const heading = document.createElement('h3');
    heading.textContent = record.title || 'बिना नाम का पाठ';
    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.textContent = `${record.category || 'अन्य'} · ${record.form || 'रूप अनिर्णीत'} · उपयोग ${Number(record.useCount || 0)} बार${record.preferredSettings ? ' · व्यक्तिगत सेटिंग उपलब्ध' : ''}`;
    const body = document.createElement('div');
    body.className = 'saved-body';
    body.textContent = String(record.text || '').slice(0, 1200) + (String(record.text || '').length > 1200 ? '…' : '');
    const actions = document.createElement('div');
    actions.className = 'item-actions';
    actions.append(
      actionButton('खोलें / संपादित करें', () => fillTextFields(record)),
      actionButton('AI गायन प्रयास', () => loadRecordIntoAi(record, { generate: false })),
      actionButton('सीधे Generate', () => loadRecordIntoAi(record, { generate: true })),
      actionButton('Browser Voice कतार', () => loadRecordIntoAi(record, { queue: true })),
      actionButton('मिटाएँ', async () => {
        if (!window.confirm(`“${record.title}” को इस browser के स्थानीय संग्रह से मिटाएँ?`)) return;
        await deleteItem('texts', record.id);
        if (currentRecord?.id === record.id) currentRecord = null;
        setStatus('library-status', `“${record.title}” स्थानीय संग्रह से मिटाया गया।`, 'warn');
        await renderLibrary();
      }, 'small-btn danger-text')
    );
    card.append(heading, meta, body);
    if (record.note) {
      const note = document.createElement('p');
      note.className = 'hint';
      note.textContent = `टिप्पणी: ${record.note}`;
      card.append(note);
    }
    card.append(actions);
    root.append(card);
  }
  if (records.length > 100) {
    const note = document.createElement('p');
    note.className = 'hint';
    note.textContent = 'पहले 100 रिकॉर्ड दिखाए गए हैं; खोज से अपने रिकॉर्ड को सीमित करें।';
    root.append(note);
  }
}

async function exportLibrary() {
  try {
    const [texts, feedback] = await Promise.all([getAll('texts'), getAll('feedback')]);
    const payload = {
      schema: 'swar-sadhika-local-library/v1',
      exportedAt: new Date().toISOString(),
      note: 'यह JSON structured text/feedback backup है; मॉडल weights या audio शामिल नहीं हैं।',
      texts,
      feedback
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `swar-sadhika-library-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.append(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1500);
    setStatus('library-status', `${texts.length} पाठ और ${feedback.length} feedback-record का JSON backup डाउनलोड के लिए तैयार किया गया।`, 'good');
  } catch (error) {
    setStatus('library-status', `JSON backup तैयार नहीं हुआ: ${error.message || error}`, 'bad');
  }
}

async function importLibraryFile(file) {
  if (!file) return;
  if (file.size > 20 * 1024 * 1024) {
    setStatus('library-status', 'बैकअप 20 MB से बड़ा है; सुरक्षा के लिए आयात रोका गया।', 'bad');
    return;
  }
  try {
    const payload = JSON.parse(await file.text());
    if (payload?.schema !== 'swar-sadhika-local-library/v1' || !Array.isArray(payload.texts)) {
      throw new Error('यह स्वर-साधिका local library/v1 का बैकअप नहीं है।');
    }
    let imported = 0;
    for (const source of payload.texts) {
      const safe = sanitizeImportedRecord(source);
      const existing = (await getAll('texts')).find(r => r.titleKey === safe.titleKey);
      if (existing) safe.id = existing.id;
      await putItem('texts', safe);
      imported += 1;
    }
    // Feedback is imported only as historic information; it does not run training.
    if (Array.isArray(payload.feedback)) {
      for (const record of payload.feedback.slice(0, 10000)) {
        if (record && typeof record === 'object' && typeof record.rating === 'number') {
          const { id: _discardedImportedId, ...feedbackCopy } = record;
          await addItem('feedback', { ...feedbackCopy, importedAt: Date.now() });
        }
      }
    }
    setStatus('library-status', `${imported} पाठ बैकअप से आयात किए गए। उसी शीर्षक के रिकॉर्ड अपडेट हुए।`, 'good');
    await renderLibrary();
  } catch (error) {
    setStatus('library-status', `बैकअप आयात विफल: ${error.message || error}`, 'bad');
  } finally {
    if ($('library-import')) $('library-import').value = '';
  }
}

async function requestPersistentStorage() {
  try {
    if (!navigator.storage?.persist) {
      setStatus('library-storage-status', 'इस browser में persistent-storage API उपलब्ध नहीं। JSON बैकअप रखें।', 'warn');
      return;
    }
    const persisted = await navigator.storage.persist();
    setStatus('library-storage-status', persisted ? 'Browser ने इस origin के storage को persistent रखने की अनुमति दी। फिर भी JSON backup अलग से रखें।' : 'Browser ने persistent storage की अनुमति नहीं दी या उसे स्वतः नियंत्रित किया; नियमित JSON backup रखें।', persisted ? 'good' : 'warn');
  } catch (error) {
    setStatus('library-storage-status', `Storage persistence की जाँच विफल: ${error.message || error}`, 'warn');
  }
}

async function updateStorageStatus() {
  try {
    const count = (await getAll('texts')).length;
    let persistedText = 'स्थानीय browser IndexedDB';
    if (navigator.storage?.persisted) {
      const isPersisted = await navigator.storage.persisted();
      persistedText += isPersisted ? ' · persistent permission active' : ' · persistence permission अभी पुष्टि नहीं';
    }
    setStatus('library-storage-status', `${count} पाठ सहेजे हैं · ${persistedText}. ऐप का repository-origin बदलने पर डेटा अपने-आप नए origin में नहीं जाएगा।`, 'warn');
  } catch (error) {
    setStatus('library-storage-status', `Storage status उपलब्ध नहीं: ${error.message || error}`, 'warn');
  }
}

async function saveFeedback() {
  const rating = Number($('learning-rating')?.value || 3);
  const note = String($('learning-note')?.value || '').trim();
  const aiText = String($('ss-ai-text')?.value || $('library-text')?.value || '');
  const settings = {
    backend: String($('ss-ai-backend')?.value || 'wasm'),
    nfe: Number($('ss-ai-nfe')?.value || 4),
    speed: Number($('ss-ai-speed')?.value || 0.9),
    meter: String($('ss-ai-meter')?.value || 'auto')
  };
  if (!aiText.trim()) {
    setStatus('learning-status', 'Feedback सेव करने के लिए पहले पाठ चुनें या AI बॉक्स में पाठ रखें।', 'warn');
    return;
  }
  try {
    const feedback = {
      recordId: currentRecord?.id ?? null,
      title: currentRecord?.title || String($('library-title')?.value || 'असंग्रहित पाठ').trim(),
      textHash: await simpleHash(aiText),
      rating,
      note,
      settings,
      createdAt: Date.now(),
      status: 'user_feedback_not_model_training'
    };
    await addItem('feedback', feedback);
    if (currentRecord?.id && rating >= 4) {
      const record = (await getAll('texts')).find(r => r.id === currentRecord.id);
      if (record) {
        record.preferredSettings = settings;
        record.preferredRating = rating;
        record.preferredUpdatedAt = Date.now();
        await putItem('texts', record);
        currentRecord = record;
      }
    }
    setStatus('learning-status', `रेटिंग ${rating}/5 और आपकी टिप्पणी स्थानीय रूप से सुरक्षित हुई। ${rating >= 4 && currentRecord?.id ? 'इस पाठ की inference सेटिंग अगली बार सुझाव के रूप में लागू होगी।' : 'अगली बार सुधार के लिए इस feedback को संदर्भ के रूप में रखा गया।'} मॉडल weights को इससे retrain नहीं किया गया।`, 'good');
    await renderLibrary();
  } catch (error) {
    setStatus('learning-status', `Feedback सहेजना विफल: ${error.message || error}`, 'bad');
  }
}

async function simpleHash(text) {
  try {
    if (crypto?.subtle) {
      const bytes = new TextEncoder().encode(String(text));
      const digest = await crypto.subtle.digest('SHA-256', bytes);
      return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
    }
  } catch { /* fallback below */ }
  let hash = 2166136261;
  for (const ch of String(text)) { hash ^= ch.codePointAt(0); hash = Math.imul(hash, 16777619); }
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function prepareFastSettings() {
  if ($('ss-ai-backend')) $('ss-ai-backend').value = 'wasm';
  if ($('ss-ai-nfe')) $('ss-ai-nfe').value = '3';
  if ($('ss-ai-speed')) {
    $('ss-ai-speed').value = '1.0';
    $('ss-ai-speed').dispatchEvent(new Event('input', { bubbles: true }));
  }
  setStatus('quick-video-status', 'त्वरित preset: WASM + NFE 3 + speed 1.0 चुना गया। कम NFE समय घटा सकता है, लेकिन गुणवत्ता/उच्चारण बदल सकते हैं।', 'warn');
}

function bindQuickVideo() {
  $('quick-video-fast')?.addEventListener('click', () => {
    prepareFastSettings();
    $('panel-ai')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => {
      const generate = $('ss-ai-generate');
      if (generate && !generate.disabled) generate.click();
      else setStatus('quick-video-status', 'AI बॉक्स में पाठ खाली है या Generate अभी उपलब्ध नहीं। पहले संग्रह में पाठ चुनें।', 'warn');
    }, 180);
  });
  $('quick-video-start')?.addEventListener('click', () => {
    const audio = $('ss-ai-audio');
    if (!audio?.src || audio.readyState < 1) {
      setStatus('quick-video-status', 'पहले AI गायन ऑडियो Generate करें; उसके बाद ही वीडियो रिकॉर्ड किया जा सकता है।', 'warn');
      $('panel-ai')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    guidedRecording = true;
    waitingForRecordingStop = false;
    const play = $('ss-ai-play-in-stage');
    if (play) play.click();
    window.setTimeout(() => {
      const record = $('record-start');
      if (record && !record.disabled) {
        record.click();
        setStatus('quick-video-status', '9:16 stage playback और रिकॉर्डिंग शुरू करने का अनुरोध भेजा गया। यदि Fullscreen/ऑडियो browser से रोके जाएँ तो स्क्रीन पर दिखे status से शुरू करें। ऑडियो समाप्त होने पर रिकॉर्डिंग रोकने का प्रयास होगा।', 'warn');
      } else {
        setStatus('quick-video-status', 'रिकॉर्डिंग उपलब्ध नहीं हुई। रिकॉर्डिंग / Export panel में स्थिति देखें।', 'warn');
        guidedRecording = false;
      }
    }, 240);
  });
  $('ss-ai-audio')?.addEventListener('ended', () => {
    if (!guidedRecording) return;
    guidedRecording = false;
    waitingForRecordingStop = true;
    window.setTimeout(() => {
      const stop = $('record-stop');
      if (stop && !stop.disabled) stop.click();
      setStatus('quick-video-status', 'ऑडियो समाप्त हुआ। वीडियो फ़ाइल बनने पर रिकॉर्डिंग / Export पैनल में “रिकॉर्डिंग डाउनलोड करें” दबाएँ और फ़ाइल सुनकर जाँचें।', 'good');
      waitingForRecordingStop = false;
    }, 300);
  });
  $('ss-ai-audio')?.addEventListener('error', () => {
    if (guidedRecording) {
      guidedRecording = false;
      setStatus('quick-video-status', 'AI audio playback विफल; रिकॉर्डिंग की गुणवत्ता सुनिश्चित नहीं।', 'bad');
    }
  });
}

function addLearningPanel() {
  if ($('panel-learning-feedback')) return;
  const panel = document.createElement('section');
  panel.className = 'panel';
  panel.id = 'panel-learning-feedback';
  panel.dataset.panel = 'learning';
  panel.innerHTML = `
    <div class="panel-head"><h2>व्यक्तिगत गायन-अध्ययन / गति का अनुकूलन</h2><p>आपके feedback को स्थानीय रूप से सहेजें और अच्छे परिणाम वाली सेटिंग अगले प्रयास के लिए याद रखें।</p></div>
    <div class="panel-body">
      <div class="enhancement-grid">
        <div class="field"><label for="learning-rating">गायन की गुणवत्ता (1–5)</label><select id="learning-rating"><option value="1">1 — अनुपयुक्त</option><option value="2">2 — सुधार चाहिए</option><option value="3" selected>3 — ठीक-ठाक</option><option value="4">4 — अच्छा</option><option value="5">5 — बहुत अच्छा</option></select></div>
        <div class="field"><label for="learning-note">क्या सुधार चाहिए?</label><input id="learning-note" type="text" maxlength="1500" placeholder="जैसे: स्वर और मधुर हो, उच्चारण ठीक करें"></div>
      </div>
      <div class="enhancement-actions"><button class="btn primary" id="learning-save" type="button">रेटिंग और सुधार-नोट सुरक्षित करें</button><button class="btn secondary" id="learning-export" type="button">Learning feedback JSON डाउनलोड करें</button><button class="btn secondary" id="quick-video-fast" type="button">⚡ त्वरित preset से AI गायन बनाएँ</button><button class="btn primary" id="quick-video-start" type="button">▶ 9:16 AI वीडियो + ऑडियो रिकॉर्ड करें</button></div>
      <div id="learning-status" class="status warn" style="margin-top:9px">Feedback अभी सहेजा नहीं गया।</div>
      <div id="quick-video-status" class="status warn" style="margin-top:9px">वीडियो जल्दी बनाने के लिए: पहले छोटा पाठ चुनें, Generate करें, फिर stage playback + record करें। बहुत लंबे स्तोत्र को छोटी पंक्तियों/पादों में चलाने से जाँच आसान हो सकती है; कुल AI समय डिवाइस और मॉडल पर निर्भर है।</div>
      <p class="hint" style="margin-top:10px"><strong>ईमानदार सीमा:</strong> ऐप उपयोग-गिनती, छन्द-अनुमान, रेटिंग और पसंदीदा गति/NFE जैसी settings याद रखता है। इससे AI के model weights स्वतः train नहीं होते। वास्तविक सीखने के लिए training data, compatible training pipeline और परीक्षण आवश्यक हैं।</p>
    </div>`;
  const workspace = document.querySelector('.workspace');
  if (workspace) workspace.append(panel);
  $('learning-save')?.addEventListener('click', saveFeedback);
  $('learning-export')?.addEventListener('click', async () => {
    try {
      const data = await getAll('feedback');
      const blob = new Blob([JSON.stringify({ schema: 'swar-sadhika-feedback/v1', exportedAt: new Date().toISOString(), feedback: data }, null, 2)], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `swar-sadhika-feedback-${new Date().toISOString().slice(0, 10)}.json`; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      setStatus('learning-status', `${data.length} feedback रिकॉर्ड का JSON तैयार हुआ। यह model training नहीं है।`, 'good');
    } catch (error) { setStatus('learning-status', `Feedback export विफल: ${error.message || error}`, 'bad'); }
  });
}

function wireLibrary() {
  $('library-analyze')?.addEventListener('click', () => {
    const text = String($('library-text')?.value || '');
    if (!text.trim()) { setStatus('library-analysis', 'पहले पाठ लिखें।', 'warn'); return; }
    try { showAnalysis(runAnalysis(text)); }
    catch (error) { setStatus('library-analysis', `विश्लेषण विफल: ${error.message || error}`, 'bad'); }
  });
  $('library-save')?.addEventListener('click', saveTextRecord);
  $('library-new')?.addEventListener('click', () => {
    currentRecord = null;
    $('library-title').value = ''; $('library-text').value = ''; $('library-note').value = ''; $('library-command').value = '';
    setStatus('library-analysis', 'नया पाठ दर्ज करें।', 'warn');
    $('library-title')?.focus();
  });
  $('library-command-search')?.addEventListener('click', () => searchCommand(true));
  $('library-command-sing')?.addEventListener('click', async () => {
    const matches = await resolveCommandRecords();
    if (!matches.length) {
      setStatus('library-status', 'नाम से कोई सहेजा पाठ नहीं मिला। पहले मूल पाठ को संग्रह में सहेजें; ऐप बिना पाठ-स्रोत के शास्त्रीय मंत्र का अनुमान नहीं करेगा।', 'warn');
      return;
    }
    fillTextFields(matches[0]);
    await loadRecordIntoAi(matches[0], { generate: true });
  });
  $('library-search')?.addEventListener('input', () => renderLibrary());
  $('library-export')?.addEventListener('click', exportLibrary);
  $('library-import')?.addEventListener('change', (event) => importLibraryFile(event.target.files?.[0]));
  $('library-persist')?.addEventListener('click', requestPersistentStorage);
  $('models-search')?.addEventListener('click', searchModelHub);
  $('models-query')?.addEventListener('keydown', (event) => { if (event.key === 'Enter') { event.preventDefault(); searchModelHub(); } });
  $('models-cache-official')?.addEventListener('click', cacheOfficialModels);
  $('models-refresh-status')?.addEventListener('click', refreshModelCacheStatus);
  $('ss-ai-backend')?.addEventListener('change', refreshModelCacheStatus);
  $('library-command')?.addEventListener('keydown', (event) => { if (event.key === 'Enter') { event.preventDefault(); searchCommand(true); } });
}

function setUpNavigationAndPwa() {
  const library = document.querySelector('[data-open="library"]');
  if (library) library.setAttribute('aria-label', 'स्थानीय संस्कृत संग्रह खोलें');
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || ['localhost', '127.0.0.1'].includes(location.hostname))) {
    navigator.serviceWorker.register('./service-worker.js', { scope: './' }).catch((error) => console.warn('[Swar-Sadhika] service worker registration:', error));
  }
}

async function bootEnhancements() {
  addLearningPanel();
  renderCuratedModels();
  renderModelFileLinks();
  wireLibrary();
  bindQuickVideo();
  setUpNavigationAndPwa();
  try {
    const suite = runTextModuleSelfTests();
    setStatus('library-analysis', `Sanskrit text utility smoke tests: ${suite.passed}/${suite.passed + suite.failed} PASS. ये केवल पाठ-विश्लेषण परीक्षण हैं, गायन/inference नहीं।`, suite.ok ? 'good' : 'warn');
  } catch (error) {
    console.warn('[Swar-Sadhika] text self-tests:', error);
  }
  try {
    await openDb();
    await renderLibrary();
    await updateStorageStatus();
    setStatus('library-status', 'स्थानीय संस्कृत-संग्रह तैयार। अभी सहेजे हुए पाठ खोजें या नया पाठ जोड़ें।', 'good');
  } catch (error) {
    setStatus('library-status', `स्थानीय संग्रह आरम्भ नहीं हुआ: ${error.message || error}`, 'bad');
  }
  await refreshModelCacheStatus();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => bootEnhancements().catch(error => console.error('[Swar-Sadhika] enhancements boot failed:', error)), { once: true });
} else {
  bootEnhancements().catch(error => console.error('[Swar-Sadhika] enhancements boot failed:', error));
}
