<!--------------------------------------------------------------------------------------------------------
PSEUDOCODE
filename:   views/map.vue
purpose:    - the Map (home) screen, where users land after signing in (prototype 04/05/06-Home*.html, 03-WebMap.html)
            - full-screen MapLibre map with a marker + dashed play zone for each place
            - phone: search bar + coins on top, draggable "Near you" sheet, bottom nav
            - iPad / laptop: glass sidebar on the left, nav at the top-right, zoom buttons at the bottom-right
            - places come from our Express server (GET /api/places → Supabase `places` table).
              Every place shows as playable until the `visits` table exists (step 6)
            - cards just centre the map on the place. Place preview, search, route and journey are later steps
imports:    MapLibre, lib/paperMapStyle.js (colours), lib/mapPins3d.js (3D pins), lib/geo.js (distance maths),
            data/placeLabels.js (MRT colours), components/map/* (sheet, card, search bar),
            components/ui/* (nav, coins, underline), lib/api.js (places + coins)
---------------------------------------------------------------------------------------------------------->

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

import { MRT_COLOURS } from '@/data/placeLabels'
import { distanceM, circleRing } from '@/lib/geo'
import { MAP_STYLE_URL, applyPaperStyle } from '@/lib/paperMapStyle'
import { createPins3d, pinScale } from '@/lib/mapPins3d'
import { api } from '@/lib/api'

import BottomSheet from '@/components/map/BottomSheet.vue'
import PlaceCard from '@/components/map/PlaceCard.vue'
import SearchBar from '@/components/map/SearchBar.vue'
import PlaceSearch from '@/components/map/PlaceSearch.vue'
import AppNav from '@/components/ui/AppNav.vue'
import CoinPill from '@/components/ui/CoinPill.vue'
import HandUnderline from '@/components/ui/HandUnderline.vue'
import appLogo from '@/assets/app-logo.png'

// Used until the browser gives us a real location (or if location is turned off)
const SMU = [103.8502, 1.2963]

// The map can't be panned or zoomed out past Singapore (MapLibre's maxBounds + minZoom).
// A little sea is left around the island so coastal places (Changi, Tuas, Sentosa) aren't jammed
// against the screen edge or hidden behind the sheet / sidebar
const SINGAPORE_BOUNDS = [
    [103.55, 1.13],                          // south-west corner (lng, lat): past Tuas, below Sentosa
    [104.13, 1.50],                          // north-east corner: past Changi, above Woodlands
]
const MIN_ZOOM = 10                          // about "the whole island"

const inSingapore = ([lng, lat]) =>
    lng >= SINGAPORE_BOUNDS[0][0] && lng <= SINGAPORE_BOUNDS[1][0]
    && lat >= SINGAPORE_BOUNDS[0][1] && lat <= SINGAPORE_BOUNDS[1][1]

// ---------- Screen size ----------
// The sheet is a sidebar from 768px up, so the card layout and map padding change with it
const wideQuery = window.matchMedia('(min-width: 768px)')
const isWide = ref(wideQuery.matches)
const onWideChange = (e) => { isWide.value = e.matches }

// ---------- Sheet + filters ----------
const detent = ref('middle')                 // 'down' | 'middle' | 'up' (phone only)
const filter = ref('all')                    // 'all' | 'mrt' | 'spots'
const FILTERS = [
    { id: 'all', label: 'All' },
    { id: 'mrt', label: 'MRT' },
    { id: 'spots', label: 'Spots' },
]

// ---------- Player ----------
const userPos = ref(SMU)                     // [lng, lat]
const coins = ref(null)                      // null = still loading, or the server is off
const selectedId = ref(null)                 // the place whose label shows on the map

// ---------- Places (from the server) ----------
const places = ref([])                       // filled in by loadPlaces()
const placesStatus = ref('loading')          // 'loading' | 'ready' | 'error'

// Does this place pass the All / MRT / Spots filter?
function passesFilter(place) {
    if (filter.value === 'mrt') return place.kind === 'mrt'
    if (filter.value === 'spots') return place.kind === 'spot'
    return true
}

// ---------- How much to show (328 places cover all of Singapore) ----------
const NEAR_M = 2000              // "Near you" cards: places within 2 km of the user (~25 min walk)
const MAX_CARDS = 20
const PIN_RANGE_M = 3000         // pins + zones: within 3 km of the middle of the map
const MIN_PIN_ZOOM = 13          // zoomed out further than this, no pins at all (they would pile up)
const SPOTS_ZOOM = 15            // below this, only MRT stations (+ the selected place); spots and line codes appear above it
const ALL_ZONES_ZOOM = 16.5      // at street level every nearby zone is drawn; otherwise only the selected place's

// Where the map is looking, updated after every pan/zoom (see onMapMoved)
const mapCentre = ref(SMU)
const mapZoom = ref(16.2)

// Each place that passes the filter, with its distance from the user
const withDistance = computed(() =>
    places.value
        .filter(passesFilter)
        .map((p) => ({ place: p, distance: distanceM(userPos.value, [p.lng, p.lat]) }))
)

// Cards: the nearest places to the USER (stays put when you pan the map)
const visiblePlaces = computed(() =>
    withDistance.value
        .filter(({ distance }) => distance <= NEAR_M)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, MAX_CARDS)
)

// Pins: places around where the MAP is looking (follows you as you pan).
// Zoomed out a bit, only MRT stations show, so the overview stays clean; the selected place always shows
const pinPlaces = computed(() => {
    if (mapZoom.value < MIN_PIN_ZOOM) return []
    const showSpots = mapZoom.value >= SPOTS_ZOOM
    return withDistance.value.filter(({ place }) =>
        (showSpots || place.kind === 'mrt' || place.id === selectedId.value)
        && distanceM(mapCentre.value, [place.lng, place.lat]) <= PIN_RANGE_M)
})

// Which look the cards use: sidebar, stacked list (sheet up), or sideways rail (sheet middle/down)
const cardLayout = computed(() => {
    if (isWide.value) return 'compact'
    return detent.value === 'up' ? 'stacked' : 'rail'
})

// ============================================================================================
// Map
// ============================================================================================
const mapEl = ref(null)
let map = null
let userMarker = null
let watchId = null
const markers = new Map()                    // place id -> { el, marker } for the pins on screen now

// The 3D pins and chests, drawn by three.js inside the map (lib/mapPins3d.js)
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
const pins3d = createPins3d({ reducedMotion })

// Which 3D model a place gets (DESIGN_SPEC.md section 5, "Map markers")
function markerKind(place) {
    if (place.state === 'undiscovered') return 'chest'
    if (place.state === 'collected') return 'green'
    return place.kind === 'mrt' ? 'blue' : 'red'
}

// Play-zone tint, matching the card colours
function zoneColour(place) {
    if (place.state === 'undiscovered') return '#FFFFFF'
    if (place.state === 'collected') return '#C8DBA9'
    return place.kind === 'mrt' ? '#F3D57C' : '#F6C4A4'
}

// The dashed circles, as GeoJSON MapLibre can draw.
// Only the selected place's zone, unless zoomed right in (all of them overlapping looked like you could
// play everything from one spot). The zones still exist for tap-in either way; this is only what's drawn
function zonesGeoJson() {
    const drawn = mapZoom.value >= ALL_ZONES_ZOOM
        ? pinPlaces.value
        : pinPlaces.value.filter(({ place }) => place.id === selectedId.value)
    return {
        type: 'FeatureCollection',
        features: drawn.map(({ place }) => ({
            type: 'Feature',
            properties: { colour: zoneColour(place) },
            geometry: { type: 'Polygon', coordinates: [circleRing([place.lng, place.lat], place.radiusM)] },
        })),
    }
}

// Markers are plain DOM elements (MapLibre places them), so we build them by hand
function createMarkerEl(place) {
    const el = document.createElement('button')
    el.type = 'button'
    el.className = 'place-marker'
    el.setAttribute('aria-label', place.name)

    const label = document.createElement('span')
    label.className = 'marker-label'

    // Invisible box the size of the 3D model, so tapping the pin works (three.js draws the pin itself)
    const hit = document.createElement('span')
    hit.className = markerKind(place) === 'chest' ? 'marker-hit marker-chest' : 'marker-hit marker-pin'

    el.append(label, hit)

    // MRT stations get their line codes (EW13, NS25...) in a little pill under the pin
    if (place.kind === 'mrt') {
        const lines = document.createElement('span')
        lines.className = 'marker-lines'
        for (const code of place.lineCodes) {
            const chip = document.createElement('span')
            chip.textContent = code
            chip.style.background = MRT_COLOURS[code.slice(0, 2)]
            lines.append(chip)
        }
        el.append(lines)
    }

    el.addEventListener('click', () => selectPlace(place))
    return el
}

// Make the markers match pinPlaces: add the ones that came into range, remove the ones that left,
// and put the "Name · 300 m" label on the selected place. Only nearby places have a marker at all,
// so MapLibre isn't moving 328 of them around on every frame
function refreshMarkers() {
    if (!map) return
    const visibleIds = new Set(pinPlaces.value.map(({ place }) => place.id))

    for (const [id, { marker }] of markers) {
        if (!visibleIds.has(id)) {
            marker.remove()
            markers.delete(id)
        }
    }

    for (const { place, distance } of pinPlaces.value) {
        if (!markers.has(place.id)) {
            const el = createMarkerEl(place)
            const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
                .setLngLat([place.lng, place.lat])
                .addTo(map)
            markers.set(place.id, { el, marker })
        }
        const { el } = markers.get(place.id)
        el.querySelector('.marker-label').textContent = `${place.name} · ${Math.round(distance / 50) * 50} m`
        el.classList.toggle('is-selected', place.id === selectedId.value)
    }

    map.getSource('zones')?.setData(zonesGeoJson())
    pins3d.sync(places.value, { kindOf: markerKind, visibleIds, selectedId: selectedId.value })
}

// After every pan/zoom: remember where the map is looking, so pinPlaces can update
function onMapMoved() {
    const { lng, lat } = map.getCenter()
    mapCentre.value = [lng, lat]
    mapZoom.value = map.getZoom()
}

// Keep the user visible above the phone sheet / beside the sidebar
function mapPadding() {
    if (isWide.value) return { left: window.innerWidth >= 1200 ? 460 : 410, top: 0, right: 0, bottom: 0 }
    const covered = detent.value === 'down' ? 204 : Math.round(window.innerHeight * 0.54)
    return { left: 0, top: 130, right: 0, bottom: covered }   // top: room for the search bar + locate button
}

function selectPlace(place) {
    selectedId.value = place.id
    map.easeTo({ center: [place.lng, place.lat], padding: mapPadding(), duration: 600 })
}

// ---------- Search (components/map/PlaceSearch.vue) ----------
// Phones: the top bar opens a full-screen search (its mic opens it already listening).
// iPad / laptop: the search in the sidebar shows a dropdown as you type.
const searchOpen = ref(false)
const searchListen = ref(false)
let searchMarker = null                     // the black pin dropped on an address picked from search

function openSearch(listen) {
    searchListen.value = listen
    searchOpen.value = true
}

// a result was picked: a MemoryGo place is selected like tapping its card; any other address
// gets a pin and the map flies there (its nearby MemoryGo pins then show around it)
function onSearchPick(result) {
    searchOpen.value = false
    searchMarker?.remove()
    searchMarker = null

    if (result.kind === 'place') {
        selectPlace(result.place)
        return
    }

    const el = document.createElement('div')
    el.className = 'search-pin'
    const label = document.createElement('span')
    label.className = 'search-pin-label'
    label.textContent = result.name
    const dot = document.createElement('span')
    dot.className = 'search-pin-dot'
    el.append(label, dot)
    searchMarker = new maplibregl.Marker({ element: el, anchor: 'bottom' }).setLngLat([result.lng, result.lat]).addTo(map)

    selectedId.value = null
    map.flyTo({ center: [result.lng, result.lat], zoom: Math.max(map.getZoom(), 16), padding: mapPadding(), duration: 1200 })
}

// First view: the user at street level, in the part of the map the sheet/sidebar doesn't cover
// (that's what the padding does). Phones zoom out a little more because only a short strip of map
// shows above the sheet. (With places all over Singapore, "fit every place" would show the whole island)
function showNearby() {
    map.jumpTo({ center: userPos.value, zoom: isWide.value ? 16 : 15.2, padding: mapPadding() })
}

const zoomIn = () => map.zoomIn()
const zoomOut = () => map.zoomOut()

function centreOnMe() {
    map.easeTo({ center: userPos.value, padding: mapPadding(), duration: 600 })
}

// ---------- Where the user is ----------
// Until the browser gives a real location, the map shows places around SMU. That fallback used to be
// silent, so it looked like the app thought you were at Bras Basah. Now the page always says which it is:
//   'waiting'  asking the browser (first answer usually takes 1-5 s on a phone)
//   'ok'       real location, blue dot shown
//   'slow'     no answer yet after 15 s (indoors / underground); still trying
//   'off'      the user (or the Mac's settings) blocked location
//   'insecure' the page isn't https or localhost, so the browser never gives a location
//              (e.g. testing on an iPad through http://192.168.x.x)
//   'outside'  the location is outside Singapore
// Step 6: tapping in will only be allowed when this is 'ok'
const locationStatus = ref('waiting')
let hasFix = false                           // true once a real location inside Singapore has arrived

// short on purpose: on a phone the note sits over the map, under the search bar
const LOCATION_NOTES = {
    waiting: 'Finding your location…',
    slow: 'Still finding you · showing SMU area',
    off: 'Location is off · showing SMU area',
    insecure: 'Location needs https · showing SMU area',
    outside: 'Outside Singapore · showing city centre',
}

function onLocation(position) {
    const here = [position.coords.longitude, position.coords.latitude]

    // Outside Singapore (e.g. on holiday): the map can't go there, so stay on the city centre
    // and say why, instead of measuring distances to places hundreds of km away
    if (!inSingapore(here)) {
        locationStatus.value = 'outside'
        return
    }

    locationStatus.value = 'ok'
    userPos.value = here
    userMarker.setLngLat(here)

    // The first real location replaces SMU: show the blue dot and jump there once
    // (later updates move the dot, not the map)
    if (!hasFix) {
        hasFix = true
        userMarker.addTo(map)
        showNearby()
        selectNearest()
    }
}

// error.code: 1 = blocked, 2 = the device can't work it out, 3 = took longer than the timeout.
// watchPosition keeps trying after 2 and 3, so those only change the note
function onLocationError(error) {
    if (error.code === 1) locationStatus.value = 'off'
    else if (!hasFix) locationStatus.value = 'slow'
}

// ---------- Tapping in (step 6) ----------
// The button appears when the user's REAL location is inside a place's zone. If they're inside
// several zones, it's the nearest one (the server checks the same rules again; this only decides
// what the button says)
const router = useRouter()
const tapInState = ref('idle')               // 'idle' | 'starting'
const tapInMessage = ref('')                 // the server's reason if it said no

const tapInPlace = computed(() => {
    if (locationStatus.value !== 'ok') return null
    return places.value
        .map((place) => ({ place, distance: distanceM(userPos.value, [place.lng, place.lat]) }))
        .filter(({ place, distance }) => distance <= place.radiusM)
        .sort((a, b) => a.distance - b.distance)[0]?.place ?? null
})

// the small label on the right of the button
//   inProgress: tapped in but didn't finish (last 30 min) → tapping in again resumes the same paid game
//   playedToday: finished a paid game here today → a replay earns nothing
const tapInHint = computed(() => {
    if (tapInPlace.value?.inProgress) return 'Continue · up to 15'
    if (tapInPlace.value?.playedToday) return 'Play for fun'
    return 'Earn up to 15'
})

// a different place (or none) → clear the old message
watch(tapInPlace, () => { tapInMessage.value = '' })

async function tapIn() {
    const place = tapInPlace.value
    if (!place || tapInState.value === 'starting') return
    tapInState.value = 'starting'
    tapInMessage.value = ''
    try {
        const [lng, lat] = userPos.value
        const { data } = await api.post('/visits/start', { placeId: place.id, lat, lng })
        // the game reads ?visit= and sends its result to /api/visits/:id/finish (lib/gamereward.js)
        router.push({ path: `/games/${data.game}`, query: { visit: data.visitId, paid: data.paid ? '1' : '0' } })
    } catch (error) {
        tapInMessage.value = error.response?.data?.message ?? 'Could not tap in. Please try again.'
    } finally {
        tapInState.value = 'idle'
    }
}

// Label the nearest place on the map (or nothing, if none is within 2 km)
function selectNearest() {
    selectedId.value = visiblePlaces.value[0]?.place.id ?? null
}

// Ask our server for the places. Markers appear by themselves: places → pinPlaces → refreshMarkers
async function loadPlaces() {
    placesStatus.value = 'loading'
    try {
        const { data } = await api.get('/places')
        if (!map) return                     // they left the page while we were waiting

        // The server says which places THIS user has played (visits table):
        // ever played → 'collected' (green pin, sage card, for good); otherwise 'playable'.
        // place.playedToday decides the card label ("Played today · back tomorrow")
        places.value = data.places.map((place) => ({ ...place, state: place.visited ? 'collected' : 'playable' }))
        placesStatus.value = 'ready'
        selectNearest()
    } catch (error) {
        console.error(error)
        placesStatus.value = 'error'
    }
}

onMounted(() => {
    wideQuery.addEventListener('change', onWideChange)

    map = new maplibregl.Map({
        container: mapEl.value,
        style: MAP_STYLE_URL,
        center: SMU,
        zoom: 16.2,
        pitch: 45,
        bearing: -20,
        maxBounds: SINGAPORE_BOUNDS,         // can't pan outside Singapore
        minZoom: MIN_ZOOM,                   // can't zoom out past the whole island
        antialias: true,                     // smooth edges on the 3D pins
        attributionControl: { compact: true },
    })
    map.setPadding(mapPadding())
    showNearby()
    onMapMoved()
    map.on('moveend', onMapMoved)

    // Recolour the map, then add the play zones (dashed circles) under the markers
    map.on('style.load', () => {
        applyPaperStyle(map)
        map.addSource('zones', { type: 'geojson', data: zonesGeoJson() })
        map.addLayer({
            id: 'zones-fill',
            type: 'fill',
            source: 'zones',
            paint: { 'fill-color': ['get', 'colour'], 'fill-opacity': 0.28 },
        })
        map.addLayer({
            id: 'zones-line',
            type: 'line',
            source: 'zones',
            paint: { 'line-color': '#161412', 'line-width': 1.6, 'line-dasharray': [3, 3.5] },
        })
        map.addLayer(pins3d.layer)           // 3D pins + chests, drawn last so they sit on top
    })

    // Places come from the server; their markers are added once they arrive
    loadPlaces()

    // The user: blue dot with a white ring and a soft halo. It's only put on the map once a real
    // location arrives (onLocation), so it never sits at SMU pretending to be them
    const dot = document.createElement('span')
    dot.className = 'user-dot'
    userMarker = new maplibregl.Marker({ element: dot }).setLngLat(userPos.value)

    // Follow the real location. Browsers only give it on https pages or localhost
    if (!window.isSecureContext || !navigator.geolocation) {
        locationStatus.value = 'insecure'
    } else {
        watchId = navigator.geolocation.watchPosition(onLocation, onLocationError, {
            enableHighAccuracy: true,
            timeout: 15000,
        })
    }

    // Coins live in the `progress` table, behind our Express server
    api.get('/progress')
        .then(({ data }) => { coins.value = data.coins })
        .catch(() => { coins.value = null })
})

onUnmounted(() => {
    wideQuery.removeEventListener('change', onWideChange)
    if (watchId != null) navigator.geolocation.clearWatch(watchId)
    map?.remove()
    map = null
    markers.clear()
    pins3d.destroy()
})

// Redraw markers/zones when the filter, location, map position, zoom or selection changes
watch([pinPlaces, selectedId, mapZoom], refreshMarkers)

// Slide the map when the sheet moves or the screen crosses 768px
watch([detent, isWide], () => map?.easeTo({ padding: mapPadding(), duration: 340 }))
</script>

<template>
    <div class="map-page">
        <!-- far-zoom hides the MRT line codes; --pin-scale shrinks the tap areas along with the 3D pins -->
        <div ref="mapEl" class="map" :class="{ 'far-zoom': mapZoom < SPOTS_ZOOM }"
            :style="{ '--pin-scale': pinScale(mapZoom) }"></div>

        <!-- darkens the map when the phone sheet is pulled all the way up -->
        <div class="dim" :class="{ on: detent === 'up' && !isWide }" aria-hidden="true"></div>

        <!-- phone only: search + coins along the top -->
        <div class="topbar">
            <SearchBar class="topbar-search" @open="openSearch(false)" @mic="openSearch(true)" />
            <CoinPill :coins="coins" />
        </div>

        <!-- zoomed out too far for pins (they would pile up over the whole island) -->
        <!-- location problems first (they explain why the map isn't showing where you are) -->
        <p v-if="locationStatus !== 'ok'" class="zoom-note" :class="{ 'note-wrap': locationStatus !== 'waiting' }"
            role="status">
            {{ LOCATION_NOTES[locationStatus] }}
        </p>
        <p v-else-if="placesStatus === 'ready' && mapZoom < MIN_PIN_ZOOM" class="zoom-note" role="status">
            Zoom in to see places
        </p>

        <!-- phone: one round button under the search bar. iPad/laptop: zoom + locate at the bottom-right -->
        <div class="map-controls">
            <button type="button" class="round-btn zoom-btn" aria-label="Zoom in" @click="zoomIn">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5 V19 M5 12 H19" /></svg>
            </button>
            <button type="button" class="round-btn zoom-btn" aria-label="Zoom out" @click="zoomOut">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12 H19" /></svg>
            </button>
            <button type="button" class="round-btn" aria-label="Centre the map on me" @click="centreOnMe">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 L20 20 L12 16 L4 20 Z" /></svg>
            </button>
        </div>

        <BottomSheet v-model:detent="detent">
            <template #header>
                <!-- iPad/laptop only: logo + search live inside the sidebar -->
                <div class="sidebar-top">
                    <span class="sidebar-brand"><img :src="appLogo" alt="" class="brand-mark" />MemoryGo</span>
                    <PlaceSearch variant="dropdown" :places="places" :user-pos="userPos"
                        :knows-location="locationStatus === 'ok'" @pick="onSearchPick" />
                </div>

                <!-- inside a place's zone: tap in to play its game -->
                <div v-if="tapInPlace" class="tap-in">
                    <button type="button" class="tap-in-btn" :disabled="tapInState === 'starting'" @click="tapIn">
                        <span class="tap-in-dot"></span>
                        <span class="tap-in-text">
                            {{ tapInState === 'starting' ? 'Tapping in…' : `Tap in at ${tapInPlace.name}` }}
                        </span>
                        <span class="tap-in-hint">{{ tapInHint }}</span>
                    </button>
                    <p v-if="tapInMessage" class="tap-in-message" role="alert">{{ tapInMessage }}</p>
                </div>

                <div class="near-row">
                    <h1 class="near-title">Near <HandUnderline>you</HandUnderline></h1>

                    <div class="filters" role="group" aria-label="Show on map">
                        <button v-for="f in FILTERS" :key="f.id" type="button" class="filter"
                            :class="{ active: filter === f.id }" :aria-pressed="filter === f.id"
                            @click="filter = f.id">
                            {{ f.label }}
                        </button>
                    </div>
                </div>
            </template>

            <!-- while the places load, or if the server can't be reached -->
            <p v-if="placesStatus === 'loading'" class="places-note">Finding places near you…</p>
            <div v-else-if="placesStatus === 'error'" class="places-note" role="alert">
                <span>Couldn’t load places. Check your connection and try again.</span>
                <button type="button" class="retry-btn" @click="loadPlaces">Try again</button>
            </div>

            <p v-else-if="visiblePlaces.length === 0" class="places-note">
                No places within 2 km of you. Move the map to explore, or search for somewhere to go.
            </p>

            <div v-else class="cards" :class="`cards-${cardLayout}`">
                <PlaceCard v-for="{ place, distance } in visiblePlaces" :key="place.id" :place="place"
                    :distance="distance" :layout="cardLayout" @select="selectPlace" />
            </div>
        </BottomSheet>

        <AppNav :coins="coins" />

        <!-- phones: full-screen search (covers the map, nav and sheet until a place is picked) -->
        <div v-if="searchOpen && !isWide" class="search-screen" role="dialog" aria-label="Search for a place">
            <PlaceSearch variant="screen" :places="places" :user-pos="userPos"
                :knows-location="locationStatus === 'ok'" :listen-on-open="searchListen"
                @pick="onSearchPick" @close="searchOpen = false" />
        </div>
    </div>
</template>

<style scoped>
/* =========================================================
   Page + map
   ========================================================= */
.map-page {
    position: fixed;
    inset: 0;
    overflow: hidden;
    background: #EFE9DC;
    color: var(--ink);
    font-family: var(--font);
}

.map {
    position: absolute;
    inset: 0;
}

.dim {
    position: absolute;
    inset: 0;
    z-index: 5;
    background: var(--ink);
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.3s ease;
}

.dim.on {
    opacity: 0.25;
}

/* ---------- markers (built in JS, so :deep() is needed for scoped styles to reach them) ----------
   Don't set `position` here: MapLibre makes markers position: absolute to place them on the map */
.map :deep(.place-marker) {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 0;
    border: 0;
    background: none;
    cursor: pointer;
}

/* invisible tap areas the same size as the 3D models (lib/mapPins3d.js draws the pins and their shadows) */
.map :deep(.marker-hit) {
    display: block;
}

.map :deep(.marker-pin) {
    width: calc(34px * var(--pin-scale, 1));
    height: calc(46px * var(--pin-scale, 1));
}

.map :deep(.marker-chest) {
    width: calc(58px * var(--pin-scale, 1));
    height: calc(44px * var(--pin-scale, 1));
}

/* zoomed out: no line-code pills, except on the selected station */
.map.far-zoom :deep(.place-marker:not(.is-selected) .marker-lines) {
    display: none;
}

/* "St Andrew's · 300 m" bubble, only on the selected place */
.map :deep(.marker-label) {
    position: absolute;
    bottom: calc(100% + 6px);
    left: 50%;
    display: none;
    padding: 7px 13px;
    border-radius: var(--radius-pill);
    background: var(--ink);
    color: var(--white);
    font-family: var(--font);
    font-size: 15px;
    font-weight: 700;
    white-space: nowrap;
    transform: translateX(-50%);
}

.map :deep(.marker-label)::after {
    content: '';
    position: absolute;
    left: 50%;
    bottom: -5px;
    width: 11px;
    height: 11px;
    margin-left: -5.5px;
    border-radius: 2px;
    background: var(--ink);
    transform: rotate(45deg);
}

/* "EW13 NS25" pill under MRT pins. Absolute, so the pin's tip still sits exactly on the station */
.map :deep(.marker-lines) {
    position: absolute;
    top: calc(100% + 2px);
    left: 50%;
    display: flex;
    gap: 4px;
    transform: translateX(-50%);
    padding: 3px 5px;
    border: 1.5px solid var(--ink);
    border-radius: var(--radius-pill);
    background: var(--white);
}

.map :deep(.marker-lines span) {
    padding: 1px 7px;
    border-radius: var(--radius-pill);
    color: var(--white);
    font-family: var(--font);
    font-size: 12px;
    font-weight: 800;
}

.map :deep(.place-marker.is-selected) {
    z-index: 2;
}

.map :deep(.place-marker.is-selected .marker-label) {
    display: block;
}

/* user: blue dot, white ring, soft halo */
.map :deep(.user-dot) {
    width: 18px;
    height: 18px;
    border: 3.5px solid var(--white);
    border-radius: 50%;
    background: var(--user-blue);
    box-sizing: border-box;
    box-shadow: 0 0 0 8px rgba(47, 111, 176, 0.18);
}

/* =========================================================
   Phone top bar + controls
   ========================================================= */
.topbar {
    position: absolute;
    top: 16px;
    left: 16px;
    right: 16px;
    z-index: 10;
    display: flex;
    align-items: center;
    gap: 10px;
}

.topbar-search {
    flex: 1;
}

/* phones: full-screen search over everything */
.search-screen {
    position: fixed;
    inset: 0;
    z-index: 60;
    padding: 16px 16px 24px;
    background: var(--paper);
    box-sizing: border-box;
}

/* the pin for an address picked from search (not a MemoryGo place) */
.map :deep(.search-pin) {
    display: flex;
    flex-direction: column;
    align-items: center;
    pointer-events: none;
}

.map :deep(.search-pin-label) {
    margin-bottom: 6px;
    padding: 7px 13px;
    border-radius: var(--radius-pill);
    background: var(--white);
    box-shadow: 0 6px 16px rgba(22, 20, 18, 0.18);
    color: var(--ink);
    font-family: var(--font);
    font-size: 15px;
    font-weight: 700;
    white-space: nowrap;
}

.map :deep(.search-pin-dot) {
    width: 22px;
    height: 22px;
    border: 4px solid var(--white);
    border-radius: 50%;
    background: var(--ink);
    box-shadow: 0 4px 10px rgba(22, 20, 18, 0.3);
}

/* "Zoom in to see places": under the search bar on phones, bottom-middle of the map on big screens */
.zoom-note {
    position: absolute;
    top: 86px;
    left: 50%;
    z-index: 10;
    margin: 0;
    padding: 10px 18px;
    border: var(--glass-border);
    border-radius: var(--radius-pill);
    background: var(--glass-strong-bg);
    -webkit-backdrop-filter: var(--glass-blur);
    backdrop-filter: var(--glass-blur);
    box-shadow: var(--glass-shadow);
    font-size: 16px;
    font-weight: 700;
    white-space: nowrap;
    transform: translateX(-50%);
    pointer-events: none;
}

/* the longer location messages may need two lines on a phone (and must clear the locate button) */
.zoom-note.note-wrap {
    width: max-content;
    max-width: calc(100% - 128px);
    border-radius: 20px;
    text-align: center;
    white-space: normal;
}

@media (min-width: 768px) {
    .zoom-note.note-wrap {
        max-width: 420px;
    }

    .zoom-note {
        top: auto;
        bottom: 28px;
        left: calc(50% + 205px);        /* middle of the map part, beside the 410px sidebar */
    }
}

@media (min-width: 1200px) {
    .zoom-note {
        left: calc(50% + 230px);
    }
}

.map-controls {
    position: absolute;
    top: 86px;
    right: 16px;
    z-index: 10;
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.round-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 50px;
    height: 50px;
    padding: 0;
    border: var(--glass-border);
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.42);
    -webkit-backdrop-filter: var(--glass-blur);
    backdrop-filter: var(--glass-blur);
    box-shadow: var(--glass-shadow);
    color: var(--ink);
    cursor: pointer;
}

.round-btn svg {
    width: 22px;
    height: 22px;
    fill: none;
    stroke: currentColor;
    stroke-width: 2.2;
    stroke-linecap: round;
    stroke-linejoin: round;
}

/* zoom buttons only on big screens (phones pinch to zoom) */
.zoom-btn {
    display: none;
}

/* =========================================================
   Sheet content
   ========================================================= */
.sidebar-top {
    display: none;
}

/* ---------- Tap in (inside a place's zone) ---------- */
.tap-in {
    margin-bottom: 14px;
}

.tap-in-btn {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    min-height: var(--cta-height);
    padding: 0 18px;
    border: 0;
    border-radius: var(--radius-pill);
    background: var(--ink);
    color: var(--white);
    font-family: inherit;
    text-align: left;
    cursor: pointer;
}

.tap-in-btn:disabled {
    opacity: 0.7;
    cursor: wait;
}

.tap-in-dot {
    flex-shrink: 0;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--live-green);
    box-shadow: 0 0 0 4px rgba(143, 209, 139, 0.3);
}

.tap-in-text {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    font-size: 18px;
    font-weight: 700;
    white-space: nowrap;
    text-overflow: ellipsis;          /* long names: "Tap in at Former Saint Jos…" */
}

.tap-in-hint {
    flex-shrink: 0;
    padding: 4px 10px;
    border-radius: var(--radius-pill);
    background: rgba(255, 255, 255, 0.16);
    font-size: 14px;
    font-weight: 700;
}

.tap-in-message {
    margin: 8px 4px 0;
    font-size: 16px;
    font-weight: 600;
}

.near-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
}

.near-title {
    margin: 0;
    font-family: var(--font);     /* views/main.vue sets every h1 to Fraunces; override it */
    font-size: 34px;
    font-weight: 700;
    line-height: 0.95;
    letter-spacing: -0.045em;
}

.filters {
    display: flex;
    gap: 2px;
    padding: 3px;
    border: 1px solid rgba(255, 255, 255, 0.85);
    border-radius: var(--radius-pill);
    background: rgba(255, 255, 255, 0.5);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.9);
}

.filter {
    height: var(--tap-min);
    padding: 0 14px;
    border: 0;
    border-radius: var(--radius-pill);
    background: transparent;
    color: var(--ink);
    font-family: inherit;
    font-size: 16px;
    font-weight: 700;
    cursor: pointer;
}

.filter.active {
    background: var(--ink);
    color: var(--white);
}

/* ---------- card lists ---------- */
/* "Finding places near you…" / "Couldn't load places" */
.places-note {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
    margin: 0;
    padding: 4px 20px 20px;
    font-size: 17px;
    font-weight: 600;
}

.retry-btn {
    min-height: var(--tap-min);
    padding: 0 20px;
    border: 0;
    border-radius: var(--radius-pill);
    background: var(--ink);
    color: var(--white);
    font-family: inherit;
    font-size: 16px;
    font-weight: 700;
    cursor: pointer;
}

.cards {
    display: flex;
    gap: 12px;
    scrollbar-width: none;        /* hide the scrollbar (Firefox) */
}

.cards::-webkit-scrollbar {
    display: none;                /* hide the scrollbar (Chrome / Safari) */
}

/* sheet middle/down: swipe sideways, each card snaps into place */
.cards-rail {
    align-items: flex-start;
    padding: 0 20px;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    scroll-padding-left: 20px;
}

/* sheet up: vertical list. Bottom padding keeps the last card above the nav */
.cards-stacked {
    flex: 1;
    flex-direction: column;
    padding: 0 20px 110px;
    overflow-y: auto;
}

/* =========================================================
   iPad + laptop
   ========================================================= */
@media (min-width: 768px) {
    .topbar {
        display: none;
    }

    .map-controls {
        top: auto;
        right: 24px;
        bottom: 28px;
    }

    .round-btn {
        width: 52px;
        height: 52px;
        background: var(--glass-strong-bg);
    }

    .zoom-btn {
        display: flex;
    }

    .sidebar-top {
        display: flex;
        flex-direction: column;
        gap: 16px;
        margin-bottom: 22px;
    }

    /* not called .brand: views/main.vue gives every .brand the Fraunces font */
    .sidebar-brand {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 28px;
        font-weight: 800;
        letter-spacing: var(--tracking-tight);
    }

    .brand-mark {
        height: 40px;
        width: auto;
    }

    .cards-compact {
        flex: 1;
        flex-direction: column;
        padding: 16px 22px 22px;
        overflow-y: auto;
    }
}
</style>
