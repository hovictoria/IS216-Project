<script setup>
import {ref, computed, onMounted, onUnmounted } from 'vue'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { stations, areas } from '../data/stations'
import { useAuthStore } from '../stores/auth'
import AppMenu from '@/components/menu.vue'
//system progression
import { useProgression } from '@/composables/useProgression'
import { areaUnlockLevel } from '@/config/progression'



const SMU = [103.8502, 1.2963]
const { refreshProgress, canEnterArea } = useProgression()

// landing page colours (from SplashMap.vue)
const C = {
    land: '#F3E8D2',
    landuse: '#EFE2C6',
    park: '#CFE0B4',
    water: '#A9D3E6',
    road: '#FDFBF2',
    roadEdge: '#E8D8B7',
    text: '#4D4134',
    textHalo: '#FFFBF2',
}

// building colours: cream like the HDB blocks, pastels like the shophouses
const BUILDING_COLOURS = ['#F2C4B4', '#F3D58A', '#FFFBF2', '#F4E6CB']

const mapE1 = ref(null)
let map = null
let playerMarker = null
let watchId = null

const fakeMode = ref(false)
const isDev = import.meta.env.DEV
const playerPos = ref(SMU)
const playerAccuracy = ref(null)
const selected = ref(null)

// message shown when location isn't working well ('' = no message)
const locationMessage = ref('')

// big pop-up message for unlocking an area ('' = hidden)
const celebration = ref('')
let celebrationTimer = null

function celebrate(text) {
    celebration.value = text
    clearTimeout(celebrationTimer)
    celebrationTimer = setTimeout(() => {
        celebration.value = ''
    }, 4000)
}

const LOCATION_ERRORS = {
    1: "📍 We can't see your location. Please allow location for this site in your browser settings, then refresh the page.",
    2: "📡 We can't find your location right now. Try moving outdoors or near a window.",
    3: "⏳ Finding your location is taking a while. Please wait a moment…",
}

// save progress in the browser, separately for each logged-in user
const auth = useAuthStore()
const SAVE_KEY = `memorygo-stations-${auth.user?.id}`

function loadProgress() {
    try {
        const saved = localStorage.getItem(SAVE_KEY)
        return saved ? JSON.parse(saved) : []
    } catch {
        return []
    }
}

function saveProgress() {
    try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(completedIds.value))
    } catch {
        // storage can be blocked (e.g. private browsing); progress just won't be kept
    }
}

// stations this player has completed (loaded from saved progress)
const completedIds = ref(loadProgress())

// function isAreaUnlocked(areaId) {
//     if (areaId === 1) return true
//     const previousStations = stations.filter((s) => s.area === areaId - 1)
//     return previousStations.every((s) => completedIds.value.includes(s.id))
// }

// Areas unlock by level
function isAreaUnlocked(areaId) {
    return canEnterArea(areaId)
}

function getStatus(station) {
    if (completedIds.value.includes(station.id)) return 'completed'
    if (!isAreaUnlocked(station.area)) return 'locked'
    return 'available'
}

// the HTML element for each station tag, looked up by station id
const stationEls = {}

// (re)draw one station tag to match its current status
function drawStationChip(station) {
    const status = getStatus(station)

    let badge = ''
    if (status === 'completed') badge = ' ✅'
    if (status === 'locked') badge = ' 🔒'

    const el = stationEls[station.id]
    el.classList.remove('available', 'completed', 'locked')
    el.classList.add('station-chip', status)
    el.innerHTML = `<span class="station-emoji">${station.emoji}</span>${station.name}${badge}`
}

// redraw every station tag (e.g. after completing one, which may unlock an area)
function refreshStations() {
    for (const station of stations) {
        drawStationChip(station)
    }
}

// for now, Start completes the station straight away (the puzzle comes later)
function completeStation() {
    const station = selected.value
    completedIds.value.push(station.id)
    saveProgress()
    refreshStations()

    // Area unlocks now come from levelling up (LevelUpNotice)
    if (completedIds.value.length === stations.length) {
        celebrate("🏆 You've completed every station!")
    }
}

// dev button to reset progress testing
function resetProgress() {
    completedIds.value = []
    saveProgress()
    refreshStations()
}

const distance = computed(() => {
    if (!selected.value) return 0
    const from = maplibregl.LngLat.convert(playerPos.value)
    const to = new maplibregl.LngLat(selected.value.lng, selected.value.lat)
    return Math.round(from.distanceTo(to))
})

const walkMinutes = computed(() => Math.max(1, Math.round(distance.value / 60)))
// how close counts as "arrived": follows GPS accuracy, but never under 40 m or over 70 m
const arriveRadius = computed(() => {
    if (fakeMode.value || playerAccuracy.value === null) return 40
    return Math.min(Math.max(playerAccuracy.value, 40), 70)
})

const isNear = computed(() => distance.value <= arriveRadius.value)

// const statusText = {
//     available: '🟢 Available',
//     completed: '✅ Completed. Well done!',
//     locked: '🔒 Locked: finish the previous area first',
// }

const statusText = {
    available: '🟢 Available',
    completed: '✅ Completed. Well done!',
}

// Locked stations say which level the player needs
function statusLabel(station) {
    const status = getStatus(station)
    if (status === 'locked') {
        return `🔒 Locked: reach Level ${areaUnlockLevel(station.area)} to unlock`
    }
    return statusText[status]
}

// move the character and remember where they are
function movePlayer(lngLat) {
    playerMarker.setLngLat(lngLat)
    playerPos.value = lngLat
}

// fake location mode
function toggleFake() {
    fakeMode.value = !fakeMode.value
    if (fakeMode.value) {
        movePlayer(SMU)
        map.easeTo({ center: SMU })
    }
}

// bring the camera back to the player
function recentre() {
    map.easeTo({ center: playerPos.value, zoom: 17, pitch: 55 })
}

// dev only: copy the player's exact position, to place stations precisely
async function copyPosition() {
    const p = maplibregl.LngLat.convert(playerPos.value)
    const accuracy = fakeMode.value ? 'fake' : `±${playerAccuracy.value} m`
    const text = `lat: ${p.lat.toFixed(6)}, lng: ${p.lng.toFixed(6)} (${accuracy})`

    try {
        await navigator.clipboard.writeText(text)
        alert(`Copied!\n${text}`)
    } catch {
        alert(`Couldn't copy, please note it down:\n${text}`)
    }
}


function paperStyle() {
    for (const layer of map.getStyle().layers) {
        const id = layer.id
        const source = layer['source-layer']

        if (layer.type === 'background') {
            map.setPaintProperty(id, 'background-color', C.land)
        } else if (layer.type === 'fill') {
            if (source === 'water') map.setPaintProperty(id, 'fill-color', C.water)
            else if (source === 'park' || source === 'landcover') {
                map.setPaintProperty(id, 'fill-color', C.park)
                map.setPaintProperty(id, 'fill-opacity', 1)
            }
            else if (source === 'landuse') map.setPaintProperty(id, 'fill-color', C.landuse)
            else if (source === 'building') map.setPaintProperty(id, 'fill-color', C.roadEdge)
        } else if (layer.type === 'line' && source === 'transportation') {
            const colour = id.includes('casing') ? C.roadEdge : C.road
            map.setPaintProperty(id, 'line-color', colour)
        } else if (layer.type === 'symbol') {
            if (source === 'poi' || source === 'housenumber') {
                map.setLayoutProperty(id, 'visibility', 'none')
            }
            else {
                map.setPaintProperty(id, 'text-color', C.text)
                map.setPaintProperty(id, 'text-halo-color', C.textHalo)
            }
        } else if (layer.type === 'fill-extrusion') {
            const height = ['coalesce', ['get', 'render_height'], 8]
            const pick = ['%', ['round', height], 4]
            map.setPaintProperty(id, 'fill-extrusion-color',
                ['match', pick, 0, BUILDING_COLOURS[0], 1, BUILDING_COLOURS[1], 2, BUILDING_COLOURS[2], BUILDING_COLOURS[3]])
            map.setPaintProperty(id, 'fill-extrusion-height', ['*', 0.35, height])
            map.setPaintProperty(id, 'fill-extrusion-base', 0)
        }
    }
}

onMounted(() => {
    map = new maplibregl.Map({
        container: mapE1.value,
        style: 'https://tiles.openfreemap.org/styles/liberty',
        center: SMU,
        zoom: 17,
        pitch: 55,
        bearing: -20,
        attributionControl: { compact: true },
    })
    map.on('style.load', paperStyle)

    // add stations
    for (const station of stations) {
        const el = document.createElement('div')
        el.addEventListener('click', () => { selected.value = station })
        stationEls[station.id] = el
        drawStationChip(station)

        new maplibregl.Marker({ element: el, anchor: 'bottom' })
            .setLngLat([station.lng, station.lat])
            .addTo(map)
    }

    // Get the player's XP, then redraw stations so the right areas unlock
    refreshProgress().then(refreshStations).catch(console.error)
    
    // add player
    const playerE1 = document.createElement('div')
    playerE1.className = 'player-icon'
    playerE1.textContent = '🧍'

    playerMarker = new maplibregl.Marker({ element: playerE1, anchor: 'bottom' })
        .setLngLat(SMU)
        .addTo(map)

    // follow the player's real location
    watchId = navigator.geolocation.watchPosition(
        (position) => {
            playerAccuracy.value = Math.round(position.coords.accuracy)
            if (position.coords.accuracy > 50) {
                locationMessage.value = '📡 Weak GPS signal. Your position may be a little off.'
            } else {
                locationMessage.value = ''
            }

            if (fakeMode.value) return
            const here = [position.coords.longitude, position.coords.latitude]
            movePlayer(here)
            map.easeTo({ center: here })
        },
        (error) => {
            locationMessage.value = LOCATION_ERRORS[error.code] || '📍 Something went wrong finding your location.'
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    )

    // fake mode: click the map to teleport
    map.on('click', (e) => {
        if (e.originalEvent.target.closest('.station-chip')) return
        if (!fakeMode.value) return
        movePlayer(e.lngLat)
        map.easeTo({ center: e.lngLat })
    })

})

onUnmounted(() => {
    navigator.geolocation.clearWatch(watchId)
    clearTimeout(celebrationTimer)
    map.remove()
})

</script>

<template>
   <div class="map-shell">
        <AppMenu />

        <div class="map-page">
        <div ref="mapE1" class="map"></div>

        <div v-if="locationMessage && !fakeMode" class="location-banner" role="status">
            {{ locationMessage }}
        </div>

        <Transition name="pop">
            <div v-if="celebration" class="celebration" role="status">
                {{ celebration }}
            </div>
        </Transition>

        <div v-if="isDev" class="dev-tools">
            <button class="dev-btn" @click="toggleFake">
                📍 Fake location: {{ fakeMode ? 'ON' : 'OFF' }}
            </button>
            <button class="dev-btn" @click="resetProgress">
                🔄 Reset progress
            </button>
             <button class="dev-btn" @click="copyPosition">
                📌 Copy my position
            </button>
        </div>

        <button v-if="!selected" class="recentre-btn" @click="recentre">
            📍 Back to me
        </button>

        <div v-if="selected" class="station-card">
        <button class="close-btn" @click="selected=null">x</button>
        <h2> {{ selected.emoji }} {{ selected.name }}</h2>
        <p>{{ statusLabel(selected) }}</p>

        <template v-if="getStatus(selected) === 'available'">
            <p v-if="isNear">You're here! 🎉</p>
            <p v-else>{{ distance }} m away · about {{ walkMinutes }} min walk</p>            
            <button class="start-btn" :disabled="!isNear" @click="completeStation">
                {{ isNear ? 'Start' : 'Walk closer to start' }}
            </button>
        </template>

        </div>
    </div>
   </div>

</template>

<style scoped>
.map-shell {
    display: flex;
    flex-direction: column;
    height: 100vh;
    height: 100dvh;
}

.map-page {
    position: relative;
    flex: 1;
    min-height: 0;
    font-family: 'Nunito', system-ui, sans-serif;
}

.map {
    height: 100%;
    width: 100%;
}

/* Desktop: leave room for the 250px sidebar */
@media (min-width: 768px) {
    .map-page {
        margin-left: 250px;
    }
}

/* Phones: leave room for the 70px bottom menu bar */
@media (max-width: 767px) {
    .map-shell {
        padding-bottom: 70px;
    }
}

:deep(.player-icon) {
    font-size: 44px;
    line-height: 1;
    filter: drop-shadow(0 6px 4px rgba(0, 0, 0, 0.35));
}


:deep(.station-chip) {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px 6px 8px;
    border-radius: 999px;
    border: 3px solid transparent;
    background: #fffbf2;
    color: #2a2017;
    font-size: 15px;
    font-weight: 800;
    white-space: nowrap;
    cursor: pointer;
    box-shadow: 0 3px 0 #e8d8b7, 0 6px 14px rgba(110, 67, 41, 0.2);
}

:deep(.station-emoji) {
    font-size: 22px;
}

:deep(.station-chip.available) {
    border-color: #b5492a;
}

:deep(.station-chip.completed) {
    border-color: #3c784d;
}

:deep(.station-chip.locked) {
    background: #efe7d6;
    color: #8a7f70;
}

.station-card {
    position: absolute;
    left: 16px;
    right: 16px;
    bottom: 18px;
    max-width: 440px;
    margin: 0 auto;
    z-index: 10;
    padding: 18px 20px 20px;
    border-radius: 22px;
    background: #fffbf2;
    color: #2a2017;
    font-size: 18px;
    box-shadow: 0 4px 0 #e8d8b7, 0 14px 30px rgba(110, 67, 41, 0.25);
}

.station-card h2 {
    font-family: 'Fraunces', Georgia, serif;
    font-size: 24px;
    margin: 0 0 6px;
    padding-right: 30px;
}

.station-card p {
    margin: 4px 0;
    color: #4d4134;
    font-weight: 700;
}

.close-btn {
    position: absolute;
    top: 6px;
    right: 6px;
    width: 44px;
    height: 44px;
    border: none;
    background: none;
    font-size: 22px;
    color: #4d4134;
}

.start-btn {
    width: 100%;
    margin-top: 14px;
    padding: 14px;
    border: none;
    border-radius: 14px;
    background: #b5492a;
    color: white;
    font-size: 19px;
    font-weight: 800;
    box-shadow: 0 4px 0 #7f2f17;
}

.start-btn:disabled {
    background: #e7dcc6;
    color: #8a7a66;
    box-shadow: none;
}

.dev-tools {
    position: absolute;
    top: 16px;
    right: 16px;
    z-index: 10;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 8px;
}

.dev-btn {
    padding: 10px 16px;
    font-size: 16px;
    font-weight: 700;
    color: #2a2017;
    background: #fffbf2;
    border: none;
    border-radius: 999px;
    box-shadow: 0 3px 0 #e8d8b7, 0 6px 14px rgba(110, 67, 41, 0.18);
}

.location-banner {
    position: absolute;
    top: 16px;
    left: 16px;
    z-index: 10;
    max-width: 420px;
    padding: 12px 16px;
    border-radius: 16px;
    border: 2px solid #f3c54b;
    background: #fff4d6;
    color: #4d4134;
    font-size: 16px;
    font-weight: 700;
    line-height: 1.4;
    box-shadow: 0 3px 0 #e8d8b7, 0 6px 14px rgba(110, 67, 41, 0.18);
}

.recentre-btn {
    position: absolute;
    right: 16px;
    bottom: 40px;
    z-index: 10;
    padding: 12px 18px;
    font-size: 17px;
    font-weight: 800;
    color: #2a2017;
    background: #fffbf2;
    border: none;
    border-radius: 999px;
    box-shadow: 0 3px 0 #e8d8b7, 0 6px 14px rgba(110, 67, 41, 0.18);
}

.celebration {
    position: absolute;
    top: 35%;
    left: 50%;
    transform: translateX(-50%);
    z-index: 20;
    padding: 18px 26px;
    border-radius: 22px;
    background: #b5492a;
    color: white;
    font-family: 'Fraunces', Georgia, serif;
    font-size: 26px;
    font-weight: 700;
    text-align: center;
    box-shadow: 0 5px 0 #7f2f17, 0 16px 34px rgba(110, 67, 41, 0.35);
    width: max-content;
    max-width: calc(100% - 32px);
}

.pop-enter-active,
.pop-leave-active {
    transition: opacity 0.3s, transform 0.3s;
}

.pop-enter-from,
.pop-leave-to {
    opacity: 0;
    transform: translateX(-50%) scale(0.7);
}
</style>