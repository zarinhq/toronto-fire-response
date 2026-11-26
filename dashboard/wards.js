// The "Wards" tab (2018-2024 only)
DRAW.wards = function () {
  const W = [...D.wards].sort((a, b) => b.adj - a.adj);          // slowest first
  const slower = W.filter((w) => w.lo > 0).length, faster = W.filter((w) => w.hi < 0).length;
  const first = W[0], last = W[W.length - 1];
  const colour = (w) => (w.lo > 0 ? css("--red") : w.hi < 0 ? css("--blue") : css("--ink2"));
  const clear = (w) => w.lo > 0 || w.hi < 0;

  document.getElementById("p-wards").innerHTML = `
    <h2>What about my ward?</h2>
    <p class="sub">Councillors are asked about wards, so here is the same analysis by the current 25 wards. It covers 2018–2024 only (${nf(D.ward_n)} fires), because earlier records use the old 44-ward numbers. ${slower} wards are clearly slower than expected and ${faster} clearly faster. Ward numbers only; the file has no ward names.</p>
    <div class="card">
      <div class="charthead"><div><h3>How much longer than expected, by ward (2018–2024)</h3>
        <p class="cap">Ward ${first.ward} is the slowest at ${pc(first.adj)} (range ${pc(first.lo)} to ${pc(first.hi)}); Ward ${last.ward} the fastest at ${pc(last.adj)}.</p></div>
        <button class="info" data-info="i-wards" aria-expanded="false" aria-label="How to read this chart">i</button></div>
      <div class="infobox" id="i-wards" hidden>Same method as the map, with wards as the groups. The file mixes two ward numbering systems (44 wards before 2018, 25 since), so only 2018 onward can be used, which means fewer incidents per ward and wider ranges. ${tag("Estimated")}</div>
      <div class="legend">
        <span><span class="dot" style="background:${css("--red")}"></span>Clearly slower</span>
        <span><span class="dot" style="background:${css("--blue")}"></span>Clearly faster</span>
        <span><span class="dot" style="border:2px solid ${css("--ink2")}"></span>Not clear</span>
      </div>
      <div class="chart" id="c-wards"></div>
      <details class="tbl"><summary>Show as table</summary><div class="tblscroll"><table id="tb-wards"></table></div></details>
    </div>`;

  const rowH = 26;
  intervalRows(document.getElementById("c-wards"),
    W.map((w) => ({
      label: "Ward " + w.ward, v: w.adj, lo: w.lo, hi: w.hi, text: pc(w.adj, 1), col: colour(w), hollow: !clear(w), r: 5,
      tip: `<b>Ward ${w.ward}</b><br>${nf(w.n)} fires, median wait ${mmss(w.med)}<br>${pc(w.adj)} vs expected (range ${pc(w.lo)} to ${pc(w.hi)})` })),
    { lo: -20, hi: 25, ticks: [-20, -10, 0, 10, 20], fmt: (v) => (v === 0 ? "0" : sg(v, 0) + "%"),
      rowH, labelAbove: false, leftPad: 58, rightPad: 62, label: "Delay beyond expected by ward" });

  // the ward names go on the left, one per row
  const svg = document.querySelector("#c-wards svg");
  svg.insertAdjacentHTML("beforeend", W.map((w, i) =>
    `<text x="0" y="${8 + i * rowH + rowH / 2 + 4}" font-size="13" fill="${css("--ink")}">Ward ${w.ward}</text>`).join(""));

  fillTable(document.getElementById("tb-wards"), ["Ward", "Fires", "Median", "Adjusted delay", "95% range"],
    W.map((w) => ["Ward " + w.ward, nf(w.n), mmss(w.med), pc(w.adj), `${pc(w.lo)} to ${pc(w.hi)}`]));
};