# Third-party and model integration notes

- Official model repositories listed by this app: https://huggingface.co/gnumanth/sanskrit-tts-onnx and https://huggingface.co/gnumanth/sanskrit-tts-wasm.
- Upstream browser project/source: https://github.com/hemanth/sanskrit-tts-web.
- The Hub model metadata and license must be checked at the exact revision used. Do not treat a model card search hit as evidence that a model supports Sanskrit, singing, female timbre, ONNX WebGPU/WASM, or this exact adapter.
- Vāgdhenu's public model card describes Sanskrit śloka-to-chant synthesis but does not document a female-voice mode. The present model should not be labeled a verified female voice.
- `model-cache.js` pins metadata per download and checks artifact content identities before caching. Do not remove its integrity checks to work around a failing download.
- Some existing project history notes that redistribution permission for the browser engine's exact copied bundle was not independently verified. Verify the upstream license/permission for the exact source revision before making the repository public. The app's own rights notice cannot grant permission to upstream code.
- The ONNX model/runtime assets are too large to bundle as normal source files in this ZIP or a conventional GitHub Pages source commit. The app downloads the required assets at first use and caches them locally. Storage and offline behavior must be tested on the target Android device.
- Third-party link: https://github.com/prathoshap/vagdhenu (separate Python project with its own license and requirements; it is not a drop-in browser model).
