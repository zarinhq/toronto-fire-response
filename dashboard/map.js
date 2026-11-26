// The Map tab: search box, neighbourhood card, and the coloured map.
const EDGES = [-9, -5, -2, 2, 5, 9];                       // the cut points between colour groups
const BIN_T = [-1, -0.67, -0.33, 0, 0.33, 0.67, 1];        // how strong each group's colour is
const BIN_LABEL = [`${MINUS}9% or faster`, `${MINUS}9 to ${MINUS}5`, `${MINUS}5 to ${MINUS}2`,
  "within 2% of expected", "+2 to +5", "+5 to +9", "+9% or slower"];
const hoodById = Object.fromEntries(D.hoods.map((h) => [h.id, h]));
const ranked = [...D.hoods].sort((a, b) => b.adj - a.adj);   // slowest first
ranked.forEach((h, i) => (h.rank = i + 1));
let selectedId = null;
let onlyClear = false;

// The flip: the same map shown two ways.  "raw" = median wait; "adjusted" = delay beyond what distance explains.
let mapMode = "adjusted";
const RAW_EDGES = [255, 285, 315, 345, 375];               // seconds
const RAW_LABEL = ["under 4:15", "4:15–4:45", "4:45–5:15", "5:15–5:45", "5:45–6:15", "6:15 or more"];
const rawBin = (sec) => { let i = 0; while (i < RAW_EDGES.length && sec >= RAW_EDGES[i]) i++; return i; };
const rawColor = (i) => mix(css("--seq0"), css("--seq1"), i / RAW_EDGES.length);   // one teal ramp: darker = longer
const fillFor = (h) => (mapMode === "raw" ? rawColor(rawBin(h.med)) : binColor(binOf(h.adj)));
const hoodTip = (h) => `<b>${esc(h.name)}</b><br>Median wait ${mmss(h.med)}<br>${pc(h.adj)} vs expected`;
const overlapN = () => D.raw10.filter((id) => D.adj10.includes(id)).length;

const binOf = (v) => { let i = 0; while (i < EDGES.length && v >= EDGES[i]) i++; return i; };
function binColor(i) {                                      // blue for faster, grey in the middle, red for slower
  const t = BIN_T[i];
  return t >= 0 ? mix(css("--mid"), css("--red"), t) : mix(css("--mid"), css("--blue"), -t);
}

function paintMap() {
  const topSet = new Set(mapMode === "raw" ? D.raw10 : D.adj10);
  ["n", "m"].forEach((prefix) => D.hoods.forEach((h) => {          // n = big map, m = the small map on the overview
    const p = document.getElementById(prefix + h.id);
    if (!p) return;
    p.style.fill = fillFor(h);                                    // style.fill so the colour change can glide
    p.classList.toggle("clear", mapMode === "adjusted" && (h.slow || h.fast));
    p.classList.toggle("top", topSet.has(h.id));                  // ember outline = the ten at the top of this list
    p.classList.toggle("dim", prefix === "n" && onlyClear && mapMode === "adjusted" && !(h.slow || h.fast));
    p.classList.toggle("sel", h.id === selectedId);
  }));
  const raw = mapMode === "raw", labels = raw ? RAW_LABEL : BIN_LABEL, count = Array(labels.length).fill(0);
  D.hoods.forEach((h) => count[raw ? rawBin(h.med) : binOf(h.adj)]++);
  const legend = labels.map((l, i) => `<span><i style="background:${raw ? rawColor(i) : binColor(i)}"></i>${l} (${count[i]})</span>`).join("") +
    `<span><i class="topkey"></i>${raw ? "10 longest raw waits" : "10 slowest after distance"}</span>`;
  const caption = raw
    ? `Darker teal = longer typical wait. The ember outlines mark the 10 longest. Many sit far from a station.`
    : `Red = slower than distance explains, blue = faster. The ember outlines mark the 10 slowest on this measure. Only ${overlapN()} of them is also in the raw top 10.`;
  ["swatches", "hswatches"].forEach((id) => { const e = document.getElementById(id); if (e) e.innerHTML = legend; });
  ["mapcap", "flipcap"].forEach((id) => { const e = document.getElementById(id); if (e) e.innerHTML = caption; });
  document.querySelectorAll(".flip button").forEach((b) => b.setAttribute("aria-pressed", b.dataset.mode === mapMode));
  const oc = document.getElementById("onlyclear"); if (oc) oc.disabled = raw;
  ["n", "m"].forEach((prefix) => { const sel = selectedId && document.getElementById(prefix + selectedId); if (sel) sel.parentNode.appendChild(sel); });
}
document.addEventListener("click", (e) => {                         // both flip switches (overview and map tab)
  const b = e.target.closest(".flip button");
  if (b) { mapMode = b.dataset.mode; paintMap(); }
});

// The card on the left that explains one neighbourhood.
function drawDetail() {
  const el = document.getElementById("detail");
  if (!selectedId) {
    el.innerHTML = `<p class="note" style="margin:0">Pick a neighbourhood to see how its wait compares with what distance and time of day predict.</p>`;
    return;
  }
  const h = hoodById[selectedId];
  const range = `${pc(h.lo)} to ${pc(h.hi)}`;
  let verdict;
  if (h.slow) verdict = `<b style="color:var(--red)">Clearly slower than expected.</b> Waits run about <b>${pc(h.adj, 0)}</b> longer than distance, time of day and year predict (range ${range}).`;
  else if (h.fast) verdict = `<b style="color:var(--blue)">Clearly faster than expected.</b> Waits run about <b>${Math.abs(h.adj).toFixed(0)}%</b> shorter than expected (range ${range}).`;
  else verdict = `<b>Not clearly different from expected.</b> The estimate is ${pc(h.adj, 0)}, but the range (${range}) includes zero.`;
  const small = h.n < 75 ? `<p class="note">Based on only ${h.n} incidents, so treat the number with extra care.</p>` : "";
  el.innerHTML = `
    <h3 class="hood">${esc(h.name)}</h3>
    <p class="verdict">${verdict} ${tag("Estimated")}</p>
    <div id="rangebar"></div>${small}
    <div class="kv">
      <div><b>${mmss(h.med)}</b><span>median wait</span></div>
      <div><b>${h.km.toFixed(1)} km</b><span>average distance to nearest station</span></div>
      <div><b>${h.n}</b><span>incidents</span></div>
      <div><b>${h.rank} of 158</b><span>after adjusting (1 = slowest)</span></div>
    </div>
    <p class="note" style="margin-bottom:0">${tag("Screening")} Census 2021 context: ${h.old.toFixed(0)}% of homes built before 1980, ${h.apt.toFixed(0)}% in apartment buildings of 5+ storeys, ${h.rent.toFixed(0)}% renters, ${h.p65.toFixed(0)}% aged 65+${h.inc ? `, median household income $${nf(h.inc)}` : ""}.${h.five ? " <b>One of the five to watch.</b>" : ""}</p>`;
  intervalRows(document.getElementById("rangebar"),
    [{ label: "", v: h.adj, lo: h.lo, hi: h.hi, text: pc(h.adj, 0), r: 6,
       col: h.slow ? css("--red") : h.fast ? css("--blue") : css("--ink2"), tip: `95% range ${range}` }],
    { lo: -20, hi: 30, ticks: [-20, -10, 0, 10, 20, 30], fmt: (v) => (v === 0 ? "0" : sg(v, 0) + "%"),
      rowH: 34, labelAbove: false, label: "Estimated delay with range for " + h.name, leftPad: 22, rightPad: 52 });
}

function select(id) {
  if (!hoodById[id]) return;
  selectedId = id;
  document.getElementById("q").value = hoodById[id].name;
  closeResults();
  paintMap();
  drawDetail();
  history.replaceState(null, "", "#map/" + id);             // the address now points at this neighbourhood
}

function closeResults() {
  document.getElementById("results").hidden = true;
  document.getElementById("q").setAttribute("aria-expanded", "false");
}

function setupSearch() {
  const input = document.getElementById("q");
  const results = document.getElementById("results");
  let active = -1;

  let openAll = false;                                          // true = show every neighbourhood (the dropdown)
  const byName = [...D.hoods].sort((a, b) => a.name.localeCompare(b.name));

  function showResults() {
    const t = openAll ? "" : input.value.trim().toLowerCase();
    const list = openAll ? byName : t ? D.hoods.filter((h) => h.name.toLowerCase().includes(t))
      .sort((a, b) => a.name.toLowerCase().indexOf(t) - b.name.toLowerCase().indexOf(t) || a.name.localeCompare(b.name)).slice(0, 8) : [];
    active = -1;
    if (!list.length) {
      results.hidden = !t;
      results.innerHTML = t ? `<div class="note" style="padding:12px 14px">No neighbourhood matches “${esc(input.value)}”. Try the arrow on the right to browse the full list.</div>` : "";
      input.setAttribute("aria-expanded", !!t);
      return;
    }
    results.innerHTML = (openAll ? `<div class="listhead">All ${list.length} neighbourhoods, A to Z</div>` : "") +
      list.map((h) => `<button type="button" role="option" data-id="${h.id}"><span>${esc(h.name)}</span><span class="v">${pc(h.adj, 0)}</span></button>`).join("");
    results.hidden = false;
    input.setAttribute("aria-expanded", "true");
  }

  input.addEventListener("input", () => { openAll = false; showResults(); });
  input.addEventListener("focus", () => { if (!input.value.trim()) { openAll = true; showResults(); } });
  document.getElementById("q-drop").addEventListener("click", () => {
    if (!results.hidden) { closeResults(); return; }
    openAll = true; showResults(); input.focus();
  });
  input.addEventListener("keydown", (e) => {
    if ((e.key === "ArrowDown" || e.key === "ArrowUp") && results.hidden) { openAll = true; showResults(); }
    const b = [...results.querySelectorAll("button")];
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!b.length) return;
      active = (active + (e.key === "ArrowDown" ? 1 : -1) + b.length) % b.length;
      b.forEach((x, i) => x.setAttribute("aria-selected", i === active));
      b[active].scrollIntoView({ block: "nearest" });
    } else if (e.key === "Enter") {
      e.preventDefault();
      const c = b[active >= 0 ? active : 0];
      if (c) select(c.dataset.id);
    } else if (e.key === "Escape") closeResults();
  });
  results.addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) select(b.dataset.id); });
  document.addEventListener("click", (e) => { if (!e.target.closest(".searchbox")) closeResults(); });

  const quick = [["Slowest vs expected", () => ranked[0].id],
                 ["Fastest vs expected", () => ranked[ranked.length - 1].id],
                 ["Surprise me", () => D.hoods[Math.floor(Math.random() * D.hoods.length)].id]];
  document.getElementById("chips").innerHTML = quick.map(([l], i) => `<button class="chip" type="button" data-i="${i}">${l}</button>`).join("");
  document.getElementById("chips").addEventListener("click", (e) => {
    const b = e.target.closest(".chip");
    if (b) select(quick[+b.dataset.i][1]());
  });
}

const flipHTML = () => `<div class="flip" role="group" aria-label="Choose what the map shows">
  <button type="button" data-mode="raw" aria-pressed="${mapMode === "raw"}">Longest raw wait</button>
  <button type="button" data-mode="adjusted" aria-pressed="${mapMode === "adjusted"}">After counting distance</button></div>`;

DRAW.map = function () {
  document.getElementById("p-map").innerHTML = `
    <h2>Where do waits differ?</h2>
    <p class="sub">The <b>raw wait</b> is the typical (median) wait with nothing adjusted. Flip the switch to see the map after allowing for distance, time of day and year. Grey outlines mark areas clearly different from expected.</p>
    <div class="maplayout">
      <div class="card">
        <label for="q" class="note" style="display:block;margin-bottom:6px">Find a neighbourhood</label>
        <div class="searchbox"><input id="q" type="text" autocomplete="off" placeholder="Type a name, or open the list" role="combobox" aria-expanded="false" aria-controls="results" aria-autocomplete="list"><button class="drop" id="q-drop" type="button" aria-label="Show all neighbourhoods"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></button><div class="results" id="results" role="listbox" hidden></div></div>
        <div class="chips" id="chips"></div>
        <div id="detail" aria-live="polite"></div>
      </div>
      <div class="card" id="mapbox">
        <div class="charthead"><h3>The same map, two ways</h3>${flipHTML()}</div>
        <p class="cap" id="mapcap"></p>
        <div id="map"><svg viewBox="0 0 ${D.W} ${D.H}" role="img" aria-label="Map of Toronto neighbourhoods coloured by delay beyond expected. Use the search box or the table for the same information as text.">
          ${D.hoods.map((h) => `<path id="n${h.id}" data-id="${h.id}" d="${h.d}"></path>`).join("")}
        </svg></div>
        <div class="swatches" id="swatches"></div>
        <div style="margin-top:10px"><button class="chip" id="onlyclear" type="button" aria-pressed="${onlyClear}">Show only clearly different areas</button></div>
        <details class="tbl"><summary>Show all 158 as a table</summary><div class="tblscroll"><table id="ntable"></table></div></details>
      </div>
    </div>`;

  const map = document.getElementById("map");
  map.addEventListener("click", (e) => { const p = e.target.closest("path"); if (p) select(p.dataset.id); });
  map.addEventListener("pointermove", (e) => {
    const p = e.target.closest("path");
    if (!p) return hideTip();
    const h = hoodById[p.dataset.id];
    showTip(hoodTip(h), e);
  });
  map.addEventListener("pointerleave", hideTip);
  document.getElementById("onlyclear").addEventListener("click", (e) => {
    onlyClear = !onlyClear;
    e.currentTarget.setAttribute("aria-pressed", onlyClear);
    paintMap();
  });

  fillTable(document.getElementById("ntable"),
    ["Neighbourhood", "Adjusted delay", "95% range", "Median", "Fires", "Verdict"],
    ranked.map((h) => [esc(h.name), pc(h.adj), `${pc(h.lo, 0)} to ${pc(h.hi, 0)}`, mmss(h.med), h.n, h.slow ? "Clearly slower" : h.fast ? "Clearly faster" : "Not clear"]));
  document.querySelectorAll("#ntable tbody tr").forEach((tr, i) => {
    tr.tabIndex = 0;
    tr.style.cursor = "pointer";
    tr.addEventListener("click", () => select(ranked[i].id));
    tr.addEventListener("keydown", (e) => { if (e.key === "Enter") select(ranked[i].id); });
  });

  setupSearch();
  if (selectedId) document.getElementById("q").value = hoodById[selectedId].name;
  paintMap();
  drawDetail();
};