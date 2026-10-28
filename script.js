// ========================================
// BRUSSELS URBAN EXPLORER
// Interactive urban mapping dashboard
// ========================================
'use strict';


// ----------------------------------------
// 1. CONFIGURATION
// ----------------------------------------

const BASEMAPS = {
    streets: 'https://tiles.openfreemap.org/styles/liberty',
    bright: 'https://tiles.openfreemap.org/styles/bright',
    light: 'https://tiles.openfreemap.org/styles/positron'
};

const CATEGORIES = {
    parks: { label: 'Park', plural: 'Parks', icon: 'park', color: '#2e9d62' },
    restaurants: { label: 'Restaurant', plural: 'Restaurants', icon: 'restaurant', color: '#f28c28' },
    busstops: { label: 'Bus stop', plural: 'Bus stops', icon: 'bus', color: '#3478db' }
};

// Used for dropped pins and online address results
const PIN_META = { label: 'Pinned place', plural: 'Pins', icon: 'pin', color: '#d93025' };

const catMeta = id => CATEGORIES[id] || PIN_META;

const MODES = {
    foot: { label: 'Walk', google: 'walking' },
    bike: { label: 'Cycle', google: 'bicycling' },
    car: { label: 'Drive', google: 'driving' }
};

// Public OSM routing servers (fine for a portfolio project;
// use your own OSRM / OpenRouteService key for heavy traffic).
const ROUTERS = {
    foot: 'https://routing.openstreetmap.de/routed-foot/route/v1/driving',
    bike: 'https://routing.openstreetmap.de/routed-bike/route/v1/driving',
    car: 'https://routing.openstreetmap.de/routed-car/route/v1/driving'
};

const STORAGE_KEY = 'brussels-explorer.lists.v1';

const datasets = [
    {
        id: 'parks',
        url: '../geojson/parks.geojson',
        layer: {
            type: 'fill',
            paint: {
                'fill-color': '#2e9d62',
                'fill-opacity': 0.65
            }
        }
    },
    {
        id: 'restaurants',
        url: '../geojson/restaurants.geojson',
        layer: {
            type: 'circle',
            paint: {
                'circle-radius': 5,
                'circle-color': '#f28c28',
                'circle-stroke-width': 1,
                'circle-stroke-color': '#ffffff'
            }
        }
    },
    {
        id: 'busstops',
        url: '../geojson/busstops.geojson',
        layer: {
            type: 'circle',
            paint: {
                'circle-radius': 4,
                'circle-color': '#3478db',
                'circle-stroke-width': 1,
                'circle-stroke-color': '#ffffff'
            }
        }
    }
];


// ----------------------------------------
// 2. SMALL HELPERS
// ----------------------------------------

const $ = id => document.getElementById(id);
const enc = encodeURIComponent;

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function debounce(fn, ms) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), ms);
    };
}

// Build DOM safely (always textContent, never innerHTML)
function el(tag, props = {}, ...kids) {
    const node = document.createElement(tag);

    Object.entries(props).forEach(([key, value]) => {
        if (value === null || value === undefined || value === false) {
            return;
        }

        if (key === 'class') {
            node.className = value;
        } else if (key === 'text') {
            node.textContent = value;
        } else if (key.startsWith('on')) {
            node.addEventListener(key.slice(2), value);
        } else if (value === true) {
            node.setAttribute(key, '');
        } else {
            node.setAttribute(key, value);
        }
    });

    kids.flat().forEach(kid => {
        if (kid !== null && kid !== undefined && kid !== false) {
            node.append(kid);
        }
    });

    return node;
}

const cap = s => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);


// ----------------------------------------
// ICON LIBRARY (custom line icons, 24x24)
// ----------------------------------------

const ICONS = {
    park: '<path d="M12 21v-6"/><path d="M12 15c-3.3 0-5.5-2-5.5-4.6 0-1.4.6-2.5 1.6-3.2C8.4 4.9 10 3 12 3s3.6 1.9 3.9 4.2c1 .7 1.6 1.8 1.6 3.2 0 2.6-2.2 4.6-5.5 4.6z"/>',
    restaurant: '<path d="M5 3v6a2 2 0 0 0 4 0V3M7 3v18"/><path d="M17 21V3c-2.2 1.2-3 3.7-3 6.500 0 1.500 1 2.500 3 2.500"/>',
    bus: '<rect x="5" y="3.500" width="14" height="14" rx="3"/><path d="M5 11h14M8 17.500V20M16 17.500V20"/><circle cx="8.700" cy="14.200" r=".7"/><circle cx="15.300" cy="14.200" r=".7"/>',
    pin: '<path d="M12 21s-6.500-5.700-6.500-11a6.500 6.500 0 0 1 13 0c0 5.300-6.500 11-6.500 11z"/><circle cx="12" cy="10" r="2.300"/>',
    layers: '<path d="M12 3l9 4.500-9 4.500-9-4.500z"/><path d="M3 12l9 4.500 9-4.500M3 16.500l9 4.500 9-4.500"/>',
    directions: '<path d="M12 3l7 17-7-4-7 4z"/>',
    star: '<path d="M12 3.500l2.600 5.300 5.800.8-4.200 4.100 1 5.800L12 16.800l-5.200 2.700 1-5.800L3.600 9.600l5.800-.8z"/>',
    share: '<circle cx="18" cy="5.500" r="2.500"/><circle cx="6" cy="12" r="2.500"/><circle cx="18" cy="18.500" r="2.500"/><path d="M8.200 10.800l7.600-4M8.200 13.200l7.600 4"/>',
    upload: '<path d="M12 15V4M7.500 8.500L12 4l4.500 4.500M5 14v5.500h14V14"/>',
    download: '<path d="M12 4v11M7.500 11l4.500 4.500 4.500-4.500M5 19.500h14"/>',
    target: '<circle cx="12" cy="12" r="6"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>',
    locate: '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.200"/><path d="M12 2.500v2.500M12 19v2.500M2.500 12H5M19 12h2.500"/>',
    search: '<circle cx="11" cy="11" r="6.500"/><path d="M16 16l4.500 4.500"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.500 2.600 3.800 5.600 3.800 9S14.500 18.400 12 21c-2.500-2.600-3.800-5.600-3.800-9S9.500 5.600 12 3z"/>',
    mail: '<rect x="3" y="5.500" width="18" height="13" rx="2.500"/><path d="M3.500 7.500l8.500 6 8.500-6"/>',
    chat: '<path d="M4 5.500h16v10.500H10l-4.500 3.800V16H4z"/>',
    whatsapp: '<path d="M4 20l1.200-4.200A8 8 0 1 1 8.200 18.800z"/><path d="M9.200 9.200c.3 2.800 2.300 4.800 5.600 5.600"/>',
    phone: '<rect x="7" y="2.500" width="10" height="19" rx="2.500"/><path d="M11 18.500h2"/>',
    map: '<path d="M3 6.500l6-2.500 6 2.500 6-2.500v13.500l-6 2.500-6-2.500-6 2.500z"/><path d="M9 4v13.500M15 6.500V20"/>',
    edit: '<path d="M4 20l1-4.200L16.500 4.300a2 2 0 0 1 2.800 0l.4.4a2 2 0 0 1 0 2.800L8.200 19z"/><path d="M14.500 6.500l3 3"/>',
    trash: '<path d="M4.500 7h15M9.500 7V4.500h5V7M6.500 7l.8 12.500h9.400L17.500 7M10 11v5.500M14 11v5.500"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    back: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    chevron: '<path d="M6 9.500l6 6 6-6"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    swap: '<path d="M8 4v15M4.500 15.500L8 19l3.500-3.500M16 20V5M12.500 8.500L16 5l3.500 3.500"/>',
    flag: '<path d="M6 21V4M6 4h11l-2 4 2 4H6"/>',
    dot: '<circle cx="12" cy="12" r="4"/>',
    up: '<path d="M12 20V5M6.500 10.500L12 5l5.500 5.500"/>',
    uturn: '<path d="M8 20V9a4 4 0 0 1 8 0v8M12.500 13.500L16 17l3.500-3.500"/>',
    foot: '<circle cx="12.800" cy="4.600" r="1.800"/><path d="M12.600 7.400L11.800 14M12.400 8.800L9 10.600 8 13.600M12.400 8.800L15 11.200l2.800.6M11.800 14l2.600 2.800V21M11.800 14L9.600 21"/>',
    bike: '<circle cx="6" cy="16" r="3.600"/><circle cx="18" cy="16" r="3.600"/><path d="M6 16l4-7h5l3 7M10 9l2.600 7H6M15 9l-.9-2.200H12"/>',
    car: '<path d="M4.500 17.500V13l1.900-4.800a1.500 1.500 0 0 1 1.400-.9h8.400a1.500 1.500 0 0 1 1.400.9L19.500 13v4.500z"/><path d="M4.500 13h15"/><circle cx="8.200" cy="17.800" r="1.700"/><circle cx="15.800" cy="17.800" r="1.700"/>'
};

const SVG_NS = 'http://www.w3.org/2000/svg';

function icon(name, { fill = false, rotate = 0 } = {}) {
    const svg = document.createElementNS(SVG_NS, 'svg');

    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('class', 'icon');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('fill', fill ? 'currentColor' : 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.9');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');

    if (rotate) {
        svg.style.transform = `rotate(${rotate}deg)`;
    }

    // Only constant strings from ICONS above, never user data
    svg.innerHTML = ICONS[name] || '';

    return svg;
}

// Any element with data-icon="name" gets that icon placed before its text
function hydrateIcons(root = document) {
    root.querySelectorAll('[data-icon]').forEach(node => {
        if (node.querySelector(':scope > svg.icon')) {
            return;
        }

        // Remove old symbol-only text (×, ←, ⌄, ☰, ◎) before adding the icon
        if (/^[×←⌄☰◎✕]$/.test(node.textContent.trim())) {
            node.textContent = '';
        }

        node.prepend(icon(node.dataset.icon));
    });
}

// Lower-case and strip accents so "cafe" finds "Café"
const norm = s => String(s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

function haversine([lng1, lat1], [lng2, lat2]) {
    const R = 6371000;
    const rad = Math.PI / 180;
    const dLat = (lat2 - lat1) * rad;
    const dLng = (lng2 - lng1) * rad;

    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) ** 2;

    return 2 * R * Math.asin(Math.sqrt(a));
}

function fmtDist(meters) {
    if (meters < 1000) {
        return `${Math.round(meters)} m`;
    }

    return `${(meters / 1000).toFixed(meters < 10000 ? 1 : 0)} km`;
}

function fmtDur(seconds) {
    if (seconds < 60) {
        return '< 1 min';
    }

    const minutes = Math.round(seconds / 60);

    if (minutes < 60) {
        return `${minutes} min`;
    }

    return `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
}

const fmtCoord = ([lng, lat]) => `${lat.toFixed(5)}, ${lng.toFixed(5)}`;

function b64encode(text) {
    const bytes = new TextEncoder().encode(text);
    let binary = '';
    bytes.forEach(b => { binary += String.fromCharCode(b); });

    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64decode(text) {
    const binary = atob(text.replace(/-/g, '+').replace(/_/g, '/'));
    return new TextDecoder().decode(Uint8Array.from(binary, c => c.charCodeAt(0)));
}

function download(filename, text, type = 'application/json') {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const link = el('a', { href: url, download: filename });

    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function copyText(text, input) {
    try {
        await navigator.clipboard.writeText(text);
    } catch {
        input.select();
        document.execCommand('copy');
    }
}


// ----------------------------------------
// 3. DOM REFERENCES + APP STATE
// ----------------------------------------

const searchInput = $('place-search');
const searchButton = $('search-button');
const searchMessage = $('search-message');
const clearSearchButton = $('clear-search');

const sidebar = $('sidebar');
const scrim = $('scrim');

const flap = $('flap');
const flapBody = $('flap-body');
const flapTitle = $('flap-title');
const flapBack = $('flap-back');
const reopenButton = $('reopen-flap');

const modal = $('modal');
['flap', 'flap-body', 'flap-title', 'flap-back', 'flap-toggle', 'flap-close', 'reopen-flap',
 'toast', 'modal', 'suggestions', 'saved-badge', 'scrim', 'menu-btn', 'locate-btn']
    .forEach(id => {
        if (!$(id)) {
            console.error(`index.html is missing an element with id="${id}"`);
        }
    });

const state = {
    results: [],        // [{ place, score, dist }]
    title: '',
    query: null,
    cat: null,
    filter: 'all',
    sort: 'relevance',
    visible: 10,
    view: 'results',    // results | place | directions | saved
    selected: null,
    ret: null,          // where the Back button returns to
    userLoc: null,
    pick: null,         // 'from' | 'to' while choosing on the map
    pulse: false
};

const route = {
    from: null,         // { name, lngLat, uid? }
    to: null,
    mode: 'foot',
    routes: [],
    sel: 0,
    loading: false,
    error: null
};

const layerVisible = { parks: true, restaurants: true, busstops: true, saved: true };

let currentBasemap = 'streets';


// ----------------------------------------
// 4. MAP
// ----------------------------------------

const map = new maplibregl.Map({
    container: 'map',
    style: BASEMAPS.streets,
    center: [4.3517, 50.8503],
    zoom: 12
});

map.addControl(new maplibregl.NavigationControl(), 'top-right');
map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-right');


// ----------------------------------------
// 5. DATA: LOAD, INDEX AND SEARCH
// ----------------------------------------

const dataStore = {};
const allPlaces = [];
const placeIndex = new Map();
const pinPlaces = new Map();

let dataPromise = null;

function getBounds(geometry) {
    const bounds = new maplibregl.LngLatBounds();

    function walk(coordinates) {
        if (typeof coordinates[0] === 'number') {
            bounds.extend(coordinates);
        } else {
            coordinates.forEach(walk);
        }
    }

    walk(geometry.coordinates);

    return bounds;
}

// Every feature becomes a "place" with a stable id built from its location.
// That id is what saved lists and share links refer to.
function indexPlaces(layerId, data) {
    const meta = catMeta(layerId);

    data.features.forEach(feature => {
        if (!feature.geometry || !feature.geometry.coordinates) {
            return;
        }

        feature.properties = feature.properties || {};

        const bounds = getBounds(feature.geometry);
        const middle = bounds.getCenter();

        const center = feature.geometry.type === 'Point'
            ? [feature.geometry.coordinates[0], feature.geometry.coordinates[1]]
            : [middle.lng, middle.lat];

        const base = `${layerId}:${center[0].toFixed(5)},${center[1].toFixed(5)}`;
        let uid = base;
        let n = 1;

        while (placeIndex.has(uid)) {
            uid = `${base}~${n++}`;
        }

        feature.properties._uid = uid;

        const name = String(feature.properties.name || '').trim();

        const values = Object.entries(feature.properties)
            .filter(([key, value]) => key[0] !== '_' && value !== null && value !== undefined)
            .map(([, value]) => value)
            .join(' ');

        const place = {
            uid,
            layerId,
            name,
            props: feature.properties,
            geometry: feature.geometry,
            center,
            bounds,
            text: norm(`${name} ${values} ${meta.label} ${meta.plural}`)
        };

        placeIndex.set(uid, place);
        allPlaces.push(place);
    });
}

function loadData() {
    if (!dataPromise) {
        dataPromise = (async () => {
            const loaded = await Promise.all(datasets.map(async ({ id, url }) => {
                try {
                    const response = await fetch(url);

                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status} for ${url}`);
                    }

                    return [id, await response.json()];
                } catch (error) {
                    console.error(`${id} error:`, error);
                    return [id, null];
                }
            }));

            // Index in a fixed order so ids stay identical on every load
            datasets.forEach(({ id }) => {
                const entry = loaded.find(([key]) => key === id);

                if (entry && entry[1]) {
                    dataStore[id] = entry[1];
                    indexPlaces(id, entry[1]);
                    console.log(`${id} loaded:`, entry[1].features.length);
                }
            });
        })();
    }

    return dataPromise;
}

// Score every place against the query. Every word must match somewhere.
function matchPlaces(query) {
    const q = norm(query.trim());

    if (q.length < 2) {
        return [];
    }

    const tokens = q.split(/\s+/);
    const out = [];

    allPlaces.forEach(place => {
        const name = norm(place.name);
        let score = 0;

        if (name === q) {
            score = 10;
        } else if (name.startsWith(q)) {
            score = 8;
        } else if (name.includes(q)) {
            score = 6;
        } else if (tokens.every(token => place.text.includes(token))) {
            score = tokens.every(token => name.includes(token)) ? 5 : 2;
        }

        if (score) {
            out.push({ place, score });
        }
    });

    return out;
}

function buildPin(uid, lngLat, name, layerId) {
    const pin = {
        uid,
        layerId,
        name: name || '',
        props: {},
        geometry: { type: 'Point', coordinates: lngLat },
        center: lngLat,
        bounds: new maplibregl.LngLatBounds(lngLat, lngLat),
        text: norm(name || ''),
        pseudo: true
    };

    pinPlaces.set(uid, pin);

    return pin;
}

function makePin(lngLat, name) {
    const uid = `pin:${lngLat[0].toFixed(5)},${lngLat[1].toFixed(5)}`;
    const existing = pinPlaces.get(uid);

    if (existing) {
        if (name) {
            existing.name = name;
        }

        return existing;
    }

    return buildPin(uid, lngLat, name, 'pin');
}

// Rebuild a place from a saved snapshot or a shared uid
function resolvePlace(item) {
    const uid = typeof item === 'string' ? item : item.uid;
    const name = typeof item === 'object' ? item.name : '';

    if (placeIndex.has(uid)) {
        return placeIndex.get(uid);
    }

    if (pinPlaces.has(uid)) {
        return pinPlaces.get(uid);
    }

    const match = /^(\w+):(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/.exec(uid);

    if (!match) {
        return null;
    }

    const layerId = CATEGORIES[match[1]] ? match[1] : 'pin';

    return buildPin(uid, [parseFloat(match[2]), parseFloat(match[3])], name, layerId);
}

async function geocode(query, limit = 5) {
    const url = 'https://nominatim.openstreetmap.org/search?' + new URLSearchParams({
        format: 'jsonv2',
        limit: String(limit),
        q: query,
        viewbox: '3.9,51.0,4.9,50.65'
    });

    const response = await fetch(url, { headers: { Accept: 'application/json' } });

    if (!response.ok) {
        throw new Error(`Address search returned ${response.status}`);
    }

    const data = await response.json();

    return data.map(item => ({
        name: item.display_name,
        lngLat: [parseFloat(item.lon), parseFloat(item.lat)]
    }));
}


// ----------------------------------------
// 6. PLACE INFORMATION HELPERS
// ----------------------------------------

function prop(props, ...keys) {
    for (const key of keys) {
        const variants = [key, key.replace(/:/g, '_'), key.replace(/:/g, '.')];

        for (const variant of variants) {
            const value = props[variant];

            if (value !== undefined && value !== null && String(value).trim() !== '') {
                return String(value);
            }
        }
    }

    return '';
}

function prettyValue(value) {
    const text = String(value);

    if (/^[a-z0-9_;]+$/.test(text)) {
        return text.replace(/_/g, ' ').replace(/;/g, ', ');
    }

    return text;
}

const prettyKey = key => cap(key.replace(/[:_.]+/g, ' ').trim());

function placeLabel(place) {
    return place.name || `Unnamed ${catMeta(place.layerId).label.toLowerCase()}`;
}

function placeSubtitle(place) {
    const bits = [catMeta(place.layerId).label];
    const cuisine = prop(place.props, 'cuisine');

    if (cuisine) {
        bits.push(prettyValue(cuisine));
    }

    return bits.join(' · ');
}

function placeAddress(place) {
    const street = [prop(place.props, 'addr:street'), prop(place.props, 'addr:housenumber')]
        .filter(Boolean).join(' ');

    const city = [prop(place.props, 'addr:postcode'), prop(place.props, 'addr:city')]
        .filter(Boolean).join(' ');

    return [street, city].filter(Boolean).join(', ');
}

const HIDDEN_KEYS = /^(_|name$|@id$|osm_id$|full_id$|osm_type$)/i;

function nearest(center, layerId, count) {
    return allPlaces
        .filter(place => place.layerId === layerId)
        .map(place => ({ place, dist: haversine(center, place.center) }))
        .sort((a, b) => a.dist - b.dist)
        .slice(0, count);
}


// ----------------------------------------
// 7. MAP LAYERS (DATA + OVERLAYS)
// ----------------------------------------

function firstSymbolLayerId() {
    const layers = map.getStyle().layers;
    const symbol = layers.find(layer => layer.type === 'symbol');

    return symbol ? symbol.id : undefined;
}

function addDataLayers() {
    const beforeId = firstSymbolLayerId();

    datasets.forEach(({ id, layer }) => {
        if (!dataStore[id]) {
            return;
        }

        if (!map.getSource(id)) {
            map.addSource(id, { type: 'geojson', data: dataStore[id] });
        }

        if (!map.getLayer(id)) {
            map.addLayer(
                {
                    id,
                    source: id,
                    ...layer,
                    layout: { visibility: layerVisible[id] ? 'visible' : 'none' }
                },
                layer.type === 'fill' ? beforeId : undefined
            );
        }
    });
}

const EMPTY = { type: 'FeatureCollection', features: [] };
const overlayData = { route: EMPTY, saved: EMPTY, highlight: EMPTY, focus: EMPTY };

const POINT_ONLY = ['match', ['geometry-type'], ['Point', 'MultiPoint'], true, false];
const POLYGON_ONLY = ['match', ['geometry-type'], ['Polygon', 'MultiPolygon'], true, false];

function addOverlayLayers() {
    Object.keys(overlayData).forEach(id => {
        if (!map.getSource(id)) {
            map.addSource(id, { type: 'geojson', data: overlayData[id] });
        }
    });

    const add = spec => {
        if (!map.getLayer(spec.id)) {
            map.addLayer(spec);
        }
    };

    const roundLine = { 'line-cap': 'round', 'line-join': 'round' };

    // Routes
    add({
        id: 'route-alt', type: 'line', source: 'route',
        filter: ['!=', ['get', 'selected'], true],
        layout: roundLine,
        paint: { 'line-color': '#7d8da1', 'line-width': 6, 'line-opacity': 0.75 }
    });

    add({
        id: 'route-casing', type: 'line', source: 'route',
        filter: ['==', ['get', 'selected'], true],
        layout: roundLine,
        paint: { 'line-color': '#ffffff', 'line-width': 10 }
    });

    add({
        id: 'route-main', type: 'line', source: 'route',
        filter: ['==', ['get', 'selected'], true],
        layout: roundLine,
        paint: {
            'line-color': '#1a73e8',
            'line-width': 5,
            ...(route.mode === 'foot' ? { 'line-dasharray': [0.1, 1.8] } : {})
        }
    });

    // Saved places: gold ring
    add({
        id: 'saved-ring', type: 'circle', source: 'saved',
        layout: { visibility: layerVisible.saved ? 'visible' : 'none' },
        paint: {
            'circle-radius': 10,
            'circle-color': 'rgba(0,0,0,0)',
            'circle-stroke-width': 3,
            'circle-stroke-color': '#f5b301'
        }
    });

    // Search results highlight
    add({
        id: 'hl-fill', type: 'fill', source: 'highlight', filter: POLYGON_ONLY,
        paint: { 'fill-color': '#ffb703', 'fill-opacity': 0.5 }
    });

    add({
        id: 'hl-line', type: 'line', source: 'highlight', filter: POLYGON_ONLY,
        paint: { 'line-color': '#fb8500', 'line-width': 3 }
    });

    add({
        id: 'hl-halo', type: 'circle', source: 'highlight', filter: POINT_ONLY,
        paint: { 'circle-radius': 14, 'circle-color': '#ffb703', 'circle-opacity': 0.4 }
    });

    add({
        id: 'hl-point', type: 'circle', source: 'highlight', filter: POINT_ONLY,
        paint: {
            'circle-radius': 7,
            'circle-color': '#fb8500',
            'circle-stroke-width': 2.5,
            'circle-stroke-color': '#ffffff'
        }
    });

    // Hovered / selected place
    add({
        id: 'focus-fill', type: 'fill', source: 'focus', filter: POLYGON_ONLY,
        paint: { 'fill-color': '#d93025', 'fill-opacity': 0.35 }
    });

    add({
        id: 'focus-line', type: 'line', source: 'focus', filter: POLYGON_ONLY,
        paint: { 'line-color': '#d93025', 'line-width': 3.5 }
    });

    add({
        id: 'focus-halo', type: 'circle', source: 'focus', filter: POINT_ONLY,
        paint: { 'circle-radius': 20, 'circle-color': '#d93025', 'circle-opacity': 0.25 }
    });

    add({
        id: 'focus-point', type: 'circle', source: 'focus', filter: POINT_ONLY,
        paint: {
            'circle-radius': 9,
            'circle-color': '#d93025',
            'circle-stroke-width': 3,
            'circle-stroke-color': '#ffffff'
        }
    });
}

function setOverlay(id, features) {
    overlayData[id] = { type: 'FeatureCollection', features };

    const source = map.getSource(id);

    if (source) {
        source.setData(overlayData[id]);
    }
}

const featureOf = place => ({
    type: 'Feature',
    geometry: place.geometry,
    properties: { uid: place.uid }
});

function updateHighlight() {
    const places = filteredResults().map(r => r.place);

    setOverlay('highlight', places.map(featureOf));

    state.pulse = !reducedMotion && places.length > 0 && places.length <= 300;
}

function setFocus(places) {
    setOverlay('focus', places.map(featureOf));
}

function restoreFocus() {
    setFocus(state.selected ? [state.selected] : []);
}

function updateSavedOverlay() {
    const seen = new Set();
    const features = [];

    lists.forEach(list => {
        list.items.forEach(item => {
            if (seen.has(item.uid)) {
                return;
            }

            seen.add(item.uid);

            features.push({
                type: 'Feature',
                geometry: { type: 'Point', coordinates: item.center },
                properties: { uid: item.uid }
            });
        });
    });

    setOverlay('saved', features);
}

function updateRouteOverlay() {
    setOverlay('route', route.routes.map((r, idx) => ({
        type: 'Feature',
        geometry: r.geometry,
        properties: { idx, selected: idx === route.sel }
    })));

    if (map.getLayer('route-main')) {
        map.setPaintProperty(
            'route-main',
            'line-dasharray',
            route.mode === 'foot' ? [0.1, 1.8] : null
        );
    }
}

function refreshOverlays() {
    Object.keys(overlayData).forEach(id => {
        const source = map.getSource(id);

        if (source) {
            source.setData(overlayData[id]);
        }
    });

    updateRouteOverlay();
}

// A gentle pulse on the highlighted points (only for small result sets)
function pulseFrame(time) {
    if (state.pulse && map.getLayer('hl-halo')) {
        const k = (time % 1800) / 1800;

        map.setPaintProperty('hl-halo', 'circle-radius', 10 + k * 14);
        map.setPaintProperty('hl-halo', 'circle-opacity', 0.45 * (1 - k));
    }

    requestAnimationFrame(pulseFrame);
}


// ----------------------------------------
// 8. CAMERA HELPERS
// ----------------------------------------

function mapPadding() {
    const container = map.getContainer();
    const width = container.clientWidth;
    const height = container.clientHeight;
    const open = !flap.hidden && !flap.classList.contains('collapsed');

    if (window.innerWidth <= 700) {
        return { top: 70, left: 30, right: 30, bottom: open ? Math.min(height * 0.5, 380) : 40 };
    }

    return { top: 60, bottom: 60, right: 60, left: open ? Math.min(400, width * 0.5) : 60 };
}

function flyToPlace(place) {
    const pad = mapPadding();

    if (place.geometry.type === 'Point') {
        map.flyTo({
            center: place.center,
            zoom: Math.max(map.getZoom(), 16),
            offset: [(pad.left - pad.right) / 2, (pad.top - pad.bottom) / 2]
        });
    } else {
        map.fitBounds(place.bounds, { padding: pad, maxZoom: 16 });
    }
}

function fitToPlaces(places) {
    if (!places.length) {
        return;
    }

    if (places.length === 1) {
        flyToPlace(places[0]);
        return;
    }

    const bounds = new maplibregl.LngLatBounds();

    places.forEach(place => {
        bounds.extend(place.bounds.getSouthWest());
        bounds.extend(place.bounds.getNorthEast());
    });

    map.fitBounds(bounds, { padding: mapPadding(), maxZoom: 16, duration: 800 });
}


// ----------------------------------------
// 9. TOAST AND MODAL
// ----------------------------------------

let toastTimer;

function toast(message, action) {
    const box = $('toast');

    box.replaceChildren(el('span', { text: message }));

    if (action) {
        box.append(el('button', {
            class: 'toast-action',
            type: 'button',
            onclick: () => {
                box.hidden = true;
                action.fn();
            }
        }, action.label));
    }

    box.hidden = false;

    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { box.hidden = true; }, 4500);
}

let modalOnClose = null;

function openModal(node, onClose) {
    modalOnClose = onClose || null;
    modal.replaceChildren(el('div', { class: 'modal-card' }, node));

    if (!modal.open) {
        modal.showModal();
    }
}

modal.addEventListener('click', event => {
    if (event.target === modal) {
        modal.close();
    }
});

modal.addEventListener('close', () => {
    // A stale close event can arrive after we already re-opened the dialog
    if (modal.open) {
        return;
    }

    const callback = modalOnClose;
    modalOnClose = null;

    if (callback) {
        callback();
    }
});

function askText({ title, label, value = '', okText = 'Save' }) {
    return new Promise(resolve => {
        let settled = false;

        const done = result => {
            if (settled) {
                return;
            }

            settled = true;
            modalOnClose = null;
            modal.close();
            resolve(result);
        };

        const input = el('input', {
            type: 'text', class: 'modal-input', maxlength: '60', value, 'aria-label': label
        });

        const form = el('form', { class: 'modal-form' },
            el('h3', { text: title }),
            el('label', { class: 'modal-label' }, label, input),
            el('div', { class: 'modal-actions' },
                el('button', { type: 'button', class: 'btn', onclick: () => done(null) }, 'Cancel'),
                el('button', { type: 'submit', class: 'btn primary' }, okText)
            )
        );

        form.addEventListener('submit', event => {
            event.preventDefault();
            done(input.value.trim() || null);
        });

        openModal(form, () => done(null));

        input.focus();
        input.select();
    });
}


// ----------------------------------------
// 10. AUTOCOMPLETE (used by search + directions)
// ----------------------------------------

function attachAutocomplete({ input, list, getItems, onPick, onEnter }) {
    let items = [];
    let active = -1;

    const close = () => {
        list.hidden = true;
        active = -1;
        input.setAttribute('aria-expanded', 'false');
    };

    const render = () => {
        list.replaceChildren();

        items.forEach((item, index) => {
            const row = el('li', {
                role: 'option',
                class: 'suggest-item' + (index === active ? ' active' : ''),
                'aria-selected': index === active ? 'true' : 'false'
            },
            el('span', { class: 's-icon' }, item.icon ? icon(item.icon) : null),
            el('span', { class: 's-main' },
                el('span', { class: 's-label', text: item.label }),
                item.sub && el('span', { class: 's-sub', text: item.sub })
            ));

            // mousedown keeps focus in the input so blur doesn't swallow the click
            row.addEventListener('mousedown', event => {
                event.preventDefault();
                pick(index);
            });

            list.appendChild(row);
        });

        list.hidden = items.length === 0;
        input.setAttribute('aria-expanded', String(items.length > 0));
    };

    const pick = index => {
        const item = items[index];

        close();

        if (item) {
            onPick(item);
        }
    };

    const refresh = () => {
        items = getItems(input.value.trim());
        active = -1;
        render();
    };

    input.addEventListener('input', debounce(refresh, 120));
    input.addEventListener('focus', refresh);
    input.addEventListener('blur', close);

    input.addEventListener('keydown', event => {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();

            if (list.hidden) {
                refresh();
            }

            if (!items.length) {
                return;
            }

            const step = event.key === 'ArrowDown' ? 1 : -1;
            active = (active + step + items.length) % items.length;
            render();
        } else if (event.key === 'Enter') {
            if (active >= 0 && items[active]) {
                event.preventDefault();
                pick(active);
            } else {
                close();

                if (onEnter) {
                    onEnter(input.value.trim());
                }
            }
        } else if (event.key === 'Escape') {
            close();
        }
    });
}


// ----------------------------------------
// 11. SAVED PLACES AND CUSTOM LISTS
// ----------------------------------------

function loadLists() {
    let stored = null;

    try {
        stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    } catch {
        stored = null;
    }

    const result = Array.isArray(stored) ? stored.filter(l => l && Array.isArray(l.items)) : [];

    if (!result.some(list => list.id === 'favorites')) {
        result.unshift({ id: 'favorites', name: 'Favorites', items: [] });
    }

    return result;
}

const lists = loadLists();
const openLists = new Set(['favorites']);

function persist() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(lists));
    } catch (error) {
        console.warn('Could not save lists:', error);
    }
}

const getList = id => lists.find(list => list.id === id);
const isSaved = uid => lists.some(list => list.items.some(item => item.uid === uid));
const inFavorites = uid => getList('favorites').items.some(item => item.uid === uid);

function addToList(listId, place, { silent = false } = {}) {
    const list = getList(listId);

    if (!list || list.items.some(item => item.uid === place.uid)) {
        return;
    }

    list.items.push({
        uid: place.uid,
        name: place.name,
        layerId: place.layerId,
        center: place.center,
        added: Date.now()
    });

    if (!silent) {
        onListsChanged();
    }
}

function removeFromList(listId, uid, { silent = false } = {}) {
    const list = getList(listId);

    if (!list) {
        return;
    }

    list.items = list.items.filter(item => item.uid !== uid);

    if (!silent) {
        onListsChanged();
    }
}

function createList(name) {
    const list = { id: `l${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`, name, items: [] };

    lists.push(list);
    onListsChanged();

    return list;
}

function onListsChanged() {
    persist();
    updateSavedOverlay();

    const uniqueSaved = new Set(lists.flatMap(list => list.items.map(item => item.uid)));
    $('saved-badge').textContent = String(uniqueSaved.size);

    rerender();
}

function toggleFavorite(place) {
    if (inFavorites(place.uid)) {
        removeFromList('favorites', place.uid);
        toast('Removed from Favorites');
    } else {
        addToList('favorites', place);
        toast('Saved to Favorites', { label: 'Change list', fn: () => openListPicker([place]) });
    }
}

function openListPicker(places) {
    if (!places.length) {
        return;
    }

    const heading = places.length === 1
        ? `Save “${placeLabel(places[0])}”`
        : `Save ${places.length} places`;

    const box = el('div', { class: 'picker-list' });

    function draw() {
        box.replaceChildren();

        lists.forEach(list => {
            const have = places.filter(p => list.items.some(i => i.uid === p.uid)).length;

            const checkbox = el('input', { type: 'checkbox' });
            checkbox.checked = have === places.length;
            checkbox.indeterminate = have > 0 && have < places.length;

            checkbox.addEventListener('change', () => {
                places.forEach(place => {
                    if (checkbox.checked) {
                        addToList(list.id, place, { silent: true });
                    } else {
                        removeFromList(list.id, place.uid, { silent: true });
                    }
                });

                onListsChanged();
                draw();
            });

            box.append(el('label', { class: 'picker-row' },
                checkbox,
                el('span', { class: 'pr-name', text: list.name }),
                el('span', { class: 'pr-count', text: String(list.items.length) })
            ));
        });
    }

    draw();

    const content = el('div', {},
        el('h3', { text: heading }),
        box,
        el('div', { class: 'modal-actions spread' },
            el('button', {
                type: 'button',
                class: 'btn',
                onclick: async () => {
                    const name = await askText({
                        title: 'New list',
                        label: 'List name',
                        okText: 'Create'
                    });

                    if (name) {
                        const list = createList(name);
                        places.forEach(place => addToList(list.id, place, { silent: true }));
                        onListsChanged();
                    }

                    openListPicker(places);
                }
            }, '+ New list'),
            el('button', { type: 'button', class: 'btn primary', onclick: () => modal.close() }, 'Done')
        )
    );

    openModal(content);
}

async function newListFlow() {
    const name = await askText({ title: 'New list', label: 'List name', okText: 'Create' });

    if (name) {
        const list = createList(name);
        openLists.add(list.id);
    }
}

async function renameListFlow(list) {
    const name = await askText({ title: 'Rename list', label: 'List name', value: list.name });

    if (name) {
        list.name = name;
        onListsChanged();
    }
}

function deleteListFlow(list) {
    if (confirm(`Delete the list “${list.name}”? The places themselves are not deleted.`)) {
        lists.splice(lists.indexOf(list), 1);
        onListsChanged();
    }
}

function exportGeoJSON(list) {
    const collection = {
        type: 'FeatureCollection',
        features: list.items.map(item => ({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: item.center },
            properties: { name: item.name || null, category: item.layerId, uid: item.uid }
        }))
    };

    download(`${list.name.replace(/\W+/g, '-').toLowerCase() || 'list'}.geojson`,
        JSON.stringify(collection, null, 2), 'application/geo+json');
}

function exportBackup() {
    download('brussels-explorer-lists.json', JSON.stringify(lists, null, 2));
}

async function importBackup(file) {
    try {
        const imported = JSON.parse(await file.text());

        if (!Array.isArray(imported)) {
            throw new Error('Unexpected file format');
        }

        let added = 0;

        imported.forEach(source => {
            if (!source || !Array.isArray(source.items)) {
                return;
            }

            let target = lists.find(l => l.id === source.id) ||
                lists.find(l => l.name === source.name);

            if (!target) {
                target = { id: source.id || `l${Date.now().toString(36)}`, name: String(source.name || 'Imported'), items: [] };
                lists.push(target);
            }

            source.items.forEach(item => {
                const valid = item && item.uid && Array.isArray(item.center) && item.center.length === 2;

                if (valid && !target.items.some(i => i.uid === item.uid)) {
                    target.items.push({
                        uid: String(item.uid),
                        name: String(item.name || ''),
                        layerId: String(item.layerId || 'pin'),
                        center: [Number(item.center[0]), Number(item.center[1])],
                        added: item.added || Date.now()
                    });
                    added++;
                }
            });
        });

        onListsChanged();
        toast(`Imported ${added} place${added === 1 ? '' : 's'}`);
    } catch (error) {
        toast(`Import failed: ${error.message}`);
    }
}


// ----------------------------------------
// 12. SHARING
// ----------------------------------------

const baseUrl = () => location.href.split('#')[0];
const linkFor = params => `${baseUrl()}#${new URLSearchParams(params)}`;

function placeLinkParams(place) {
    if (place.layerId === 'pin' || place.pseudo) {
        return {
            pin: `${place.center[0].toFixed(6)},${place.center[1].toFixed(6)}`,
            ...(place.name ? { name: place.name } : {})
        };
    }

    return { place: place.uid };
}

function shareLink(href, iconName, label, external = false) {
    return el('a', {
        class: 'share-opt',
        href,
        target: external ? '_blank' : null,
        rel: external ? 'noopener' : null
    },
    el('span', { class: 'so-icon' }, icon(iconName)),
    el('span', { text: label }));
}

function openShare({ title, text, url, extra = [] }) {
    const input = el('input', {
        type: 'text', readonly: true, value: url, class: 'modal-input', 'aria-label': 'Share link'
    });

    const message = `${text}\n${url}`;
    const options = [];

    if (navigator.share) {
        options.push(el('button', {
            type: 'button',
            class: 'share-opt',
            onclick: () => navigator.share({ title, text, url }).catch(() => {})
        },
        el('span', { class: 'so-icon' }, icon('upload')),
        el('span', { text: 'Share…' })));
    }

    options.push(
        shareLink(`mailto:?subject=${enc(title)}&body=${enc(message)}`, 'mail', 'Email'),
        shareLink(`sms:?&body=${enc(message)}`, 'chat', 'Text message'),
        shareLink(`https://wa.me/?text=${enc(message)}`, 'whatsapp', 'WhatsApp', true),
        ...extra
    );

    openModal(el('div', {},
        el('h3', { text: title }),
        el('p', { class: 'muted', text: text }),
        el('div', { class: 'copy-row' },
            input,
            el('button', {
                type: 'button',
                class: 'btn primary',
                onclick: async () => {
                    await copyText(url, input);
                    toast('Link copied');
                }
            }, 'Copy')
        ),
        el('div', { class: 'share-grid' }, options),
        el('div', { class: 'modal-actions' },
            el('button', { type: 'button', class: 'btn', onclick: () => modal.close() }, 'Close')
        )
    ));

    input.select();
}

function sharePlace(place) {
    const [lng, lat] = place.center;
    const name = placeLabel(place);

    openShare({
        title: name,
        text: `${name} – ${placeSubtitle(place)} (Brussels Urban Explorer)`,
        url: linkFor(placeLinkParams(place)),
        extra: [
            shareLink(`geo:${lat},${lng}?q=${lat},${lng}(${enc(name)})`, 'phone', 'Maps app'),
            shareLink(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, 'map', 'Google Maps', true),
            shareLink(`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=18/${lat}/${lng}`, 'globe', 'OpenStreetMap', true)
        ]
    });
}

function routeLinkParams() {
    const pair = [route.from, route.to]
        .map(wp => `${wp.lngLat[0].toFixed(6)},${wp.lngLat[1].toFixed(6)}`)
        .join(';');

    return { route: pair, mode: route.mode, fn: route.from.name, tn: route.to.name };
}

function shareRoute() {
    if (!route.from || !route.to) {
        return;
    }

    const current = route.routes[route.sel];
    const summary = current
        ? ` (${fmtDur(current.duration)}, ${fmtDist(current.distance)} by ${MODES[route.mode].label.toLowerCase()})`
        : '';

    const [fromLng, fromLat] = route.from.lngLat;
    const [toLng, toLat] = route.to.lngLat;

    openShare({
        title: `Route to ${route.to.name}`,
        text: `Route from ${route.from.name} to ${route.to.name}${summary}`,
        url: linkFor(routeLinkParams()),
        extra: [
            shareLink(
                `https://www.google.com/maps/dir/?api=1&origin=${fromLat},${fromLng}&destination=${toLat},${toLng}&travelmode=${MODES[route.mode].google}`,
                'map', 'Google Maps', true
            )
        ]
    });
}

function shareList(list) {
    const pins = {};

    list.items.forEach(item => {
        if (!placeIndex.has(item.uid) && item.name) {
            pins[item.uid] = item.name;
        }
    });

    const payload = b64encode(JSON.stringify({ n: list.name, i: list.items.map(i => i.uid), m: pins }));

    openShare({
        title: `List: ${list.name}`,
        text: `${list.name} – ${list.items.length} place${list.items.length === 1 ? '' : 's'} in Brussels Urban Explorer`,
        url: linkFor({ list: payload })
    });
}

function shareResults() {
    const params = state.query ? { q: state.query } : state.cat ? { cat: state.cat } : null;

    if (!params) {
        return;
    }

    openShare({
        title: state.title,
        text: `${state.results.length} places for ${state.title} in Brussels Urban Explorer`,
        url: linkFor(params)
    });
}

// Keep the address bar in sync so "copy the URL" always works
function syncHash() {
    let params = null;

    if (state.view === 'directions' && route.from && route.to) {
        params = routeLinkParams();
    } else if (state.view === 'place' && state.selected) {
        params = placeLinkParams(state.selected);
    } else if (state.view === 'results' && state.query) {
        params = { q: state.query };
    } else if (state.view === 'results' && state.cat) {
        params = { cat: state.cat };
    }

    try {
        history.replaceState(
            null, '',
            params ? `#${new URLSearchParams(params)}` : location.pathname + location.search
        );
    } catch {
        // Some sandboxed previews block the History API; sharing still works
    }
}

function handleSharedList(encoded) {
    let data;

    try {
        data = JSON.parse(b64decode(encoded));
    } catch {
        toast('That shared list link is not valid.');
        return;
    }

    const places = (data.i || [])
        .map(uid => {
            const known = resolvePlace(uid);

            if (known && data.m && data.m[uid] && !known.name) {
                known.name = data.m[uid];
            }

            return known;
        })
        .filter(Boolean);

    if (!places.length) {
        toast('That shared list is empty.');
        return;
    }

    const name = String(data.n || 'Shared list').slice(0, 60);

    setResults(places.map(place => ({ place, score: 1 })), { title: name });

    openModal(el('div', {},
        el('h3', { text: `Shared list: ${name}` }),
        el('p', { class: 'muted', text: `${places.length} places. They are highlighted on the map.` }),
        el('div', { class: 'modal-actions' },
            el('button', { type: 'button', class: 'btn', onclick: () => modal.close() }, 'Just look'),
            el('button', {
                type: 'button',
                class: 'btn primary',
                onclick: () => {
                    const list = createList(name);
                    places.forEach(place => addToList(list.id, place, { silent: true }));
                    onListsChanged();
                    modal.close();
                    toast(`Saved “${name}” to your lists`);
                }
            }, 'Save to my lists')
        )
    ));
}


// ----------------------------------------
// 13. RESULTS: SEARCH + CATEGORY BROWSING
// ----------------------------------------

function filteredResults() {
    return state.filter === 'all'
        ? state.results
        : state.results.filter(r => r.place.layerId === state.filter);
}

function recomputeDistances() {
    state.results.forEach(r => {
        r.dist = state.userLoc ? haversine(state.userLoc, r.place.center) : null;
    });
}

function sortResults() {
    const byName = (a, b) =>
        (a.place.name || '\uffff').localeCompare(b.place.name || '\uffff');

    state.results.sort((a, b) => {
        if (state.sort === 'distance' && state.userLoc) {
            return a.dist - b.dist;
        }

        if (state.sort === 'name') {
            return byName(a, b);
        }

        return (b.score - a.score) ||
            (Number(!!b.place.name) - Number(!!a.place.name)) ||
            (state.userLoc ? a.dist - b.dist : 0) ||
            byName(a, b);
    });
}

function setResults(list, { title, query = null, cat = null, fit = true }) {
    state.results = list;
    state.title = title;
    state.query = query;
    state.cat = cat;
    state.filter = 'all';
    state.visible = 10;
    state.selected = null;

    recomputeDistances();
    sortResults();
    updateHighlight();
    setFocus([]);
    showView('results');

    if (fit) {
        fitToPlaces(filteredResults().map(r => r.place));
    }
}

function runSearch(query) {
    const text = query.trim();

    if (text.length < 2) {
        searchMessage.textContent = 'Type at least 2 characters.';
        return;
    }

    const matches = matchPlaces(text);

    searchMessage.textContent = matches.length
        ? `Found ${matches.length} matching place${matches.length === 1 ? '' : 's'}.`
        : 'No matches in the dataset. Try another word, or search addresses online.';

    setResults(matches, { title: `“${text}”`, query: text });
}

function browseCategory(category) {
    const places = category === 'all'
        ? allPlaces
        : allPlaces.filter(place => place.layerId === category);

    const title = category === 'all' ? 'All places' : CATEGORIES[category].plural;

    searchMessage.textContent = `Showing ${places.length} ${title.toLowerCase()}.`;

    setResults(places.map(place => ({ place, score: 1 })), { title, cat: category });
}

async function searchOnline(query) {
    toast('Searching addresses online…');

    try {
        const found = await geocode(query, 5);

        if (!found.length) {
            toast('No online results found.');
            return;
        }

        const pins = found.map(item => makePin(item.lngLat, item.name));

        setResults(pins.map(place => ({ place, score: 1 })), { title: `Addresses for “${query}”` });
    } catch (error) {
        toast(`Online search failed: ${error.message}`);
    }
}

function clearSearch() {
    searchInput.value = '';
    searchMessage.textContent = '';

    state.results = [];
    state.query = null;
    state.cat = null;
    state.selected = null;

    updateHighlight();
    setFocus([]);

    if (state.view === 'results' || state.view === 'place') {
        flap.hidden = true;
    }

    updateReopen();
    syncHash();
}

function submitSearch() {
    const query = searchInput.value.trim();

    if (!query) {
        searchMessage.textContent = 'Please enter a place name.';
        return;
    }

    runSearch(query);
    closeDrawer();
}


// ----------------------------------------
// 14. THE FLAP (results / place / directions / saved)
// ----------------------------------------

function showView(name) {
    state.view = name;

    flap.hidden = false;
    flap.classList.remove('collapsed');
    $('flap-toggle').setAttribute('aria-expanded', 'true');

    renderFlap();
    flapBody.scrollTop = 0;

    updateReopen();
    syncHash();
}

function renderFlap() {
    const titles = {
        results: state.title || 'Results',
        place: 'Place details',
        directions: 'Directions',
        saved: 'Saved places'
    };

    if (flapTitle) {
        flapTitle.textContent = titles[state.view];
    }

    flapBack.hidden = !(state.view === 'place' && state.ret);

    try {
        ({
            results: renderResultsView,
            place: renderPlaceView,
            directions: renderDirectionsView,
            saved: renderSavedView
        })[state.view]();
    } catch (error) {
        console.error('Panel failed to render:', error);
        flapBody.replaceChildren(el('div', { class: 'error-box', text: `Panel error: ${error.message}` }));
    }
}

// Re-draw without losing scroll position (skipped for directions so typing isn't interrupted)
function rerender() {
    if (flap.hidden || state.view === 'directions') {
        return;
    }

    const scroll = flapBody.scrollTop;

    renderFlap();
    flapBody.scrollTop = scroll;
}

function updateReopen() {
    const show = flap.hidden && state.results.length > 0;

    reopenButton.hidden = !show;

    if (show) {
        reopenButton.textContent = `Show results (${state.results.length})`;
    }
}

function actionButton(iconNode, label, handler, { primary = false, active = false } = {}) {
    return el('button', {
        type: 'button',
        class: 'action-btn' + (primary ? ' primary' : '') + (active ? ' active' : ''),
        onclick: handler
    },
    el('span', { class: 'ab-icon' }, iconNode),
    el('span', { class: 'ab-label', text: label }));
}

function heartButton(place) {
    const saved = inFavorites(place.uid);

    return el('button', {
        type: 'button',
        class: 'icon-btn small heart' + (saved ? ' on' : ''),
        title: saved ? 'Remove from Favorites' : 'Save to Favorites',
        'aria-label': `${saved ? 'Remove' : 'Save'} ${placeLabel(place)} ${saved ? 'from' : 'to'} Favorites`,
        'aria-pressed': String(saved),
        onclick: event => {
            event.stopPropagation();
            toggleFavorite(place);
        }
    }, icon('star', { fill: saved }));
}

function placeCard(place, dist) {
    const meta = catMeta(place.layerId);
    const label = placeLabel(place);

    const sub = [placeSubtitle(place), dist !== null && dist !== undefined ? fmtDist(dist) : '']
        .filter(Boolean).join(' · ');

    const card = el('div', {
        class: 'place-card',
        role: 'button',
        tabindex: '0'
    },
    el('span', {
        class: 'pc-icon',
        style: `background:${meta.color}26;color:${meta.color}`
    }, icon(meta.icon)),
    el('div', { class: 'pc-main' },
        el('div', { class: 'pc-name', text: label }),
        el('div', { class: 'pc-sub', text: sub })
    ),
    el('div', { class: 'pc-actions' },
        heartButton(place),
        el('button', {
            type: 'button',
            class: 'icon-btn small',
            title: 'Directions',
            'aria-label': `Directions to ${label}`,
            onclick: event => {
                event.stopPropagation();
                directionsTo(place);
            }
        }, icon('directions'))
    ));

    card.addEventListener('click', () => selectPlace(place));

    card.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            selectPlace(place);
        }
    });

    card.addEventListener('mouseenter', () => setFocus([place]));
    card.addEventListener('mouseleave', restoreFocus);
    card.addEventListener('focus', () => setFocus([place]));
    card.addEventListener('blur', restoreFocus);

    return card;
}

function renderResultsView() {
    const body = flapBody;
    body.replaceChildren();

    const all = state.results;
    const list = filteredResults();

    body.append(el('div', { class: 'rv-head' },
        el('strong', { text: `${all.length} ${all.length === 1 ? 'place' : 'places'}` }),
        state.query ? el('span', { class: 'muted', text: ` matching “${state.query}”` }) : null
    ));

    if (!all.length) {
        body.append(el('div', { class: 'empty' },
            el('p', { text: 'Nothing in the Brussels dataset matches that search.' }),
            state.query
                ? el('button', {
                    type: 'button',
                    class: 'btn primary',
                    onclick: () => searchOnline(state.query)
                }, icon('globe'), 'Search addresses online')
                : null
        ));

        return;
    }

    // Category filter chips
    const counts = {};

    all.forEach(r => {
        counts[r.place.layerId] = (counts[r.place.layerId] || 0) + 1;
    });

    const keys = Object.keys(counts);

    if (keys.length > 1) {
        const chips = el('div', { class: 'chip-row' });

        [['all', null, `All ${all.length}`], ...keys.map(k => [k, catMeta(k).icon, String(counts[k])])]
            .forEach(([key, iconName, label]) => {
                chips.append(el('button', {
                    type: 'button',
                    class: 'chip' + (state.filter === key ? ' active' : ''),
                    title: key === 'all' ? 'All categories' : catMeta(key).plural,
                    onclick: () => {
                        state.filter = key;
                        state.visible = 10;
                        updateHighlight();
                        fitToPlaces(filteredResults().map(r => r.place));
                        rerender();
                    }
                }, iconName ? icon(iconName) : null, label));
            });

        body.append(chips);
    }

    // Sort control
    const select = el('select', { class: 'sort-select', 'aria-label': 'Sort results' },
        ...[['relevance', 'Best match'], ['name', 'A to Z'], ['distance', 'Nearest to me']]
            .map(([value, label]) => {
                const option = el('option', { value, text: label });
                option.selected = state.sort === value;
                return option;
            })
    );

    select.addEventListener('change', async () => {
        if (select.value === 'distance' && !state.userLoc) {
            try {
                await getUserLocation();
            } catch (error) {
                toast(error.message);
                select.value = state.sort;
                return;
            }
        }

        state.sort = select.value;
        recomputeDistances();
        sortResults();
        rerender();
    });

    body.append(el('div', { class: 'sort-row' }, el('span', { class: 'muted', text: 'Sort by' }), select));

    // Cards
    const cards = el('div', { class: 'card-list' });

    list.slice(0, state.visible).forEach(r => cards.append(placeCard(r.place, r.dist)));

    body.append(cards);

    if (list.length > state.visible) {
        body.append(el('button', {
            type: 'button',
            class: 'btn wide',
            onclick: () => {
                state.visible += 10;
                rerender();
            }
        }, `Show more (${list.length - state.visible} left)`));
    }

    // Footer actions
    const footer = el('div', { class: 'rv-footer' },
        el('button', {
            type: 'button',
            class: 'btn',
            onclick: () => {
                if (list.length > 300) {
                    toast('Narrow the search first. You can save up to 300 places at once.');
                    return;
                }

                openListPicker(list.map(r => r.place));
            }
        }, icon('star'), 'Save all to list'),
        (state.query || state.cat)
            ? el('button', { type: 'button', class: 'btn', onclick: shareResults }, icon('share'), 'Share results')
            : null,
        state.query
            ? el('button', { type: 'button', class: 'btn', onclick: () => searchOnline(state.query) }, icon('globe'), 'Search online')
            : null
    );

    body.append(footer);
}


// ----------------------------------------
// 15. PLACE DETAILS
// ----------------------------------------

function inferReturn() {
    if (state.view === 'place') {
        return state.ret;
    }

    if (state.view === 'saved') {
        return 'saved';
    }

    return state.results.length ? 'results' : null;
}

function selectPlace(place, { fly = true } = {}) {
    state.ret = inferReturn();
    state.selected = place;

    setFocus([place]);
    showView('place');

    if (fly) {
        flyToPlace(place);
    }
}

function clearSelected() {
    state.selected = null;
    setFocus([]);
}

function renderPlaceView() {
    const place = state.selected;
    const body = flapBody;

    body.replaceChildren();

    if (!place) {
        return;
    }

    const meta = catMeta(place.layerId);
    const address = placeAddress(place);
    const savedAnywhere = isSaved(place.uid);

    body.append(el('div', { class: 'pv-head' },
        el('span', { class: 'pc-icon big', style: `background:${meta.color}26;color:${meta.color}` }, icon(meta.icon)),
        el('div', {},
            el('h3', { class: 'pv-name', text: placeLabel(place) }),
            el('div', { class: 'pc-sub', text: placeSubtitle(place) }),
            address ? el('div', { class: 'pv-address', text: address }) : null,
            state.userLoc
                ? el('div', { class: 'pc-sub', text: `${fmtDist(haversine(state.userLoc, place.center))} from you` })
                : null
        )
    ));

    body.append(el('div', { class: 'action-row' },
        actionButton(icon('directions'), 'Directions', () => directionsTo(place), { primary: true }),
        actionButton(icon('star', { fill: savedAnywhere }), savedAnywhere ? 'Saved' : 'Save', () => openListPicker([place]), { active: savedAnywhere }),
        actionButton(icon('share'), 'Share', () => sharePlace(place)),
        actionButton(icon('target'), 'Zoom', () => flyToPlace(place))
    ));

    // Details table (every property in the dataset)
    const rows = Object.entries(place.props)
        .filter(([key, value]) => !HIDDEN_KEYS.test(key) && value !== null && value !== undefined && String(value).trim() !== '');

    const details = el('dl', { class: 'pv-details' });

    if (place.layerId === 'pin') {
        details.append(el('dt', { text: 'Coordinates' }), el('dd', { text: fmtCoord(place.center) }));
    }

    rows.forEach(([key, value]) => {
        const text = String(value);
        const isUrl = /^https?:\/\//i.test(text);
        const isPhone = /phone/i.test(key) && /^[+\d][\d\s().-]{5,}$/.test(text);

        let content;

        if (isUrl) {
            content = el('a', { href: text, target: '_blank', rel: 'noopener noreferrer', text: text.replace(/^https?:\/\/(www\.)?/i, '') });
        } else if (isPhone) {
            content = el('a', { href: `tel:${text.replace(/[^\d+]/g, '')}`, text });
        } else {
            content = document.createTextNode(prettyValue(text));
        }

        details.append(el('dt', { text: prettyKey(key) }), el('dd', {}, content));
    });

    if (details.children.length) {
        body.append(el('h4', { class: 'pv-section', text: 'Details' }), details);
    }

    // Nearest places in the other categories (straight-line distance)
    Object.keys(CATEGORIES)
        .filter(id => id !== place.layerId && dataStore[id])
        .forEach(id => {
            const near = nearest(place.center, id, 3).filter(n => n.dist < 5000);

            if (!near.length) {
                return;
            }

            const group = el('div', { class: 'card-list' });

            near.forEach(({ place: other, dist }) => {
                const card = placeCard(other, dist);
                group.append(card);
            });

            body.append(el('h4', { class: 'pv-section', text: `Nearest ${CATEGORIES[id].plural.toLowerCase()}` }), group);
        });
}


// ----------------------------------------
// 16. DIRECTIONS
// ----------------------------------------

const dirUI = { from: null, to: null, out: null };
const wpMarkers = { from: null, to: null };

let routeAbort = null;

function wpFromPlace(place) {
    return { name: placeLabel(place), lngLat: place.center, uid: place.uid };
}

const pinWaypoint = lngLat => ({ name: `Pinned location (${fmtCoord(lngLat)})`, lngLat });

function placeWaypointMarker(kind) {
    const wp = route[kind];

    if (!wp) {
        if (wpMarkers[kind]) {
            wpMarkers[kind].remove();
            wpMarkers[kind] = null;
        }

        return;
    }

    if (!wpMarkers[kind]) {
        const marker = new maplibregl.Marker({
            color: kind === 'from' ? '#188038' : '#d93025',
            draggable: true
        }).setLngLat(wp.lngLat).addTo(map);

        // Drag a marker to re-route
        marker.on('dragend', () => {
            const position = marker.getLngLat();
            setWaypoint(kind, pinWaypoint([position.lng, position.lat]));
        });

        wpMarkers[kind] = marker;
    } else {
        wpMarkers[kind].setLngLat(wp.lngLat);
    }
}

function setWaypoint(kind, waypoint, { compute = true } = {}) {
    route[kind] = waypoint;

    placeWaypointMarker(kind);

    if (dirUI[kind] && dirUI[kind].isConnected) {
        dirUI[kind].value = waypoint ? waypoint.name : '';
    }

    if (route.from && route.to) {
        if (compute) {
            computeRoute();
        }
    } else if (waypoint) {
        map.flyTo({ center: waypoint.lngLat, zoom: Math.max(map.getZoom(), 14) });
        renderRouteOutput();
    }
}

function swapWaypoints() {
    const { from, to } = route;

    route.from = to;
    route.to = from;

    placeWaypointMarker('from');
    placeWaypointMarker('to');

    if (dirUI.from) {
        dirUI.from.value = route.from ? route.from.name : '';
    }

    if (dirUI.to) {
        dirUI.to.value = route.to ? route.to.name : '';
    }

    if (route.from && route.to) {
        computeRoute();
    }
}

function setMode(mode) {
    route.mode = mode;

    document.querySelectorAll('.mode-btn').forEach(button => {
        button.classList.toggle('active', button.dataset.mode === mode);
        button.setAttribute('aria-selected', String(button.dataset.mode === mode));
    });

    if (route.from && route.to) {
        computeRoute();
    } else {
        updateRouteOverlay();
    }
}

function clearRoute() {
    if (routeAbort) {
        routeAbort.abort();
    }

    route.from = null;
    route.to = null;
    route.routes = [];
    route.error = null;
    route.loading = false;

    placeWaypointMarker('from');
    placeWaypointMarker('to');
    updateRouteOverlay();

    if (dirUI.from) {
        dirUI.from.value = '';
    }

    if (dirUI.to) {
        dirUI.to.value = '';
    }

    renderRouteOutput();
    syncHash();
}

async function computeRoute() {
    if (!route.from || !route.to) {
        return;
    }

    if (routeAbort) {
        routeAbort.abort();
    }

    routeAbort = new AbortController();

    const { signal } = routeAbort;
    const coords = [route.from, route.to].map(wp => wp.lngLat.map(n => n.toFixed(6)).join(',')).join(';');
    const url = `${ROUTERS[route.mode]}/${coords}?overview=full&geometries=geojson&steps=true&alternatives=true`;

    route.loading = true;
    route.error = null;
    renderRouteOutput();

    try {
        const response = await fetch(url, { signal });

        if (!response.ok) {
            throw new Error(`The routing service answered with ${response.status}.`);
        }

        const data = await response.json();

        if (data.code !== 'Ok' || !data.routes || !data.routes.length) {
            throw new Error('No route found between these two points for this travel mode.');
        }

        route.routes = data.routes;
        route.sel = 0;
        fitRoute();
    } catch (error) {
        if (error.name === 'AbortError') {
            return;
        }

        route.routes = [];
        route.error = error.message || 'Could not get directions.';
    }

    route.loading = false;

    updateRouteOverlay();
    renderRouteOutput();
    syncHash();
}

function fitRoute() {
    const current = route.routes[route.sel];

    if (!current) {
        return;
    }

    const bounds = new maplibregl.LngLatBounds();
    current.geometry.coordinates.forEach(c => bounds.extend(c));

    map.fitBounds(bounds, { padding: mapPadding(), maxZoom: 17, duration: 800 });
}

function selectRoute(index) {
    route.sel = index;
    updateRouteOverlay();
    renderRouteOutput();
}

async function directionsTo(place) {
    showView('directions');
    setWaypoint('to', wpFromPlace(place));

    if (!route.from) {
        try {
            const here = await getUserLocation();
            setWaypoint('from', { name: 'Your location', lngLat: here });
        } catch (error) {
            toast(`${error.message} Type a starting point instead.`);

            if (dirUI.from) {
                dirUI.from.focus();
            }
        }
    }
}

function startPick(kind) {
    state.pick = kind;
    map.getCanvas().style.cursor = 'crosshair';
    flap.classList.add('collapsed');

    toast(`Click the map to set the ${kind === 'from' ? 'starting point' : 'destination'}. Esc cancels.`);
}

function endPick() {
    state.pick = null;
    map.getCanvas().style.cursor = '';
    flap.classList.remove('collapsed');
}

function directionItems(query) {
    if (!query) {
        const items = [{ type: 'me', icon: 'locate', label: 'Your location' }];

        lists.forEach(list => list.items.slice(0, 4).forEach(item => {
            if (!items.some(i => i.uid === item.uid)) {
                items.push({ type: 'saved', uid: item.uid, icon: 'star', label: item.name || 'Saved place', sub: list.name });
            }
        }));

        return items.slice(0, 6);
    }

    const matches = matchPlaces(query)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
        .map(({ place }) => ({
            type: 'place',
            place,
            icon: catMeta(place.layerId).icon,
            label: placeLabel(place),
            sub: placeSubtitle(place)
        }));

    return [...matches, { type: 'online', query, icon: 'globe', label: `Search “${query}” online` }];
}

async function pickWaypointItem(kind, item) {
    try {
        if (item.type === 'me') {
            const here = await getUserLocation();
            setWaypoint(kind, { name: 'Your location', lngLat: here });
        } else if (item.type === 'place') {
            setWaypoint(kind, wpFromPlace(item.place));
        } else if (item.type === 'saved') {
            const place = resolvePlace(item.uid);

            if (place) {
                setWaypoint(kind, wpFromPlace(place));
            }
        } else if (item.type === 'online') {
            const found = await geocode(item.query, 1);

            if (!found.length) {
                toast('No online match for that address.');
                return;
            }

            setWaypoint(kind, { name: found[0].name, lngLat: found[0].lngLat });
        }
    } catch (error) {
        toast(error.message);
    }
}

function waypointRow(kind) {
    const label = kind === 'from' ? 'Starting point' : 'Destination';

    const input = el('input', {
        type: 'text',
        class: 'wp-input',
        placeholder: kind === 'from' ? 'Choose starting point…' : 'Choose destination…',
        'aria-label': label,
        autocomplete: 'off',
        value: route[kind] ? route[kind].name : ''
    });

    const list = el('ul', { class: 'suggest', role: 'listbox', hidden: true });

    attachAutocomplete({
        input,
        list,
        getItems: directionItems,
        onPick: item => pickWaypointItem(kind, item),
        onEnter: query => {
            if (query) {
                pickWaypointItem(kind, { type: 'online', query });
            }
        }
    });

    dirUI[kind] = input;

    return el('div', { class: 'wp-row' },
        el('span', { class: `wp-dot ${kind}` }),
        el('div', { class: 'wp-field' }, input, list),
        el('button', {
            type: 'button',
            class: 'icon-btn small',
            title: `Choose ${label.toLowerCase()} on the map`,
            'aria-label': `Choose ${label.toLowerCase()} on the map`,
            onclick: () => startPick(kind)
        }, icon('target'))
    );
}

function renderDirectionsView() {
    const body = flapBody;
    body.replaceChildren();

    const modeBar = el('div', { class: 'mode-bar', role: 'tablist', 'aria-label': 'Travel mode' },
        ...Object.entries(MODES).map(([key, mode]) => el('button', {
            type: 'button',
            role: 'tab',
            class: 'mode-btn' + (route.mode === key ? ' active' : ''),
            'aria-selected': String(route.mode === key),
            'data-mode': key,
            onclick: () => setMode(key)
        }, icon(key), el('span', { text: mode.label })))
    );

    const block = el('div', { class: 'wp-block' },
        el('div', { class: 'wp-rows' }, waypointRow('from'), waypointRow('to')),
        el('button', {
            type: 'button',
            class: 'icon-btn swap',
            title: 'Swap start and destination',
            'aria-label': 'Swap start and destination',
            onclick: swapWaypoints
        }, icon('swap'))
    );

    dirUI.out = el('div', { class: 'route-out' });

    body.append(modeBar, block, dirUI.out);

    renderRouteOutput();
}

// Rotation (degrees) applied to the "up" arrow for each turn type
const TURN_ROTATION = {
    straight: 0,
    'slight right': 45,
    right: 90,
    'sharp right': 135,
    'sharp left': -135,
    left: -90,
    'slight left': -45
};

function maneuverIcon(maneuver) {
    if (maneuver.type === 'arrive') {
        return icon('flag');
    }

    if (maneuver.type === 'depart') {
        return icon('dot');
    }

    if (maneuver.modifier === 'uturn') {
        return icon('uturn');
    }

    return icon('up', { rotate: TURN_ROTATION[maneuver.modifier] ?? 0 });
}

function compass(bearing) {
    const names = ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'];
    return names[Math.round(((bearing || 0) % 360) / 45) % 8];
}

function describeStep(step) {
    const maneuver = step.maneuver || {};
    const modifier = maneuver.modifier || '';
    const road = step.name ? ` onto ${step.name}` : '';

    switch (maneuver.type) {
        case 'depart':
            return `Head ${compass(maneuver.bearing_after)}${step.name ? ` on ${step.name}` : ''}`;
        case 'arrive':
            return 'Arrive at your destination';
        case 'roundabout':
        case 'rotary':
        case 'roundabout turn':
            return `At the roundabout, take exit ${maneuver.exit || ''}${road}`.replace(/\s+/g, ' ').trim();
        case 'merge':
            return `Merge${road}`;
        case 'fork':
            return `Keep ${modifier || 'straight'}${road}`;
        case 'continue':
        case 'new name':
            return !modifier || modifier === 'straight'
                ? `Continue straight${step.name ? ` on ${step.name}` : ''}`
                : `Continue ${modifier}${road}`;
        default:
            if (modifier === 'uturn') {
                return `Make a U-turn${road}`;
            }

            if (!modifier || modifier === 'straight') {
                return `Continue straight${step.name ? ` on ${step.name}` : ''}`;
            }

            return `Turn ${modifier}${road}`;
    }
}

function renderRouteOutput() {
    const out = dirUI.out;

    if (!out || !out.isConnected) {
        return;
    }

    out.replaceChildren();

    if (route.loading) {
        out.append(el('p', { class: 'muted pad', text: 'Finding the best route…' }));
        return;
    }

    if (route.error) {
        out.append(el('div', { class: 'error-box', text: route.error }));
    }

    if (!route.from || !route.to) {
        out.append(el('p', { class: 'muted pad', text: 'Choose a start and a destination. You can type a place, use the target button to pick on the map, or right-click the map. Markers can be dragged.' }));
        return;
    }

    const cards = el('div', { class: 'route-cards' });

    route.routes.forEach((r, index) => {
        cards.append(el('button', {
            type: 'button',
            class: 'route-card' + (index === route.sel ? ' active' : ''),
            onclick: () => selectRoute(index)
        },
        el('span', { class: 'rc-time', text: fmtDur(r.duration) }),
        el('span', { class: 'rc-dist', text: fmtDist(r.distance) }),
        el('span', { class: 'rc-tag', text: index === 0 ? 'Fastest' : `Option ${index + 1}` })));
    });

    if (route.routes.length) {
        out.append(cards);

        const steps = el('ol', { class: 'steps' });
        const current = route.routes[route.sel];

        (current.legs || []).forEach(leg => {
            (leg.steps || []).forEach(step => {
                const maneuver = step.maneuver || {};

                const item = el('li', { class: 'step', tabindex: '0' },
                    el('span', { class: 'st-icon' }, maneuverIcon(maneuver)),
                    el('span', { class: 'st-text', text: describeStep(step) }),
                    el('span', { class: 'st-dist', text: step.distance ? fmtDist(step.distance) : '' })
                );

                const goToStep = () => {
                    if (maneuver.location) {
                        map.flyTo({ center: maneuver.location, zoom: 17 });
                    }
                };

                item.addEventListener('click', goToStep);
                item.addEventListener('keydown', event => {
                    if (event.key === 'Enter') {
                        goToStep();
                    }
                });

                steps.append(item);
            });
        });

        out.append(steps);
    }

    const [fromLng, fromLat] = route.from.lngLat;
    const [toLng, toLat] = route.to.lngLat;

    out.append(el('div', { class: 'rv-footer' },
        el('button', { type: 'button', class: 'btn primary', onclick: shareRoute }, icon('share'), 'Share route'),
        el('a', {
            class: 'btn',
            target: '_blank',
            rel: 'noopener',
            href: `https://www.google.com/maps/dir/?api=1&origin=${fromLat},${fromLng}&destination=${toLat},${toLng}&travelmode=${MODES[route.mode].google}`
        }, 'Open in Google Maps'),
        el('button', { type: 'button', class: 'btn', onclick: clearRoute }, 'Clear')
    ));

    if (route.mode === 'foot' || route.mode === 'bike') {
        out.append(el('p', { class: 'muted pad small', text: 'Bus timetable routing is not included. Bus stops are shown on the map for planning.' }));
    }
}


// ----------------------------------------
// 17. SAVED VIEW
// ----------------------------------------

const importInput = el('input', {
    type: 'file',
    accept: 'application/json,.json',
    hidden: true
});

importInput.addEventListener('change', () => {
    if (importInput.files[0]) {
        importBackup(importInput.files[0]);
    }

    importInput.value = '';
});

function showListOnMap(list) {
    const places = list.items.map(resolvePlace).filter(Boolean);

    if (!places.length) {
        toast('This list is empty.');
        return;
    }

    setResults(places.map(place => ({ place, score: 1 })), { title: list.name });
}

function listSection(list) {
    const details = el('details', { class: 'list-card' });
    details.open = openLists.has(list.id);

    details.addEventListener('toggle', () => {
        if (details.open) {
            openLists.add(list.id);
        } else {
            openLists.delete(list.id);
        }
    });

    details.append(el('summary', {},
        el('span', { class: 'ls-name', text: list.name }),
        el('span', { class: 'ls-count', text: String(list.items.length) })
    ));

    if (!list.items.length) {
        details.append(el('p', { class: 'muted pad small', text: 'Nothing here yet. Tap the star on any place to save it.' }));
    } else {
        details.append(el('div', { class: 'list-tools' },
            el('button', { type: 'button', class: 'btn small', onclick: () => showListOnMap(list) }, icon('map'), 'Show on map'),
            el('button', { type: 'button', class: 'btn small', onclick: () => shareList(list) }, icon('share'), 'Share'),
            el('button', { type: 'button', class: 'btn small', onclick: () => exportGeoJSON(list) }, icon('download'), 'GeoJSON')
        ));

        const rows = el('div', { class: 'card-list' });

        list.items.forEach(item => {
            const place = resolvePlace(item);

            if (!place) {
                return;
            }

            const meta = catMeta(place.layerId);

            const row = el('div', { class: 'place-card', role: 'button', tabindex: '0' },
                el('span', { class: 'pc-icon', style: `background:${meta.color}26;color:${meta.color}` }, icon(meta.icon)),
                el('div', { class: 'pc-main' },
                    el('div', { class: 'pc-name', text: item.name || placeLabel(place) }),
                    el('div', { class: 'pc-sub', text: placeSubtitle(place) })
                ),
                el('div', { class: 'pc-actions' },
                    el('button', {
                        type: 'button',
                        class: 'icon-btn small',
                        title: 'Directions',
                        'aria-label': `Directions to ${item.name || 'saved place'}`,
                        onclick: event => {
                            event.stopPropagation();
                            directionsTo(place);
                        }
                    }, icon('directions')),
                    el('button', {
                        type: 'button',
                        class: 'icon-btn small',
                        title: 'Remove from this list',
                        'aria-label': `Remove ${item.name || 'place'} from ${list.name}`,
                        onclick: event => {
                            event.stopPropagation();
                            removeFromList(list.id, item.uid);
                        }
                    }, icon('close'))
                )
            );

            row.addEventListener('click', () => selectPlace(place));

            row.addEventListener('keydown', event => {
                if (event.key === 'Enter') {
                    selectPlace(place);
                }
            });

            row.addEventListener('mouseenter', () => setFocus([place]));
            row.addEventListener('mouseleave', restoreFocus);

            rows.append(row);
        });

        details.append(rows);
    }

    if (list.id !== 'favorites') {
        details.append(el('div', { class: 'list-tools' },
            el('button', { type: 'button', class: 'btn small', onclick: () => renameListFlow(list) }, icon('edit'), 'Rename'),
            el('button', { type: 'button', class: 'btn small danger', onclick: () => deleteListFlow(list) }, icon('trash'), 'Delete')
        ));
    }

    return details;
}

function renderSavedView() {
    const body = flapBody;
    body.replaceChildren();

    body.append(el('div', { class: 'saved-toolbar' },
        el('button', { type: 'button', class: 'btn primary', onclick: newListFlow }, '+ New list'),
        el('button', { type: 'button', class: 'btn', onclick: () => importInput.click() }, 'Import'),
        el('button', { type: 'button', class: 'btn', onclick: exportBackup }, 'Back up')
    ));

    lists.forEach(list => body.append(listSection(list)));

    body.append(el('p', {
        class: 'muted pad small',
        text: 'Lists are stored in this browser only. Use Share to send a list to someone, or Back up to keep a copy.'
    }), importInput);
}


// ----------------------------------------
// 18. LOCATION
// ----------------------------------------

let userMarker = null;

function getUserLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Location is not supported by this browser.'));
            return;
        }

        navigator.geolocation.getCurrentPosition(
            position => {
                state.userLoc = [position.coords.longitude, position.coords.latitude];

                if (!userMarker) {
                    userMarker = new maplibregl.Marker({ element: el('div', { class: 'user-dot' }) });
                }

                userMarker.setLngLat(state.userLoc).addTo(map);

                recomputeDistances();
                rerender();

                resolve(state.userLoc);
            },
            error => reject(new Error(
                error.code === 1
                    ? 'Location permission was denied.'
                    : 'Could not determine your location.'
            )),
            { enableHighAccuracy: true, timeout: 10000 }
        );
    });
}


// ----------------------------------------
// 19. MAP INTERACTION
// ----------------------------------------

const CLICKABLE = ['route-alt', 'busstops', 'restaurants', 'parks'];

function featureAt(point) {
    const layers = CLICKABLE.filter(id => map.getLayer(id));

    if (!layers.length) {
        return null;
    }

    const box = [[point.x - 6, point.y - 6], [point.x + 6, point.y + 6]];

    return map.queryRenderedFeatures(box, { layers })[0] || null;
}

map.on('click', event => {
    if (state.pick) {
        const kind = state.pick;

        endPick();
        setWaypoint(kind, pinWaypoint([event.lngLat.lng, event.lngLat.lat]));
        return;
    }

    const feature = featureAt(event.point);

    if (!feature) {
        return;
    }

    if (feature.layer.id === 'route-alt') {
        selectRoute(feature.properties.idx);
        return;
    }

    const place = placeIndex.get(feature.properties._uid);

    if (place) {
        selectPlace(place, { fly: false });
    }
});

map.on('mousemove', event => {
    if (state.pick) {
        return;
    }

    map.getCanvas().style.cursor = featureAt(event.point) ? 'pointer' : '';
});

// Right-click: drop a pin and offer directions
let contextPopup = null;

map.on('contextmenu', event => {
    const lngLat = [event.lngLat.lng, event.lngLat.lat];

    const menuButton = (label, handler) => el('button', {
        type: 'button',
        class: 'ctx-btn',
        onclick: () => {
            contextPopup.remove();
            handler();
        }
    }, label);

    const box = el('div', { class: 'ctx' },
        el('strong', { text: 'Dropped pin' }),
        el('div', { class: 'ctx-coords', text: fmtCoord(lngLat) }),
        menuButton('Directions from here', () => {
            showView('directions');
            setWaypoint('from', pinWaypoint(lngLat));
        }),
        menuButton('Directions to here', () => {
            showView('directions');
            setWaypoint('to', pinWaypoint(lngLat));
        }),
        menuButton('Details, save and share', () => selectPlace(makePin(lngLat, 'Dropped pin'), { fly: false }))
    );

    if (contextPopup) {
        contextPopup.remove();
    }

    contextPopup = new maplibregl.Popup({ maxWidth: '240px' })
        .setLngLat(event.lngLat)
        .setDOMContent(box)
        .addTo(map);
});

document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && state.pick) {
        endPick();
    }
});


// ----------------------------------------
// 20. SIDEBAR + FLAP CONTROLS
// ----------------------------------------

function openDrawer() {
    sidebar.classList.add('open');
    scrim.hidden = false;
}

function closeDrawer() {
    sidebar.classList.remove('open');
    scrim.hidden = true;
}

$('menu-btn').addEventListener('click', openDrawer);
scrim.addEventListener('click', closeDrawer);

searchButton.addEventListener('click', submitSearch);
clearSearchButton.addEventListener('click', clearSearch);
reopenButton.addEventListener('click', () => showView('results'));

$('flap-close').addEventListener('click', () => {
    flap.hidden = true;

    if (state.pick) {
        endPick();
    }

    updateReopen();
});

$('flap-toggle').addEventListener('click', () => {
    const collapsed = flap.classList.toggle('collapsed');
    $('flap-toggle').setAttribute('aria-expanded', String(!collapsed));
});

flapBack.addEventListener('click', () => {
    const target = state.ret;

    clearSelected();

    if (target === 'saved') {
        showView('saved');
    } else {
        showView('results');
    }
});

$('nav-directions').addEventListener('click', () => {
    showView('directions');
    closeDrawer();
});

$('nav-saved').addEventListener('click', () => {
    showView('saved');
    closeDrawer();
});

$('locate-btn').addEventListener('click', async () => {
    try {
        const here = await getUserLocation();
        map.flyTo({ center: here, zoom: Math.max(map.getZoom(), 15) });
    } catch (error) {
        toast(error.message);
    }
});

document.querySelectorAll('.category-button').forEach(button => {
    button.addEventListener('click', () => {
        browseCategory(button.dataset.category);
        closeDrawer();
    });
});

document.querySelectorAll('.try-row .chip').forEach(chip => {
    chip.addEventListener('click', () => {
        searchInput.value = chip.dataset.q;
        submitSearch();
    });
});

// Layer visibility
[
    ['toggle-parks', 'parks'],
    ['toggle-restaurants', 'restaurants'],
    ['toggle-busstops', 'busstops'],
    ['toggle-saved', 'saved']
].forEach(([checkboxId, key]) => {
    const control = $(checkboxId);

    control.addEventListener('change', () => {
        layerVisible[key] = control.checked;

        const layerId = key === 'saved' ? 'saved-ring' : key;

        if (map.getLayer(layerId)) {
            map.setLayoutProperty(layerId, 'visibility', control.checked ? 'visible' : 'none');
        }
    });
});

// Basemap switcher: style.load re-adds all of our layers
document.querySelectorAll('.basemap-btn').forEach(button => {
    button.addEventListener('click', () => {
        const key = button.dataset.basemap;

        if (key === currentBasemap) {
            return;
        }

        currentBasemap = key;

        document.querySelectorAll('.basemap-btn').forEach(b => {
            b.classList.toggle('active', b === button);
        });

        map.setStyle(BASEMAPS[key], { diff: false });
    });
});

// Search box suggestions
attachAutocomplete({
    input: searchInput,
    list: $('suggestions'),
    getItems: query => {
        if (query.length < 2) {
            return [];
        }

        const top = matchPlaces(query)
            .sort((a, b) => b.score - a.score)
            .slice(0, 6)
            .map(({ place }) => ({
                type: 'place',
                place,
                icon: catMeta(place.layerId).icon,
                label: placeLabel(place),
                sub: placeSubtitle(place)
            }));

        return [{ type: 'search', icon: 'search', label: `Search “${query}”` }, ...top];
    },
    onPick: item => {
        if (item.type === 'search') {
            submitSearch();
        } else {
            searchInput.value = item.place.name;
            selectPlace(item.place);
            closeDrawer();
        }
    },
    onEnter: submitSearch
});


// ----------------------------------------
// 21. OPEN SHARED LINKS
// ----------------------------------------

function parseLngLat(text) {
    const parts = String(text).split(',').map(Number);

    return parts.length === 2 && parts.every(Number.isFinite) ? parts : null;
}

function applyHash() {
    const params = new URLSearchParams(location.hash.slice(1));

    if (params.has('place')) {
        const place = resolvePlace(params.get('place'));

        if (place) {
            selectPlace(place);
        }
    } else if (params.has('pin')) {
        const lngLat = parseLngLat(params.get('pin'));

        if (lngLat) {
            selectPlace(makePin(lngLat, params.get('name') || 'Shared location'));
        }
    } else if (params.has('route')) {
        const points = params.get('route').split(';').map(parseLngLat);
        const mode = params.get('mode');

        if (points.length === 2 && points.every(Boolean)) {
            if (MODES[mode]) {
                route.mode = mode;
            }

            showView('directions');

            setWaypoint('from', {
                name: params.get('fn') || pinWaypoint(points[0]).name,
                lngLat: points[0]
            }, { compute: false });

            setWaypoint('to', {
                name: params.get('tn') || pinWaypoint(points[1]).name,
                lngLat: points[1]
            });
        }
    } else if (params.has('q')) {
        searchInput.value = params.get('q');
        runSearch(params.get('q'));
    } else if (params.has('cat')) {
        const category = params.get('cat');

        if (category === 'all' || CATEGORIES[category]) {
            browseCategory(category);
        }
    } else if (params.has('list')) {
        handleSharedList(params.get('list'));
    }
}

window.addEventListener('hashchange', () => {
    if (booted) {
        applyHash();
    }
});


// ----------------------------------------
// 22. START-UP
// ----------------------------------------

let booted = false;

// "style.load" fires on first load and again whenever the basemap changes,
// so all of our layers are (re)added here.
map.on('style.load', async () => {
    await loadData();

    addDataLayers();
    addOverlayLayers();
    refreshOverlays();

    if (!booted) {
        booted = true;

        updateSavedOverlay();
        $('saved-badge').textContent = String(new Set(lists.flatMap(l => l.items.map(i => i.uid))).size);

        requestAnimationFrame(pulseFrame);
        applyHash();

        console.log('Map loaded successfully!');
        console.log('Finished loading datasets.');
    }
});

// Replace the data-icon placeholders in index.html with the SVG icons
hydrateIcons();
