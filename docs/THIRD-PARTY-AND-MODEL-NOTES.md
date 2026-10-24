# Third-party and model integration notes

**Audit date:** 2026-10-24  
**Audited artifact:** uploaded Swar-Sadhika ZIP whose archive comment identifies commit `6826a0ba71a1a5364e700091ceb3a7e038e8043b`.

## Model repositories and model license

- ONNX model repository: https://huggingface.co/gnumanth/sanskrit-tts-onnx
- WASM model repository: https://huggingface.co/gnumanth/sanskrit-tts-wasm
- The public Hugging Face model cards currently label these model repositories `MIT`. That metadata applies to the model repositories as stated by those cards; it does **not** automatically grant rights to copied JavaScript source, vendor bundles, or other third-party code.
- Required artifact names in `model-cache.js`: `vagdhenu_cond_q8.onnx`, `vagdhenu_dit_step_q8.onnx`, `vagdhenu_vocos_q8.onnx`, `baked_bank.bin`, and `baked_bank.json`.
- The uploaded ZIP contains the small `baked_bank.json`, but the three ONNX weights and `baked_bank.bin` are not bundled. The current design downloads them on first use. A verified cache is required before the app initializes the model.

## Browser engine source and redistribution status

- Upstream project page: https://github.com/hemanth/sanskrit-tts-web
- The upstream source tree reviewed for this audit did not expose a `LICENSE` file, and a direct request for its root `LICENSE` returned 404. The exact license/redistribution permission for the copied bundle at `vendor/vagdhenu-upstream/vagdhenu-onnx.js` therefore remains **BLOCKED / NOT VERIFIED**.
- Do not infer that the source bundle is MIT-licensed from the model cards. Do not claim public redistribution is cleared until permission/licensing for the exact source revision is documented.
- The app's own rights notice cannot grant rights to upstream code.

## Voice and task fit

The public model description supports Sanskrit śloka-to-chant synthesis. It does not, by itself, prove a dedicated female voice, naturalness, Android performance, Vedic accent accuracy, or user acceptance of voice quality. These require generated audio and a real listening assessment.

## Integrity and runtime contract

- `model-cache.js` resolves a Hub revision, downloads only the five expected files, verifies hashes/sizes using the repository metadata, and writes separate verification metadata.
- The normal app initialization path, public `index.js` facade, and inference audit page require this verified cache before session initialization.
- The vendored engine reads all five managed model assets—including `baked_bank.json` and `baked_bank.bin`—from `swar-sadhika-vagdhenu-models-v1`. It refuses an unverified cache miss instead of silently downloading a possibly different `resolve/main` revision.
- Default browser use, including `localhost`, resolves to the same Hugging Face artifact path used by the verified cache. This ZIP does not bundle a complete `./models` directory; silently selecting that path would request an asset name absent from the five-file cache contract.
- The ONNX/WebGPU mode must not silently switch to the separate WASM repository when no usable WebGPU adapter/device exists. The UI checks WebGPU availability before downloading ONNX assets and directs unsupported devices to the `WASM (CPU)` backend. If ONNX session creation later falls back to WASM execution, it still uses the already verified ONNX-repository asset bytes.
- ONNX Runtime Web is pinned to `1.23.2`. Its script tag requests CORS mode before setting `src` so the Service Worker can cache only eligible non-opaque responses.
- Model cache presence, JavaScript syntax checks, session initialization, or a returned audio URL alone are not proof of real inference, valid audio, audible playback, pronunciation quality, or offline success.

## Test limits for this audit

The local Node tests do not execute a browser ONNX model. Real inference, audio decoding/playback in Android Chrome, feminine-voice quality, offline inference, video export, and live Pages behavior must stay `NOT TESTED` or `BLOCKED` until actually performed in those environments.
