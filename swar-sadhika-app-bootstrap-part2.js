/* Single entry bridge: preserves the existing app.js and loads registered Part 2 modules. */
import './app.js';
import { boot } from './swar-sadhika-module-loader-part2.js';
async function startPart2(){const report=await boot({context:Object.freeze({app:'Swar-Sadhika Female Chant Studio',entry:'main',host:location.hostname})});if(!report.ok)console.error('[Swar-Sadhika Part 2] कुछ वैकल्पिक मॉड्यूल सक्रिय नहीं हुए; मुख्य ऐप को अलग से न बदलें।',report);else console.info('[Swar-Sadhika Part 2] Module loader result:',report);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>void startPart2(),{once:true});else void startPart2();
