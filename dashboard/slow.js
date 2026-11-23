// The "Slow list" tab
DRAW.slow = function () {
  const both = new Set(D.raw10.filter((id) => D.adj10.includes(id)));

  const item = (id, i, value, detail) => {
    const h = hoodById[id], shared = both.has(id);
    return `<li class="${shared ? "both" : ""}"><span class="r">${i + 1}</span>
      <span>${esc(h.name)}${shared ? " " + `<span class="tag">in both lists</span>` : ""}<br><span class="note">${detail}</span></span>
      <b>${value}</b></li>`;
  };

  const rawList = D.raw10.map((id, i) => {
    const h = hoodById[id];
    return item(id, i, mmss(h.med), `${h.km.toFixed(1)} km from the nearest station on average, ${nf(h.n)} fires`);
  }).join("");

  const adjList = D.adj10.map((id, i) => {
    const h = hoodById[id];
    return item(id, i, pc(h.adj, 0), `range ${pc(h.lo, 1)} to ${pc(h.hi, 1)}, ${h.km.toFixed(1)} km, ${nf(h.n)} fires`);
  }).join("");

  const five = D.hoods.filter((h) => h.five).sort((a, b) => b.adj - a.adj).map((h) => `
    <div class="card five"><h3>${esc(h.name)}</h3>
      <p style="margin:.2em 0 .6em">Waits about <b>${pc(h.adj, 0)}</b> longer than expected (range ${pc(h.lo, 1)} to ${pc(h.hi, 1)}), based on ${nf(h.n)} fires.</p>
      <p class="note" style="margin:0">${h.old.toFixed(0)}% of homes built before 1980 · ${h.apt.toFixed(0)}% in apartments of 5+ storeys · ${h.rent.toFixed(0)}% renters · ${h.p65.toFixed(0)}% aged 65+${h.inc ? ` · median income $${nf(h.inc)}` : ""}</p>
      <p style="margin:10px 0 0"><button class="chip" type="button" data-show="${h.id}">Show on map</button></p>
    </div>`).join("");

  document.getElementById("p-slow").innerHTML = `
    <h2>Why “slowest” changes once distance is counted</h2>
    <p class="sub">Ranking by raw wait mostly picks the neighbourhoods furthest from a station. Ranking by delay beyond what distance explains picks different places. Only ${both.size === 1 ? "one neighbourhood is" : both.size + " neighbourhoods are"} in both top-10 lists.</p>
    <div class="grid2 list">
      <div class="card"><h3>Longest raw wait</h3><p class="cap">Middle wait per neighbourhood. ${tag("Measured")}</p><ol>${rawList}</ol></div>
      <div class="card"><h3>Slowest beyond what distance explains</h3><p class="cap">Adjusted delay, with 95% range. ${tag("Estimated")}</p><ol>${adjList}</ol></div>
    </div>
    <h2 style="margin-top:28px">Five to watch</h2>
    <p class="sub">These five are clearly slower than expected <i>and</i> in the top quarter on two crude building-risk measures (share of homes built before 1980, share in apartment buildings of five or more storeys). This is a screening list for a closer look, not a finding that anyone is at higher risk. ${tag("Screening")}</p>
    <div class="grid2">${five}</div>`;
};

// "Show on map" buttons: select that neighbourhood and switch to the map tab.
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-show]");
  if (!b) return;
  selectedId = b.dataset.show;
  show("map");
  scrollTo({ top: 0 });
});