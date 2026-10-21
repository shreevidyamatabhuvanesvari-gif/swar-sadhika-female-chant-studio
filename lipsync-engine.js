/* Swar-Sadhika local photo-mouth renderer.
 * Input level comes from app.js Web Audio Analyser on the actual generated AI audio.
 * The supplied photograph remains unchanged except for a small animated mouth overlay.
 * This is audio-reactive lip animation, not phoneme-trained face synthesis.
 */
(() => {
  "use strict";
  const clamp = (n, lo, hi) =>
    Math.max(lo, Math.min(hi, Number(n) || 0));
  const el = id => document.getElementById(id);
  const svg = el("avatar-mouth-layer");
  const mouth = el("avatar-mouth");
  const teeth = el("avatar-teeth");
  const upperLip = el("avatar-upper-lip");
  const lowerLip = el("avatar-lower-lip");
  const patch = el("avatar-mouth-patch");
  const state = { level: 0, smoothed: 0 };

  function apply(value) {
    const target = clamp(value, 0, 1);
    state.level = target;

    // Pause/stop होने पर मुँह तुरन्त बंद करें।
    if (target < 0.008) {
      state.smoothed = 0;
    } else {
      // ध्वनि के उतार-चढ़ाव को थोड़ा सहज बनाना।
      state.smoothed +=
        (target - state.smoothed) *
        (target > state.smoothed ? 0.48 : 0.24);
    }

    const a = clamp(state.smoothed, 0, 1);
    if (!svg || !mouth) return a;

    const avatar = el("avatar-default");
    const usingDefaultPhoto =
      Boolean(avatar && avatar.classList.contains("active"));

    if (!usingDefaultPhoto) {
      svg.style.opacity = "0";
      return a;
    }

    // मौन में मूल फोटो के होंठ दिखें; आवाज़ पर छोटा overlay खुले।
    svg.style.opacity = String(
      clamp((a - 0.018) / 0.11, 0, 1)
    );

    const rx = 13.2 + a * 10.8;
    const ry = 1.35 + a * 9.2;

    mouth.setAttribute("rx", rx.toFixed(2));
    mouth.setAttribute("ry", ry.toFixed(2));
    mouth.setAttribute("cy", (214 + a * 1.4).toFixed(2));

    if (teeth) {
      teeth.setAttribute("rx", (rx * 0.69).toFixed(2));
      teeth.setAttribute("ry", Math.max(0.5, ry * 0.28).toFixed(2));
      teeth.setAttribute("cy", (214 - ry * 0.27).toFixed(2));
      teeth.setAttribute(
        "opacity",
        clamp((a - 0.23) * 1.9, 0, 0.92).toFixed(2)
      );
    }

    if (upperLip) {
      upperLip.setAttribute(
        "d",
        `M ${(441-rx).toFixed(1)} ${(214-a*1.2).toFixed(1)}
         Q ${(441-rx*.45).toFixed(1)} ${(211-a*2.4).toFixed(1)}
         441 ${(214-a*1.2).toFixed(1)}
         Q ${(441+rx*.45).toFixed(1)} ${(211-a*2.4).toFixed(1)}
         ${(441+rx).toFixed(1)} ${(214-a*1.2).toFixed(1)}`
      );
      upperLip.setAttribute(
        "opacity",
        String(clamp((a - 0.02) * 4, 0, 0.9))
      );
    }

    if (lowerLip) {
      lowerLip.setAttribute(
        "d",
        `M ${(441-rx*.78).toFixed(1)} ${(214+ry*.35).toFixed(1)}
         Q 441 ${(214+ry*1.12).toFixed(1)}
         ${(441+rx*.78).toFixed(1)} ${(214+ry*.35).toFixed(1)}`
      );
      lowerLip.setAttribute(
        "opacity",
        clamp(0.35 + a * 0.55, 0, 0.9).toFixed(2)
      );
    }

    if (patch) patch.setAttribute("opacity", "1");
    return a;
  }

  function setLevel(value) {
    apply(value);
  }

  function drawToCanvas(ctx, width, height) {
    // रिकॉर्डिंग में भी वही मुख-गति दिखाएँ।
    const a = state.smoothed;
    if (!ctx || a < 0.055) return;

    const x = width * 0.441;
    const y = height * 0.1204;
    const sx = width / 1000;
    const sy = height / 1777.7778;
    const rx = (13.2 + a * 10.8) * sx;
    const ry = (1.35 + a * 9.2) * sy;

    ctx.save();
    ctx.globalAlpha = clamp((a - 0.018) / 0.11, 0, 1);

    // केवल होंठों का छोटा क्षेत्र ढकें, बाकी फोटो जस की तस रहे।
    ctx.fillStyle = "#df987f";
    ctx.beginPath();
    ctx.ellipse(x, y, 31 * sx, 17 * sy, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#4e1926";
    ctx.strokeStyle = "#813344";
    ctx.lineWidth = 2.2 * sx;
    ctx.beginPath();
    ctx.ellipse(x, y + a * 1.4 * sy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    if (a > 0.23) {
      ctx.globalAlpha *= clamp((a - 0.23) * 1.9, 0, 0.92);
      ctx.fillStyle = "#fff2df";
      ctx.beginPath();
      ctx.ellipse(
        x, y + (214 - ry * 0.27 - 214) * sy,
        rx * 0.69, Math.max(0.5, ry * 0.28),
        0, Math.PI, Math.PI * 2
      );
      ctx.fill();
    }

    ctx.restore();
  }

  window.SwarSadhikaLipSync = Object.freeze({
    setLevel,
    drawToCanvas,
    getLevel: () => state.smoothed
  });
})();
