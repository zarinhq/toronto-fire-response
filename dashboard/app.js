const ICON = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
const TABS = [
  ["overview", "Overview", "The whole story in one page", ICON('<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>')],
  ["map", "Map", "Map and search", ICON('<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>')],
  ["drivers", "Factors", "What drives the wait", ICON('<path d="M5 20v-8M12 20V5M19 20v-12"/>')],
  ["slow", "Slow list", "Who is slower than distance explains", ICON('<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>')],
  ["wards", "Wards", "The same question by city ward", ICON('<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M12 12l8-4.5M12 12v9M12 12L4 7.5"/>')],
  ["quality", "Data quality", "Data quality and limits", ICON('<path d="M12 3l8 3v6c0 4.5-3.2 7.8-8 9-4.8-1.2-8-4.5-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>')],
  ["method", "Method", "Method and download", ICON('<path d="M9 3h6M10 3v6L4.5 19a1.5 1.5 0 0 0 1.3 2.2h12.4a1.5 1.5 0 0 0 1.3-2.2L14 9V3"/><path d="M7.5 15h9"/>')],
];
// "Evidence behind the numbers": the three labels, explained once, in the footer.
document.getElementById("evidence").innerHTML = `<h3>Evidence behind the numbers</h3>
  <p>Every figure is labelled by how firm it is.</p>
  <div class="pill-row">
    <span>${tag("Measured")} counted directly from the data</span>
    <span>${tag("Estimated")} from a model, with a range</span>
    <span>${tag("Screening")} a rough first look, not a finding</span>
  </div>`;

const tablist = document.getElementById("tablist");
TABS.forEach(([id, label, full, icon]) => {
  const b = document.createElement("button");
  b.className = "sidetab";
  b.id = "t-" + id;
  b.type = "button";
  b.title = full;
  b.setAttribute("role", "tab");
  b.setAttribute("aria-controls", "p-" + id);
  b.innerHTML = icon + "<span>" + label + "</span>";
  b.addEventListener("click", () => { show(id); scrollTo({ top: 0 }); });
  tablist.appendChild(b);
});

let currentTab = "overview";

function show(id) {
  if (!TABS.some((t) => t[0] === id)) id = "overview";
  currentTab = id;
  document.title = TABS.find((t) => t[0] === id)[1] + " · Toronto fire response";  TABS.forEach(([k]) => {
    const on = k === id;
    document.getElementById("p-" + k).hidden = !on;
    document.getElementById("t-" + k).setAttribute("aria-selected", on);
  });
  if (DRAW[id]) DRAW[id]();
  history.replaceState(null, "", "#" + id + (id === "map" && selectedId ? "/" + selectedId : ""));
}

// Redraw when the window is resized, so charts fit the new width.
let resizeTimer;
addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => { if (DRAW[currentTab]) DRAW[currentTab](); }, 150);
});

// Light / dark button: flips the theme, then redraws the tab so the charts pick up the new colours.
document.getElementById("theme").addEventListener("click", () => {
  const root = document.documentElement;
  const dark = root.dataset.theme ? root.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
  root.dataset.theme = dark ? "light" : "dark";
  show(currentTab);
});

// An address like  index.html#map/133  opens the map with that neighbourhood selected.
const [startTab, startHood] = location.hash.slice(1).split("/");
if (startHood && hoodById[startHood]) selectedId = startHood;
show(startTab);