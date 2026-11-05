import maplibregl from 'maplibre-gl'
import { Camera, Group, Matrix4, Mesh, MeshBasicMaterial, RingGeometry, Scene, Vector3, WebGLRenderer } from 'three'
import { buildSpirit, addSpiritLights, addSpiritShadow } from '@/three/spiritModel'
import { EMOTE_FOR, EMOTE_SECONDS, EMOTE_LENGTH, playEmote } from '@/three/spiritEmotes'

const SPIRIT_PX = 64
const MODEL_HEIGHT = 2.4
const MIN_MOVE_M = 2
const GLIDE = 0.08
const EARTH_M = 40075016.686

export function createPlayer3d({ reducedMotion = false} = {}) {
    let map = null
    let renderer = null
    let model = null
    let emote = null
    let emoteStart = -1
    let visible = false

    let origin = null
    let metre = 1
    let shown = null
    let target = null

    // scenes
    const scene = new Scene()
    const camera = new Camera()
    addSpiritLights(scene)

    const turn = new Group()
    const lift = new Group()
    const hop = new Group()
    lift.position.y = 1.2
    turn.add(lift)
    lift.add(hop)
    scene.add(turn)

    const removeShadow = addSpiritShadow(lift)

    const ringGeometry = new RingGeometry(0.85, 1.05, 48)
    const ringMaterial = new MeshBasicMaterial({ color: '#2F6FB0', transparent: true, opacity: 0.45, depthWrite: false })
    const ring = new Mesh(ringGeometry, ringMaterial)
    ring.rotation.x = -Math.PI / 2
    ring.position.y = -1.2
    lift.add(ring)

    const tapButton = document.createElement('button')
    tapButton.type = 'button'
    tapButton.className = 'player-tap'
    tapButton.setAttribute('aria-label', 'Your Spirit')
    tapButton.addEventListener('click', () => {
        if (reducedMotion || !model) return
        emoteStart = performance.now()
        map?.triggerRepaint()
    })

    const tapMarker = new maplibregl.Marker({ element: tapButton, anchor: 'bottom' })

    // helper functions
    function toMetres([lng, lat]) {
        const m = maplibregl.MercatorCoordinate.fromLngLat([lng, lat], 0)
        return [(m.x - origin.x) / metre, (m.y - origin.y) / metre]
    }

    function toLngLat([x, z]) {
        return new maplibregl.MercatorCoordinate(origin.x + x * metre, origin.y + z * metre, 0).toLngLat()
    }

    function restPose() {
        model.spirit.position.set(0, 0, 0)
        model.spirit.rotation.set(0, 0, 0)
        model.spirit.scale.set(1, 1, 1)
        for (const limb of model.limbs) limb.rotation.z = 0
        for (const arm of model.arms) {
            arm.shoulder.rotation.set(0, arm.rest[1], arm.rest[0])
            arm.elbow.rotation.set(0, 0, arm.rest[2])
            arm.setHand('fist')
        }
        model.parts.durian?.reset()
    }

        // layer for mapLibre
    const layer = {
        id: 'player-3d',
        type: 'custom',
        renderingMode: '3d',

        onAdd(mapInstance, gl) {
            map = mapInstance
            renderer = new WebGLRenderer({ canvas: map.getCanvas(), context: gl, antialias: true })
            renderer.autoClear = false
            show(visible)           
        },

        render(gl, matrix) {
            if (!visible || !model || !shown) return
            const now = performance.now()

            // glide towards where the GPS says you are
            const dx = target[0] - shown[0]
            const dz = target[1] - shown[1]
            const walking = Math.hypot(dx, dz) > 0.05
            if (walking) {
                shown[0] += dx * GLIDE
                shown[1] += dz * GLIDE
            }
            turn.position.set(shown[0], 0, shown[1])
            tapMarker.setLngLat(toLngLat(shown))

            // the same size on screen at any zoom, always facing the camera
            const lat = map.getCenter().lat
            const pxPerMetre = (512 * 2 ** map.getZoom()) / (EARTH_M * Math.cos((lat * Math.PI) / 180))
            turn.scale.setScalar(SPIRIT_PX / pxPerMetre / MODEL_HEIGHT)
            turn.rotation.y = (-map.getBearing() * Math.PI) / 180

            // waddle while walking
            const t = now / 1000
            const waddle = walking && !reducedMotion
            hop.position.y = waddle ? Math.abs(Math.sin(t * 7)) * 0.25 : 0
            hop.rotation.z = waddle ? Math.sin(t * 7) * 0.08 : 0

            // its move, if it was tapped
            restPose()
            let emoting = false
            if (emoteStart >= 0) {
                const p = (now - emoteStart) / ((EMOTE_LENGTH[emote] ?? EMOTE_SECONDS) * 1000)
                if (p < 1) {
                    playEmote(model, emote, p)
                    emoting = true
                } else {
                    emoteStart = -1
                }
            }

            // draw  with MapLibre's camera (one three.js unit = one metre)
            const toWorld = new Matrix4()
                .makeTranslation(origin.x, origin.y, origin.z)
                .scale(new Vector3(metre, -metre, metre))
                .multiply(new Matrix4().makeRotationX(Math.PI / 2))
            camera.projectionMatrix = new Matrix4().fromArray(matrix).multiply(toWorld)

            renderer.resetState()
            renderer.clearDepth()
            renderer.render(scene, camera)

            // 6. keep drawing only while something moves
            if (walking || emoting) map.triggerRepaint()
        },
    }

    // call for map.vue
    function setSpirit(spirit) {
        if (model) {
            hop.remove(model.spirit)
            model.dispose()
            model = null
        }
        if (spirit) {
            model = buildSpirit({ id: spirit.id, color: spirit.color })
            emote = EMOTE_FOR[spirit.id]
            hop.add(model.spirit)
            model.ready.then(() => map?.triggerRepaint())
        }
        map?.triggerRepaint()
    }

    function setPosition(lngLat) {
        if (!origin) {
            origin = maplibregl.MercatorCoordinate.fromLngLat(lngLat, 0)
            metre = origin.meterInMercatorCoordinateUnits()
        }
        const next = toMetres(lngLat)
        if (target && Math.hypot(next[0] - target[0], next[1] - target[1]) < MIN_MOVE_M) return
        target = next
        if (!shown || reducedMotion) shown = [...next]
        map?.triggerRepaint()
    }

    function show(on) {
        visible = on
        if (on && map && shown) tapMarker.setLngLat(toLngLat(shown)).addTo(map)
        else tapMarker.remove()
        map?.triggerRepaint()
    }

    function destroy() {
        setSpirit(null)
        removeShadow()
        ringGeometry.dispose()
        ringMaterial.dispose()
        tapMarker.remove()
    }

    return { layer, setSpirit, setPosition, show, destroy }

}