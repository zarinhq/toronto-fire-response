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

function show(id) {
  if (!TABS.some((t) => t[0] === id)) id = "overview";
  TABS.forEach(([k]) => {
    const on = k === id;
    document.getElementById("p-" + k).hidden = !on;
    document.getElementById("t-" + k).setAttribute("aria-selected", on);
  });
  history.replaceState(null, "", "#" + id);
}

show(location.hash.slice(1));

document.getElementById("p-overview").insertAdjacentHTML(
  "beforeend",
  `<p>Data loaded: ${D.hoods.length} neighbourhoods, median wait ${D.overall.median_s} seconds.</p>`
);