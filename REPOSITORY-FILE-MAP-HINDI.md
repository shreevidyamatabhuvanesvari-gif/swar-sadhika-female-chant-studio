# फ़ाइल-मैप — Swar-Sadhika Female Chant Studio

यह ZIP की top-level repository root सूची है। GitHub पर फ़ाइलें अपलोड करते समय `index.html` और नीचे दिए फ़ोल्डर उसी root पर रखें; अतिरिक्त parent folder न बनाएँ।

## मुख्य फ़ाइलें और उनका काम

- `index.html` — एक-पेज इंटरफ़ेस, 9:16 स्टेज, टेक्स्ट overlay, media/record controls और navigation।
- `app.js` — AI UI/inference controls, stage-audio sync एवं recording track bridge।
- `index.js` — वर्तमान AI backend/engine adapter entry point।
- `studio-enhancements.js` — IndexedDB library, title lookup, model search/cache UI, backup/import/export और guided video flow।
- `model-cache.js` — आधिकारिक Vāgdhenu model download तथा integrity/cache verification।
- `vagdhenu-onnx.js`, `vagdhenu-text.js`, `pronunciation-learning.js` — engine adapter, Sanskrit text utilities और स्थानीय pronunciation tools।
- `service-worker.js` — app shell/runtime cache routing; storage/inference correctness का स्वयं प्रमाण नहीं।
- `baked_bank.json`, `sanskrit-knowledge-index.json` — checked-in reference data/indexes। भारी ONNX model assets ZIP में embedded नहीं; app official source से डाउनलोड करता है।
- `manifest.webmanifest`, `icon.svg`, `.nojekyll` — PWA/Pages shell support।
- `.github/workflows/pages.yml` — `main` push पर smoke tests और GitHub Pages deployment workflow।
- `scripts/test-project.mjs`, `scripts/test-rudrashtakam-input.mjs` — structure/text-split regression tests।
- `DEPLOY-GITHUB-PAGES-HINDI.md` — नया repo बनाने और live करने के निर्देश।
- `docs/THIRD-PARTY-AND-MODEL-NOTES.md`, `LICENSE` — third-party/redistribution चेतावनी; public deployment से पहले पढ़ें।
- `PROJECT-STATUS-AND-VALIDATION.md` — कौन-से checks पास हैं और क्या अभी वास्तविक डिवाइस पर सत्यापित नहीं है।

## ZIP में शामिल सभी फ़ाइलों के पथ

- `.github/workflows/pages.yml`
- `.gitignore`
- `.nojekyll`
- `AI-ENGINE-IMPLEMENTATION-STATUS.md`
- `BAKED-BANK-INTEGRATION-STATUS.md`
- `BAKED-BANK-LOCAL-INTEGRATION-NOTES.md`
- `BAKED-BANK-ROOT-CAUSE-FIX.md`
- `BANK-VOCABULARY-ROOT-CAUSE-AND-FIX-REPORT.md`
- `DEPLOY-GITHUB-PAGES-HINDI.md`
- `LICENSE`
- `MODEL-DOWNLOAD-VOCABULARY-FIX-NOTES.md`
- `MODIFICATION-REPORT.md`
- `NEXT-STEPS-HINDI.md`
- `PROJECT-STATUS-AND-VALIDATION.md`
- `PRONUNCIATION-LEARNING-AUDIT.md`
- `README.md`
- `REPOSITORY-FILE-MAP-HINDI.md`
- `SWAR_SADHIKA_CENTRAL_MISSION_CONTROL.md`
- `app.js`
- `baked_bank.json`
- `docs/THIRD-PARTY-AND-MODEL-NOTES.md`
- `icon.svg`
- `index.html`
- `index.js`
- `manifest.webmanifest`
- `model-audit.html`
- `model-cache.js`
- `module-audit-runtime.html`
- `neural-studio.html`
- `package.json`
- `pronunciation-learning.js`
- `sanskrit-knowledge-index.json`
- `scripts/test-project.mjs`
- `scripts/test-rudrashtakam-input.mjs`
- `service-worker.js`
- `singing-engine-prototype.html`
- `soulx-mobile-audit.html`
- `studio-enhancements.js`
- `swar-sadhika-brain.js`
- `vagdhenu-inference-audit-cdn.html`
- `vagdhenu-inference-audit.html`
- `vagdhenu-onnx.js`
- `vagdhenu-runtime-audit.html`
- `vagdhenu-source-audit.html`
- `vagdhenu-text.js`
- `vendor/vagdhenu-upstream/vagdhenu-onnx.js`

## महत्वपूर्ण सीमाएँ

- ऐप में अभी प्रमाणित स्त्री-स्वर मॉडल शामिल नहीं है; Vāgdhenu के सार्वजनिक मॉडल विवरण में महिला-स्वर mode documented नहीं है।
- IndexedDB उसी browser/origin में रहता है; JSON backup रखें।
- मौजूदा engine source की public redistribution permission स्वतंत्र रूप से सत्यापित करना अभी बाकी है। README/report का licensing note पढ़ें।
- ZIP सफल inference, female voice, सही संस्कृत उच्चारण, सटीक lip-sync या Android playback को प्रमाणित नहीं करता।
