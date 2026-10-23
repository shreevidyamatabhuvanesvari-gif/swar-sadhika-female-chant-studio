/**
 * Swar-Sadhika Sanskrit Brain — Part 2 registry integration.
 *
 * Adds a source-preserving Sanskrit-analysis and knowledge-index panel.
 * This is a linguistic-analysis layer, not model training or voice synthesis.
 * The original text is never rewritten, and this optional module never blocks
 * the core app from loading if it fails.
 */
import {
  SWAR_SADHIKA_BRAIN_SCHEMA,
  analyzeSanskritForBrain,
  loadKnowledgeIndex,
  searchKnowledgeIndex
} from './swar-sadhika-brain.js';

const GLOBAL_NAME = 'SwarSadhikaBrainPart2';
const PANEL_ID = 'ss-brain-part2-panel';
const MAX_KNOWLEDGE_QUERY_LENGTH = 12_000;
const MAX_SHOWN_PADAS = 40;
const MAX_SHOWN_VEDIC_MARKS = 30;

let lastAnalysis = null;
let knowledgeIndexPromise = null;

function summarizeAnalysis(report) {
  const data = report?.textAnalysis || {};
  const inventory = data.characterInventory || {};
  const vedic = data.vedicMarks || {};
  const padas = Array.isArray(data.padas) ? data.padas : [];
  const marks = Array.isArray(vedic.marks) ? vedic.marks : [];

  return {
    schema: report?.schema || SWAR_SADHIKA_BRAIN_SCHEMA,
    sourceTextPreserved: report?.sourceTextPreserved === true,
    sourceCharacterCount: Array.from(String(report?.sourceText ?? '')).length,
    validation: data.validation || null,
    tokenCount: Array.isArray(data.tokens) ? data.tokens.length : 0,
    padaCount: padas.length,
    padas: padas.slice(0, MAX_SHOWN_PADAS).map((pada) => ({
      index: Number(pada.index) + 1,
      text: String(pada.text ?? ''),
      estimatedSyllableCount: pada.estimatedSyllableCount ?? null,
      method: pada.method ?? null,
      confidence: pada.confidence ?? null
    })),
    omittedPadas: Math.max(0, padas.length - MAX_SHOWN_PADAS),
    estimatedSyllableCount: data.estimatedSyllableCount ?? null,
    meter: data.meter || null,
    characterInventory: {
      characterCount: inventory.characterCount ?? null,
      uniqueCharacterCount: inventory.uniqueCharacterCount ?? null,
      devanagariUniqueCharacterCount: Array.isArray(inventory.devanagariCharacters)
        ? inventory.devanagariCharacters.length : null,
      vedicCandidateCount: Array.isArray(inventory.vedicCandidates)
        ? inventory.vedicCandidates.length : null
    },
    vedicMarks: {
      hasVedicMarks: Boolean(vedic.hasVedicMarks),
      count: Number(vedic.count || 0),
      uniqueCount: Number(vedic.uniqueCount || 0),
      marks: marks.slice(0, MAX_SHOWN_VEDIC_MARKS).map((mark) => ({
        character: mark.character,
        codePoint: mark.codePoint,
        label: mark.label
      })),
      omittedMarks: Math.max(0, marks.length - MAX_SHOWN_VEDIC_MARKS)
    },
    warnings: Array.isArray(data.warnings) ? data.warnings : [],
    limitations: Array.isArray(report?.limitations) ? report.limitations : []
  };
}

function selectedText(sourceSelect) {
  const mode = sourceSelect?.value === 'studio' ? 'studio' : 'ai';
  const chosenId = mode === 'studio' ? 'text-input' : 'ss-ai-text';
  const fallbackId = mode === 'studio' ? 'ss-ai-text' : 'text-input';
  const chosen = document.getElementById(chosenId);
  const fallback = document.getElementById(fallbackId);
  const element = chosen || fallback;
  return {
    text: String(element?.value ?? ''),
    source: chosen ? (mode === 'studio' ? 'मुख्य Studio पाठ' : 'AI परीक्षण पाठ')
                   : (fallback ? 'वैकल्पिक पाठ बॉक्स' : 'कोई पाठ बॉक्स नहीं')
  };
}

function setStatus(node, message, kind = 'warn') {
  if (!node) return;
  node.textContent = String(message);
  node.classList.remove('good', 'warn', 'bad');
  node.classList.add(kind);
}

async function getKnowledgeIndex() {
  if (!knowledgeIndexPromise) {
    knowledgeIndexPromise = loadKnowledgeIndex().catch((error) => {
      knowledgeIndexPromise = null;
      throw error;
    });
  }
  return knowledgeIndexPromise;
}

export function analyzeText(input, options = {}) {
  const report = analyzeSanskritForBrain(input, options);
  lastAnalysis = report;
  return report;
}

export async function searchText(input, limit = 12) {
  const index = await getKnowledgeIndex();
  return searchKnowledgeIndex(index, input, limit);
}

export function getLastAnalysisSummary() {
  return lastAnalysis ? summarizeAnalysis(lastAnalysis) : null;
}

export async function registerSwarSadhikaModule(api) {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    throw new Error('Sanskrit Brain UI केवल browser में सक्रिय हो सकता है।');
  }
  if (document.getElementById(PANEL_ID)) {
    throw new Error(`पहले से मौजूद ${PANEL_ID} को चुपचाप reuse नहीं किया गया; संभावित duplicate activation की जाँच करें।`);
  }

  const host = document.querySelector('#panel-ai .panel-body');
  if (!host) throw new Error('#panel-ai .panel-body नहीं मिला; AI परीक्षण पैनल उपलब्ध नहीं है।');

  const controller = new AbortController();
  const panel = document.createElement('section');
  panel.id = PANEL_ID;
  panel.className = 'panel';
  panel.style.marginTop = '14px';
  panel.innerHTML = `
    <div class="panel-head">
      <h2>संस्कृत Brain — पाठ का भाषिक विश्लेषण</h2>
      <p>यह Part 2 मॉड्यूल मूल पाठ को बदले बिना अक्षर, पद-विभाजन, छन्द-संकेत और स्थानीय ज्ञान-सूचकांक के संदर्भ दिखाता है।</p>
    </div>
    <div class="panel-body">
      <div class="field">
        <label for="ss-brain-source">विश्लेषण के लिए पाठ कहाँ से लें?</label>
        <select id="ss-brain-source">
          <option value="ai">AI परीक्षण बॉक्स</option>
          <option value="studio">मुख्य Studio पाठ</option>
        </select>
        <p class="hint">यह चयन केवल पढ़ने का स्रोत चुनता है; किसी बॉक्स का पाठ दूसरे में नहीं लिखा जाएगा।</p>
      </div>
      <div class="btn-row">
        <button class="btn primary" id="ss-brain-analyze" type="button">पाठ का विश्लेषण करें</button>
        <button class="btn secondary" id="ss-brain-search" type="button">स्थानीय ज्ञान-सूचकांक में खोजें</button>
      </div>
      <div class="btn-row" style="margin-top:8px">
        <button class="btn secondary" id="ss-brain-apply-meter" type="button" hidden>अनुमानित छन्द को AI परीक्षण में चुनें</button>
        <button class="btn primary" id="ss-brain-generate-chant" type="button">चुने गए पाठ से AI Chant बनाएँ</button>
      </div>
      <p class="hint">यह स्पष्ट कार्रवाई चुने गए स्रोत का मूल पाठ AI परीक्षण बॉक्स में कॉपी करके मौजूदा Vāgdhenu AI जनरेशन शुरू करती है। अनुमानित छन्द अपने-आप लागू नहीं होता। ऑडियो बनने के बाद 9:16 स्क्रीन पर गायन चलाने से मौजूदा ध्वनि-स्तर आधारित अवतार-सिंक चलेगा; यह phoneme-सटीक नहीं है।</p>
      <div id="ss-brain-status" class="status warn" role="status" aria-live="polite" style="margin-top:10px">
        Sanskrit Brain उपलब्ध है। विश्लेषण या संदर्भ-खोज स्वयं शुरू करें।
      </div>
      <details open style="margin-top:10px">
        <summary>विश्लेषण / खोज रिपोर्ट</summary>
        <pre id="ss-brain-report" style="white-space:pre-wrap;overflow-wrap:anywhere;max-height:420px;overflow:auto"></pre>
      </details>
      <p class="hint" style="margin-top:10px">
        महत्त्वपूर्ण: छन्द और अक्षर-गणना heuristic संकेत हैं, वैदिक पाठ की शुद्धता का प्रमाण नहीं।
        यह मॉड्यूल स्वयं AI मॉडल को प्रशिक्षित नहीं करता। AI जनरेशन मौजूदा ऐप इंजन को सौंपा जाता है; सफल inference, सुनाई देने वाला ऑडियो और स्त्री-सदृश स्वर अलग से सत्यापित होने चाहिए।
      </p>
    </div>
  `;
  host.appendChild(panel);

  const statusNode = panel.querySelector('#ss-brain-status');
  const reportNode = panel.querySelector('#ss-brain-report');
  const sourceSelect = panel.querySelector('#ss-brain-source');
  const analyzeButton = panel.querySelector('#ss-brain-analyze');
  const searchButton = panel.querySelector('#ss-brain-search');
  const applyMeterButton = panel.querySelector('#ss-brain-apply-meter');
  const generateChantButton = panel.querySelector('#ss-brain-generate-chant');

  const findMeterSuggestion = (meter) => {
    const name = String(meter?.name ?? '');
    if (/अनुष्टुप्/u.test(name)) return 'anushtubh';
    if (/त्रिष्टुप्/u.test(name)) return 'trishtubh';
    if (/जगती/u.test(name)) return 'jagati';
    return null;
  };

  const analyzeFromUI = () => {
    const selected = selectedText(sourceSelect);
    if (!selected.text.trim()) {
      setStatus(statusNode, `पहले पाठ लिखें। चुना गया स्रोत: ${selected.source}।`, 'bad');
      return;
    }
    try {
      const meter = document.getElementById('ss-ai-meter')?.value || 'auto';
      const report = analyzeText(selected.text, { meter });
      const suggestedMeter = findMeterSuggestion(report?.textAnalysis?.meter);
      if (suggestedMeter) {
        applyMeterButton.dataset.meter = suggestedMeter;
        applyMeterButton.hidden = false;
      } else {
        delete applyMeterButton.dataset.meter;
        applyMeterButton.hidden = true;
      }
      reportNode.textContent = JSON.stringify({
        source: selected.source,
        suggestedInferenceMeter: suggestedMeter,
        report: summarizeAnalysis(report)
      }, null, 2);
      setStatus(statusNode,
        `भाषिक विश्लेषण पूरा। स्रोत: ${selected.source}; मूल पाठ परिवर्तित नहीं किया गया। छन्द-संकेत अनुमानात्मक हैं।`,
        'good');
      api.emitStatus('Sanskrit Brain ने पाठ का भाषिक विश्लेषण तैयार किया।', 'good');
    } catch (error) {
      setStatus(statusNode, `विश्लेषण विफल: ${error?.message || error}`, 'bad');
      reportNode.textContent = '';
      api.emitStatus(`Sanskrit Brain विश्लेषण विफल: ${error?.message || error}`, 'warn');
    }
  };

  const searchFromUI = async () => {
    const selected = selectedText(sourceSelect);
    if (!selected.text.trim()) {
      setStatus(statusNode, `पहले पाठ लिखें। चुना गया स्रोत: ${selected.source}।`, 'bad');
      return;
    }
    if (selected.text.length > MAX_KNOWLEDGE_QUERY_LENGTH) {
      setStatus(statusNode,
        `संदर्भ-खोज के लिए पाठ ${MAX_KNOWLEDGE_QUERY_LENGTH.toLocaleString('en-IN')} अक्षर से छोटा रखें। बड़े पाठ का भाषिक विश्लेषण अलग से कर सकते हैं।`,
        'warn');
      return;
    }
    searchButton.disabled = true;
    const oldLabel = searchButton.textContent;
    searchButton.textContent = 'ज्ञान-सूचकांक लोड हो रहा है…';
    setStatus(statusNode, 'स्थानीय sanskrit-knowledge-index.json पढ़ा जा रहा है। पहली खोज में थोड़ी देर लग सकती है।', 'warn');
    try {
      const index = await getKnowledgeIndex();
      const matches = searchKnowledgeIndex(index, selected.text, 12);
      const safeMatches = matches.map((item) => ({
        source_path: String(item.source_path ?? ''),
        locator: String(item.locator ?? ''),
        text: String(item.text ?? '').slice(0, 900),
        tokens: Array.isArray(item.tokens) ? item.tokens.slice(0, 24) : [],
        authority: String(item.authority ?? 'SOURCE_REFERENCE_NOT_PRONUNCIATION_VERIFIED')
      }));
      reportNode.textContent = JSON.stringify({
        source: selected.source,
        queryCharacterCount: Array.from(selected.text).length,
        knowledgeIndex: {
          schema: index.schema,
          sourceCount: Number(index.file_count ?? index.files?.length ?? 0),
          segmentCount: Number(index.segment_count ?? index.segments?.length ?? 0)
        },
        matchCount: safeMatches.length,
        matches: safeMatches,
        note: 'ये स्रोत-संदर्भ हैं; मिलान न मिलना पाठ के किसी ग्रंथ में न होने का प्रमाण नहीं, और मिलान शुद्ध पाठ/उच्चारण का प्रमाण नहीं।'
      }, null, 2);
      setStatus(statusNode,
        matches.length
          ? `${matches.length} संदर्भ मिले। कृपया स्रोत और पाठ स्वयं सत्यापित करें।`
          : 'कोई संदर्भ-मिलान नहीं मिला; इसका अर्थ यह नहीं कि पाठ स्रोतों में अनुपस्थित है।',
        matches.length ? 'good' : 'warn');
      api.emitStatus(`Sanskrit Brain ज्ञान-सूचकांक खोज पूरी; ${matches.length} परिणाम।`, 'good');
    } catch (error) {
      setStatus(statusNode, `ज्ञान-सूचकांक खोज विफल: ${error?.message || error}`, 'bad');
      reportNode.textContent = '';
      api.emitStatus(`Sanskrit Brain संदर्भ-खोज विफल: ${error?.message || error}`, 'warn');
    } finally {
      searchButton.disabled = false;
      searchButton.textContent = oldLabel;
    }
  };

  const generateChantFromSelection = () => {
    const selected = selectedText(sourceSelect);
    if (!selected.text.trim()) {
      setStatus(statusNode, `पहले पाठ लिखें। चुना गया स्रोत: ${selected.source}।`, 'bad');
      return;
    }

    const target = document.getElementById('ss-ai-text');
    const generateButton = document.getElementById('ss-ai-generate');
    if (!target || !generateButton) {
      setStatus(statusNode,
        'मौजूदा AI जनरेशन नियंत्रण उपलब्ध नहीं है। #ss-ai-text और #ss-ai-generate की वास्तविक index.html/app.js integration जाँचें।',
        'bad');
      return;
    }

    try {
      const meter = document.getElementById('ss-ai-meter')?.value || 'auto';
      const report = analyzeText(selected.text, { meter });
      if (report?.sourceTextPreserved !== true || report?.sourceText !== selected.text) {
        throw new Error('मूल पाठ संरक्षण जाँच विफल हुई; AI जनरेशन शुरू नहीं किया गया।');
      }

      // Copy only after the user explicitly asks for AI chant generation.
      // Preserve the selected source verbatim; do not auto-correct or apply an
      // estimated meter. The existing app owns inference and failure reporting.
      target.value = selected.text;
      target.dispatchEvent(new Event('input', { bubbles: true }));
      target.dispatchEvent(new Event('change', { bubbles: true }));

      if (generateButton.disabled) {
        setStatus(statusNode,
          'पाठ AI परीक्षण बॉक्स में कॉपी किया गया, लेकिन AI Generate नियंत्रण अभी disabled है। यदि जनरेशन पहले से चल रही है तो उसके पूरा होने की प्रतीक्षा करें; अन्यथा app.js की स्थिति जाँचें।',
          'warn');
        reportNode.textContent = JSON.stringify({
          source: selected.source,
          sourceTextPreserved: true,
          generationStarted: false,
          note: 'AI Generate नियंत्रण disabled था; कोई जनरेशन शुरू नहीं की गई।',
          report: summarizeAnalysis(report)
        }, null, 2);
        return;
      }

      reportNode.textContent = JSON.stringify({
        source: selected.source,
        sourceTextPreserved: true,
        generationRequested: true,
        selectedMeter: meter,
        estimatedMeterNotAutoApplied: true,
        report: summarizeAnalysis(report)
      }, null, 2);
      generateButton.click();
      setStatus(statusNode,
        'भाषिक विश्लेषण पूरा हुआ और मौजूदा Vāgdhenu AI जनरेशन अनुरोध शुरू किया गया। वास्तविक सफलता, त्रुटि और ऑडियो अवधि नीचे AI स्थिति/प्लेयर में जाँचें; यह स्त्री-स्वर या उच्चारण-शुद्धता का प्रमाण नहीं है।',
        'warn');
      api.emitStatus('Sanskrit Brain ने मूल पाठ संरक्षित रखते हुए मौजूदा AI chant generation शुरू की।', 'info');
    } catch (error) {
      setStatus(statusNode, `AI chant शुरू नहीं हुआ: ${error?.message || error}`, 'bad');
      reportNode.textContent = '';
      api.emitStatus(`Sanskrit Brain → AI chant integration विफल: ${error?.message || error}`, 'warn');
    }
  };

  analyzeButton.addEventListener('click', analyzeFromUI, { signal: controller.signal });
  searchButton.addEventListener('click', searchFromUI, { signal: controller.signal });
  generateChantButton.addEventListener('click', generateChantFromSelection, { signal: controller.signal });
  applyMeterButton.addEventListener('click', () => {
    const suggested = String(applyMeterButton.dataset.meter || '');
    const meterControl = document.getElementById('ss-ai-meter');
    const supported = meterControl &&
      Array.from(meterControl.options || []).some((option) => option.value === suggested);
    if (!supported) {
      setStatus(statusNode, 'AI परीक्षण में यह छन्द-विकल्प उपलब्ध नहीं है; कोई विकल्प नहीं बदला गया।', 'warn');
      return;
    }
    meterControl.value = suggested;
    meterControl.dispatchEvent(new Event('change', { bubbles: true }));
    setStatus(statusNode,
      `AI परीक्षण का छन्द विकल्प “${meterControl.selectedOptions?.[0]?.textContent || suggested}” चुना गया। यह केवल निम्न-confidence अनुमान है; शास्त्रीय छन्द-प्रमाण नहीं। अगली AI generation में यह विकल्प प्रयुक्त होगा।`,
      'warn');
  }, { signal: controller.signal });

  const previousGlobal = Object.getOwnPropertyDescriptor(window, GLOBAL_NAME);
  if (previousGlobal && previousGlobal.configurable === false) {
    controller.abort();
    panel.remove();
    throw new Error(`${GLOBAL_NAME} पहले से non-configurable global के रूप में मौजूद है; उसे overwrite नहीं किया गया।`);
  }
  const publicApi = Object.freeze({
    schema: SWAR_SADHIKA_BRAIN_SCHEMA,
    analyzeText,
    searchText,
    getLastAnalysisSummary
  });
  Object.defineProperty(window, GLOBAL_NAME, {
    value: publicApi,
    enumerable: false,
    configurable: true,
    writable: false
  });

  api.registerCleanup(() => {
    controller.abort();
    panel.remove();
    if (previousGlobal) Object.defineProperty(window, GLOBAL_NAME, previousGlobal);
    else delete window[GLOBAL_NAME];
    lastAnalysis = null;
    knowledgeIndexPromise = null;
  });

  api.emitStatus('Sanskrit Brain Part 2 सक्रिय: भाषिक विश्लेषण और स्थानीय स्रोत-संदर्भ उपलब्ध।', 'good');
  return Object.freeze({
    available: true,
    schema: SWAR_SADHIKA_BRAIN_SCHEMA,
    feature: 'source-preserving-linguistic-analysis-and-local-knowledge-search',
    modifiesOriginalText: false,
    generatesAudioDirectly: false,
    startsExistingSynthesisWorkflow: true,
    synthesisIntegration: true,
    avatarSync: 'existing-audio-level-estimate; not-phoneme-accurate'
  });
}
