# Swar-Sadhika — Vāgdhenu vocabulary/root-cause correction

## Root cause confirmed from the supplied upstream browser source

The former local bridge hard-coded `VOCAB_SIZE = 1039`, searched for a generic token-to-ID vocabulary, and rejected `vocab_char_map` because its IDs span `0..2544`. The supplied official browser implementation does not use that generic tokenizer. It reads `bankManifest.vocab_char_map`, appends reference tokens and one character ID per input character, and writes `BigInt(rawTokens[i] + 1)` to the `text_in` tensor. Therefore applying the former 1,039-token validation to this official bank/runtime contract was incorrect.

## What changed

- `vendor/vagdhenu-upstream/vagdhenu-onnx.js` now contains the self-contained official browser bundle from the supplied archive's `dist/index.mjs`, preserving the official character-map tokenization and original model input logic.
- The upstream bundle's Cache Storage name was aligned with the Swar-Sadhika model cache: `swar-sadhika-vagdhenu-models-v1`.
- Its cache lookup now uses `ignoreSearch: true` so a model/bank artifact preloaded without `?v=23` can be reused by the upstream loader's versioned URL. This avoids unnecessary duplicate cache entries/downloads.
- The bundle is loaded through the existing same-origin dynamic `import()` adapter. Do not open or run this module as a classic `<script>`; it is an ES module.
- The root `baked_bank.json` is retained as project data, but the runtime obtains its active JSON and `baked_bank.bin` from the same official model repository so the pair remains matched. Cache preloading uses those same repository artifact URLs.

## Verification performed in this container

- JavaScript module syntax check passed.
- Dynamic module import passed in Node with browser globals not invoked at import time.
- The exported `VagdhenuWebEngine` constructor and required adapter methods were found.
- The official source uses `vocab_char_map` and writes IDs plus one into `text_in`; the former hard-coded 1,039-token generic vocabulary validation is absent from the runtime bundle.
- JSON parse, ZIP integrity, and repository package layout checks passed.

## Not yet verified

- Live GitHub Pages deployment was not performed.
- The actual remote ONNX models were not downloaded or executed in this environment.
- Real synthesis of `ॐ नमः शिवाय`, audible playback, pronunciation quality, and Android memory/performance still require the live app/device test.

## Provenance

Runtime source: `dist/index.mjs` inside the user-supplied `sanskrit-tts-web-main.zip` (official source archive for https://github.com/hemanth/sanskrit-tts-web), with only the cache name and cache-match behavior adjusted as documented above.
- The Swar-Sadhika adapter's stale header was corrected so it no longer claims the vendor file is plain text/blocked, and initialization progress is now passed through to the official runtime.
