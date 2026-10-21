# Swar-Sadhika — index.html और Sanskrit Brain Part 2 audit

## स्रोत
- जाँची गई उपयोगकर्ता-प्रदत्त फ़ाइल: `index (4).html`
- मूल आकार: 732,697 bytes, 647 lines.
- संशोधित `index.html`: 732,653 bytes, 646 lines.

## मिली बातें
1. `lipsync-engine.js` का script tag दो बार था। अतिरिक्त अंतिम tag हटाया गया; पहले वाला tag रखा गया।
2. `index.html` में `app.js` का सीधा script tag नहीं है। Bootstrap `swar-sadhika-app-bootstrap-part2.js` से `app.js` import करता है; HTML में दूसरा सीधा load tag नहीं मिला।
3. Part 2 registry में `modules` सूची खाली थी, इसलिए loader के माध्यम से कोई अतिरिक्त Part 2 module सक्रिय नहीं होता था।
4. मौजूदा `swar-sadhika-brain.js` में भाषिक विश्लेषण और स्थानीय ज्ञान-सूचकांक के कार्य हैं, लेकिन वह स्वयं loader का `registerSwarSadhikaModule(api)` activation contract नहीं देता। उसे सीधे registry में डालना सही नहीं होगा।
5. Brain builder की `buildSwarSadhikaMachineBrain()` विधि ऐसे engine `analyzeInput()` की अपेक्षा करती है जो मौजूदा `index.js` facade में उपलब्ध होने की पुष्टि नहीं हुई। इसलिए वास्तविक model-token signal होने का दावा नहीं किया गया।

## किए गए संशोधन
- `index.html`: केवल दूसरा `lipsync-engine.js` script tag हटाया गया।
- `swar-sadhika-module-registry-part2.json`: एक वैकल्पिक (`required: false`) `sanskrit-brain-ui` module दर्ज किया गया।
- नया `swar-sadhika-brain-integration-part2.js`: existing brain exports का उपयोग कर AI परीक्षण अनुभाग में भाषिक विश्लेषण, local knowledge-index search, और अनुमानित छन्द को अगले generation के लिए explicitly चुनने की सुविधा जोड़ता है।
- मूल संस्कृत पाठ स्वतः नहीं बदला जाता। अनुमानित meter तभी चुना जाता है जब उपयोगकर्ता संबंधित बटन दबाता है।

## परीक्षण
- HTML duplicate-ID check: PASS (0 duplicate IDs).
- Script reference check: PASS (`lipsync-engine.js` 1 बार; bootstrap 1 बार; `studio-enhancements.js` 1 बार; `app.js` का direct tag 0).
- Node.js syntax check: inline script, new brain integration module, supplied brain source, and Sanskrit text utilities — PASS.
- Functional unit check: `ॐ नमः शिवाय॥` analysis preserves source text; local index search for `स्वर-साधिका` returns results — PASS.
- Registry JSON parsing and path/name checks — PASS.

## परीक्षण जो अभी नहीं हुए
- वास्तविक GitHub Pages browser/device end-to-end test.
- Model loading, real neural inference, generated audio, female-voice quality, Sanskrit pronunciation correctness, or accurate phoneme lip-sync.
- Local Chromium smoke test was blocked by this environment's administrator network policy.

## लागू करने के लिए
ZIP से ये तीन फ़ाइलें repository root में लागू करें:
- `index.html`: backup लेकर पुरानी प्रति बदलें।
- `swar-sadhika-module-registry-part2.json`: backup लेकर पुरानी प्रति बदलें।
- `swar-sadhika-brain-integration-part2.js`: नई फ़ाइल के रूप में जोड़ें।

बाकी मौजूदा core files को न हटाएँ और न बदलें। `README-HI-Part2.md` में आवश्यक dependencies और सीमाएँ दी गई हैं।
