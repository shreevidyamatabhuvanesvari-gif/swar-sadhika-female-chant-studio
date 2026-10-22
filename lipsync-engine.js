/* Swar-Sadhika audio-reactive lip animation for the supplied photograph.
 * Input: measured RMS level from app.js analysing the actual generated AI audio.
 * The photograph file is preserved byte-for-byte; only a small mouth overlay animates.
 * This is amplitude-synchronised mouth animation, not phoneme-accurate neural face synthesis.
 */
(() => {
  "use strict";
  const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0));
  const byId = id => document.getElementById(id);
  const svg = byId("avatar-mouth-layer");
  const mouth = byId("avatar-mouth");
  const teeth = byId("avatar-teeth");
  const upperLip = byId("avatar-upper-lip");
  const lowerLip = byId("avatar-lower-lip");
  const patch = byId("avatar-mouth-patch");
  if (svg) { svg.hidden = false; if (typeof svg.removeAttribute === "function") svg.removeAttribute("hidden"); svg.style.opacity = "0"; }
  const state = { target: 0, smoothed: 0 };
  // Coordinates are aligned for swar-sadhika-avatar-photo.jpg in the 9:16 object-fit:cover stage.
  const CENTER_X = 680;
  const CENTER_Y = 564;
  const SKIN_PATCH_RX = 38;
  const SKIN_PATCH_RY = 23;

  function setLevel(value) {
    state.target = clamp(value, 0, 1);
    // Close immediately on pause/end, otherwise use fast attack and softer release.
    if (state.target < 0.008) state.smoothed = 0;
    else state.smoothed += (state.target - state.smoothed) * (state.target > state.smoothed ? 0.52 : 0.25);
    const amount = clamp(state.smoothed, 0, 1);
    if (!svg || !mouth) return amount;
    const photo = byId("avatar-default");
    const defaultPhotoVisible = Boolean(photo && photo.classList.contains("active"));
    if (!defaultPhotoVisible) {
      svg.style.opacity = "0";
      return amount;
    }
    // Reveal overlay only during sound; when silent the exact original mouth stays visible.
    svg.style.opacity = String(clamp((amount - 0.025) / 0.095, 0, 1));
    const rx = 16 + amount * 18;
    const ry = 1.15 + amount * 8.8;
    mouth.setAttribute("cx", String(CENTER_X));
    mouth.setAttribute("cy", (CENTER_Y + amount * 1.2).toFixed(2));
    mouth.setAttribute("rx", rx.toFixed(2));
    mouth.setAttribute("ry", ry.toFixed(2));
    if (teeth) {
      teeth.setAttribute("cx", String(CENTER_X));
      teeth.setAttribute("cy", (CENTER_Y - ry * 0.23).toFixed(2));
      teeth.setAttribute("rx", (rx * 0.66).toFixed(2));
      teeth.setAttribute("ry", Math.max(0.45, ry * 0.25).toFixed(2));
      teeth.setAttribute("opacity", clamp((amount - 0.28) * 1.8, 0, 0.86).toFixed(2));
    }
    if (patch) {
      patch.setAttribute("cx", String(CENTER_X));
      patch.setAttribute("cy", String(CENTER_Y));
      patch.setAttribute("rx", String(SKIN_PATCH_RX));
      patch.setAttribute("ry", String(SKIN_PATCH_RY));
      patch.setAttribute("opacity", clamp((amount - 0.025) / 0.095, 0, 0.96).toFixed(2));
    }
    if (upperLip) {
      upperLip.setAttribute("d", `M ${(CENTER_X-rx).toFixed(1)} ${(CENTER_Y-amount*1.1).toFixed(1)} Q ${(CENTER_X-rx*.42).toFixed(1)} ${(CENTER_Y-amount*2.5).toFixed(1)} ${CENTER_X} ${(CENTER_Y-amount*1.1).toFixed(1)} Q ${(CENTER_X+rx*.42).toFixed(1)} ${(CENTER_Y-amount*2.5).toFixed(1)} ${(CENTER_X+rx).toFixed(1)} ${(CENTER_Y-amount*1.1).toFixed(1)}`);
      upperLip.setAttribute("opacity", String(clamp((amount - 0.04) * 3.8, 0, 0.85)));
    }
    if (lowerLip) {
      lowerLip.setAttribute("d", `M ${(CENTER_X-rx*.76).toFixed(1)} ${(CENTER_Y+ry*.31).toFixed(1)} Q ${CENTER_X} ${(CENTER_Y+ry*1.03).toFixed(1)} ${(CENTER_X+rx*.76).toFixed(1)} ${(CENTER_Y+ry*.31).toFixed(1)}`);
      lowerLip.setAttribute("opacity", clamp(0.25 + amount * 0.62, 0, 0.88).toFixed(2));
    }
    return amount;
  }

  function drawToCanvas(ctx, width, height) {
    // Called only from the 9:16 canvas draw loop while recording.
    const amount = clamp(state.smoothed, 0, 1);
    if (!ctx || !(width > 0) || !(height > 0) || amount < 0.055) return false;
    const sx = width / 1000;
    const sy = height / 1777.7778;
    const x = CENTER_X * sx;
    const y = CENTER_Y * sy;
    const rx = (16 + amount * 18) * sx;
    const ry = (1.15 + amount * 8.8) * sy;
    ctx.save();
    ctx.globalAlpha = clamp((amount - 0.025) / 0.095, 0, 0.96);
    const skin = ctx.createRadialGradient(x, y, 0, x, y, SKIN_PATCH_RX * sx);
    skin.addColorStop(0, "#e8a590");
    skin.addColorStop(0.72, "#e3a08a");
    skin.addColorStop(1, "#d98f79");
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.ellipse(x, y, SKIN_PATCH_RX * sx, SKIN_PATCH_RY * sy, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#4e1926";
    ctx.strokeStyle = "#813344";
    ctx.lineWidth = 1.5 * sx;
    ctx.beginPath();
    ctx.ellipse(x, y + amount * 1.2 * sy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    if (amount > 0.28) {
      ctx.globalAlpha *= clamp((amount - 0.28) * 1.8, 0, 0.86);
      ctx.fillStyle = "#fff2df";
      ctx.beginPath();
      ctx.ellipse(x, y - ry * 0.23 * sy, rx * 0.66, Math.max(0.35 * sy, ry * 0.25), 0, Math.PI, Math.PI * 2);
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
})();
