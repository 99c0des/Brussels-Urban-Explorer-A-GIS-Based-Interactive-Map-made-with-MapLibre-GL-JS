# Brussels Urban Explorer

An interactive web map for discovering parks, restaurants and bus stops across Brussels. Search by name or by what a place offers (try "pizza"), get walking, cycling and driving directions, save places into custom lists, and share places, routes and lists with a link.

**[Live demo]()**


## Why I built this

A GIS project that takes OpenStreetMap data prepared in QGIS and turns it into a complete web mapping application, using plain HTML, CSS and JavaScript (see set for replicable codes)

## Features

### Search and discovery
- Free-text search across place names and every attribute in the data, so "pizza" finds restaurants whose cuisine is pizza as well as places with pizza in the name
- Multi-word queries where every word must match, and accent-insensitive matching ("cafe" finds "Café")
- Ranked results: exact name, then names starting with the query, then names containing it, then other attributes
- Live autocomplete suggestions with full keyboard control (arrow keys, Enter, Escape)
- Quick-try search chips
- Explore by category: parks, restaurants, bus stops, or all places
- Online address search (OpenStreetMap Nominatim) when the local data has no match

### Map highlighting
- Matching polygons are filled and outlined, and matching points get a halo with a gentle pulse (small result sets, respects reduced-motion settings)
- The map zooms to fit all results, with padding that accounts for the open panel
- Hovering or focusing a result card marks that place on the map
- Saved places are marked with a gold ring

### Results panel
- A Google-Maps-style panel over the map listing results as cards
- Category filter chips with counts, and sorting by best match, A to Z, or nearest to me
- Paged results with "Show more"
- Distance from your location on every card
- One-click favourite star and directions on each card
- Save all results to a list, share the results, or search online from the same panel

### Place details
- Click any feature on the map, or any result, to open its details
- Every attribute from the dataset, with websites and phone numbers as live links
- Composed address, distance from you, and the nearest places in the other categories (for example the closest bus stops to a restaurant)
- Actions: Directions, Save, Share, Zoom

### Directions
- Walking, cycling and driving routes (OpenStreetMap routing)
- Up to three route alternatives, selectable from the cards or by clicking a route on the map
- Travel time and distance for each option
- Turn-by-turn instructions with custom icons, and click a step to fly to it
- Start and destination from typed places (autocomplete), saved places, your location, an online address, or a point picked on the map
- Draggable start and destination markers that re-route as you move them
- Swap start and destination
- Right-click the map to drop a pin: directions from here, directions to here, or pin details
- Dotted route line for walking, solid for cycling and driving
- Open the same route in Google Maps

### Saved places and custom lists
- Favourites with a one-click star
- Unlimited custom lists, with a picker that shows which lists a place is in (including partial selection when saving several places)
- Rename and delete lists, and show any list on the map
- Saved-places counter in the sidebar and a toggleable gold-ring map layer
- Lists persist in the browser (localStorage)
- Back up and import lists as JSON
- Export any list as GeoJSON for use in QGIS

### Sharing
- Share places, routes, searches, categories and whole lists
- Share via the device share sheet, email, text message, WhatsApp, or copy the link
- Open a place in a maps app (geo link), Google Maps or OpenStreetMap
- The address bar updates as you use the map, so any view can be copied as a link
- Opening a shared link restores the exact place, route, search or list
- Opening a shared list lets you save it to your own lists or just view it

### Map and interface
- Layer toggles for parks, restaurants, bus stops and saved places
- Basemap switcher: Streets, Bright and Light
- "Show my location" button with a pulsing position marker
- Zoom and compass controls, and a metric scale bar
- Legend that matches the map symbols
- Custom SVG icon set used throughout, with no emoji or icon fonts
- Responsive layout: on phones the sidebar becomes a slide-over drawer and the results panel becomes a bottom sheet
- Keyboard accessible, visible focus states, ARIA labels, and reduced-motion support
- Data is rendered with safe DOM methods rather than injected HTML

## Share link reference

Everything after `#` in the URL describes the view:

| Parameter | Example | Result |
|---|---|---|
| `place` | `#place=restaurants:4.35170,50.84630` | Opens a place from the dataset |
| `pin` and `name` | `#pin=4.3517,50.8503&name=Meeting%20point` | Opens a dropped pin |
| `route`, `mode`, `fn`, `tn` | `#route=4.35,50.84;4.36,50.85&mode=foot` | Opens directions (modes: `foot`, `bike`, `car`) |
| `q` | `#q=pizza` | Runs a search |
| `cat` | `#cat=parks` | Browses a category (`parks`, `restaurants`, `busstops`, `all`) |
| `list` | `#list=...` | Opens a shared list |

## Tech stack

- [MapLibre GL JS](https://maplibre.org/) v5 for the map
- [OpenFreeMap](https://openfreemap.org/) vector tiles for the basemaps
- OpenStreetMap routing servers (`routing.openstreetmap.de`) for directions
- [Nominatim](https://nominatim.org/) for online address search
- Vanilla JavaScript, HTML and CSS
- GeoJSON data prepared in QGIS from OpenStreetMap

## Data

The three layers (`parks`, `restaurants`, `busstops`) are stored in `geojson/` and were extracted from OpenStreetMap and cleaned in QGIS. [Describe your steps here, for example the Overpass query or QGIS plugin, the date of extraction, the CRS conversion to EPSG:4326, and any attributes you kept.]

## Run locally

The page loads GeoJSON with `fetch`, so it needs a local web server (opening the file directly will not work).

**VS Code:** install the Live Server extension, open the project folder, and click **Go Live**.

**Python:**

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Deploy

Push to GitHub, then enable **Settings → Pages → Deploy from a branch → main / root**.

## Project structure

| File | Purpose |
|---|---|
| `index.html` | Page layout: sidebar, map, results panel, dialogs |
| `script.js` | Data loading, search, map layers, directions, lists, sharing, icons |
| `style.css` | Styling, responsive layout, accessibility |
| `geojson/` | Parks, restaurants and bus stops |

## Known limitations

- Public routing and address servers are meant for light use; for heavy traffic, point `ROUTERS` in `script.js` at your own OSRM server or an OpenRouteService key
- Public transport (bus timetable) routing is not included, since the data holds stops but no schedules
- Saved lists live in the browser they were created in; use Share or Back up to move them

## Ideas for next steps

- Public transport routing with GTFS data
- Opening-hours filter ("open now")
- Isochrones: everything reachable within 10 minutes on foot
- More layers (cycling infrastructure, playgrounds, bike sharing)

## Credits and licence

- Map data © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), available under the ODbL
- Basemap tiles by OpenFreeMap
- Code: MIT licence

## Author

Gunjan Gautam, 2026
