# swar-sadhika-female-chant-studio
# स्वर-साधिका — Female Chant Studio

यह **अलग repository** बनाने के लिए तैयार किया गया browser-first प्रोजेक्ट है। सुझाया गया repository name:

`swar-sadhika-female-chant-studio`

ऊपर के नाम में अतिरिक्त spaces न रखें; वास्तविक सही नाम **`swar-sadhika-female-chant-studio`** है।

## मुख्य फ़ीचर

- मौजूदा 9:16 stage, फोटो/वीडियो preview, ऊपर/मध्य/नीचे text placement, fullscreen और browser voice controls सुरक्षित रखे गए हैं।
- वास्तविक AI model परीक्षण `AI गायन` पैनल में है; समर्थित Vāgdhenu ONNX/WASM model assets की आधिकारिक Hugging Face repository से integrity-checked download/cache सुविधा शामिल है।
- नया `संस्कृत-संग्रह` panel: नाम और मूल पाठ IndexedDB में save/update, title से search, AI बॉक्स में load, usage counter, text/prosody heuristic, JSON export/import.
- नया `मॉडल खोज / डाउनलोड` panel: Hugging Face Model Hub की खोज, curated official source links, Vāgdhenu asset download/cache action.
- स्थानीय feedback/ratings तथा सफल परिणाम पर चुने गए backend/NFE/speed की व्यक्तिगत पसंद अगले प्रयास के लिए याद रखी जा सकती है। यह model weights को retrain नहीं करता।
- त्वरित video workflow: कम NFE preset, AI output playback और Canvas+AI audio recording का प्रयास। डाउनलोड की हुई फ़ाइल को सुनकर जाँचना आवश्यक है।
- root-level GitHub Pages workflow और PWA manifest शामिल हैं।

## तैनाती

1. ZIP को extract करें। `index.html` सीधे extracted root में है; `swar-sadhika-female-chant-studio/` जैसा अतिरिक्त parent folder GitHub की repository root के रूप में अपलोड **न** करें।
2. GitHub पर **नया public repository** बनाएँ: `swar-sadhika-female-chant-studio`.
3. ZIP के root की सभी फ़ाइलें/फ़ोल्डर उस नए repository की root में upload करें और `main` branch पर commit करें।
4. Actions टैब में `Deploy Swar-Sadhika Female Chant Studio to GitHub Pages` workflow सफल होने की जाँच करें।
5. Settings → Pages में deployment environment दिखाई देना चाहिए। अपेक्षित URL:
   `https://shreevidyamatabhuvanesvari-gif.github.io/swar-sadhika-female-chant-studio/`
6. पहली deployment के लिए कुछ मिनट दें; workflow सफल हुए बिना live होने का दावा न करें। विस्तृत निर्देश `DEPLOY-GITHUB-PAGES-HINDI.md` में हैं।

## क्या पुराने repositories पर प्रभाव पड़ेगा?

यह ZIP स्वयं किसी GitHub repository में push नहीं करता और किसी पुराने repository को बदलता नहीं है। जब इसे ऊपर दिए नए नाम से अलग repository में upload करेंगे, तो पुराने `swar-sadhika-test` और `anujadha` repositories अपरिवर्तित रहेंगे—बशर्ते आप इस पैकेज को उन repositories में upload/push न करें। GitHub Pages की अलग project URL और browser storage origin होगी।

## मॉडल और आवाज़ — ज़रूरी सच्चाई

- Vāgdhenu मॉडल स्रोत संस्कृत chant निर्माण के लिए है, लेकिन उसके सार्वजनिक विवरण से मधुर महिला/लड़की-स्वर की पुष्टि नहीं होती। इस पैकेज में स्त्री-स्वर की गारंटी नहीं दी गई है।
- अपेक्षित 5 artifacts: `vagdhenu_cond_q8.onnx`, `vagdhenu_dit_step_q8.onnx`, `vagdhenu_vocos_q8.onnx`, `baked_bank.bin`, `baked_bank.json`. भारी मॉडल weights GitHub Pages repository में embed नहीं किए गए; app का model manager आधिकारिक source से download/cache करता है।
- ONNX model assets कुल लगभग 270–280 MB के आसपास हो सकते हैं। मोबाइल में पर्याप्त storage, स्थिर internet, browser cache quota और model runtime support चाहिए। Cache status सफल audio/inference का प्रमाण नहीं है।
- Hub search arbitrary models को Vāgdhenu runtime में स्वतः integrate नहीं करता। अलग architecture के लिए अलग loader/adapter, runtime, license और test चाहिए।
- `संस्कृत-संग्रह` का डेटा वर्तमान browser origin के IndexedDB में होता है। Browser data clear हो सकता है; इसलिए JSON backup डाउनलोड करके रखें। दूसरे repository/origin पर move करने के लिए backup import करें।
- text/prosody identification heuristic है; किसी अज्ञात मंत्र/स्तोत्र का text नाम से इंटरनेट से स्वतः नहीं गढ़ा जाता। केवल library में saved text को title/command से retrieve किया जा सकता है।
- Mouth animation amplitude/RMS आधारित approximate animation है, phoneme-accurate lip-sync नहीं। Uploaded existing video में original person's lips को retime/modify नहीं किया जाता।
- GitHub Pages static hosting देता है। Model inference client device/browser में चलाने का design है; कोई hidden server/API key नहीं जोड़ी गई।

## Test

Node.js 18+ सुझाया जाता है:

```bash
npm test
```

यह parser regression और संरचनात्मक smoke tests चलाता है। यह Android के वास्तविक model inference, महिला-स्वर, audio/video playback या accurate lip-sync का विकल्प नहीं है।

## तृतीय-पक्ष अधिकार

मॉडल कार्ड/फाइल की license और स्रोत-संबंधी terms उसी आधिकारिक revision पर अलग से सत्यापित करें। इस repository का `LICENSE` notice upstream code या सभी third-party resources के अधिकार नहीं देता। Public publishing से पहले `docs/THIRD-PARTY-AND-MODEL-NOTES.md` पढ़ें।
