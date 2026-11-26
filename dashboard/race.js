// "Watch the wait": two fires start together, one close to a station and one far from one.
// The times are the real medians for the closest and furthest quarter of fires, played at 20 times real speed.
let raceState = "idle";                    // idle, running or done
let raceRaf = 0;
const RACE_SPEED = 20, RACE_SCALE = 360;   // 20x speed; the track runs from 0:00 to 6:00

function raceHTML() {
  const a = D.quarter[0], b = D.quarter[3];
  const lane = (id, title, q, sub) => `<div class="lane"><div class="lane-label"><b>${title}</b><span>${q.km_min.toFixed(1)}–${q.km_max.toFixed(1)} km from a station · typical wait ${mmss(q.median_s)}</span></div>
      <div class="track"><div class="rail"></div><div class="fill" id="${id}f"></div>${sub}<div class="runner" id="${id}d"><span class="clock" id="${id}t">0:00</span></div></div></div>`;
  const ticks = [0, 1, 2, 3, 4, 5, 6].map((m) => `<span style="left:${(m * 60 / RACE_SCALE) * 100}%">${m}:00</span>`).join("");
  return `<div class="card race" id="race">
    <div class="charthead"><div><h3>Watch the wait</h3>
      <p class="cap">Two fires start at the same moment: one close to a station, one far from one. Shown ${RACE_SPEED} times faster than real life, using the typical wait for the closest and the furthest quarter of fires. ${tag("Measured")}</p></div>
      <button class="chip" id="race-replay" type="button">Replay</button></div>
    ${lane("r1", "Close to a station", a, "")}
    ${lane("r2", "Far from a station", b, '<div class="gapfill" id="r2g"></div>')}
    <div class="lane ticks"><span></span><div class="tickrow">${ticks}</div></div>
    <p class="race-result" id="race-res" aria-live="polite"></p>
  </div>`;
}

function raceFrame(sim) {
  const a = D.quarter[0].median_s, b = D.quarter[3].median_s, $ = (id) => document.getElementById(id);
  if (!$("r1f")) return false;                                            // the tab was left
  [["r1", Math.min(sim, a), a], ["r2", Math.min(sim, b), b]].forEach(([id, s, end]) => {
    $(id + "f").style.width = (s / RACE_SCALE) * 100 + "%";
    $(id + "d").style.left = (s / RACE_SCALE) * 100 + "%";
    $(id + "t").textContent = mmss(s);
    $(id + "d").classList.toggle("done", s >= end);
  });
  const g = $("r2g");
  g.style.left = (a / RACE_SCALE) * 100 + "%";
  g.style.width = sim > a ? ((Math.min(sim, b) - a) / RACE_SCALE) * 100 + "%" : "0";
  $("race-res").innerHTML = sim >= b
    ? `The far fire waited <b>${mmss(b - a)}</b> longer (${mmss(b)} against ${mmss(a)}). These are typical waits for each group, not a promise for any single fire.`
    : sim >= a ? `The close fire has been reached. The other is still waiting…` : "";
  return true;
}

function playRace() {
  cancelAnimationFrame(raceRaf);
  raceState = "running";
  let t0 = null;
  const end = D.quarter[3].median_s;
  const step = (ts) => {
    if (t0 === null) t0 = ts;
    const sim = ((ts - t0) / 1000) * RACE_SPEED;
    if (!raceFrame(sim)) return;
    if (sim < end) raceRaf = requestAnimationFrame(step);
    else { raceFrame(end); raceState = "done"; }
  };
  raceRaf = requestAnimationFrame(step);
}

function wireRace() {
  const el = document.getElementById("race");
  if (!el) return;
  document.getElementById("race-replay").addEventListener("click", playRace);
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (raceState === "done" || calm) { raceFrame(RACE_SCALE); raceState = "done"; return; }
  raceFrame(0);
  if (raceState === "running") { playRace(); return; }
  const io = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) { io.disconnect(); playRace(); }
  }, { threshold: 0.6 });
  io.observe(el);
}