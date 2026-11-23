//Second half of the Data quality tab
function drawCaveats() {
  const KN = D.kn, EX = D.extra;
  const ns = D.hoods.map((h) => h.n), nMin = Math.min(...ns), nMax = Math.max(...ns);

  const caveats = [
    ["Arrival time covers more than driving",
     "The wait includes dispatch and turnout. A station with slower turnout looks slower here even if its trucks drive fast. Records also show the first unit that arrived, which is not always the nearest."],
    ["A subset of calls",
     `The file holds about 1,900 incidents a year, not every call. Small neighbourhoods have ${nMin}–${nMax} incidents each, which is why ranges are wide.`],
    ["Straight-line distance",
     `Distance is as the crow flies, from the incident to the nearest station. Barriers like ravines and highways are not modelled. Measured to the station that actually responded, the effect is smaller (about ${Math.round(KN.distance_range_low)}% per km).`],
    ["Locations are approximate",
     `${Math.round(EX.share_at_shared_location * 100)}% of incidents share a location with at least one other (up to ${EX.max_at_one_point} at one point), so coordinates are often an address or intersection, not a doorstep. ${EX.unplaced_incidents} incidents could not be placed in a neighbourhood and are left out; their median wait is longer (${mmss(EX.unplaced_median_wait_s)} against ${mmss(EX.placed_median_wait_s)}).`],
    ["Station codes that do not match",
     "26 incidents name a station that is not in the station list (23 of them use code 424), so they have no assigned-station distance. They stay in the main analysis, which uses the nearest station."],
    ["The risk measures are crude",
     "The building-risk screen uses two census measures from 2021, applied to every year back to 2011. It points at places worth a closer look and says nothing about actual fire risk."],
  ];

  const checks = D.checks, passed = (c) => c.passed === true || c.passed === "True";
  const detail = (c) => (c.detail == null || (typeof c.detail === "number" && Number.isNaN(c.detail)) ? "" : c.detail);

  document.getElementById("p-quality").insertAdjacentHTML("beforeend", `
    <div class="grid2" style="margin-top:14px">${caveats.map(([t, b]) =>
      `<div class="card"><h3>${t}</h3><p class="note" style="margin:.3em 0 0">${b}</p></div>`).join("")}</div>
    <div class="card" style="margin-top:14px"><h3>Automatic checks</h3>
      <p class="cap">${checks.filter(passed).length} of ${checks.length} automatic checks pass every time the analysis is rebuilt; if one fails, the run stops.</p>
      <details class="tbl"><summary>Show all checks</summary><div class="tblscroll"><table id="tb-checks"></table></div></details></div>`);

  fillTable(document.getElementById("tb-checks"), ["Check", "Result", "Detail"],
    checks.map((c) => [esc(c.check), passed(c) ? "Pass" : "FAIL", esc(detail(c))]));
}