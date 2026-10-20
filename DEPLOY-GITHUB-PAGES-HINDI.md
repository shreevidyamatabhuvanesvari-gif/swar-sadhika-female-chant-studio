# नए GitHub repository में लाइव करने के निर्देश

## क्या पुरानी repository सुरक्षित रहेगी?

हाँ—अलग नाम से repository बनाने पर पुरानी repository की फ़ाइलें, history और GitHub Pages अपने-आप नहीं बदलते। इस ZIP में कोई Git remote/push action शामिल नहीं है। **इस पैकेज को `swar-sadhika-test` या `anujadha` में upload न करें।**

## सुझाया गया repository name

`swar-sadhika-female-chant-studio` में spaces नहीं डालने हैं। सही नाम:

`swar-sadhika-female-chant-studio`

कृपया copy करते समय नीचे का exact slug इस्तेमाल करें: **`swar-sadhika-female-chant-studio`**.

## फोन/कंप्यूटर पर

1. डाउनलोड की हुई ZIP को Extract करें।
2. GitHub पर अपने उसी account में जाएँ, जिसमें test repository है। **New repository** चुनें।
3. Repository name में `swar-sadhika-female-chant-studio` लिखें। GitHub Free पर GitHub Pages के लिए इसे **Public** रखें; public site को इंटरनेट पर कोई भी देख सकता है।
4. README, `.gitignore` आदि auto-add करने की जगह चाहें तो repository blank बनाएँ।
5. Extracted folder की सामग्री upload करें—`index.html`, `app.js`, `index.js`, `studio-enhancements.js`, `model-cache.js`, बाकी `.js`, `.html`, `.json`, `vendor/`, `.github/`, `scripts/`, `docs/`, `manifest.webmanifest`, `.nojekyll` आदि। **`index.html` repository root पर होना चाहिए**, किसी अंदरूनी subfolder में नहीं। Hidden `.github` directory भी upload करें।
6. Commit message लिखकर `main` branch में commit करें।
7. Repository के **Actions** टैब में `Deploy Swar-Sadhika Female Chant Studio to GitHub Pages` workflow चुनें। वह सफल होना चाहिए।
8. **Settings → Pages** में workflow deployment और `Visit site` link देखें।

यदि account owner `shreevidyamatabhuvanesvari-gif` ही है, तो अनुमानित project URL होगा:

`https://shreevidyamatabhuvanesvari-gif.github.io/swar-sadhika-female-chant-studio/`

## यदि live न हो

- Actions में failure log देखें; फ़ाइल नाम और `index.html` का root path सत्यापित करें।
- `app.js`, `studio-enhancements.js`, `model-cache.js`, `service-worker.js` root में होने चाहिए।
- पृष्ठ खुलने पर model cache या browser voice status को AI inference PASS न मानें।
- पहली बार model assets डाउनलोड करना अलग काम है और इसके लिए करीब 280 MB डेटा/उचित storage लग सकता है।
- पुरानी repository में कोई commit न करें; new repo URL header में नाम जाँचें।

GitHub के आधिकारिक निर्देश: https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site
