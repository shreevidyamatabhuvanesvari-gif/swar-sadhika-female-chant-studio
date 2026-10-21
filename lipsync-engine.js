/* Swar-Sadhika: audio-reactive photo lip-sync engine.
   Actual AI audio level comes from app.js.
   This is audio-amplitude-based animation, not phoneme-accurate neural synthesis. */
(() => {
  "use strict";

  const clamp = (v, min, max) =>
    Math.max(min, Math.min(max, Number(v) || 0));
  const byId = id => document.getElementById(id);

  const svg = byId("avatar-mouth-layer");
  const mouth = byId("avatar-mouth");
  const teeth = byId("avatar-teeth");
  const upperLip = byId("avatar-upper-lip");
  const lowerLip = byId("avatar-lower-lip");
  const patch = byId("avatar-mouth-patch");

  const state = { target: 0, smoothed: 0 };

  // 9:16 स्टूडियो में मूल फोटो के मुँह की स्थिति।
  const CENTER_X = 444;
  const CENTER_Y = 214;
  const PATCH_RX = 24;
  const PATCH_RY = 12;

  function setLevel(value) {
    state.target = clamp(value, 0, 1);

    if (state.target < 0.008) {
      state.smoothed = 0;
    } else {
      state.smoothed +=
        (state.target - state.smoothed) *
        (state.target > state.smoothed ? 0.52 : 0.25);
    }

    const a = clamp(state.smoothed, 0, 1);
    if (!svg || !mouth) return a;

    const photo = byId("avatar-default");
    const defaultPhotoVisible =
      Boolean(photo && photo.classList.contains("active"));

    if (!defaultPhotoVisible) {
      svg.style.opacity = "0";
      return a;
    }

    svg.style.opacity =
      String(clamp((a - 0.025) / 0.095, 0, 1));

    const rx = 11.5 + a * 10.5;
    const ry = 1.15 + a * 8.8;

    mouth.setAttribute("cx", String(CENTER_X));
    mouth.setAttribute("cy", (CENTER_Y + a * 1.2).toFixed(2));
    mouth.setAttribute("rx", rx.toFixed(2));
    mouth.setAttribute("ry", ry.toFixed(2));

    if (teeth) {
      teeth.setAttribute("cx", String(CENTER_X));
      teeth.setAttribute("cy", (CENTER_Y - ry * 0.23).toFixed(2));
      teeth.setAttribute("rx", (rx * 0.66).toFixed(2));
      teeth.setAttribute("ry", Math.max(0.45, ry * 0.25).toFixed(2));
      teeth.setAttribute(
        "opacity",
        clamp((a - 0.28) * 1.8, 0, 0.86).toFixed(2)
      );
    }

    if (patch) {
      patch.setAttribute("cx", String(CENTER_X));
      patch.setAttribute("cy", String(CENTER_Y));
      patch.setAttribute("rx", String(PATCH_RX));
      patch.setAttribute("ry", String(PATCH_RY));
      patch.setAttribute(
        "opacity",
        clamp((a - 0.025) / 0.095, 0, 0.96).toFixed(2)
      );
    }

    if (upperLip) {
      upperLip.setAttribute(
        "d",
        `M ${(CENTER_X-rx).toFixed(1)} ${(CENTER_Y-a*1.1).toFixed(1)}
         Q ${(CENTER_X-rx*.42).toFixed(1)} ${(CENTER_Y-a*2.5).toFixed(1)}
         ${CENTER_X} ${(CENTER_Y-a*1.1).toFixed(1)}
         Q ${(CENTER_X+rx*.42).toFixed(1)} ${(CENTER_Y-a*2.5).toFixed(1)}
         ${(CENTER_X+rx).toFixed(1)} ${(CENTER_Y-a*1.1).toFixed(1)}`
      );
      upperLip.setAttribute(
        "opacity",
        String(clamp((a - 0.04) * 3.8, 0, 0.85))
      );
    }

    if (lowerLip) {
      lowerLip.setAttribute(
        "d",
        `M ${(CENTER_X-rx*.76).toFixed(1)} ${(CENTER_Y+ry*.31).toFixed(1)}
         Q ${CENTER_X} ${(CENTER_Y+ry*1.03).toFixed(1)}
         ${(CENTER_X+rx*.76).toFixed(1)} ${(CENTER_Y+ry*.31).toFixed(1)}`
      );
      lowerLip.setAttribute(
        "opacity",
        clamp(0.25 + a * 0.62, 0, 0.88).toFixed(2)
      );
    }

    return a;
  }

  function drawToCanvas(ctx, width, height) {
    const a = clamp(state.smoothed, 0, 1);

    if (!ctx || width <= 0 || height <= 0 || a < 0.055) {
      return false;
    }

    const sx = width / 1000;
    const sy = height / 1777.7778;
    const x = CENTER_X * sx;
    const y = CENTER_Y * sy;
    const rx = (11.5 + a * 10.5) * sx;
    const ry = (1.15 + a * 8.8) * sy;

    ctx.save();
    ctx.globalAlpha = clamp((a - 0.025) / 0.095, 0, 0.96);

    const skin = ctx.createRadialGradient(
      x, y, 0, x, y, PATCH_RX * sx
    );
    skin.addColorStop(0, "#e8a590");
    skin.addColorStop(0.72, "#e3a08a");
    skin.addColorStop(1, "#d98f79");

    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.ellipse(
      x, y, PATCH_RX * sx, PATCH_RY * sy,
      0, 0, Math.PI * 2
    );
    ctx.fill();

    ctx.fillStyle = "#4e1926";
    ctx.strokeStyle = "#813344";
    ctx.lineWidth = 1.5 * sx;
    ctx.beginPath();
    ctx.ellipse(
      x, y + a * 1.2 * sy, rx, ry,
      0, 0, Math.PI * 2
    );
    ctx.fill();
    ctx.stroke();

    if (a > 0.28) {
      ctx.globalAlpha *= clamp((a - 0.28) * 1.8, 0, 0.86);
      ctx.fillStyle = "#fff2df";
      ctx.beginPath();
      ctx.ellipse(
        x, y - ry * 0.23 * sy,
        rx * 0.66, Math.max(0.35 * sy, ry * 0.25),
        0, Math.PI, Math.PI * 2
      );
      ctx.fill();
    }

    ctx.restore();
    return true;
  }

  window.SwarSadhikaLipSync = Object.freeze({
    setLevel,
    drawToCanvas,
    getLevel: () => state.smoothed,
    getTargetLevel: () => state.target
  });

  console.info("[Swar-Sadhika] Lip-sync renderer loaded.");
})();
