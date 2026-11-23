const DRAW = {};
const MINUS = "−";                  // typographic minus sign, used in labels like "−9%"

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

// ---- colour helpers -------------------------------------------------------
const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const hex2rgb = (h) => [1, 3, 5].map((i) => parseInt(h.replace("#", "").substr(i - 1, 2), 16));
function mix(a, b, t) {                  // blend colour a toward colour b by t (0 to 1)
  const A = hex2rgb(a), B = hex2rgb(b);
  return "rgb(" + A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(",") + ")";
}

// ---- the little hover box ---------------------------------------------------
const tipEl = document.getElementById("tip");
function showTip(html, e) {
  tipEl.innerHTML = html;
  tipEl.style.opacity = 1;
  let x = e.clientX + 14, y = e.clientY + 14;
  if (x + tipEl.offsetWidth > innerWidth - 8) x = e.clientX - tipEl.offsetWidth - 14;
  if (y + tipEl.offsetHeight > innerHeight - 8) y = e.clientY - tipEl.offsetHeight - 14;
  tipEl.style.left = x + "px";
  tipEl.style.top = y + "px";
}
function hideTip() { tipEl.style.opacity = 0; }
document.addEventListener("scroll", hideTip, { passive: true });

// The little "i" buttons: click one to show or hide its explanation box.
document.addEventListener("click", (e) => {
  const b = e.target.closest(".info");
  if (!b) return;
  const box = document.getElementById(b.dataset.info);
  box.hidden = !box.hidden;
  b.setAttribute("aria-expanded", !box.hidden);
});