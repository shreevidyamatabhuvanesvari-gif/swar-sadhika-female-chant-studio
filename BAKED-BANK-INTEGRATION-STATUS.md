# baked_bank.json integration status — latest package

## Implemented

- The root-level `baked_bank.json` remains in the test package as a data copy.
- The active engine is now the self-contained official Vāgdhenu browser bundle from the supplied source ZIP. It uses `vocab_char_map` according to the upstream implementation rather than the old custom 1,039-ID generic vocabulary check.
- Active bank JSON and `baked_bank.bin` are loaded from the same selected official Hugging Face backend repository to keep the JSON/binary pair matched.
- Runtime Cache Storage now shares `swar-sadhika-vagdhenu-models-v1` with the hash-verifying model cache. Cache lookup ignores the version query string so the preloaded bank can be reused.

## Verified locally

- The supplied JSON parses.
- `vocab_char_map`: 2,545 unique IDs spanning 0 through 2,544.
- All 1,164 reference-token positions across the 18 bank entries refer to IDs represented in that map.
- Every JavaScript module parses in ES-module mode.
- The official bundle dynamically imports in Node and exposes `VagdhenuWebEngine`, `setBackendMode()`, `initOnnxSessions()`, and `synthesizeInBrowser()`.
- ZIP integrity passes.

## Not yet proven

- The new package has not been published to GitHub Pages.
- Real model assets have not been downloaded and initialized in a browser in this environment.
- Successful neural inference, audible output, correct pronunciation, Android resource usage and offline synthesis have not been verified.
- The source ZIP did not include a license file; public redistribution terms remain to be checked.

Do not publish to or modify the protected `anujadha` app. This is a test-only update.
