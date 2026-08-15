const PARK_TYPES = {
  provincial: { label: "Provincial parks", color: "#167552" },
  national: { label: "National parks", color: "#1d5fa7" },
  regional: { label: "Regional parks (OSM)", color: "#b45f18" },
  island: { label: "Large islands", color: "#2e8793" }
};

const AUTHORITY_COLORS = {
  acr: "#537f72", crd: "#9c6045", cvrd: "#6d749c", cow: "#9a7c3b",
  rdn: "#6c8550", mwr: "#706d66", srd: "#7c5b82"
};

const SUBREGION_COLORS = ["#3d7b75", "#4e7190", "#726b9c", "#9a6b55", "#8a7a3e", "#4f8460"];

const map = L.map("map", { zoomControl: false, preferCanvas: false, minZoom: 5 });
L.control.zoom({ position: "bottomleft" }).addTo(map);
map.createPane("islands");
map.createPane("authorities");
map.createPane("subregions");
map.createPane("parks");
map.createPane("mapLabels");
map.getPane("islands").style.zIndex = 280;
map.getPane("authorities").style.zIndex = 340;
map.getPane("subregions").style.zIndex = 390;
map.getPane("parks").style.zIndex = 440;
map.getPane("mapLabels").style.zIndex = 520;

const minimalTiles = L.tileLayer("https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png", {
  subdomains: "abcd", maxZoom: 20,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
}).addTo(map);
const detailTiles = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
});

const islandLayer = L.featureGroup().addTo(map);
const authorityLayer = L.featureGroup().addTo(map);
const authorityLabels = L.layerGroup().addTo(map);
const subregionLayer = L.featureGroup().addTo(map);
const subregionLabels = L.layerGroup().addTo(map);
const parkLayer = L.featureGroup().addTo(map);
const exaggerationLayer = L.featureGroup().addTo(map);
const parkLabels = L.layerGroup().addTo(map);
const authorityShapes = new Map();
const subregionShapes = new Map();
const parkShapes = new Map();
const enabledTypes = new Set(Object.keys(PARK_TYPES));
const visited = new Set(JSON.parse(localStorage.getItem("every-park-seen") || "[]"));

let authorities = [];
let subregions = [];
let parks = [];
const loadedAuthorities = new Set();
const loadedSubregions = new Set();
let selectedAuthority = null;
let selectedSubregion = null;
let selectedPark = null;

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
}

function titleCase(value) {
  return String(value).toLowerCase().replace(/\b\w/g, character => character.toUpperCase());
}

function setBase(detail) {
  if (detail) {
    if (map.hasLayer(minimalTiles)) map.removeLayer(minimalTiles);
    if (!map.hasLayer(detailTiles)) detailTiles.addTo(map);
  } else {
    if (map.hasLayer(detailTiles)) map.removeLayer(detailTiles);
    if (!map.hasLayer(minimalTiles)) minimalTiles.addTo(map);
  }
}

function fitLayer(layer, options = {}) {
  try {
    const bounds = layer?.getBounds?.();
    if (!bounds?.isValid?.()) return false;
    map.invalidateSize({ pan: false, animate: false });
    map.fitBounds(bounds, { ...options, animate: false });
    return true;
  } catch (error) {
    console.warn("Could not fit the map to this layer", error);
    return false;
  }
}

function parksForAuthority(key) {
  return parks.filter(feature => feature.properties.authority_key === key);
}

function subregionsForAuthority(key) {
  return subregions.filter(feature => feature.properties.authority_key === key);
}

function placesForSubregion(key) {
  return parks.filter(feature => feature.properties.subregion_key === key);
}

function subregionColor(feature) {
  const value = [...feature.properties.subregion_key].reduce((total, character) => total + character.charCodeAt(0), 0);
  return SUBREGION_COLORS[value % SUBREGION_COLORS.length];
}

function seenCount(features) {
  return features.filter(feature => visited.has(feature.properties.park_id)).length;
}

function seenIdCount(ids = []) {
  return ids.filter(id => visited.has(id)).length;
}

function setLoading(message) {
  const loading = document.querySelector("#loading");
  loading.textContent = message;
  loading.classList.remove("hidden");
}

function clearLoading() {
  document.querySelector("#loading").classList.add("hidden");
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Request failed (${response.status})`);
  return response.json();
}

async function loadSubregions(authorityKey) {
  if (loadedAuthorities.has(authorityKey)) return;
  setLoading("Loading local areas…");
  const data = await fetchJson(`/api/map-data?level=authority&key=${encodeURIComponent(authorityKey)}`);
  subregions = subregions.filter(feature => feature.properties.authority_key !== authorityKey).concat(data.features);
  loadedAuthorities.add(authorityKey);
  clearLoading();
}

async function loadPlaces(subregionKey) {
  if (loadedSubregions.has(subregionKey)) return;
  setLoading("Loading places…");
  const data = await fetchJson(`/api/map-data?level=subregion&key=${encodeURIComponent(subregionKey)}`);
  parks = parks.filter(feature => feature.properties.subregion_key !== subregionKey).concat(data.features);
  loadedSubregions.add(subregionKey);
  clearLoading();
}

function updateSummary(first, firstLabel, second, secondLabel, third, thirdLabel) {
  document.querySelector("#summary-one").textContent = first;
  document.querySelector("#summary-one-label").textContent = firstLabel;
  document.querySelector("#summary-two").textContent = second;
  document.querySelector("#summary-two-label").textContent = secondLabel;
  document.querySelector("#summary-three").textContent = third;
  document.querySelector("#summary-three-label").textContent = thirdLabel;
}

function authorityLabelHtml(authority) {
  return `<div class="authority-map-label" data-authority="${authority.authority_key}"><strong>${escapeHtml(authority.short_name)}</strong><span>${authority.park_count} places · ${seenIdCount(authority.place_ids)} seen</span></div>`;
}

function featureLabelLatLng(properties, shape) {
  const lat = Number(properties.label_lat);
  const lon = Number(properties.label_lon);
  if (Number.isFinite(lat) && Number.isFinite(lon)) return L.latLng(lat, lon);
  const bounds = shape?.getBounds?.();
  return bounds?.isValid?.() ? bounds.getCenter() : null;
}

function renderAuthorityLabels() {
  authorityLabels.clearLayers();
  authorities.forEach(feature => {
    const authority = feature.properties;
    const labelPoint = featureLabelLatLng(authority, authorityShapes.get(authority.authority_key));
    if (!labelPoint) return;
    const marker = L.marker(labelPoint, {
      pane: "mapLabels",
      interactive: true,
      icon: L.divIcon({ className: "authority-label-host", html: authorityLabelHtml(authority), iconSize: [150, 54], iconAnchor: [75, 27] })
    }).addTo(authorityLabels);
    marker.on("click", () => selectAuthority(authority.authority_key));
  });
}

function buildAuthorityControls() {
  const holder = document.querySelector("#authority-controls");
  holder.innerHTML = "";
  authorities.forEach(feature => {
    const authority = feature.properties;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "authority-row";
    button.style.setProperty("--authority-color", AUTHORITY_COLORS[authority.authority_key]);
    button.innerHTML = `<span class="authority-dot"></span><span><strong>${escapeHtml(authority.short_name)}</strong><small>${authority.park_count} places · ${seenIdCount(authority.place_ids)} seen</small></span><span aria-hidden="true">→</span>`;
    button.addEventListener("click", () => selectAuthority(authority.authority_key));
    holder.appendChild(button);
  });
}

function subregionStyle(feature, active = true) {
  const color = subregionColor(feature);
  return active
    ? { pane: "subregions", color, fillColor: color, fillOpacity: .22, opacity: .95, weight: 3.2, lineCap: "round", lineJoin: "round" }
    : { pane: "subregions", color, fillColor: color, fillOpacity: .025, opacity: .18, weight: 1.2, lineCap: "round", lineJoin: "round" };
}

function subregionTypeLabel(feature) {
  return feature.properties.subregion_type === "municipality" ? "Municipality" : "Electoral area";
}

function placeCountLabel(count) {
  return `${count} ${count === 1 ? "place" : "places"}`;
}

function renderSubregionLabels() {
  subregionLabels.clearLayers();
  const occupied = [];
  subregionsForAuthority(selectedAuthority)
    .sort((a, b) => b.properties.place_count - a.properties.place_count)
    .forEach(feature => {
      const properties = feature.properties;
      const labelPoint = featureLabelLatLng(properties, subregionShapes.get(properties.subregion_key));
      if (!labelPoint) return;
      const point = map.latLngToContainerPoint(labelPoint);
      if (occupied.some(existing => Math.abs(existing.x - point.x) < 132 && Math.abs(existing.y - point.y) < 48)) return;
      occupied.push(point);
      const marker = L.marker(labelPoint, {
        pane: "mapLabels", interactive: true,
        icon: L.divIcon({
          className: "subregion-label-host",
          html: `<div class="subregion-map-label" style="--subregion-color:${subregionColor(feature)}"><strong>${escapeHtml(properties.short_name)}</strong><span>${placeCountLabel(properties.place_count)} · ${seenIdCount(properties.place_ids)} seen</span></div>`,
          iconSize: [142, 51], iconAnchor: [71, 25]
        })
      }).addTo(subregionLabels);
      marker.on("click", () => selectSubregion(properties.subregion_key));
    });
}

function renderSubregions() {
  subregionLayer.clearLayers();
  subregionLabels.clearLayers();
  subregionShapes.clear();
  subregionsForAuthority(selectedAuthority).forEach(feature => {
    const properties = feature.properties;
    const shape = L.geoJSON(feature, {
      pane: "subregions", smoothFactor: 1.55, style: subregionStyle(feature, true),
      onEachFeature: (_, layer) => layer.on({
        click: () => selectSubregion(properties.subregion_key),
        mouseover: () => layer.setStyle({ weight: 5, fillOpacity: .34 }),
        mouseout: () => layer.setStyle(subregionStyle(feature, !selectedSubregion || selectedSubregion === properties.subregion_key))
      })
    }).addTo(subregionLayer);
    shape.feature = feature;
    subregionShapes.set(properties.subregion_key, shape);
  });
}

function buildSubregionControls() {
  const holder = document.querySelector("#subregion-list");
  holder.innerHTML = "";
  subregionsForAuthority(selectedAuthority)
    .sort((a, b) => a.properties.short_name.localeCompare(b.properties.short_name))
    .forEach(feature => {
      const properties = feature.properties;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "authority-row";
      button.style.setProperty("--authority-color", subregionColor(feature));
      button.innerHTML = `<span class="authority-dot"></span><span><strong>${escapeHtml(properties.short_name)}</strong><small>${subregionTypeLabel(feature)} · ${placeCountLabel(properties.place_count)} · ${seenIdCount(properties.place_ids)} seen</small></span><span aria-hidden="true">→</span>`;
      button.addEventListener("click", () => selectSubregion(properties.subregion_key));
      holder.appendChild(button);
    });
}

function zoneStyle(feature, active = true) {
  const color = AUTHORITY_COLORS[feature.properties.authority_key];
  return active
    ? { pane: "authorities", color, fillColor: color, fillOpacity: .18, opacity: .92, weight: 2.2, lineCap: "round", lineJoin: "round" }
    : { pane: "authorities", color, fillColor: color, fillOpacity: .025, opacity: .2, weight: 1, lineCap: "round", lineJoin: "round" };
}

function showOverview() {
  selectedAuthority = null;
  selectedSubregion = null;
  selectedPark = null;
  setBase(false);
  parkLayer.clearLayers();
  exaggerationLayer.clearLayers();
  parkLabels.clearLayers();
  authorityShapes.forEach(shape => shape.setStyle(zoneStyle(shape.feature, true)));
  subregionLayer.clearLayers();
  subregionLabels.clearLayers();
  renderAuthorityLabels();
  buildAuthorityControls();
  document.querySelector("#back-button").hidden = true;
  document.querySelector("#overview-controls").hidden = false;
  document.querySelector("#subregion-controls").hidden = true;
  document.querySelector("#region-controls").hidden = true;
  document.querySelector("#eyebrow").textContent = "Every Park · Island overview";
  document.querySelector("#view-title").textContent = "Vancouver Island park regions";
  document.querySelector("#view-intro").textContent = "Choose one of seven regional authorities to reveal its municipalities and electoral areas.";
  const totalPlaces = authorities.reduce((total, feature) => total + feature.properties.park_count, 0);
  const seenPlaces = new Set(authorities.flatMap(feature => feature.properties.place_ids).filter(id => visited.has(id))).size;
  updateSummary(totalPlaces, "places", seenPlaces, "seen", authorities.length, "authorities");
  fitLayer(authorityLayer, { padding: [30, 30] });
}

function renderParkLabels(regionParks) {
  parkLabels.clearLayers();
  const occupied = [];
  let placed = 0;
  const ranked = [...regionParks].sort((a, b) => b.properties.rank_area - a.properties.rank_area);
  const candidates = [
    ...ranked.filter(feature => feature.properties.park_type !== "island").slice(0, 6),
    ...ranked.filter(feature => feature.properties.park_type === "island").slice(0, 3)
  ];
  candidates.forEach(feature => {
    try {
    if (placed >= 8) return;
    const shape = parkShapes.get(feature.properties.park_id);
    if (!shape) return;
    const center = shape.getBounds().getCenter();
    const point = map.latLngToContainerPoint(center);
    if (occupied.some(existing => Math.abs(existing.x - point.x) < 125 && Math.abs(existing.y - point.y) < 38)) return;
    occupied.push(point);
    placed++;
    const marker = L.marker(center, {
      pane: "mapLabels",
      interactive: true,
      icon: L.divIcon({ className: "park-label-host", html: `<div class="park-map-label" style="--place-color:${PARK_TYPES[feature.properties.park_type].color}"><span></span>${escapeHtml(titleCase(feature.properties.name))}</div>`, iconSize: [150, 34], iconAnchor: [75, 17] })
    }).addTo(parkLabels);
    marker.on("click", () => selectPark(feature.properties.park_id));
    } catch (error) {
      console.warn("Could not render a place label", feature.properties.park_id, error);
    }
  });
}

function renderPlaceList() {
  const holder = document.querySelector("#place-list");
  const visible = placesForSubregion(selectedSubregion)
    .filter(feature => enabledTypes.has(feature.properties.park_type))
    .sort((a, b) => a.properties.name.localeCompare(b.properties.name));
  holder.innerHTML = "";
  document.querySelector("#place-list-count").textContent = `${visible.length} shown`;
  visible.forEach(feature => {
    const properties = feature.properties;
    const button = document.createElement("button");
    button.type = "button";
    button.className = `place-row${visited.has(properties.park_id) ? " seen" : ""}${selectedPark === properties.park_id ? " selected" : ""}`;
    button.style.setProperty("--place-color", PARK_TYPES[properties.park_type].color);
    button.innerHTML = `<span class="place-type-dot"></span><span><strong>${escapeHtml(titleCase(properties.name))}</strong><small>${escapeHtml(PARK_TYPES[properties.park_type].label)}</small></span><span class="place-seen">${visited.has(properties.park_id) ? "✓" : "→"}</span>`;
    button.addEventListener("click", () => selectPark(properties.park_id));
    holder.appendChild(button);
  });
}

function updateExaggerationMarkers() {
  exaggerationLayer.clearLayers();
  if (!selectedSubregion || selectedPark) return;
  placesForSubregion(selectedSubregion)
    .filter(feature => enabledTypes.has(feature.properties.park_type))
    .forEach(feature => {
      const properties = feature.properties;
      const shape = parkShapes.get(properties.park_id);
      if (!shape) return;
      const bounds = shape.getBounds();
      const nw = map.latLngToContainerPoint(bounds.getNorthWest());
      const se = map.latLngToContainerPoint(bounds.getSouthEast());
      if (Math.max(Math.abs(se.x - nw.x), Math.abs(se.y - nw.y)) >= 28) return;
      const marker = L.circleMarker(bounds.getCenter(), {
        pane: "parks", radius: 9, color: "#fffdf7", weight: 3,
        fillColor: PARK_TYPES[properties.park_type].color, fillOpacity: .96, opacity: 1
      }).addTo(exaggerationLayer);
      marker.bindTooltip(titleCase(properties.name), { direction: "top", offset: [0, -8] });
      marker.on("click", () => selectPark(properties.park_id));
    });
}

function parkPopup(feature) {
  const properties = feature.properties;
  const isSeen = visited.has(properties.park_id);
  const area = properties.area_ha ? `${Number(properties.area_ha).toLocaleString()} ha` : "Not supplied";
  const source = properties.source_url ? `<a href="${escapeHtml(properties.source_url)}" target="_blank" rel="noreferrer">${escapeHtml(properties.source)}</a>` : escapeHtml(properties.source);
  return `<h3 class="popup-name">${escapeHtml(titleCase(properties.name))}</h3><dl class="popup-meta"><dt>Type</dt><dd>${escapeHtml(PARK_TYPES[properties.park_type].label)}</dd><dt>Area</dt><dd>${area}</dd><dt>Source</dt><dd>${source}</dd></dl><button class="seen-button" type="button" data-seen-id="${escapeHtml(properties.park_id)}">${isSeen ? "✓ Seen — undo" : "Mark as seen"}</button>`;
}

function addParkFeature(feature) {
  const properties = feature.properties;
  if (!enabledTypes.has(properties.park_type)) return;
  const color = PARK_TYPES[properties.park_type].color;
  const shape = L.geoJSON(feature, {
    pane: "parks",
    smoothFactor: 1.75,
    style: { color, fillColor: color, fillOpacity: .36, opacity: .98, weight: 4.2, lineCap: "round", lineJoin: "round" },
    onEachFeature: (_, layer) => {
      layer.bindPopup(() => parkPopup(feature), { maxWidth: 285 });
      layer.on({
        click: () => selectPark(properties.park_id),
        mouseover: () => layer.setStyle({ weight: 6.5, fillOpacity: .5 }),
        mouseout: () => layer.setStyle({ weight: 4.2, fillOpacity: .36 }),
        popupopen: () => {
          const button = document.querySelector(`[data-seen-id="${CSS.escape(properties.park_id)}"]`);
          if (button) button.addEventListener("click", () => toggleSeen(properties.park_id));
        }
      });
    }
  }).addTo(parkLayer);
  parkShapes.set(properties.park_id, shape);
}

function renderSelectedSubregion() {
  const subregion = subregions.find(feature => feature.properties.subregion_key === selectedSubregion);
  const regionParks = placesForSubregion(selectedSubregion);
  document.querySelector("#view-title").textContent = subregion.properties.short_name;
  document.querySelector("#view-intro").textContent = `${regionParks.length} places in this ${subregionTypeLabel(subregion).toLowerCase()}. Select one to reveal the detailed basemap.`;
  updateSummary(regionParks.length, "places", seenCount(regionParks), "seen", Math.round((seenCount(regionParks) / Math.max(1, regionParks.length)) * 100) + "%", "complete");
  buildLayerControls();
  renderPlaceList();
  parkLayer.clearLayers();
  exaggerationLayer.clearLayers();
  parkShapes.clear();
  regionParks.forEach(feature => {
    try {
      addParkFeature(feature);
    } catch (error) {
      console.warn("Could not render a place polygon", feature.properties.park_id, error);
    }
  });
  renderParkLabels(regionParks.filter(feature => enabledTypes.has(feature.properties.park_type)));
  authorityShapes.forEach((shape, key) => shape.setStyle(zoneStyle(shape.feature, key === selectedAuthority)));
  updateExaggerationMarkers();
}

async function selectAuthority(key) {
  try {
    await loadSubregions(key);
  } catch (error) {
    setLoading("Could not load this authority from the cloud database.");
    console.error(error);
    return;
  }
  selectedAuthority = key;
  selectedSubregion = null;
  selectedPark = null;
  setBase(false);
  parkLayer.clearLayers();
  exaggerationLayer.clearLayers();
  parkLabels.clearLayers();
  authorityLabels.clearLayers();
  document.querySelector("#overview-controls").hidden = true;
  document.querySelector("#subregion-controls").hidden = false;
  document.querySelector("#region-controls").hidden = true;
  const back = document.querySelector("#back-button");
  back.hidden = false;
  back.textContent = "← All authorities";
  document.querySelector("#eyebrow").textContent = "Every Park · Regional authority";
  const authority = authorities.find(feature => feature.properties.authority_key === key);
  const localAreas = subregionsForAuthority(key);
  const regionPlaceCount = authority.properties.park_count;
  const regionSeenCount = seenIdCount(authority.properties.place_ids);
  document.querySelector("#view-title").textContent = authority.properties.short_name;
  document.querySelector("#view-intro").textContent = `${regionPlaceCount} places across ${localAreas.length} populated municipalities and electoral areas. Choose a local area to continue.`;
  updateSummary(regionPlaceCount, "places", regionSeenCount, "seen", localAreas.length, "local areas");
  authorityShapes.forEach((shape, authorityKey) => shape.setStyle(zoneStyle(shape.feature, authorityKey === selectedAuthority)));
  buildSubregionControls();
  renderSubregions();
  fitLayer(authorityShapes.get(key), { padding: [42, 42], maxZoom: 9 });
  renderSubregionLabels();
}

async function selectSubregion(key) {
  try {
    await loadPlaces(key);
  } catch (error) {
    setLoading("Could not load places from the cloud database.");
    console.error(error);
    return;
  }
  selectedSubregion = key;
  selectedPark = null;
  setBase(false);
  subregionLabels.clearLayers();
  document.querySelector("#subregion-controls").hidden = true;
  document.querySelector("#region-controls").hidden = false;
  const subregion = subregions.find(feature => feature.properties.subregion_key === key);
  const back = document.querySelector("#back-button");
  back.hidden = false;
  back.textContent = `← ${authorities.find(feature => feature.properties.authority_key === selectedAuthority).properties.short_name}`;
  document.querySelector("#eyebrow").textContent = `Every Park · ${subregionTypeLabel(subregion)}`;
  subregionShapes.forEach((shape, subregionKey) => shape.setStyle(subregionStyle(shape.feature, subregionKey === key)));
  renderSelectedSubregion();
  fitLayer(subregionShapes.get(key), { padding: [38, 38], maxZoom: 11 });
}

function selectPark(id, zoom = true) {
  const feature = parks.find(candidate => candidate.properties.park_id === id);
  const shape = parkShapes.get(id);
  if (!feature || !shape) return;
  selectedPark = id;
  exaggerationLayer.clearLayers();
  setBase(true);
  document.querySelector("#eyebrow").textContent = `Every Park · ${PARK_TYPES[feature.properties.park_type].label}`;
  document.querySelector("#view-title").textContent = titleCase(feature.properties.name);
  document.querySelector("#view-intro").textContent = `${feature.properties.subregion_name}, ${feature.properties.authority_name}. Detailed OpenStreetMap context is now visible.`;
  document.querySelector("#back-button").textContent = `← ${feature.properties.subregion_name}`;
  updateSummary(visited.has(id) ? "Yes" : "No", "seen", feature.properties.area_ha ? Number(feature.properties.area_ha).toLocaleString() : "—", "hectares", 1, "selected");
  renderPlaceList();
  if (zoom) fitLayer(shape, { padding: [28, 28], maxZoom: 17 });
  shape.eachLayer(layer => layer.openPopup());
}

function toggleSeen(id) {
  if (visited.has(id)) visited.delete(id); else visited.add(id);
  localStorage.setItem("every-park-seen", JSON.stringify([...visited]));
  if (selectedPark === id) selectPark(id, false); else renderSelectedSubregion();
}

function buildLayerControls() {
  const holder = document.querySelector("#layer-controls");
  holder.innerHTML = "";
  const regionParks = placesForSubregion(selectedSubregion);
  Object.entries(PARK_TYPES).forEach(([key, config]) => {
    const count = regionParks.filter(feature => feature.properties.park_type === key).length;
    if (!count) return;
    const label = document.createElement("label");
    label.className = "layer-row";
    label.style.setProperty("--swatch", config.color);
    label.innerHTML = `<input type="checkbox" ${enabledTypes.has(key) ? "checked" : ""} data-layer="${key}" /><span class="swatch"></span><span class="layer-name">${config.label}</span><span class="layer-count">${count}</span>`;
    label.querySelector("input").addEventListener("change", event => {
      if (event.target.checked) enabledTypes.add(key); else enabledTypes.delete(key);
      renderSelectedSubregion();
    });
    holder.appendChild(label);
  });
}

function setupSearch() {
  const input = document.querySelector("#park-search");
  const results = document.querySelector("#search-results");
  const clear = document.querySelector("#clear-search");
  const close = () => { results.classList.remove("visible"); results.innerHTML = ""; };
  input.addEventListener("input", () => {
    const query = input.value.trim().toLowerCase();
    clear.style.display = query ? "block" : "none";
    close();
    if (query.length < 2 || !selectedSubregion) return;
    const matches = placesForSubregion(selectedSubregion).filter(feature => feature.properties.name.toLowerCase().includes(query)).sort((a, b) => a.properties.name.localeCompare(b.properties.name)).slice(0, 12);
    matches.forEach(feature => {
      const button = document.createElement("button");
      button.className = "search-result";
      button.type = "button";
      button.innerHTML = `<strong>${escapeHtml(titleCase(feature.properties.name))}</strong><span>${PARK_TYPES[feature.properties.park_type].label}${visited.has(feature.properties.park_id) ? " · Seen" : ""}</span>`;
      button.addEventListener("click", () => { selectPark(feature.properties.park_id); input.value = feature.properties.name; close(); });
      results.appendChild(button);
    });
    if (matches.length) results.classList.add("visible");
  });
  clear.addEventListener("click", () => { input.value = ""; clear.style.display = "none"; close(); input.focus(); });
}

async function load() {
  try {
    const [islands, authorityData] = await Promise.all([
      fetchJson("./data/island-outlines.geojson"),
      fetchJson("/api/map-data?level=overview")
    ]);
    L.geoJSON(islands, {
      pane: "islands", interactive: false, smoothFactor: 1.45,
      style: { color: "#587078", fillColor: "#849ba1", fillOpacity: .05, opacity: .5, weight: .75, lineCap: "round", lineJoin: "round" }
    }).addTo(islandLayer);
    authorities = authorityData.features;
    authorities.forEach(feature => {
      const shape = L.geoJSON(feature, {
        pane: "authorities", smoothFactor: 1.2, style: zoneStyle(feature, true),
        onEachFeature: (_, layer) => {
          layer.on({ click: () => selectAuthority(feature.properties.authority_key), mouseover: () => layer.setStyle({ weight: 3.5, fillOpacity: .28 }), mouseout: () => {
            const active = !selectedAuthority || selectedAuthority === feature.properties.authority_key;
            layer.setStyle(zoneStyle(feature, active));
          }});
        }
      }).addTo(authorityLayer);
      shape.feature = feature;
      authorityShapes.set(feature.properties.authority_key, shape);
    });
    setupSearch();
    showOverview();
    clearLoading();
  } catch (error) {
    document.querySelector("#loading").innerHTML = "Could not load the hierarchy from the cloud data service.";
    console.error(error);
  }
}

document.querySelector("#back-button").addEventListener("click", () => {
  if (selectedPark) selectSubregion(selectedSubregion);
  else if (selectedSubregion) selectAuthority(selectedAuthority);
  else showOverview();
});
document.querySelector("#reset-view").addEventListener("click", () => selectedSubregion ? selectSubregion(selectedSubregion) : selectedAuthority ? selectAuthority(selectedAuthority) : showOverview());
map.on("zoomend moveend", () => {
  if (selectedAuthority && !selectedSubregion) renderSubregionLabels();
  if (selectedSubregion && !selectedPark) {
    renderParkLabels(placesForSubregion(selectedSubregion).filter(feature => enabledTypes.has(feature.properties.park_type)));
    updateExaggerationMarkers();
  }
});
const panel = document.querySelector("#sidebar");
const panelToggle = document.querySelector("#panel-toggle");
panelToggle.addEventListener("click", () => {
  const closed = panel.classList.toggle("closed");
  panelToggle.textContent = closed ? "Map details" : "Hide details";
  panelToggle.setAttribute("aria-expanded", String(!closed));
});

load();
