const TABS = [
  ["overview", "Overview"], ["map", "Map and search"], ["drivers", "What drives the wait"],
  ["slow", "Slow list"], ["wards", "Wards"], ["quality", "Data quality"], ["method", "Method and download"],
];

const tablist = document.getElementById("tablist");
TABS.forEach(([id, label]) => {
  const b = document.createElement("button");
  b.className = "tab";
  b.id = "t-" + id;
  b.type = "button";
  b.setAttribute("role", "tab");
  b.setAttribute("aria-controls", "p-" + id);
  b.textContent = label;
  b.addEventListener("click", () => show(id));
  tablist.appendChild(b);
});

let currentTab = "overview";

function show(id) {
  if (!TABS.some((t) => t[0] === id)) id = "overview";
  currentTab = id;
  TABS.forEach(([k]) => {
    const on = k === id;
    document.getElementById("p-" + k).hidden = !on;
    document.getElementById("t-" + k).setAttribute("aria-selected", on);
  });
  if (DRAW[id]) DRAW[id]();              // draw the tab, if its file exists yet
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