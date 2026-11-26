//Data quality tab
const VARIANT_NAMES = {
  "baseline": "Main model",
  "assigned-station distance": "Distance to the station that responded",
  "waits of 2 min or more": "Drop waits under 2 minutes",
  "years 2011 to 2022": "Drop 2023 and 2024",
  "flexible distance (bands)": "Distance in bands, not a straight line",
  "with distance squared": "Add a curve for distance",
};

// hover tooltips for charts drawn by hand (the shared chart helpers set this up themselves)
function hoverTips(el) {
  el.onpointermove = (e) => {
    const g = e.target.closest("[data-tip]");
    if (g) showTip(g.getAttribute("data-tip"), e); else hideTip();
  };
  el.onpointerleave = hideTip;
}

DRAW.quality = function () {
  document.getElementById("p-quality").innerHTML = `
    <h2>Data quality and limits</h2>
    <p class="sub">What went into the numbers, what was thrown away, and what could still be wrong.</p>
    <div class="grid2">
      <div class="card"><h3>From raw file to analysis</h3>
        <p class="cap">Only fires and explosions (types 01 and 02) with waits between 10 seconds and 1 hour are kept. ${tag("Measured")}</p>
        <table id="tb-audit"></table></div>
      <div class="card"><div class="charthead"><div><h3>Very short waits jumped in 2023</h3><p class="cap" id="cap-short"></p></div>
        <button class="info" data-info="i-short" aria-expanded="false" aria-label="How to read this chart">i</button></div>
        <div class="infobox" id="i-short" hidden>Share of each year’s incidents with a recorded wait under two minutes. Before 2023 it is about 1%. In 2023 and 2024 it is about 6–7%, which looks like a change in how times are recorded rather than a change in real response. Results are unchanged when these waits are dropped (see the checks). ${tag("Measured")}</div>
        <div class="chart" id="c-short"></div></div>
    </div>
    <div class="grid2" style="margin-top:14px">
      <div class="card"><h3>Does the ranking survive different choices?</h3>
        <p class="cap">Each row re-does the neighbourhood ranking a different way. ${tag("Estimated")}</p>
        <div class="tblscroll" style="max-height:none"><table id="tb-rank"></table></div></div>
      <div class="card"><h3>Is it more than chance?</h3><p class="cap" id="shuffle-text"></p><div class="chart" id="c-shuffle"></div></div>
    </div>`;

  // 1. the cleaning table
  fillTable(document.getElementById("tb-audit"), ["Step", "Rows removed", "Rows left"],
    D.audit.map((r) => [esc(r.step), r.rows_removed ? nf(r.rows_removed) : "–", nf(r.rows_left)]));

  // 2. share of very short waits, by year
  const S = D.short, el = document.getElementById("c-short");
  const w = Math.max(280, el.clientWidth), h = 230, top = 26, bot = 34, gap = 3;
  const bw = (w - 16 - gap * (S.length - 1)) / S.length, max = Math.max(...S.map((r) => r.pct)) * 1.15;
  let s = `<line x1="8" x2="${w - 8}" y1="${h - bot}" y2="${h - bot}" stroke="${css("--axis")}"/>`;
  S.forEach((r, i) => {
    const x = 8 + i * (bw + gap), bh = (r.pct / max) * (h - bot - top), y = h - bot - bh, recent = r.year >= 2023;
    s += `<g data-tip="<b>${r.year}</b><br>${r.pct.toFixed(1)}% of ${nf(r.n)} fires waited under 2 minutes">
      <rect x="${x}" y="${y}" width="${bw}" height="${bh}" rx="3" fill="${recent ? css("--red") : css("--bar")}"/>
      <rect x="${x}" y="${top}" width="${bw}" height="${h - bot - top}" fill="transparent"/></g>`;
    if (recent) s += `<text x="${x + bw / 2}" y="${y - 6}" text-anchor="middle" font-size="12.5" font-weight="600" fill="${css("--ink")}">${r.pct.toFixed(1)}%</text>`;
    if (i % (w < 420 ? 2 : 1) === 0)
      s += `<text x="${x + bw / 2}" y="${h - bot + 16}" text-anchor="middle" font-size="11.5" fill="${css("--ink2")}">${w < 420 ? String(r.year).slice(2) : r.year}</text>`;
  });
  el.innerHTML = svgWrap(w, h, s, "Share of waits under two minutes by year");
  hoverTips(el);
  const pct = (y) => S.find((r) => r.year === y).pct.toFixed(1);
  document.getElementById("cap-short").textContent = `${pct(2022)}% in 2022, ${pct(2023)}% in 2023, ${pct(2024)}% in 2024.`;

  // 3. does the ranking survive other choices?
  fillTable(document.getElementById("tb-rank"), ["Variant", "Rank agreement", "Top-10 shared", "Clearly slow", "Five still slow"],
    D.rob_rank.map((r) => [VARIANT_NAMES[r.variant] || esc(r.variant), r.rank_corr.toFixed(2), r.top10_overlap + " of 10",
      r.clearly_slow, r.five_still_clearly_slow + " of " + r.of_how_many]));

  // 4. the shuffle test: real data against shuffled neighbourhood labels
  const sh = D.shuffle, KN = D.kn;
  document.getElementById("shuffle-text").textContent =
    `If the neighbourhood labels carry no information, shuffling them should give a similar picture. It does not: ${KN.shuffle_real_flagged} neighbourhoods are flagged in the real data, against ${KN.shuffle_mean_flagged.toFixed(1)} on average (and at most ${sh[2].flagged}) after shuffling.`;
  const items = [
    { label: "Real data", v: sh[0].flagged, col: css("--red") },
    { label: "Shuffled, worst run", v: sh[2].flagged, col: css("--bar") },
    { label: "Shuffled, average", v: sh[1].flagged, col: css("--bar") },
  ];
  const sel = document.getElementById("c-shuffle"), ww = Math.max(260, sel.clientWidth), rh = 40;
  const wide = ww >= 420, lw = wide ? 150 : 0, hh = items.length * rh + 8 + (wide ? 0 : items.length * 8);
  const mx = Math.max(...items.map((i) => i.v)), val = (v) => (v % 1 ? v.toFixed(1) : v);
  let ss = "";
  items.forEach((it, i) => {
    const y = 4 + i * rh, len = (ww - lw - 50) * (it.v / mx);
    ss += `<g data-tip="<b>${it.label}</b><br>${val(it.v)} neighbourhoods flagged as clearly slower or faster">` +
      (wide ? `<text x="0" y="${y + 23}" font-size="13" fill="${css("--ink")}">${it.label}</text>`
            : `<text x="0" y="${y + 11}" font-size="12" fill="${css("--ink2")}">${it.label}</text>`) +
      `<rect x="${lw}" y="${wide ? y + 6 : y + 16}" width="${Math.max(2, len)}" height="${wide ? 24 : 16}" rx="4" fill="${it.col}"/>` +
      `<text x="${lw + len + 8}" y="${wide ? y + 24 : y + 29}" font-size="14" font-weight="600" fill="${css("--ink")}">${val(it.v)}</text></g>`;
  });
  sel.innerHTML = svgWrap(ww, hh, ss, "Neighbourhoods flagged: real data against shuffled labels");
  hoverTips(sel);

  drawCaveats();
};