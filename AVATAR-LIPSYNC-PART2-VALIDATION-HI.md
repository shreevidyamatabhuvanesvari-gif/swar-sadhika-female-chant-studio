# स्वर-साधिका — Avatar Lip-Sync Part 2 सत्यापन रिपोर्ट

## इस संशोधन में किए गए बदलाव

1. `index.html` में डिफ़ॉल्ट फोटो-अवतार के लिए `./swar-sadhika-avatar-photo.jpg` स्थानीय asset लगाया गया। नई Part 2 के लिए कोई नया `<script>` संदर्भ नहीं जोड़ा गया; मौजूदा `swar-sadhika-app-bootstrap-part2.js` ही Module Loader का प्रवेश-बिंदु है।
2. उपयोगकर्ता द्वारा भेजे गए स्क्रीनशॉट में दिख रहे मीडिया-चित्र का केवल बाहरी मीडिया क्षेत्र crop करके फोटो asset बनाया गया। चेहरे को AI से पुनः उत्पन्न, retouch, reshape या बदलने की प्रक्रिया नहीं की गई। 9:16 `object-fit: cover` प्रदर्शन में दाहिने किनारे का खिलाड़ी-स्पीकर चिह्न दृश्य crop से बाहर रहता है।
3. `lipsync-engine.js` के SVG मुख-स्थान/आकार को चुनी गई नई फोटो में चेहरे के स्थान के अनुरूप बदला गया। वास्तविक फोटो के पिक्सेल रनटाइम पर संपादित नहीं होते; गति SVG overlay द्वारा दिखाई जाती है।
4. `swar-sadhika-avatar-lipsync-part2.js` को IIFE-only script से मौजूदा Module Loader के समर्थित `registerSwarSadhikaModule(api)` interface में बदला गया। यह Registry से लोड होता है और सामान्य Browser TTS के `start`, वैकल्पिक `boundary`, `pause`, `resume`, `end`, `error` तथा `cancel` lifecycle को देखता है। ऐप के मौजूदा `utterance.onstart`, `onend` और `onerror` handlers को overwrite नहीं करता।
5. `swar-sadhika-module-registry-part2.json` में `avatar-lipsync` मॉड्यूल जोड़ा गया; मौजूदा `sanskrit-brain-ui` entry सुरक्षित रखी गई। Avatar module `required:false` है, ताकि इस add-on की विफलता core app startup को न रोके।
6. `service-worker.js` में अनुपस्थित पुराने `swar-sadhika-user-photo.jpg` cache path को हटाकर नई फोटो लगाई गई, shell cache version `v10` से `v11` किया गया और loader/registry/Avatar module की आवश्यक स्थानीय फ़ाइलें cache सूची में जोड़ी गईं।
7. `package.json`, `.github/workflows/pages.yml` और `test-lipsync-integration-part2.mjs` अपडेट किए गए। पुराने `test-lipsync-integration.mjs` और मूल audio-analysis path को नहीं बदला गया।

## चलाए गए परीक्षण

- `node --check` — परियोजना की सभी `.js` फ़ाइलों के लिए PASS।
- `npm test` — PASS; 20 आवश्यक फ़ाइलें, 2 JSON फ़ाइलें parse, text utility 15/15 PASS, structural checks PASS।
- `npm run test:avatar-lipsync-part2` — PASS। यह वास्तविक Module Loader को एक isolated test Registry के साथ चलाकर Avatar module activation, मौजूदा SVG renderer bridge, TTS lifecycle और पुराने event handlers के सुरक्षित रहने की पुष्टि करता है।
- `node scripts/test-rudrashtakam-input.mjs` — PASS।
- Service Worker shell list — प्रत्येक घोषित स्थानीय path मौजूद है; duplicate path नहीं मिला।
- `index.html` — Avatar Part 2 के लिए कोई अलग `<script>` tag नहीं है; मौजूदा bootstrap reference एक ही है।

## सीमाएँ जिन्हें ईमानदारी से स्पष्ट रखना आवश्यक है

- इस परीक्षण में SpeechSynthesis lifecycle simulated है; यह वास्तविक मोबाइल voice playback का परीक्षण नहीं है।
- Android डिवाइस पर GitHub Pages deployment के बाद वास्तविक Sanskrit पाठ चलाकर मुँह की गति, Pause/Resume/Stop और recording/export का अलग manual test अभी शेष है।
- मुख-गति पाठ/समय और उपलब्ध boundary events पर आधारित अनुमान है; यह ध्वनि से phoneme-सटीक lip-sync या AI voice training नहीं है।
- GitHub Pages पर संशोधन तब तक प्रकाशित नहीं होगा जब तक बदली हुई फ़ाइलें repository की `main` branch पर commit/push न की जाएँ और Actions deployment सफल न हो।
