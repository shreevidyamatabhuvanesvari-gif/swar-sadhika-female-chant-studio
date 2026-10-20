# स्वर-साधिका — वर्तमान परीक्षण पैकेज के अगले चरण

यह पैकेज केवल `swar-sadhika-test` परीक्षण रिपॉज़िटरी के लिए है। इसे `anujadha` में लागू न करें।

## इस संशोधन में क्या बदला

- `vendor/vagdhenu-upstream/vagdhenu-onnx.js` अब उपयोगकर्ता द्वारा दिए गए आधिकारिक Vāgdhenu स्रोत ZIP के self-contained `dist/index.mjs` browser bundle पर आधारित है। फ़ाइल अब वास्तविक engine code है, placeholder नहीं।
- पिछला custom loader `VOCAB_SIZE = 1039` मानकर `vocab_char_map` को अस्वीकार कर रहा था। आधिकारिक browser implementation `vocab_char_map` को सीधे पढ़ता है और `text_in` के लिए IDs में 1 जोड़ता है। इसीलिए पुराने generic tokenizer gate को हटाकर आधिकारिक implementation लगाया गया।
- runtime और सत्यापित model downloader अब `swar-sadhika-vagdhenu-models-v1` Cache Storage नाम साझा करते हैं। runtime cache lookup query string को अनदेखा करता है, इसलिए `?v=23` जोड़ने से वही सत्यापित मॉडल फ़ाइल दोबारा डाउनलोड करने की आवश्यकता कम होती है।
- मूल `baked_bank.json` परियोजना में सुरक्षित है; वास्तविक रनटाइम JSON और `baked_bank.bin` को उसी चुने गए आधिकारिक model repository से एक जोड़ी के रूप में प्राप्त करता है। यह जानबूझकर किया गया है ताकि असंगत स्थानीय JSON को अलग binary के साथ न मिलाया जाए।

## इस वातावरण में सफल जाँच

- सभी परियोजना JavaScript फ़ाइलों की ES-module syntax जाँच सफल।
- official bundled engine का module import और `VagdhenuWebEngine`, `setBackendMode()`, `initOnnxSessions()`, `synthesizeInBrowser()` API जाँच सफल।
- दिए गए bank JSON में `vocab_char_map` की 2,545 unique IDs (`0–2544`) और सभी reference-token IDs का map में होना सत्यापित।
- ZIP अखंडता जाँच सफल।

## अभी सत्यापित नहीं

- GitHub Pages पर नया पैकेज प्रकाशित या चलाया नहीं गया है।
- इस वातावरण में सभी वास्तविक ONNX weights डाउनलोड कर model sessions शुरू नहीं किए गए।
- `ॐ नमः शिवाय` का वास्तविक inference, सुनाई देने वाला ऑडियो, उच्चारण गुणवत्ता और Android प्रदर्शन सत्यापित नहीं हैं।
- official source archive में अलग license फ़ाइल शामिल नहीं थी; सार्वजनिक वितरण से पहले engine source की लागू license/redistribution terms जाँचना बाकी है।

## अगला व्यावहारिक चरण

केवल `swar-sadhika-test` में नई फाइलें deploy करने के बाद GitHub Pages पर खोलकर initialization करें और फिर `ॐ नमः शिवाय` का ऑडियो बनाकर सुनें। यदि browser कोई error दिखाए, तो उसका पूरा संदेश/स्क्रीनशॉट साझा करें। `anujadha` को न बदलें।
