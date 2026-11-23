// The "What drives the wait" tab.
DRAW.drivers = function () {
  const KN = D.kn;
  const q = D.quarter, closest = q[0], furthest = q[3];
  const order = ["morning", "afternoon", "evening", "night"];
  const names = { morning: "Morning", afternoon: "Afternoon", evening: "Evening", night: "Night" };
  const hours = { morning: "6am–noon", afternoon: "noon–6pm", evening: "6pm–midnight", night: "midnight–6am" };
  const day = (k) => D.daypart.find((r) => r.daypart === k);
  const others = order.filter((k) => k !== "night");
  const nightExtra = Math.round(day("night").median_s - others.reduce((a, k) => a + day(k).median_s, 0) / others.length);
  const qLabels = ["Closest quarter", "Second", "Third", "Furthest quarter"];

  document.getElementById("p-drivers").innerHTML = `
    <h2>What drives the wait</h2>
    <p class="sub">Distance to the nearest station does most of the work. Night makes it worse. Weekends barely matter.</p>
    <div class="grid2">
      <div class="card">
        <div class="charthead"><div><h3>Median wait by distance to the nearest station</h3>
          <p class="cap">Fires furthest from a station wait about ${((furthest.median_s - closest.median_s) / 60).toFixed(1)} minutes longer at the median.</p></div>
          <button class="info" data-info="i-dist" aria-expanded="false" aria-label="How to read this chart">i</button></div>
        <div class="infobox" id="i-dist" hidden>Fires are split into four equal groups by how far the incident was from its nearest fire station in a straight line. Each bar is the middle wait in that group. ${tag("Measured")}</div>
        <div class="chart" id="c-dist"></div>
        <details class="tbl"><summary>Show as table</summary><table id="tb-dist"></table></details>
      </div>
      <div class="card">
        <div class="charthead"><div><h3>Median wait by time of day</h3>
          <p class="cap">Nights are about ${nightExtra} seconds slower at the median, and the model puts night at ${pc(KN.night_pct, 0)} after distance is counted.</p></div>
          <button class="info" data-info="i-day" aria-expanded="false" aria-label="How to read this chart">i</button></div>
        <div class="infobox" id="i-day" hidden>Morning is 6am to noon, afternoon noon to 6pm, evening 6pm to midnight, night midnight to 6am. Bars show the middle wait in each period. ${tag("Measured")}</div>
        <div class="chart" id="c-day"></div>
        <details class="tbl"><summary>Show as table</summary><table id="tb-day"></table></details>
      </div>
    </div>`;

  barChart(document.getElementById("c-dist"),
    q.map((r, i) => ({ label: qLabels[i], sub: `${r.km_min.toFixed(1)}–${r.km_max.toFixed(1)} km`, value: r.median_s, text: mmss(r.median_s),
      tip: `<b>${qLabels[i]}</b><br>${nf(r.n)} fires, ${r.km_min.toFixed(2)}–${r.km_max.toFixed(2)} km from a station<br>Median wait ${mmss(r.median_s)}` })),
    "Median wait by distance group");
  barChart(document.getElementById("c-day"),
    order.map((k) => ({ label: names[k], sub: hours[k], value: day(k).median_s, text: mmss(day(k).median_s),
      tip: `<b>${names[k]}</b> (${hours[k]})<br>${nf(day(k).n)} fires<br>Median wait ${mmss(day(k).median_s)}, 9 in 10 under ${mmss(day(k).p90_s)}` })),
    "Median wait by time of day");

  fillTable(document.getElementById("tb-dist"), ["Distance group", "Fires", "Distance range (km)", "Median wait"],
    q.map((r, i) => [qLabels[i], nf(r.n), `${r.km_min.toFixed(2)}–${r.km_max.toFixed(2)}`, mmss(r.median_s)]));
  fillTable(document.getElementById("tb-day"), ["Time of day", "Fires", "Median", "Slowest 1 in 10 over"],
    order.map((k) => [names[k], nf(day(k).n), mmss(day(k).median_s), mmss(day(k).p90_s)]));
drawForest();
};