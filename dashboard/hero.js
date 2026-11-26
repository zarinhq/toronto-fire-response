// The opening of the Overview: the title, a one-sentence answer for any neighbourhood, and a small map to flip.
function timelineSVG() {
  const med = D.overall.median_s, p90 = D.overall.p90_s, max = 480;           // the line runs from 0:00 to 8:00
  const x = (s) => 14 + (s / max) * 732;
  return `<svg class="timeline" viewBox="0 0 760 88" role="img" aria-label="From alarm to first truck: typical ${mmss(med)}, nine in ten within ${mmss(p90)}">
    <line x1="14" y1="38" x2="746" y2="38" stroke="rgba(255,255,255,.28)" stroke-width="3"/>
    <line x1="14" y1="38" x2="${x(med)}" y2="38" stroke="#f08a4b" stroke-width="6" stroke-linecap="round"/>
    <circle cx="14" cy="38" r="10" fill="#0c2a2c" stroke="#fff" stroke-width="3"/>
    <circle cx="${x(med)}" cy="38" r="13" fill="#f08a4b" stroke="#fff" stroke-width="3"/>
    <circle cx="${x(p90)}" cy="38" r="7" fill="#cfe3e0"/>
    <text x="4" y="80" fill="#cfe3e0" font-size="17">ALARM 0:00</text>
    <text x="${x(med)}" y="17" fill="#fff" font-size="18" font-weight="700" text-anchor="middle">FIRST TRUCK · ${mmss(med)} TYPICAL</text>
    <text x="${x(p90)}" y="80" fill="#cfe3e0" font-size="17" text-anchor="middle">9 IN 10 BY ${mmss(p90)}</text></svg>`;
}

function heroHTML() {
  return `<section class="hero">
    <div class="hero-text">
      <p class="eyebrow">Toronto Fire Services · Fire incidents 2011–2024 · City of Toronto Open Data</p>
      <h1>Who waits longest for the fire department?</h1>
      <p class="lede">Where you live in Toronto shifts how long the first fire truck takes, mostly because of distance to the nearest station, and some neighbourhoods wait longer than their distance explains.</p>
      <div class="ask">
        <label for="ask-q">Find your neighbourhood</label>
        <div class="searchbox"><input id="ask-q" type="text" autocomplete="off" placeholder="Type a name, or open the list" role="combobox" aria-expanded="false" aria-controls="ask-results" aria-autocomplete="list"><button class="drop" id="ask-drop" type="button" aria-label="Show all neighbourhoods"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></button><div class="results" id="ask-results" role="listbox" hidden></div></div>
        <div class="chips light" id="ask-chips"></div>
        <div class="answer" id="ask-answer" aria-live="polite"></div>
      </div>
      ${timelineSVG()}
    </div>
    <div class="hero-map">
      <div class="charthead"><h3>The map, flipped</h3>${flipHTML()}</div>
      <div id="hmap"><svg viewBox="0 0 ${D.W} ${D.H}" role="img" aria-label="Map of Toronto neighbourhoods. Use the box on the left to look one up.">
        ${D.hoods.map((h) => `<path id="m${h.id}" data-id="${h.id}" d="${h.d}"></path>`).join("")}</svg></div>
      <p class="cap" id="flipcap"></p>
      <div class="swatches" id="hswatches"></div>
    </div>
  </section>`;
}

// One sentence about one neighbourhood.
function answerHTML(h) {
  if (!h) return `<span class="hint">Pick a neighbourhood, or click the map, and get its answer in one sentence.</span>`;
  let tail;
  if (h.slow) tail = `That is about <b>${pc(h.adj, 0)}</b> longer than its distance explains. <span class="verdict-chip slow">Clearly slower than expected</span>`;
  else if (h.fast) tail = `That is about <b>${Math.abs(h.adj).toFixed(0)}%</b> shorter than its distance explains. <span class="verdict-chip fast">Clearly faster than expected</span>`;
  else tail = `That is <b>${pc(h.adj, 0)}</b> against what its distance explains, but the range (${pc(h.lo, 0)} to ${pc(h.hi, 0)}) includes zero. <span class="verdict-chip">Not clearly different</span>`;
  const small = h.n < 75 ? ` <span class="hint">Only ${h.n} fires, so take it lightly.</span>` : "";
  return `<b>${esc(h.name)}</b> waits <b>${mmss(h.med)}</b> for the first truck. ${tail}${small}
    <button class="chip light" type="button" id="ask-go">See it on the map →</button>`;
}

function wireHero() {
  const input = document.getElementById("ask-q"), results = document.getElementById("ask-results");
  const answer = document.getElementById("ask-answer"), hmap = document.getElementById("hmap");
  if (!input) return;
  let active = -1;

  function choose(id) {
    selectedId = id;
    input.value = hoodById[id].name;
    results.hidden = true;
    input.setAttribute("aria-expanded", "false");
    refresh();
  }
  function refresh() {
    answer.innerHTML = answerHTML(selectedId && hoodById[selectedId]);
    const go = document.getElementById("ask-go");
    if (go) go.addEventListener("click", () => { show("map"); scrollTo({ top: 0 }); });
    paintMap();
  }

  let openAll = false;
  const byName = [...D.hoods].sort((a, b) => a.name.localeCompare(b.name));
  function showResults() {
    const t = openAll ? "" : input.value.trim().toLowerCase();
    const list = openAll ? byName : t ? D.hoods.filter((h) => h.name.toLowerCase().includes(t))
      .sort((a, b) => a.name.toLowerCase().indexOf(t) - b.name.toLowerCase().indexOf(t) || a.name.localeCompare(b.name)).slice(0, 7) : [];
    active = -1;
    results.hidden = !(t || openAll);
    results.innerHTML = list.length
      ? (openAll ? `<div class="listhead">All ${list.length} neighbourhoods, A to Z</div>` : "") +
        list.map((h) => `<button type="button" role="option" data-id="${h.id}"><span>${esc(h.name)}</span><span class="v">${mmss(h.med)}</span></button>`).join("")
      : `<div class="note" style="padding:12px 14px">No neighbourhood matches “${esc(input.value)}”. Try the arrow on the right to browse the full list.</div>`;
    input.setAttribute("aria-expanded", !results.hidden);
  }
  input.addEventListener("input", () => { openAll = false; showResults(); });
  input.addEventListener("focus", () => { if (!input.value.trim()) { openAll = true; showResults(); } });
  document.getElementById("ask-drop").addEventListener("click", () => {
    if (!results.hidden) { results.hidden = true; input.setAttribute("aria-expanded", "false"); return; }
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
      if (c) choose(c.dataset.id);
    } else if (e.key === "Escape") results.hidden = true;
  });
  results.addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) choose(b.dataset.id); });

  const quick = [["Slowest after distance", () => ranked[0].id], ["Fastest after distance", () => ranked[ranked.length - 1].id],
                 ["Surprise me", () => D.hoods[Math.floor(Math.random() * D.hoods.length)].id]];
  const chips = document.getElementById("ask-chips");
  chips.innerHTML = quick.map(([l], i) => `<button class="chip light" type="button" data-i="${i}">${l}</button>`).join("");
  chips.addEventListener("click", (e) => { const b = e.target.closest(".chip"); if (b) choose(quick[+b.dataset.i][1]()); });

  hmap.addEventListener("click", (e) => { const p = e.target.closest("path"); if (p) choose(p.dataset.id); });
  hmap.addEventListener("pointermove", (e) => { const p = e.target.closest("path"); if (!p) return hideTip(); showTip(hoodTip(hoodById[p.dataset.id]), e); });
  hmap.addEventListener("pointerleave", hideTip);

  if (selectedId) input.value = hoodById[selectedId].name;
  refresh();
}