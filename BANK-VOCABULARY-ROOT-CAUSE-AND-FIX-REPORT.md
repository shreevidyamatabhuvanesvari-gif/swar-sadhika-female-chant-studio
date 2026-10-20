# Vocabulary root-cause correction — current authoritative report

## Root cause found in code

The previous local bridge imposed `VOCAB_SIZE = 1039`, searched for a generic token-to-ID vocabulary, and rejected the supplied `vocab_char_map` because it has 2,545 IDs (`0..2544`). The official browser bundle in the user-supplied `sanskrit-tts-web-main.zip` follows a different contract: it reads `bankManifest.vocab_char_map`, appends reference tokens plus character IDs, and sends `BigInt(rawTokens[i] + 1)` to the model's `text_in` tensor. The former generic validation did not match that official implementation.

The supplied JSON's 18 reference entries contain 1,164 reference-token positions; each token ID is present in the character map. This confirms internal map membership, but does not by itself prove that live ONNX inference succeeds.

## Changes made

- Replaced the custom generic-tokenizer bridge at `vendor/vagdhenu-upstream/vagdhenu-onnx.js` with the self-contained official browser bundle from the supplied archive's `dist/index.mjs`.
- Changed the runtime Cache Storage name to `swar-sadhika-vagdhenu-models-v1`, the same name used by `model-cache.js`.
- Changed runtime cache lookup to `cache.match(url, { ignoreSearch: true })`, allowing `?v=23` bank URLs to reuse previously integrity-verified artifacts cached without a query string.
- Updated the compatibility adapter's stale header and passed initialization progress through to the engine.
- Added a root-level test/status note and kept the app's active JSON and binary paired from the same selected official model repository.

## Tests and limits

Syntax, dynamic module import, required API, bank map checks and ZIP integrity all passed locally. The engine has not yet been deployed to GitHub Pages; actual remote models were not loaded in a browser, and inference/audio playback has not been verified. The supplied official source archive did not contain a license file, so redistribution terms must be verified before public deployment.

Only the `swar-sadhika-test` package is modified. Do not modify `anujadha`.
