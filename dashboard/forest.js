// The third chart on the drivers tab
const CHECK_NAMES = {
  "baseline (nearest station)": "Main estimate (nearest station)",
  "assigned station": "Distance to the station that responded",
  "assigned is also nearest": "Only fires where the responding station was the nearest",
  "assigned, within 5 km": "Responding station, fires within 5 km only",
  "waits 10 to 900 s": "Ignore waits over 15 minutes",
  "waits 60 to 3600 s": "Ignore waits under 1 minute",
  "waits 120 to 3600 s": "Ignore waits under 2 minutes",
  "waits 120 to 900 s": "Ignore waits under 2 and over 15 minutes",
};

function drawForest() {
  const KN = D.kn;
  const low = Math.round(KN.distance_range_low), high = Math.round(KN.distance_range_high);
  const checks = D.rob_dist.filter((r) => CHECK_NAMES[r.check]);   // the "same rows" duplicate is only in the table

  document.getElementById("p-drivers").insertAdjacentHTML("beforeend", `
    <div class="card" style="margin-top:14px">
      <div class="charthead"><div><h3>How much longer each extra kilometre adds, under ${checks.length - 1} variations</h3>
        <p class="cap">The main estimate (filled dot) is ${pc(KN.distance_pct_per_km)} per km. Every variation agrees on direction; the size runs ${low}–${high}% depending on how distance is measured.</p></div>
        <button class="info" data-info="i-forest" aria-expanded="false" aria-label="How to read this chart">i</button></div>
      <div class="infobox" id="i-forest" hidden>Each row repeats the main estimate a different way (different cut-offs for unusual waits, or measuring distance to the station that responded instead of the nearest one). The dot is the best estimate; the line is the 95% range. The direction never changes; the size depends on how distance is measured. ${tag("Estimated")}</div>
      <div class="chart" id="c-forest"></div>
      <details class="tbl"><summary>Show as table</summary><table id="tb-forest"></table></details>
    </div>`);

  intervalRows(document.getElementById("c-forest"),
    checks.map((r, i) => ({
      label: CHECK_NAMES[r.check], v: r.per_km_pct, lo: r.lo, hi: r.hi, text: pc(r.per_km_pct),
      col: css("--bar"), r: i ? 5 : 7, hollow: i > 0,
      tip: `<b>${esc(CHECK_NAMES[r.check])}</b><br>${nf(r.n)} fires<br>${pc(r.per_km_pct)} per km (95% range ${pc(r.lo)} to ${pc(r.hi)})` })),
    { lo: 10, hi: 40, ticks: [10, 15, 20, 25, 30, 35, 40], fmt: (v) => v + "%", rowH: 42, leftPad: 20,
      label: "Effect of distance under different checks" });

  fillTable(document.getElementById("tb-forest"), ["Check", "Fires", "Per km", "95% range"],
    D.rob_dist.map((r) => [esc(CHECK_NAMES[r.check] || r.check), nf(r.n), pc(r.per_km_pct), `${pc(r.lo)} to ${pc(r.hi)}`]));
}