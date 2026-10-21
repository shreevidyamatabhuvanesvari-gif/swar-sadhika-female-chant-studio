/* Swar-Sadhika: local audio-reactive lip-sync prototype */
(() => {
  "use strict";

  const audio = document.getElementById("ss-ai-audio");
  const stageAPI = window.SwarSadhikaStage;

  if (!audio || !stageAPI) {
    console.warn("Lip-sync: audio element or stage API is missing.");
    return;
  }

  let context = null;
  let analyser = null;
  let source = null;
  let samples = null;
  let frame = 0;
  let connected = false;

  async function connectAudio() {
    if (connected) return true;

    const AudioContextClass =
      window.AudioContext || window.webkitAudioContext;

    if (!AudioContextClass) {
      console.warn("Web Audio API is not supported.");
      return false;
    }

    try {
      context = new AudioContextClass();
      analyser = context.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.68;
      samples = new Uint8Array(analyser.fftSize);

      source = context.createMediaElementSource(audio);
      source.connect(analyser);
      analyser.connect(context.destination);

      connected = true;
      return true;
    } catch (error) {
      console.error("Lip-sync audio connection failed:", error);
      return false;
    }
  }

  function animateMouth() {
    if (!connected || audio.paused || audio.ended) {
      stageAPI.setMouthLevel(0);
      frame = 0;
      return;
    }

    analyser.getByteTimeDomainData(samples);

    let sum = 0;
    for (let i = 0; i < samples.length; i++) {
      const value = (samples[i] - 128) / 128;
      sum += value * value;
    }

    const rms = Math.sqrt(sum / samples.length);
    const level = Math.max(0, Math.min(1, (rms - 0.012) * 5.5));

    stageAPI.setMouthLevel(level);
    frame = requestAnimationFrame(animateMouth);
  }

  audio.addEventListener("play", async () => {
    const ready = await connectAudio();
    if (!ready) return;

    try {
      if (context.state === "suspended") {
        await context.resume();
      }
    } catch (error) {
      console.warn("AudioContext resume failed:", error);
    }

    cancelAnimationFrame(frame);
    animateMouth();
  });

  audio.addEventListener("pause", () => {
    cancelAnimationFrame(frame);
    stageAPI.setMouthLevel(0);
  });

  audio.addEventListener("ended", () => {
    cancelAnimationFrame(frame);
    stageAPI.setMouthLevel(0);
    if (typeof stageAPI.endAiPlayback === "function") {
      stageAPI.endAiPlayback();
    }
  });

  audio.addEventListener("error", () => {
    cancelAnimationFrame(frame);
    stageAPI.setMouthLevel(0);
    console.error("Lip-sync: audio playback error.");
  });

  console.info("Swar-Sadhika lip-sync module loaded.");
})();
