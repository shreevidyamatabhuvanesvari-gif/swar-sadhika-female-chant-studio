/* Single entry bridge: preserves app.js and invokes the additive Part 2 loader. */
import './app.js';
import { boot } from './swar-sadhika-module-loader-part2.js';

async function startPart2() {
  const report = await boot({
    context: Object.freeze({
      app: 'Swar-Sadhika Female Chant Studio',
      entry: 'main',
      host: typeof location === 'undefined' ? '' : location.hostname,
    }),
  });
  if (report.failed.length) {
    console.warn('[Swar-Sadhika Part 2] कुछ मॉड्यूल सक्रिय नहीं हुए:', report.failed);
  }
  if (!report.ok) {
    console.error('[Swar-Sadhika Part 2] किसी आवश्यक मॉड्यूल या registry में त्रुटि है:', report);
  } else {
    console.info('[Swar-Sadhika Part 2] Loader report:', report);
  }
}

function scheduleStart() {
  void startPart2().catch((error) => console.error('[Swar-Sadhika Part 2] Bootstrap failed:', error));
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scheduleStart, { once: true });
  else scheduleStart();
}
