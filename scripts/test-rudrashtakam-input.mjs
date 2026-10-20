import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const runtimePath = path.resolve(here, '../vendor/vagdhenu-upstream/vagdhenu-onnx.js');
const source = fs.readFileSync(runtimePath, 'utf8');
const modulePath = path.join('/tmp', `swar-rudra-runtime-${process.pid}.mjs`);
fs.writeFileSync(modulePath, `${source}\nexport { splitPadas };\n`, 'utf8');
try {
  const { splitPadas, analyzeVerse } = await import(`file://${modulePath}`);
  const singleVerse = `नमामीशमीशान निर्वाणरूपं
विभुं व्यापकं ब्रह्मवेदस्वरूपम्।
निजं निर्गुणं निर्विकल्पं निरीहं
चिदाकाशमाकाशवासं भजेऽहम्॥१॥`;
  const singleParts = splitPadas(singleVerse);
  assert.equal(singleParts.length, 4, `Expected four padas, got ${singleParts.length}: ${JSON.stringify(singleParts)}`);
  assert(!singleParts.some(x => /^[०-९0-9]+$/.test(x)), 'Verse number must not become a standalone piece');
  assert(singleParts.every(x => x.trim().length > 0), 'No empty pieces');
  const singleAnalysis = analyzeVerse(singleVerse);
  // Meter autodetection is informative only; this bundle's manifest defines a fallback meter.

  const fullStotra = `नमामीशमीशान निर्वाणरूपं
विभुं व्यापकं ब्रह्मवेदस्वरूपम्।
निजं निर्गुणं निर्विकल्पं निरीहं
चिदाकाशमाकाशवासं भजेऽहम्॥१॥

निराकारमोङ्कारमूलं तुरीयं
गिरा ज्ञान गोतीतमीशं गिरीशम्।
करालं महाकालकालं कृपालं
गुणागारसंसारपारं नतोऽहम्॥२॥

तुषाराद्रिसङ्काशगौरं गभीरं
मनोभूतकोटिप्रभाश्री शरीरम्।
स्फुरन्मौलिकल्लोलिनी चारुगङ्गा
लसद्भालबालेन्दु कण्ठे भुजङ्गा॥३॥

चलत्कुण्डलं भ्रूसुनेत्रं विशालं
प्रसन्नाननं नीलकण्ठं दयालम्।
मृगाधीशचर्माम्बरं मुण्डमालं
प्रियं शङ्करं सर्वनाथं भजामि॥४॥

प्रचण्डं प्रकृष्टं प्रगल्भं परेशं
अखण्डं अजं भानुकोटिप्रकाशम्।
त्रयःशूलनिर्मूलनं शूलपाणिं
भजेऽहं भवानीपतिं भावगम्यम्॥५॥

कलातीतकल्याण कल्पान्तकारी
सदा सज्जनानन्ददाता पुरारी।
चिदानन्दसन्दोह मोहापहारी
प्रसीद प्रसीद प्रभो मन्मथारी॥६॥

न यावदुमानाथपादारविन्दं
भजन्तीह लोके परे वा नराणाम्।
न तावत्सुखं शान्ति सन्तापनाशं
प्रसीद प्रभो सर्वभूताधिवासम्॥७॥

न जानामि योगं जपं नैव पूजां
नतोऽहं सदा सर्वदा शम्भु तुभ्यम्।
जराजन्मदुःखौघतातप्यमानं
प्रभो पाहि आपन्नमामीश शम्भो॥८॥`;
  const fullParts = splitPadas(fullStotra);
  assert.equal(fullParts.length, 32, `Expected 32 quarter-lines for eight verses, got ${fullParts.length}`);
  assert(!fullParts.some(x => /^[०-९0-9]+$/.test(x)), 'No verse number may become a standalone piece');
  const fullAnalysis = analyzeVerse(fullStotra);
  // Do not mark meter PASS solely from fallback selection; no acoustic result is tested here.

  const twoLineSample = 'वागर्थाविव संपृक्तौ वागर्थप्रतिपत्तये । जगतः पितरौ वन्दे पार्वतीपरमेश्वरौ ॥';
  assert.equal(splitPadas(twoLineSample).length, 2, 'Existing two-part shloka split must remain unchanged');
  console.log(JSON.stringify({
    status: 'PASS',
    singleVersePadaCount: singleParts.length,
    fullStotraPadaCount: fullParts.length,
    verseNumberStandalonePiece: false,
    detectedMeterForSingleVerse: singleAnalysis.detectedMeterKey,
    detectedMeterForFullStotra: fullAnalysis.detectedMeterKey,
    meterStatus: 'INFORMATIVE_ONLY_NOT_ACOUSTICALLY_VERIFIED',
    existingShlokaPadaCount: splitPadas(twoLineSample).length
  }, null, 2));
} finally {
  fs.rmSync(modulePath, { force: true });
}
