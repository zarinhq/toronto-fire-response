// The "Method and download" tab
DRAW.method = function () {
  const h = hoodById["133"];                         // Centennial Scarborough, the slowest after adjusting

  document.getElementById("p-method").innerHTML = `
    <h2>How this was made</h2>
    
    <div class="grid2" style="margin-top:12px">
      <div class="card"><h3>How the numbers were made</h3>
        <ol class="steps" style="margin-top:12px">
          <li><b>Measure the wait.</b> Alarm time to first-arrival time, for fires and explosions only.</li>
          <li><b>Place each fire.</b> Which neighbourhood it was in, and how far (straight line) from its nearest station.</li>
          <li><b>Learn what is normal.</b> A regression on the logarithm of the wait finds the typical wait for a given distance, time of day, weekday/weekend and year. Standard errors allow for fires in the same neighbourhood being alike.</li>
          <li><b>Find the leftover.</b> For each neighbourhood, average the gap between real and expected waits, then pull it toward zero when there are few incidents.</li>
          <li><b>Check it.</b> Re-run it many ways, and against shuffled neighbourhood labels.</li>
        </ol></div>
      <div class="card"><h3>A worked example</h3>
        <p class="note">Take <b>${esc(h.name)}</b>.</p>
        <ol class="steps">
          <li>Its fires are about <b>${h.km.toFixed(1)} km</b> from the nearest station on average.</li>
          <li>For that distance, time of day and year, the model expects a certain wait.</li>
          <li>The real waits run about <b>${pc(h.adj, 0)}</b> above that expectation (range ${pc(h.lo, 1)} to ${pc(h.hi, 1)}, from ${nf(h.n)} fires).</li>
          <li>The range sits entirely above zero, so it counts as <b>clearly slower than expected</b>. A neighbourhood whose range straddles zero would be called “not clear”.</li>
        </ol></div>
    </div>
    <div style="margin-top:14px">
      <div class="card"><h3>Download the results</h3>
        <p class="note">One row per neighbourhood: the adjusted delay with its range, median wait, number of incidents, average distance and the census measures.</p>
        <p><button class="btn" id="dl" type="button">Download neighbourhood results (CSV)</button></p>
        <p class="note" id="dlmsg" role="status"></p>
            <p class="note" style="margin-bottom:0">Everything here can be rebuilt from the City’s open files. The code and the instructions are in the <a href="https://github.com/zarinhq/toronto-fire-response"> GitHub repository</a>.</p></div>
    </div>
    <div class="card" style="margin-top:14px"><h3>Words used here</h3>
      <p class="note"><b>Raw wait:</b> the typical (median) wait with nothing adjusted. <b>Adjusted delay:</b> how much longer (or shorter) the typical wait is than the model expects for that distance, time of day and year. <b>Clearly slower:</b> the 95% range is entirely above zero. <b>Shrinkage:</b> a way of not over-reading neighbourhoods with few incidents. <b>Median:</b> the middle value, half of waits are shorter. <b>p90:</b> nine in ten waits are shorter than this.</p></div>`;

  // CSV download: build the file in the browser from the data already on the page
  document.getElementById("dl").addEventListener("click", () => {
    const cols = [["neighbourhood_id", "id"], ["neighbourhood_name", "name"], ["incidents", "n"], ["adjusted_delay_pct", "adj"],
      ["range_low_pct", "lo"], ["range_high_pct", "hi"], ["median_wait_s", "med"], ["mean_distance_km", "km"],
      ["clearly_slower", "slow"], ["clearly_faster", "fast"], ["slow_and_high_risk_screen", "five"],
      ["pct_built_before_1980", "old"], ["pct_apt_5plus", "apt"], ["pct_renters", "rent"], ["pct_65_plus", "p65"], ["median_income", "inc"]];
    const q = (v) => (v == null ? "" : typeof v === "string" ? '"' + v.replace(/"/g, '""') + '"' : v);
    const csv = cols.map((c) => c[0]).join(",") + "\n" + ranked.map((n) => cols.map((c) => q(n[c[1]])).join(",")).join("\n");
    const msg = document.getElementById("dlmsg");
    try {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
      a.download = "toronto_fire_neighbourhood_results.csv";
      document.body.appendChild(a); a.click(); a.remove();
      msg.textContent = `Downloaded ${ranked.length} rows.`;
    } catch (e) {
      msg.textContent = "Your browser blocked the download. Open this page in a normal browser tab and try again.";
    }
  });


};