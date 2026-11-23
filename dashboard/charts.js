
// Wrap drawing instructions in an <svg> tag of the right size.
function svgWrap(w, h, inner, label) {
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(label)}">${inner}</svg>`;
}

// Rows of "dot with a line through it": the dot is the estimate, the line is its 95% range.
// rows: [{label, v, lo, hi, text, col, hollow, r, tip}]
function intervalRows(el, rows, o) {
  const { lo, hi, ticks, fmt, rowH = 40, labelAbove = true, label = "", leftPad = 8, rightPad = 64 } = o;
  const w = Math.max(280, el.clientWidth), top = 8, bot = 30;
  const h = top + rows.length * rowH + bot;
  const px = (v) => leftPad + ((v - lo) / (hi - lo)) * (w - leftPad - rightPad);
  let s = "";
  ticks.forEach((t) => {
    s += `<line x1="${px(t)}" x2="${px(t)}" y1="${top}" y2="${h - bot}" stroke="${t === 0 ? css("--ink2") : css("--line")}" ${t === 0 ? 'stroke-dasharray="3 3"' : ""}/>` +
         `<text x="${px(t)}" y="${h - bot + 16}" text-anchor="middle" font-size="12" fill="${css("--muted")}">${fmt(t)}</text>`;
  });
  rows.forEach((r, i) => {
    const y = top + i * rowH, cy = labelAbove ? y + rowH - 13 : y + rowH / 2, col = r.col || css("--ink2");
    s += `<g data-tip="${esc(r.tip || "")}"><rect x="0" y="${y}" width="${w}" height="${rowH}" fill="transparent"/>` +
      (labelAbove ? `<text x="${leftPad}" y="${y + 14}" font-size="13" fill="${css("--ink")}">${esc(r.label)}</text>` : "") +
      `<line x1="${px(Math.max(lo, r.lo))}" x2="${px(Math.min(hi, r.hi))}" y1="${cy}" y2="${cy}" stroke="${col}" stroke-width="2.5" stroke-linecap="round"/>` +
      (r.hollow
        ? `<circle cx="${px(r.v)}" cy="${cy}" r="${r.r || 5}" fill="${css("--surface")}" stroke="${col}" stroke-width="2"/>`
        : `<circle cx="${px(r.v)}" cy="${cy}" r="${r.r || 5}" fill="${col}" stroke="${css("--surface")}" stroke-width="2"/>`) +
      `<text x="${w - rightPad + 8}" y="${cy + 4}" font-size="13" font-weight="600" fill="${css("--ink")}">${r.text}</text></g>`;
  });
  el.innerHTML = svgWrap(w, h, s, label);
  el.onpointermove = (e) => {                       // hover box for any row that has one
    const g = e.target.closest("[data-tip]");
    if (g && g.getAttribute("data-tip")) showTip(g.getAttribute("data-tip"), e); else hideTip();
  };
  el.onpointerleave = hideTip;
}

// Fill a <table> from a list of column names and rows.
function fillTable(el, head, rows) {
  el.innerHTML = "<thead><tr>" + head.map((h, i) => `<th class="${i ? "num" : ""}">${h}</th>`).join("") + "</tr></thead><tbody>" +
    rows.map((r) => "<tr>" + r.map((c, i) => `<td class="${i ? "num" : ""}">${c}</td>`).join("") + "</tr>").join("") + "</tbody>";
}

// Vertical bars with the value written above each bar.
// items: [{label, sub, value, text, tip}]
function barChart(el, items, label) {
  const w = Math.max(260, el.clientWidth), h = 250, top = 30, bot = 40, L = 8, R = 8;
  const n = items.length, gap = Math.max(14, w * 0.04);
  const bw = (w - L - R - gap * (n - 1)) / n;
  const max = Math.max(...items.map((i) => i.value)) * 1.08;
  let s = `<line x1="${L}" x2="${w - R}" y1="${h - bot}" y2="${h - bot}" stroke="${css("--axis")}"/>`;
  items.forEach((it, i) => {
    const x = L + i * (bw + gap), bh = (it.value / max) * (h - bot - top), y = h - bot - bh;
    s += `<g data-tip="${esc(it.tip)}"><rect x="${x}" y="${y}" width="${bw}" height="${bh}" rx="4" fill="${css("--blue")}"/>` +
         `<rect x="${x}" y="${top - 8}" width="${bw}" height="${h - bot - top + 8}" fill="transparent"/></g>` +
         `<text x="${x + bw / 2}" y="${y - 8}" text-anchor="middle" font-size="15" font-weight="600" fill="${css("--ink")}">${it.text}</text>` +
         `<text x="${x + bw / 2}" y="${h - bot + 18}" text-anchor="middle" font-size="12.5" fill="${css("--ink2")}">${esc(it.label)}</text>` +
         (it.sub ? `<text x="${x + bw / 2}" y="${h - bot + 33}" text-anchor="middle" font-size="11.5" fill="${css("--muted")}">${esc(it.sub)}</text>` : "");
  });
  el.innerHTML = svgWrap(w, h, s, label);
  el.onpointermove = (e) => {
    const g = e.target.closest("[data-tip]");
    if (g) showTip(g.getAttribute("data-tip"), e); else hideTip();
  };
  el.onpointerleave = hideTip;
}