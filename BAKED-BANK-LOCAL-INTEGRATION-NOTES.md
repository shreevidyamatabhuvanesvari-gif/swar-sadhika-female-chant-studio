# baked_bank.json — वर्तमान loader और compatibility स्थिति

यह नोट पुराने 1,039-ID generic vocabulary bridge के बाद superseded है। वर्तमान स्थिति का मुख्य संदर्भ `BAKED-BANK-ROOT-CAUSE-FIX.md` है।

दिए गए `baked_bank.json` में `vocab_char_map` की 2,545 unique IDs (`0..2544`) हैं, और 18 reference entries के 1,164 `ref_tokens` positions सभी इसी map में पाए गए। आधिकारिक browser bundle इसी field का उपयोग करता है; यह generic 1,039-ID token-to-ID map की खोज नहीं करता।

वर्तमान runtime official browser implementation से JSON और `baked_bank.bin` को एक ही चुने गए Hugging Face repository से लोड करता है। इससे लोकल JSON और अलग संस्करण के binary को अनजाने में मिलाने से बचा जाता है। root-level `baked_bank.json` पैकेज में रखा है, लेकिन active runtime इसे जबरन official bank पर override नहीं करता।

स्थानीय syntax/import/API तथा bank-schema जाँचें सफल हुईं। Live model download, ONNX inference, audio playback और Android व्यवहार अब भी device/live-site पर जाँचना बाकी हैं। यह पैकेज केवल `swar-sadhika-test` के लिए है; `anujadha` को न बदलें।
