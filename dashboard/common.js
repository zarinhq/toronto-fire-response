const DRAW = {};                      

const nf = (n) => Math.round(n).toLocaleString("en-CA");                 
const mmss = (s) => {                                                  
  s = Math.round(s);
  return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
};
const sg = (v, d = 1) => (v > 0 ? "+" : v < 0 ? MINUS : "") + Math.abs(v).toFixed(d);
const pc = (v, d = 1) => sg(v, d) + "%";                                 // 29.5 -> "+29.5%"
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));


const TAGS = {
  Measured: '<svg viewBox="0 0 12 12" aria-hidden="true"><circle cx="6" cy="6" r="5" fill="currentColor"/></svg>',
  Estimated: '<svg viewBox="0 0 12 12" aria-hidden="true"><circle cx="6" cy="6" r="4.5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M6 1.5a4.5 4.5 0 0 1 0 9z" fill="currentColor"/></svg>',
  Screening: '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M6 1.5 11 10.5H1z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>',
};
const tag = (kind) => `<span class="tag">${TAGS[kind]}${kind}</span>`;