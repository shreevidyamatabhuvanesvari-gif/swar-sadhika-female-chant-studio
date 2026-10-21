# Swar-Sadhika — Part 2 Sanskrit Brain integration

इस पैकेज में केवल तीन deploy files हैं:

1. `index.html` — वर्तमान uploaded file की पूर्ण प्रति, लेकिन अंत में मौजूद दूसरा `lipsync-engine.js` tag हटाया गया है।
2. `swar-sadhika-module-registry-part2.json` — registry में एक वैकल्पिक Part 2 module दर्ज किया गया है।
3. `swar-sadhika-brain-integration-part2.js` — registry-compatible adapter जो मौजूदा `swar-sadhika-brain.js` को UI और local knowledge-index search से जोड़ता है।

## GitHub repository में लागू करना

तीनों फ़ाइलें repository root में रखें:
- `index.html` और `swar-sadhika-module-registry-part2.json` की मौजूदा प्रतियों का backup लेकर उन्हें इन प्रतियों से बदलें।
- `swar-sadhika-brain-integration-part2.js` नई फ़ाइल के रूप में जोड़ें।

बाकी मौजूदा फ़ाइलें न हटाएँ। यह integration इन मौजूदा स्थानीय फ़ाइलों पर निर्भर है:
- `swar-sadhika-app-bootstrap-part2.js`
- `swar-sadhika-module-loader-part2.js`
- `app.js`
- `studio-enhancements.js`
- `lipsync-engine.js`
- `swar-sadhika-brain.js`
- `vagdhenu-text.js`
- `sanskrit-knowledge-index.json`

ये paths `index.html` के समान repository root के सापेक्ष हैं।

## यह संशोधन क्या करता है

- `lipsync-engine.js` को HTML में केवल एक बार लोड करता है।
- Part 2 registry को खाली नहीं छोड़ता: `sanskrit-brain-ui` module लोडर के contract के अनुसार सक्रिय किया जाता है।
- AI परीक्षण अनुभाग में नया Sanskrit Brain panel जोड़ता है: पाठ का स्रोत चुना जा सकता है, भाषिक विश्लेषण चलाया जा सकता है, और स्थानीय ज्ञान-सूचकांक में संदर्भ खोजे जा सकते हैं। यदि बहुत कम भरोसे वाला छन्द-संकेत उपलब्ध हो, तो उसे अगले AI गायन के लिए छन्द-विकल्प के रूप में चुनना उपयोगकर्ता के स्पष्ट बटन-दबाव से संभव है।
- मूल पाठ को स्वतः बदलता, सुधारता या दूसरे text box में कॉपी नहीं करता।
- मॉड्यूल को `required: false` रखा है; इस अतिरिक्त panel में त्रुटि होने पर मुख्य ऐप का लोड होना अनिवार्य रूप से विफल नहीं होगा।

## महत्वपूर्ण सीमाएँ

यह मॉड्यूल संस्कृत-पाठ का भाषिक विश्लेषण और स्थानीय स्रोत-संदर्भ उपलब्ध कराता है। यह स्वयं मॉडल को train नहीं करता और अभी inference engine से सीधे जुड़कर उत्पन्न आवाज़ को नियंत्रित नहीं करता। मौजूदा engine API में `analyzeInput()` उपलब्ध होने का प्रमाण नहीं मिला; इसलिए `buildSwarSadhikaMachineBrain()` को वास्तविक model-token signal के लिए कॉल नहीं किया गया। छन्द-आकलन heuristic है, वैदिक शुद्धता का प्रमाण नहीं।

Static syntax और संरचना की जाँच की गई है। वास्तविक GitHub Pages browser test, mobile-device inference, generated audio, female-voice quality या lip-sync quality इस पैकेज-निर्माण के दौरान execute नहीं हुई।
