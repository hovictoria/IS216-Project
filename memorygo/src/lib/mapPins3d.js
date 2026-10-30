// ----------------------------------------------------------------------------------------------------------
// PSEUDOCODE
// filename:   lib/mapPins3d.js
// purpose:    - draws the map's pins and chests as real three.js models instead of .webp pictures
//             - ONE three.js scene inside MapLibre (a "custom layer"), sharing the map's WebGL canvas.
//               Not one canvas per pin: browsers only allow ~16 WebGL canvases at once
//             - shapes and colours copied from the login scene (components/auth/scene/SplashMap.vue pins,
//               TreasureChest.vue chest), built with plain three.js because TresJS needs its own canvas
//             - pins keep a steady size on screen (shrinking a little when zoomed out, see pinScale), and lean back a little so they always
//               look upright (like the prototype's sprites) even when the map is tilted
//             - only moves while something animates (selected pin hops, chest lid opens), then stops
//               redrawing so it doesn't drain the battery
// usage:      const pins = createPins3d({ reducedMotion })
//             map.addLayer(pins.layer)                          (after the style has loaded)
//             pins.sync(places, { kindOf, visibleIds, selectedId })   whenever something changes
//             pins.destroy()                                    when the page closes
// note:       tapping still uses the invisible HTML button on each place (views/map.vue);
//             a 3D shape can't receive a click by itself
// ----------------------------------------------------------------------------------------------------------

import maplibregl from 'maplibre-gl'
import {
    Camera,
    CircleGeometry,
    CylinderGeometry,
    DirectionalLight,
    Group,
    HemisphereLight,
    Matrix4,
    Mesh,
    MeshBasicMaterial,
    MeshStandardMaterial,
    Scene,
    SphereGeometry,
    Vector3,
    WebGLRenderer,
} from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'

// ---------- Size on screen ----------
const PIN_PX = 46          // pin height in pixels (the old .webp was 48px)
const CHEST_PX = 44        // chest height in pixels
const VIEW_ANGLE = 25      // pins always look as if seen from 25° above, whatever the map tilt
const EARTH_M = 40075016.686

// Pins shrink as you zoom out so they don't pile up: full size at street level (zoom 16+),
// 60% at zoom 14 and below. views/map.vue uses the same rule for the tap areas
export function pinScale(zoom) {
    const t = Math.min(1, Math.max(0, (zoom - 14) / 2))
    return 0.6 + 0.4 * t
}

// ---------- Colours (same as the login scene) ----------
const PIN_COLOURS = {
    red: '#B5492A',        // playable heritage spot
    blue: '#2F668F',       // MRT station
    green: '#3C784D',      // collected
}

// ---------- Shared shapes: made once, used by every pin ----------
const geo = {
    pinPoint: new CylinderGeometry(0.11, 0, 0.32, 20),
    pinHead: new SphereGeometry(0.15, 24, 16),
    pinDot: new SphereGeometry(0.06, 16, 12),
    shadow: new CircleGeometry(1, 24),

    // chest: TreasureChest.vue sizes (1.5 x 0.85 x 0.95)
    chestBase: new RoundedBoxGeometry(1.5, 0.85, 0.95, 4, 0.06),
    chestTrim: new RoundedBoxGeometry(1.55, 0.12, 1.0, 3, 0.04),
    chestBand: new RoundedBoxGeometry(0.12, 0.87, 0.99, 3, 0.03),
    chestLid: new CylinderGeometry(0.475, 0.475, 1.5, 40, 1, false, 0, Math.PI),
    chestLidBand: new CylinderGeometry(0.5, 0.5, 0.12, 40, 1, false, 0, Math.PI),
    chestLock: new RoundedBoxGeometry(0.24, 0.3, 0.08, 3, 0.04),
    chestKeyhole: new CylinderGeometry(0.035, 0.035, 0.02, 16),
    chestGlow: new SphereGeometry(0.6, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2),
}

const mat = {
    red: new MeshStandardMaterial({ color: PIN_COLOURS.red, roughness: 0.8 }),
    blue: new MeshStandardMaterial({ color: PIN_COLOURS.blue, roughness: 0.8 }),
    green: new MeshStandardMaterial({ color: PIN_COLOURS.green, roughness: 0.8 }),
    white: new MeshStandardMaterial({ color: '#FFFBF2', roughness: 0.8 }),
    shadow: new MeshBasicMaterial({ color: '#161412', transparent: true, opacity: 0.22, depthWrite: false }),

    wood: new MeshStandardMaterial({ color: '#9A6340', roughness: 0.75 }),
    woodDark: new MeshStandardMaterial({ color: '#6E4329', roughness: 0.8 }),
    gold: new MeshStandardMaterial({ color: '#E9B949', roughness: 0.35, metalness: 0.35 }),
    keyhole: new MeshStandardMaterial({ color: '#2B1D14', roughness: 0.9 }),
    treasure: new MeshStandardMaterial({ color: '#FFD36A', emissive: '#FFB52E', emissiveIntensity: 0.6, roughness: 0.4 }),
}

function mesh(geometry, material, [x, y, z] = [0, 0, 0], rotation) {
    const m = new Mesh(geometry, material)
    m.position.set(x, y, z)
    if (rotation) m.rotation.set(...rotation)
    return m
}

// Pin: cone point + round head + white shine. Tip touches the ground (y = 0). About 0.51 tall
function buildPin(colour) {
    const g = new Group()
    g.add(mesh(geo.pinPoint, mat[colour], [0, 0.16, 0]))
    g.add(mesh(geo.pinHead, mat[colour], [0, 0.36, 0]))
    g.add(mesh(geo.pinDot, mat.white, [0.085, 0.38, 0.085]))
    return { model: g, height: 0.51, lid: null }
}

// Chest: wooden box, gold bands, round lid that can open. About 1.3 tall with the lid shut
// (also used on its own by components/ui/ChestCanvas.vue, e.g. the Spirits tab's set card)
export function buildChest() {
    const g = new Group()
    const H = 0.85
    g.add(mesh(geo.chestBase, mat.wood, [0, H / 2, 0]))
    g.add(mesh(geo.chestTrim, mat.woodDark, [0, 0.06, 0]))
    g.add(mesh(geo.chestBand, mat.gold, [-0.48, H / 2, 0]))
    g.add(mesh(geo.chestBand, mat.gold, [0.48, H / 2, 0]))

    // glowing treasure inside, only seen when the lid opens
    const glow = mesh(geo.chestGlow, mat.treasure, [0, H - 0.02, 0])
    glow.scale.set(1.05, 0.28, 0.66)
    g.add(glow)

    // the lid turns on its back edge
    const lid = new Group()
    lid.position.set(0, H, -0.475)
    lid.add(mesh(geo.chestLid, mat.wood, [0, 0, 0.475], [0, 0, Math.PI / 2]))
    lid.add(mesh(geo.chestLidBand, mat.gold, [-0.48, 0, 0.475], [0, 0, Math.PI / 2]))
    lid.add(mesh(geo.chestLidBand, mat.gold, [0.48, 0, 0.475], [0, 0, Math.PI / 2]))
    lid.add(mesh(geo.chestLock, mat.gold, [0, -0.04, 0.985]))
    lid.add(mesh(geo.chestKeyhole, mat.keyhole, [0, -0.06, 1.03], [Math.PI / 2, 0, 0]))
    g.add(lid)

    return { model: g, height: 1.32, lid }
}

// One place on the map:
//   turn   (faces the camera as the map rotates)
//    ├─ shadow   flat on the ground
//    └─ lean     (tips back so it looks upright from any tilt)
//        └─ hop  (jumps when selected)
//            └─ model (pin or chest)
function buildMarker(kind) {
    const built = kind === 'chest' ? buildChest() : buildPin(kind)
    const turn = new Group()
    const lean = new Group()
    const hop = new Group()

    const shadow = new Mesh(geo.shadow, mat.shadow)
    shadow.rotation.x = -Math.PI / 2
    shadow.position.y = 0.005
    shadow.scale.set(kind === 'chest' ? 0.9 : 0.16, kind === 'chest' ? 0.55 : 0.08, 1)

    hop.add(built.model)
    lean.add(hop)
    turn.add(shadow, lean)

    return { kind, turn, lean, hop, lid: built.lid, height: built.height, hopStart: -1, lidAngle: 0 }
}

// ---------- The layer ----------
export function createPins3d({ reducedMotion = false } = {}) {
    let map = null
    let renderer = null
    const scene = new Scene()
    const camera = new Camera()
    const markers = new Map()       // place id -> marker built above
    let selectedId = null

    // Everything is placed in metres around one origin point, so numbers stay small and precise
    let origin = null               // MercatorCoordinate of the first place
    let metre = 1                   // one metre in Mercator units at the origin

    scene.add(new HemisphereLight('#FFF6E2', '#B89A6E', 1.5))
    const sun = new DirectionalLight('#FFE9C6', 2.3)
    sun.position.set(-3, 7, 2.5)
    scene.add(sun)

    // Mercator (x east, y south, z up) <-> three.js (x east, y up, z south), in metres from the origin
    function toScene(lng, lat) {
        const m = maplibregl.MercatorCoordinate.fromLngLat([lng, lat], 0)
        return [(m.x - origin.x) / metre, (m.y - origin.y) / metre]
    }

    // Is anything still moving? (a hop in progress, or a lid still opening/closing)
    function isAnimating(now) {
        for (const [id, m] of markers) {
            if (m.hopStart >= 0 && now - m.hopStart < 600) return true
            if (m.lid) {
                const target = id === selectedId ? -1.95 : 0
                if (Math.abs(m.lidAngle - target) > 0.01) return true
            }
        }
        return false
    }

    const layer = {
        id: 'pins-3d',
        type: 'custom',
        renderingMode: '3d',

        onAdd(mapInstance, gl) {
            map = mapInstance
            renderer = new WebGLRenderer({ canvas: map.getCanvas(), context: gl, antialias: true })
            renderer.autoClear = false      // MapLibre already drew the map, don't wipe it
        },

        render(gl, matrix) {
            if (!origin) return
            const now = performance.now()

            // Same size on screen at any zoom: work out how many metres one pixel covers right now
            const lat = map.getCenter().lat
            const pxPerMetre = (512 * 2 ** map.getZoom()) / (EARTH_M * Math.cos((lat * Math.PI) / 180))
            const pitch = map.getPitch()
            const bearing = map.getBearing()
            const zoomScale = pinScale(map.getZoom())

            for (const [id, m] of markers) {
                const size = ((m.kind === 'chest' ? CHEST_PX : PIN_PX) * zoomScale) / pxPerMetre / m.height
                m.turn.scale.setScalar(size)
                m.turn.rotation.y = (-bearing * Math.PI) / 180
                m.lean.rotation.x = ((Math.min(pitch, 90 - VIEW_ANGLE) - 90 + VIEW_ANGLE) * Math.PI) / 180

                // hop: one little jump when it gets selected
                const t = m.hopStart >= 0 ? (now - m.hopStart) / 600 : 1
                m.hop.position.y = t < 1 ? Math.sin(t * Math.PI) * 0.35 * m.height : 0

                // chest lid: springs open when selected, shuts again when not
                if (m.lid) {
                    const target = id === selectedId ? -1.95 : 0
                    m.lidAngle = reducedMotion ? target : m.lidAngle + (target - m.lidAngle) * 0.12
                    m.lid.rotation.x = m.lidAngle
                }
            }

            // MapLibre's camera, then shift + scale so one three.js unit = one metre at the origin
            const toWorld = new Matrix4()
                .makeTranslation(origin.x, origin.y, origin.z)
                .scale(new Vector3(metre, -metre, metre))
                .multiply(new Matrix4().makeRotationX(Math.PI / 2))
            camera.projectionMatrix = new Matrix4().fromArray(matrix).multiply(toWorld)

            renderer.resetState()           // MapLibre and three.js share the canvas, so reset its settings
            renderer.clearDepth()           // draw pins on top of the 3D buildings, never hidden behind them
            renderer.render(scene, camera)

            if (isAnimating(now)) map.triggerRepaint()
        },
    }

    // Make the 3D scene match the places: add new ones, swap a model when its kind changes
    // (e.g. red -> green after playing), hide filtered ones, and hop the newly selected one
    function sync(places, { kindOf, visibleIds, selectedId: newSelected }) {
        if (!origin && places.length) {
            origin = maplibregl.MercatorCoordinate.fromLngLat([places[0].lng, places[0].lat], 0)
            metre = origin.meterInMercatorCoordinateUnits()
        }

        for (const place of places) {
            const kind = kindOf(place)
            let m = markers.get(place.id)

            // out of range: hide it, and don't build a model for it until it's needed
            if (!visibleIds.has(place.id)) {
                if (m) m.turn.visible = false
                continue
            }

            if (!m || m.kind !== kind) {
                if (m) scene.remove(m.turn)
                m = buildMarker(kind)
                const [x, z] = toScene(place.lng, place.lat)
                m.turn.position.set(x, 0, z)
                markers.set(place.id, m)
                scene.add(m.turn)
            }
            m.turn.visible = true
        }

        if (newSelected !== selectedId) {
            selectedId = newSelected
            const m = markers.get(selectedId)
            if (m && !reducedMotion) m.hopStart = performance.now()
        }

        map?.triggerRepaint()
    }

    function destroy() {
        Object.values(geo).forEach((g) => g.dispose())
        Object.values(mat).forEach((m) => m.dispose())
        markers.clear()
    }

    return { layer, sync, destroy }
}
