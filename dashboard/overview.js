// The Overview tab: key numbers, "How to read this page", the three answers.
DRAW.overview = function () {
  const KN = D.kn;
  const low = Math.round(KN.distance_range_low);
  const high = Math.round(KN.distance_range_high);

  // --- key numbers ---------------------------
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

  // --- the three answers ---------------------------------------------------
  const closest = D.quarter[0];
  const furthest = D.quarter[3];
  const answers = [
    ["Does where you live change the wait?",
      `Yes. The middle wait is <b>${mmss(closest.median_s)}</b> for fires closest to a station and <b>${mmss(furthest.median_s)}</b> for the furthest quarter, about ${((furthest.median_s - closest.median_s) / 60).toFixed(1)} minutes more.`,
      "These are counts from the data, not a model.",
      "Measured"],
    ["What explains most of it?",
      `Distance to the nearest station. Each extra kilometre adds about <b>${pc(KN.distance_pct_per_km, 0)}</b> (range ${Math.round(KN.distance_ci_lo)}–${Math.round(KN.distance_ci_hi)}%). Night adds about <b>${pc(KN.night_pct, 0)}</b>. Weekends make no clear difference.`,
      `Fairly sure of the direction, less sure of the size: ${low}–${high}% across the variations tested.`,
      "Estimated"],
    ["Do some places wait longer than distance explains?",
      `Yes: <b>${KN.clearly_slow_count}</b> of ${D.hoods.length} neighbourhoods are clearly slower and <b>${KN.clearly_fast_count}</b> clearly faster, ${KN.clearly_slow_count + KN.clearly_fast_count} in all. When the neighbourhood labels are shuffled, almost none stand out (an average of ${KN.shuffle_mean_flagged.toFixed(2)}, never more than ${D.shuffle.find((r) => r.what === "shuffled maximum").flagged}).`,
      "Fairly sure the differences are real. Each neighbourhood’s own number is less certain, which is why ranges are shown.",
      "Estimated"],
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
    </div>

    <h2>The short version</h2>
    <p class="sub">Each answer says how sure we are.</p>
    <div class="grid3">
      ${answers.map(([q, a, s, k]) => `<div class="card qa"><p class="q">${q}</p><p class="a">${a}</p><p class="s">${tag(k)} ${s}</p></div>`).join("")}
    </div>

    <div class="card" style="margin-top:14px">
      <h3>What this page does not say</h3>
      <p class="note" style="margin:.3em 0 0">“Slower than expected” is not the same as “underserved”, and nothing here says anyone was put at risk. The file covers a subset of calls (about 1,900 a year), the census data is from 2021, and the risk measures are crude. The Data quality tab shows what could change the numbers.</p>
    </div>`;
};