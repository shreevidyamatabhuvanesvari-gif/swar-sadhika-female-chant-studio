# Swar-Sadhika Female Chant Studio — delivery and validation report

Build: `swar-sadhika-female-chant-studio.zip`  
Suggested GitHub repository: `swar-sadhika-female-chant-studio`

## Package layout

The ZIP's top level is the repository root. `index.html` is directly in that root; there is no extra wrapper directory. Full path list and GitHub placement notes are in `REPOSITORY-FILE-MAP-HINDI.md`.

## Features included

- Existing one-page 9:16 studio, photo/video selection, top/middle/bottom text positions, fullscreen, queue, Browser Voice, AI test panel, pronunciation-reference tools and Canvas recording controller.
- Local Sanskrit library backed by IndexedDB: save/update text and title, search, restore to AI input, title-only command lookup over saved texts, heuristic meter/form report, import/export JSON backup and use count.
- Model Hub search UI and official Vāgdhenu links; the current model-cache module fetches model assets from the official repository, pins revision metadata and checks artifact identity before caching.
- NFE selector for controlled speed/quality experiments; lower NFE can be faster but may degrade output.
- Feedback/ratings and per-text preferred settings persist locally. These settings do not modify or train model weights.
- Guided quick-video flow with stage playback and best-effort MediaRecorder audio-track connection.
- GitHub Pages Actions workflow, PWA manifest, install icon and Hindi deployment instructions for the separate repository slug.
- Verse-number splitter regression fix: numeric labels between double danda (e.g. `॥१॥`) do not become a separate chant chunk in the text utility.

## Validation actually run in this package

- `node --check` passed for the project's root JavaScript modules and worker modules at packaging time.
- `npm test`: **PASS**; 18 required files/paths, two JSON files, HTML/template IDs and workflow references checked; 15/15 text utility tests passed; Rudrashtakam first-verse splitter returns four non-empty padas and no separate verse-number token.
- `node scripts/test-rudrashtakam-input.mjs`: **PASS**; first verse splits to 4 chunks and the full eight-verse sample to 32 chunks; numeric verse labels do not become standalone chunks.
- ZIP integrity and complete entry list are verified after archive creation.

These are source/structure/regression checks. They are not real browser or sound generation tests.

## Model files and first-use behaviour

The very large ONNX/WASM model assets are intentionally not embedded in the ZIP or ordinary Git repository. The app offers an official-model cache/download action; on first use, it attempts to retrieve the selected Vāgdhenu artifacts from Hugging Face and verifies their metadata. This needs an internet connection and sufficient browser storage. A successful download/cache check is not proof of successful inference.

## Not verified / not claimed

- Natural female/young-woman singing voice. The official public Vāgdhenu model card describes Sanskrit śloka-to-chant synthesis but does not document a female-voice mode.
- Real ONNX inference, audible audio output, pronunciation quality, full Rudrashtakam synthesis or execution on a particular Android phone.
- Faster-than-real-time singing or guaranteed response duration; phone/browser/runtime performance varies.
- Audio actually present and decodable in every recorded WebM/MP4. The code attempts to connect an AI audio track, but the exported file needs playback inspection on the user's phone.
- Phoneme-accurate lip-sync. Current avatar animation estimates mouth movement from audio level; it is not aligned to phonemes, and does not retime the original lips of a provided video.
- Permanent retention outside browser storage. IndexedDB is scoped to browser + origin and can be cleared. JSON backup/export is provided.
- Automatic AI learning by updating model weights. The app remembers use counts, ratings and settings, but does not retrain the neural model.
- Automatic retrieval of an unsaved scripture by title. Title commands only resolve texts the user has saved/imported; the app will not invent authoritative Sanskrit text based on a title.
- Public GitHub Pages deployment. This ZIP is prepared locally; the user must create the new repo and confirm the Actions job.

## Separate repository safety

This ZIP does not execute a Git push and does not modify any existing repo. Upload it only to a newly created repository named `swar-sadhika-female-chant-studio`; do not overwrite `swar-sadhika-test` or `anujadha`. The new site has a different GitHub Pages origin, so IndexedDB data does not automatically migrate—export/import JSON to transfer the library.

## Third-party rights

Read `docs/THIRD-PARTY-AND-MODEL-NOTES.md` before public publishing. The included vendor engine source came from the previous project package, but independent verification of redistribution permission for that exact upstream source revision is still outstanding. The project `LICENSE` does not license upstream material. Do not interpret this ZIP as legal confirmation that every upstream asset may be publicly redistributed.

## Status vocabulary

PASS means only the named test ran and passed. No structural or parser test is presented as proof of female-voice singing, successful inference, correct pronunciation or combined video/audio output.
