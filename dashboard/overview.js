DRAW.overview = function () {
  const KN = D.kn;
  const low = Math.round(KN.distance_range_low);
  const high = Math.round(KN.distance_range_high);

  const tiles = [
    [mmss(D.overall.median_s),
      `typical wait for the first truck (median), across ${nf(D.overall.n)} fires, 2011–2024. Nine in ten are under ${mmss(D.overall.p90_s)}.`,
      "Measured"],
    [pc(KN.distance_pct_per_km),
      `longer for each extra kilometre from the nearest station. About ${low}–${high}% depending on how distance is measured.`,
      "Estimated"],
    [`${KN.clearly_slow_count} and ${KN.clearly_fast_count}`,
      "of 158 neighbourhoods are clearly slower and clearly faster than expected once distance and time are counted.",
      "Estimated"],
    [String(KN.slow_and_high_risk.length),
      "neighbourhoods are clearly slower than expected and also in the top quarter on two building-risk measures.",
      "Screening"],
  ];

  document.getElementById("p-overview").innerHTML = `
    <div class="tiles">
      ${tiles.map(([v, l, t]) => `<div class="tile"><div class="v">${v}</div><div class="l">${l}</div><div class="tagrow">${tag(t)}</div></div>`).join("")}
    </div>
    <div class="how">
      <h3>How to read this page</h3>
      <p><b>The wait</b> is the time from the fire alarm being recorded to the first Toronto Fire truck arriving. It includes dispatch and getting out the door, not just driving.</p>
      <p><b>“Slower than expected”</b> means slower than distance, time of day and year predict, so a neighbourhood far from a station is not blamed for the distance. Every estimate comes with a range, and every number is tagged:</p>
      <div class="pill-row">
        <span>${tag("Measured")} counted directly from the data</span>
        <span>${tag("Estimated")} from a model, with a range</span>
        <span>${tag("Screening")} a rough first look, not a finding</span>
      </div>
    </div>`;
};