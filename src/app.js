// fichas.js es opcional: si no existe, el mapa carga igual, solo que sin textos de fichas.
let FICHAS = {};
try { ({ FICHAS } = await import('./fichas.js')); } catch (e) { console.warn('fichas.js no disponible; se continúa sin fichas locales.', e); }

const $ = (id) => document.getElementById(id);
const map = L.map('map', { zoomControl: false, scrollWheelZoom: false }).setView([-21.5, -65.2], 5);
L.control.zoom({ position: 'bottomright' }).addTo(map);
// La rueda del mouse hace zoom solo después de hacer clic en el mapa; así no atrapa el scroll de la página.
map.on('click focus', () => map.scrollWheelZoom.enable());
map.on('mouseout blur', () => map.scrollWheelZoom.disable());
// Mapas de base: imagen satelital y mapa gris claro (los colores de las capas se distinguen mejor).
const BASES = {
  sat: { hint: 'Esri World Imagery (imágenes satelitales).',
    layer: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { attribution: 'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community', maxZoom: 19 }) },
  light: { hint: 'Esri Light Gray Canvas (mapa base gris claro).',
    layer: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', { attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ', maxNativeZoom: 16, maxZoom: 19 }) }
};
let currentBase = 'sat';
BASES.sat.layer.addTo(map);
let selectedLayer = null;
let selectedFeature = null;
const layers = {};   // clave de capa -> L.geoJSON
const layerCounts = {};
// Cada capa tiene sus propios controles en la barra lateral.
const LAYER_UI = {
  territorio:  { toggle: 'territory-toggle', slider: 'territory-opacity', output: 'territory-value' },
  gobernacion: { toggle: 'gob-toggle',       slider: 'gob-opacity',       output: 'gob-value' },
  audiencia:   { toggle: 'aud-toggle',       slider: 'aud-opacity',       output: 'aud-value' },
  puntos:      { toggle: 'points-toggle',    slider: 'points-opacity',    output: 'points-value' }
};
// Colores de las capas de polígonos y orden de apilado (de abajo hacia arriba: Audiencia, Gobernación, territorios).
const LAYER_COLORS = { audiencia: '#2f6fb0', gobernacion: '#3f9a4a' };
const LAYER_PANE = { audiencia: 'pane-audiencia', gobernacion: 'pane-gobernacion', territorio: 'pane-territorio' };
const POWER_BORDER = { sat: { audiencia: '#8cc3f5', gobernacion: '#6fd18d' }, light: { audiencia: '#1f5fa8', gobernacion: '#2e8b45' } };
Object.values(LAYER_PANE).forEach((name, i) => { map.createPane(name).style.zIndex = 410 + i * 5; });
// El contorno de la Real Audiencia se dibuja por encima de los territorios para que nunca se pierda.
map.createPane('pane-audiencia-borde').style.zIndex = 425;
// Capa de puntos: el ícono depende del campo "tipoid" de cada punto.
// Cada tipo tiene su propia silueta (no solo otro color), para distinguirlos de un vistazo:
// capital = estrella dorada · ciudad/pueblo = círculo blanco con centro oscuro · mina = rombo violeta con pico.
// "size" es el tamaño en píxeles; el dibujo se define en una grilla de 24 × 24.
const POINT_TYPES = {
  capital: { label: 'Capital', size: 26,
    svg: '<polygon points="12,1.6 14.9,8.5 22.4,9.1 16.7,14 18.5,21.4 12,17.5 5.5,21.4 7.3,14 1.6,9.1 9.1,8.5" fill="#f2b705" stroke="#4a3300" stroke-width="1.5" stroke-linejoin="round"/>' },
  ciudad:  { label: 'Ciudad / pueblo', size: 16,
    svg: '<circle cx="12" cy="12" r="8" fill="#ffffff" stroke="#1f2a30" stroke-width="2.6"/><circle cx="12" cy="12" r="3" fill="#1f2a30"/>' },
  mineria: { label: 'Asentamiento minero', size: 20,
    svg: '<polygon points="12,1.5 22.5,12 12,22.5 1.5,12" fill="#7b4fa3" stroke="#2e1a40" stroke-width="1.6" stroke-linejoin="round"/><path d="M7.4 11.2c2.6-3.4 6.6-3.4 9.2 0M12 8.3v8" fill="none" stroke="#ffffff" stroke-width="1.9" stroke-linecap="round"/>' },
  otro:    { label: 'Otro', size: 12,
    svg: '<circle cx="12" cy="12" r="7" fill="#9a9c94" stroke="#ffffff" stroke-width="2"/>' }
};
const norm = (v='') => String(v).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
function pointCategory(p) {
  const key = Object.keys(p).find(k => norm(k).replace(/[_\s]/g, '') === 'tipoid');
  const v = norm(key ? p[key] : (p.categoria || ''));
  if (POINT_TYPES[v]) return v;
  if (v.startsWith('capital')) return 'capital';
  if (v.startsWith('miner') || v.startsWith('mina') || v.startsWith('asiento')) return 'mineria';
  if (/^(ciudad|subciudad|villa|pueblo)/.test(v)) return 'ciudad';
  return 'otro';
}
const LAYER_LABEL = { territorio: 'Distribución territorial', audiencia: 'Real Audiencia', gobernacion: 'Gobernación del Tucumán', puntos: 'Lugar' };
const TYPE_LABEL = { territorio: 'Territorio', poder: 'Espacio de poder', punto: 'Lugar (punto)' };
const FICHA_LABEL = { territorio: 'FICHA · TERRITORIO', poder: 'FICHA · ESPACIO DE PODER', punto: 'FICHA · LUGAR' };
const isSelected = (f) => Boolean(selectedFeature) && featureId(selectedFeature.properties) === featureId(f.properties || {});
function pointIcon(feature, selected = false) {
  const p = feature.properties || {};
  const cat = pointCategory(p);
  const t = POINT_TYPES[cat];
  const s = t.size;
  // Solo las capitales llevan etiqueta con el nombre.
  const label = cat === 'capital' ? `<span class="pt-label">${esc(featureName(p))}</span>` : '';
  return L.divIcon({ className: 'pt-marker', iconSize: [s, s], iconAnchor: [s / 2, s / 2], popupAnchor: [0, -s / 2],
    html: `<svg class="pt-icon${selected ? ' selected' : ''}" viewBox="0 0 24 24" width="${s}" height="${s}" aria-hidden="true">${t.svg}</svg>${label}` });
}
const featureIndex = new Map();
const colors = { territorio: '#71816e', poder: '#b76d4d' };

function esc(value='') { return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
// Nombres para mostrar: corrige tildes y fuerza "Cabildo de Jujuy" aunque el dato diga solo "Jujuy".
const DISPLAY_NAMES = {
  'potosi': 'Potosí',
  'lipes': 'Lípez',
  'yamparaez': 'Yamparáez',
  'cordoba': 'Córdoba',
  'san miguel de tucuman': 'San Miguel de Tucumán'
};
const TERRITORY_NAMES = { 'jujuy': 'Cabildo de Jujuy' };   // solo para la capa de territorios
// Los espacios de poder tienen un rótulo fijo, en dos líneas.
const POWER_LABELS = { audiencia: ['Real Audiencia', 'de Charcas'], gobernacion: ['Gobernación', 'del Tucumán'] };
// Posición fija de esos rótulos [lat, lng]: zonas libres de puntos y de otras capas.
const LABEL_ANCHORS = { audiencia: [-16.04, -62.37], gobernacion: [-30.18, -67.27] };
function featureName(p) {
  const raw = p.display_name || p.Nombre || p.Nombre_poder || p.nombre || p.id_territorio || p.id_poder || p.id_punto || 'Entidad sin denominación';
  const k = norm(raw);
  if (p.layer_key === 'territorio' && TERRITORY_NAMES[k]) return TERRITORY_NAMES[k];
  return DISPLAY_NAMES[k] || raw;
}
// Cabildo de Jujuy (el territorio foco) también lleva su rótulo en dos líneas.
const FOCUS_LABEL = ['Cabildo', 'de Jujuy'];
function labelHtml(p) {
  if (POWER_LABELS[p.layer_key]) return POWER_LABELS[p.layer_key].map(esc).join('<br>');
  if (p.layer_key === 'territorio' && isFocusTerritory(p)) return FOCUS_LABEL.map(esc).join('<br>');
  return esc(featureName(p));
}
function featureId(p) { return p.entity_id || p.id_territorio || p.id_poder || p.id_punto || ''; }
// Paleta de territorios: un color distinto por territorio (tonos medios, de la misma intensidad) y el
// rojo carmesí reservado solo para el Cabildo de Jujuy, el foco del trabajo. La asignación se calculó
// para que los territorios vecinos queden con colores bien contrastados entre sí.
const FOCUS_TERRITORY = { name: 'cabildo de jujuy', color: '#c8102e' };
// Para cambiar un color basta editar su valor acá (clave = id_territorio del GeoJSON).
const TERRITORY_COLORS = {
  'TER-0001': '#c45a86',   // Atacama · rosa
  'TER-0003': '#4f9da6',   // Lípez · turquesa
  'TER-0004': '#7c8794',   // Tarija · gris pizarra
  'TER-0005': '#d9a21b',   // Chichas · ocre
  'TER-0006': '#7b5ea7',   // Porco · violeta
  'TER-0007': '#e07b39',   // Potosí · naranja
  'TER-0008': '#8c4a2f'    // Yamparáez · siena
};
// Si se agrega un territorio nuevo sin color asignado, usa estos de reserva.
const territoryPalette = ['#6b8f5e', '#b58a4a', '#5b7fa6', '#a35d6a'];
const territoryColor = new Map();
const isFocusTerritory = (p) => norm(featureName(p)) === FOCUS_TERRITORY.name;

function territoryFill(p) {
  const id = featureId(p);
  if (!territoryColor.has(id)) {
    const n = [...territoryColor.values()].filter(c => c !== FOCUS_TERRITORY.color).length;
    territoryColor.set(id, isFocusTerritory(p) ? FOCUS_TERRITORY.color : (TERRITORY_COLORS[id] || territoryPalette[n % territoryPalette.length]));
  }
  return territoryColor.get(id);
}
function styleFeature(feature) {
  const p = feature.properties || {};
  const key = p.layer_key;
  const selected = isSelected(feature);
  const slider = Number($(LAYER_UI[key].slider).value) / 100;
  if (key === 'territorio') {
    const focus = isFocusTerritory(p);
    return {
      pane: LAYER_PANE[key],
      // Bordes blancos entre territorios; oscuros solo para el seleccionado y el foco sobre el mapa gris.
      color: currentBase === 'light'
        ? (selected ? '#3b0a10' : focus ? '#6e0a14' : '#ffffff')
        : '#ffffff',
      weight: selected ? 4 : (focus ? 3.2 : 1.4),
      opacity: 1,
      fillColor: territoryFill(p),
      fillOpacity: Math.min(1, slider * (focus ? 1.22 : 1.05) + (selected ? .1 : 0)),
      className: focus ? 'territory-focus' : ''
    };
  }
  // Espacios de poder: relleno suave y borde bien marcado, para no tapar los territorios.
  return {
    pane: LAYER_PANE[key],
    color: selected ? (currentBase === 'light' ? '#3b0a10' : '#ffffff') : POWER_BORDER[currentBase][key],
    weight: selected ? 4 : 3,
    opacity: 1,
    fillColor: LAYER_COLORS[key],
    fillOpacity: slider * (selected ? .5 : .28)
  };
}
let audOutline = null;
const audSelected = () => Boolean(selectedFeature) && selectedFeature.properties.layer_key === 'audiencia';
const casingStyle = () => ({ fill: false, interactive: false, lineJoin: 'round', weight: 7.5, opacity: 1, color: currentBase === 'light' ? 'rgba(255,255,255,.92)' : 'rgba(6,14,30,.6)' });
const outlineStyle = () => ({ fill: false, interactive: false, lineJoin: 'round', weight: audSelected() ? 4.5 : 3.6, opacity: 1, color: audSelected() ? (currentBase === 'light' ? '#3b0a10' : '#ffffff') : POWER_BORDER[currentBase].audiencia });
function buildAudOutline(features) {
  const mk = (style) => L.geoJSON({ type: 'FeatureCollection', features }, { pane: 'pane-audiencia-borde', interactive: false, style: () => style });
  audOutline = { casing: mk(casingStyle()), line: mk(outlineStyle()) };
}
function updateAudOutline() {
  if (!audOutline) return;
  const on = $(LAYER_UI.audiencia.toggle).checked;
  [audOutline.casing, audOutline.line].forEach(l => { if (on && !map.hasLayer(l)) l.addTo(map); if (!on && map.hasLayer(l)) map.removeLayer(l); });
  audOutline.casing.setStyle(casingStyle());
  audOutline.line.setStyle(outlineStyle());
}
function restyle(layer, feature) {
  if (!layer || !feature) return;
  if (feature.properties.layer_key === 'puntos') layer.setIcon(pointIcon(feature, isSelected(feature)));
  else if (layer.setStyle) layer.setStyle(styleFeature(feature));
  if (feature.properties.layer_key === 'audiencia') updateAudOutline();
}
// ---- Rótulos de polígonos: se ubican en el punto más interior del polígono principal ----
function polygonsOf(g) { return g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : []; }
function ringArea(r) { let s = 0; for (let i = 0, j = r.length - 1; i < r.length; j = i++) s += r[j][0] * r[i][1] - r[i][0] * r[j][1]; return Math.abs(s / 2); }
function inRing(x, y, r) { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, yi] = r[i], [xj, yj] = r[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; }
function inPoly(x, y, p) { if (!inRing(x, y, p[0])) return false; for (let i = 1; i < p.length; i++) if (inRing(x, y, p[i])) return false; return true; }
function sampleRing(r, max = 500) { const s = Math.max(1, Math.floor(r.length / max)); const o = []; for (let i = 0; i < r.length; i += s) o.push(r[i]); return o; }
function distToRing(x, y, r) { let m = Infinity; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [ax, ay] = r[j], [bx, by] = r[i]; const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy; let t = l ? ((x - ax) * dx + (y - ay) * dy) / l : 0; t = Math.max(0, Math.min(1, t)); const px = ax + t * dx - x, py = ay + t * dy - y; m = Math.min(m, px * px + py * py); } return Math.sqrt(m); }
function labelLatLng(geometry) {
  const poly = polygonsOf(geometry).sort((a, b) => ringArea(b[0]) - ringArea(a[0]))[0];
  if (!poly) return null;
  const rings = poly.map(r => sampleRing(r));
  const xs = poly[0].map(c => c[0]), ys = poly[0].map(c => c[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  let best = null, bestD = -1;
  const scan = (ax, bx, ay, by, n) => { for (let i = 0; i <= n; i++) for (let j = 0; j <= n; j++) { const x = ax + (bx - ax) * i / n, y = ay + (by - ay) * j / n; if (!inPoly(x, y, poly)) continue; let d = Infinity; for (const r of rings) d = Math.min(d, distToRing(x, y, r)); if (d > bestD) { bestD = d; best = [x, y]; } } };
  scan(x0, x1, y0, y1, 24);
  if (best) scan(best[0] - (x1 - x0) / 12, best[0] + (x1 - x0) / 12, best[1] - (y1 - y0) / 12, best[1] + (y1 - y0) / 12, 12);
  return best ? L.latLng(best[1], best[0]) : L.latLng((y0 + y1) / 2, (x0 + x1) / 2);
}
function bindAreaLabel(feature, layer) {
  const p = feature.properties;
  const cls = `area-label area-label-${p.layer_key}${p.layer_key === 'territorio' && isFocusTerritory(p) ? ' area-label-focus' : ''}`;
  layer.bindTooltip(labelHtml(p), { permanent: true, direction: 'center', className: cls, interactive: false, opacity: 1 });
  const at = LABEL_ANCHORS[p.layer_key] ? L.latLng(LABEL_ANCHORS[p.layer_key][0], LABEL_ANCHORS[p.layer_key][1]) : labelLatLng(feature.geometry);
  if (at) layer.getCenter = () => at;   // el tooltip permanente se ancla en este punto
}
function updateLabelZoom() { $('map').classList.toggle('zoom-low', map.getZoom() < 6); }

function bindFeature(feature, layer, type) {
  const p = feature.properties || {};
  if (p.layer_key === 'puntos') {
    // Puntos: al hacer clic solo se muestra el nombre (sin ficha).
    layer.bindPopup(`<div class="popup-title popup-name-only">${esc(featureName(p))}</div>`, { closeButton: false, offset: [0, -2] });
    return;
  }
  // Polígonos: rótulo permanente con el nombre y ficha al hacer clic.
  bindAreaLabel(feature, layer);
  layer.on('click', () => selectFeature(feature, layer, type));
  if (p.layer_key === 'territorio') {
    // Al pasar el cursor: el territorio se ilumina y su nombre se muestra siempre.
    const tip = () => layer.getTooltip() && layer.getTooltip().getElement();
    layer.on('mouseover', () => {
      const s = styleFeature(feature);
      layer.setStyle({ weight: Math.max(s.weight, 3), fillOpacity: Math.min(1, s.fillOpacity + .18), color: currentBase === 'light' ? '#3b0a10' : '#ffffff' });
      layer.bringToFront();
      const el = tip(); if (el) el.classList.add('is-hover');
    });
    layer.on('mouseout', () => {
      layer.setStyle(styleFeature(feature));
      const el = tip(); if (el) el.classList.remove('is-hover');
    });
  }
}
function selectFeature(feature, layer, type) {
  const previous = selectedLayer, previousFeature = selectedFeature;
  selectedFeature = feature; selectedLayer = layer;
  restyle(previous, previousFeature);
  restyle(layer, feature);
  renderDetail(feature, type);
}
function setLayerOpacity(layer, key) {
  if (!layer) return;
  if (key === 'puntos') {
    const o = Number($(LAYER_UI.puntos.slider).value) / 100;
    layer.eachLayer(m => { m.setIcon(pointIcon(m.feature, isSelected(m.feature))); m.setOpacity(o); });
  } else layer.setStyle(f => styleFeature(f));
}
let lastFocus = null;
function openDetail() {
  const panel = $('detail-panel');
  if (!panel.classList.contains('open')) lastFocus = document.activeElement;
  panel.classList.add('open'); panel.setAttribute('aria-hidden', 'false');
  $('detail-close').focus({ preventScroll: true });
}
function closeDetail() {
  const panel = $('detail-panel');
  panel.classList.remove('open'); panel.setAttribute('aria-hidden', 'true');
  if (lastFocus && lastFocus !== document.body && document.contains(lastFocus)) lastFocus.focus({ preventScroll: true });
  lastFocus = null;
}

function fichaHtml(text) {
  // Todas las fichas se muestran con el mismo formato: un párrafo por apartado ("**Título:** texto").
  // Si un texto trae viñetas ("* "), se muestran igual, como párrafos.
  const inline = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>').replace(/ +([.,;:])/g, '$1');
  const paragraphs = [];
  String(text || '').split(/\n{2,}/).forEach(block => {
    let current = [];
    const flush = () => { if (current.length) paragraphs.push(current.join('<br>')); current = []; };
    block.split('\n').map(l => l.trim()).filter(Boolean).forEach(line => {
      if (/^[*•-]\s+/.test(line)) { flush(); current.push(inline(line.replace(/^[*•-]\s+/, ''))); flush(); }
      else current.push(inline(line));
    });
    flush();
  });
  return paragraphs.map(p => `<p>${p}</p>`).join('');
}
function renderDetail(feature, type) {
  const p = feature.properties || {};
  const id = featureId(p);
  const local = FICHAS[id];
  $('detail-type').textContent = FICHA_LABEL[type] || 'FICHA HISTÓRICA';
  const body = local
    ? `<div class="ficha-body">${fichaHtml(local.description)}</div>`
    : '<p>La ficha de esta entidad está en preparación.</p>';
  $('detail-content').innerHTML = `<h3>${esc(local?.name || featureName(p))}</h3><div class="detail-period">${esc(local?.period || 'Espacio histórico de Charcas · Siglo XVII')}</div><h4>Descripción histórica</h4>${body}`;
  openDetail();
}

async function fetchGeoJSON(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`No se pudo cargar ${path} (${response.status})`);
  return response.json();
}
function buildLayer(features, layerKey, type) {
  features.forEach(f => { f.properties = f.properties || {}; f.properties.entity_type = type; f.properties.layer_key = layerKey; featureIndex.set(featureId(f.properties), f); });
  const options = { style: f => styleFeature(f), onEachFeature: (f,l) => bindFeature(f,l,type) };
  if (layerKey === 'puntos') options.pointToLayer = (f, latlng) => L.marker(latlng, { icon: pointIcon(f), keyboard: true, title: featureName(f.properties) });
  const layer = L.geoJSON({ type: 'FeatureCollection', features }, options).addTo(map);
  layers[layerKey] = layer; layerCounts[layerKey] = features.length;
  if (layerKey === 'audiencia') buildAudOutline(features);
  return layer;
}
function updateLayerCount() {
  const n = Object.values(LAYER_UI).filter(ui => $(ui.toggle).checked).length;
  const el = $('layer-count');
  if (el) el.textContent = `${n} ${n === 1 ? 'capa activa' : 'capas activas'}`;
}
function refreshLayers() {
  updateLayerCount();
  const keyWrap = $('territory-key-wrap');
  if (keyWrap) keyWrap.classList.toggle('hidden', !$(LAYER_UI.territorio.toggle).checked);
  Object.entries(layers).forEach(([key, layer]) => {
    const on = $(LAYER_UI[key].toggle).checked;
    if (on && !map.hasLayer(layer)) layer.addTo(map);
    if (!on && map.hasLayer(layer)) map.removeLayer(layer);
    setLayerOpacity(layer, key);
  });
  updateAudOutline();
}
// Clave de colores: cada territorio con su color (el degradé anterior no podía representarlos a todos).
function buildTerritoryKey() {
  const box = $('territory-key');
  if (!box || !layers.territorio) return;
  const items = [];
  layers.territorio.eachLayer(l => { const p = l.feature.properties; items.push([featureName(p), territoryFill(p)]); });
  items.sort((a, b) => a[0].localeCompare(b[0], 'es'));
  box.innerHTML = items.map(([n, c]) => `<div><i class="legend-box" style="background:${c}"></i> ${esc(n)}</div>`).join('');
}
// Lista de fichas: acceso por teclado y por toque a todas las entidades (los polígonos del mapa no son enfocables).
function buildFichaList() {
  const box = $('ficha-list');
  if (!box) return;
  const rows = [];
  [['audiencia', 'poder'], ['gobernacion', 'poder'], ['territorio', 'territorio']].forEach(([key, type]) => {
    if (!layers[key]) return;
    const part = [];
    layers[key].eachLayer(l => {
      const p = l.feature.properties;
      const name = POWER_LABELS[key] ? POWER_LABELS[key].join(' ') : featureName(p);
      const color = key === 'territorio' ? territoryFill(p) : LAYER_COLORS[key];
      part.push({ name, color, feature: l.feature, layer: l, type });
    });
    part.sort((a, b) => a.name.localeCompare(b.name, 'es'));
    rows.push(...part);
  });
  box.innerHTML = '';
  rows.forEach(r => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'ficha-item';
    b.innerHTML = `<i class="legend-box" style="background:${r.color}"></i><span>${esc(r.name)}</span>`;
    b.addEventListener('click', () => {
      selectFeature(r.feature, r.layer, r.type);
      try { map.fitBounds(r.layer.getBounds(), { padding: [30, 30], maxZoom: 8 }); } catch (e) { /* sin límites */ }
    });
    box.appendChild(b);
  });
}
async function initMap() {
  try {
    const [t, au, go] = await Promise.all([
      fetchGeoJSON('./public/data/territorios.geojson'),
      fetchGeoJSON('./public/data/real_audiencia.geojson'),
      fetchGeoJSON('./public/data/tucuman.geojson')
    ]);
    buildLayer(t.features, 'territorio', 'territorio');
    buildLayer(au.features, 'audiencia', 'poder');
    buildLayer(go.features, 'gobernacion', 'poder');
    // La capa de puntos es opcional: si el archivo todavía no existe, el resto del mapa funciona igual.
    try { const pt = await fetchGeoJSON('./public/data/puntos.geojson'); buildLayer(pt.features, 'puntos', 'punto'); } catch (e) { console.warn(e); layerCounts.puntos = 0; }
    buildTerritoryKey();
    buildFichaList();
    refreshLayers();
    $('map-status').textContent = `${layerCounts.territorio} territorios · ${layerCounts.gobernacion + layerCounts.audiencia} espacios de poder · ${layerCounts.puntos || 0} puntos`;
  } catch (e) { console.error(e); $('map-status').textContent = 'No se pudieron cargar los datos. Revisá la carpeta public/data.'; }
}

Object.entries(LAYER_UI).forEach(([key, ui]) => {
  $(ui.toggle).addEventListener('change', refreshLayers);
  $(ui.slider).addEventListener('input', e => { $(ui.output).value = `${e.target.value}%`; setLayerOpacity(layers[key], key); });
});
function setBase(key) {
  if (key === currentBase || !BASES[key]) return;
  map.removeLayer(BASES[currentBase].layer);
  currentBase = key;
  BASES[key].layer.addTo(map);
  BASES[key].layer.bringToBack();
  $('map').classList.toggle('base-light', key === 'light');
  $('base-sat').classList.toggle('active', key === 'sat'); $('base-sat').setAttribute('aria-pressed', key === 'sat');
  $('base-light').classList.toggle('active', key === 'light'); $('base-light').setAttribute('aria-pressed', key === 'light');
  $('base-hint').textContent = BASES[key].hint;
  refreshLayers();
}
$('base-sat').addEventListener('click', () => setBase('sat'));
$('base-light').addEventListener('click', () => setBase('light'));
$('reset-map').addEventListener('click',()=>map.setView([-21.5,-65.2],5));
map.on('zoomend', updateLabelZoom); updateLabelZoom();
$('detail-close').addEventListener('click',closeDetail);
// Menú móvil: se abre con ☰ y se cierra al tocar un enlace, al tocar fuera, con Esc o al ensanchar la pantalla.
const nav = $('main-nav'), menuToggle = $('menu-toggle');
function setMenu(open) {
  nav.classList.toggle('open', open);
  menuToggle.setAttribute('aria-expanded', String(open));
  menuToggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
  menuToggle.textContent = open ? '✕' : '☰';
}
menuToggle.addEventListener('click', () => setMenu(!nav.classList.contains('open')));
nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setMenu(false)));
document.addEventListener('click', e => { if (!nav.contains(e.target) && !menuToggle.contains(e.target)) setMenu(false); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });
window.matchMedia('(min-width: 701px)').addEventListener('change', e => { if (e.matches) setMenu(false); });

// Sección activa en el menú mientras se hace scroll.
const navLinks = [...nav.querySelectorAll('a')];
const spy = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    navLinks.forEach(a => a.hash === '#' + e.target.id ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current'));
  });
}, { rootMargin: '-40% 0px -55% 0px' });
['proyecto', ...navLinks.map(a => a.hash.slice(1))].forEach(id => { const s = $(id); if (s) spy.observe(s); });
// Escape cierra la ficha.
document.addEventListener('keydown', e => { if (e.key === 'Escape' && $('detail-panel').classList.contains('open')) closeDetail(); });

initMap();
