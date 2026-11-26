// The Overview tab: the opening, three plain questions, the race, the numbers behind it.
DRAW.overview = function () {
  const KN = D.kn, sh = D.shuffle;
  const low = Math.round(KN.distance_range_low);
  const high = Math.round(KN.distance_range_high);
  const closest = D.quarter[0];
  const furthest = D.quarter[3];
  const flagged = KN.clearly_slow_count + KN.clearly_fast_count;

  // --- three plain questions -------------------------------------------------
  const questions = [
    ["Does where you live change the wait?",
      `Yes. Fires far from a station wait <b>${mmss(furthest.median_s - closest.median_s)} longer</b> than fires close to one (${mmss(furthest.median_s)} against ${mmss(closest.median_s)}).`,
      "These are counts from the data, not a model.",
      "Measured", "map", "See the map →"],
    ["Why?",
      `Mostly distance. Each extra kilometre from the nearest station adds about <b>${Math.round(KN.distance_pct_per_km)}%</b> to the wait. Night adds about ${Math.round(KN.night_pct)}%. Weekends make no clear difference.`,
      `Fairly sure of the direction, less sure of the size: ${low}–${high}% depending on how distance is measured.`,
      "Estimated", "drivers", "See the factors →"],
    ["Does anyone wait longer than they should?",
      `Yes. <b>${KN.clearly_slow_count}</b> of 158 neighbourhoods wait longer than their distance explains, and <b>${KN.clearly_fast_count}</b> wait less. <b>${KN.slow_and_high_risk.length}</b> deserve a closer look.`,
      `Fairly sure the differences are real: with the labels shuffled, almost none stand out (${sh[1].flagged.toFixed(2)} on average, never more than ${sh[2].flagged}), against ${flagged} in the real data.`,
      "Estimated", "slow", "See the slow list →"],
  ];

  document.getElementById("p-overview").innerHTML = heroHTML() + `
    <h2 class="lead">The answer in three questions</h2>
    <div class="grid3">
      ${questions.map(([q, a, s, k, go, link]) => `<div class="card qa"><p class="q">${q}</p><p class="a big">${a}</p><p class="s">${s} ${tag(k)}</p><button class="chip go" type="button" data-go="${go}">${link}</button></div>`).join("")}
    </div>
    ${raceHTML()}

    <div class="card facts">
      <h3>The numbers behind it</h3>
      <div class="factrow">
        <div><b>${mmss(D.overall.median_s)}</b><span>typical wait for the first truck (the median: half are faster, half slower)</span></div>
        <div><b>${nf(D.overall.n)}</b><span>fires analysed, 2011–2024. Nine in ten waited under ${mmss(D.overall.p90_s)}.</span></div>
        <div><b>${pc(KN.distance_pct_per_km)}</b><span>longer for each extra kilometre from the nearest station (about ${low}–${high}% depending on method)</span></div>
        <div><b>${flagged} of 158</b><span>neighbourhoods clearly different from what their distance predicts: ${KN.clearly_slow_count} slower, ${KN.clearly_fast_count} faster</span></div>
      </div>
    </div>

    <div class="card" style="margin-top:14px">
      <h3>What this page does not say</h3>
      <p class="note" style="margin:.3em 0 0">“Slower than expected” is not the same as “underserved”, and nothing here says anyone was put at risk. The wait is the time from the alarm to the first truck arriving, so it includes dispatch and getting out the door, not just driving. The file covers a subset of calls (about 1,900 a year), the census data is from 2021, and the risk measures are crude. The Data quality page shows what could change the numbers.</p>
    </div>`;
  document.querySelectorAll("#p-overview [data-go]").forEach((b) =>
    b.addEventListener("click", () => { show(b.dataset.go); scrollTo({ top: 0 }); }));
  wireHero();
  wireRace();
};