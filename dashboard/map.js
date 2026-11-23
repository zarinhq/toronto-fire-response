// The Map tab: every neighbourhood coloured by delay beyond what is expected.
const EDGES = [-9, -5, -2, 2, 5, 9];                       
const BIN_T = [-1, -0.67, -0.33, 0, 0.33, 0.67, 1];        
const BIN_LABEL = [`${MINUS}9% or faster`, `${MINUS}9 to ${MINUS}5`, `${MINUS}5 to ${MINUS}2`,
  "within 2% of expected", "+2 to +5", "+5 to +9", "+9% or slower"];
const hoodById = Object.fromEntries(D.hoods.map((h) => [h.id, h]));
let selectedId = null;

const binOf = (v) => { let i = 0; while (i < EDGES.length && v >= EDGES[i]) i++; return i; };
function binColor(i) {                                      // blue for faster, grey in the middle, red for slower
  const t = BIN_T[i];
  return t >= 0 ? mix(css("--mid"), css("--red"), t) : mix(css("--mid"), css("--blue"), -t);
}

function paintMap() {
  D.hoods.forEach((h) => {
    const p = document.getElementById("n" + h.id);
    p.setAttribute("fill", binColor(binOf(h.adj)));
    p.classList.toggle("clear", h.slow || h.fast);          
    p.classList.toggle("sel", h.id === selectedId);
  });
  const count = Array(7).fill(0);
  D.hoods.forEach((h) => count[binOf(h.adj)]++);
  document.getElementById("swatches").innerHTML = BIN_LABEL
    .map((l, i) => `<span><i style="background:${binColor(i)}"></i>${l} (${count[i]})</span>`).join("");
  const sel = selectedId && document.getElementById("n" + selectedId);
  if (sel) sel.parentNode.appendChild(sel);                 
}

DRAW.map = function () {
  document.getElementById("p-map").innerHTML = `
    <h2>Find your neighbourhood</h2>
    <p class="sub">Colour shows how much longer (red) or shorter (blue) the typical wait is than distance, time of day and year predict. Outlined areas are clearly different from expected.</p>
    <div class="card" id="mapbox">
      <h3>Delay beyond what is expected, by neighbourhood</h3>
      <p class="cap">Darker red = longer than expected; darker blue = shorter. Grey = about as expected. ${tag("Estimated")}</p>
      <div id="map"><svg viewBox="0 0 ${D.W} ${D.H}" role="img" aria-label="Map of Toronto neighbourhoods coloured by delay beyond expected">
        ${D.hoods.map((h) => `<path id="n${h.id}" data-id="${h.id}" d="${h.d}"></path>`).join("")}
      </svg></div>
      <div class="swatches" id="swatches"></div>
    </div>`;

  const map = document.getElementById("map");
  map.addEventListener("click", (e) => {
    const p = e.target.closest("path");
    if (p) { selectedId = p.dataset.id; paintMap(); }
  });
  map.addEventListener("pointermove", (e) => {
    const p = e.target.closest("path");
    if (!p) return hideTip();
    const h = hoodById[p.dataset.id];
    showTip(`<b>${esc(h.name)}</b><br>${pc(h.adj)} vs expected<br>Median wait ${mmss(h.med)}`, e);
  });
  map.addEventListener("pointerleave", hideTip);
  paintMap();
};