<script setup>
// A small map board of a Singapore neighbourhood. Put the treasure chest in the default slot.
// Must be rendered inside <TresCanvas> because it uses useLoop().
import { onMounted, onUnmounted, shallowRef } from 'vue'
import { useLoop } from '@tresjs/core'
import { CylinderGeometry, ExtrudeGeometry, MeshStandardMaterial, Shape, SphereGeometry } from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'

const props = defineProps({
  reducedMotion: { type: Boolean, default: false },
})

// ---------- Geometry and material helpers (cached so shapes are shared) ----------
const cache = new Map()
function cached(key, make) {
  if (!cache.has(key)) cache.set(key, make())
  return cache.get(key)
}

const box = (w, h, d, r = 0.03) =>
  cached(`box:${w},${h},${d},${r}`, () => {
    const safe = Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001)
    return new RoundedBoxGeometry(w, h, d, 2, Math.max(safe, 0.001))
  })

const cyl = (top, bottom, h, seg = 24, thetaLength = Math.PI * 2) =>
  cached(`cyl:${top},${bottom},${h},${seg},${thetaLength}`, () =>
    new CylinderGeometry(top, bottom, h, seg, 1, false, 0, thetaLength),
  )

const ball = (r) => cached(`ball:${r}`, () => new SphereGeometry(r, 24, 16))

// Triangular roof: profile in x/y, ridge running along z.
const roof = (w, h, len) =>
  cached(`roof:${w},${h},${len}`, () => {
    const s = new Shape()
    s.moveTo(-w / 2, 0)
    s.lineTo(w / 2, 0)
    s.lineTo(0, h)
    s.closePath()
    const g = new ExtrudeGeometry(s, { depth: len, bevelEnabled: false })
    g.translate(0, 0, -len / 2)
    return g
  })

const paint = (color, extra = {}) =>
  cached(`mat:${color}:${JSON.stringify(extra)}`, () =>
    new MeshStandardMaterial({ color, roughness: 0.8, ...extra }),
  )

// ---------- Palette ----------
const C = {
  // Matched to the Memory Go prototype palette
  paper: '#E8D8B7', // board edge (map blocks)
  land: '#F3E8D2', // map land
  park: '#CFE0B4', // parks
  road: '#FDFBF2',
  roadLine: '#E8D8B7',
  plaza: '#FBF4E4',
  water: '#A9D3E6',
  waterRim: '#F3E8D2',
  route: '#B5492A', // terracotta dotted walk route
  hdb: '#F4E6CB',
  hdbWindows: '#D9C29A',
  hdbBase: '#E2D0AE',
  wood: '#B07A4F',
  woodDark: '#6E4329',
  thatch: '#A98450',
  tile: '#C9704E',
  white: '#FFFBF2',
  trunk: '#7A5236',
  leaf: '#7FAF6E',
  leafLight: '#9CC48A',
  green: '#3C784D', // parks / success
  terracotta: '#B5492A', // hawker centres / primary
  blue: '#2F668F', // community clubs / links
}

// ---------- Build the static scene as a flat list of parts ----------
const parts = []
const add = (geometry, material, position, opts = {}) =>
  parts.push({ geometry, material, position, rotation: opts.rotation ?? [0, 0, 0], scale: opts.scale ?? [1, 1, 1], cast: opts.cast ?? true, receive: opts.receive ?? false })

// Board: a paper map with green land printed on it. Land top sits at y = 0.
add(box(5.2, 0.3, 5.2, 0.12), paint(C.paper), [0, -0.18, 0], { cast: false, receive: true })
add(box(4.75, 0.06, 4.75, 0.03), paint(C.land), [0, -0.03, 0], { cast: false, receive: true })

// Roads with dashed centre lines
add(box(0.36, 0.02, 4.5, 0.01), paint(C.road), [1.05, 0.01, 0], { cast: false, receive: true })
add(box(4.5, 0.02, 0.36, 0.01), paint(C.road), [0, 0.012, -1.05], { cast: false, receive: true })
for (let v = -2.0; v <= 2.0; v += 0.4) {
  if (Math.abs(v + 1.05) > 0.25) add(box(0.04, 0.006, 0.16, 0.002), paint(C.roadLine), [1.05, 0.022, v], { cast: false })
  if (Math.abs(v - 1.05) > 0.25) add(box(0.16, 0.006, 0.04, 0.002), paint(C.roadLine), [v, 0.024, -1.05], { cast: false })
}

// Parks (pale green patches like the prototype map), a plaza under the chest, and a pond
add(cyl(1.2, 1.2, 0.012, 56), paint(C.park), [0.15, 0.006, 0.2], { cast: false, receive: true })
add(box(1.05, 0.012, 1.05, 0.004), paint(C.park), [1.8, 0.006, 1.8], { cast: false, receive: true })
add(box(0.7, 0.012, 0.75, 0.004), paint(C.park), [0.4, 0.006, -1.85], { cast: false, receive: true })
add(cyl(0.7, 0.7, 0.02, 48), paint(C.plaza), [0.15, 0.014, 0.2], { cast: false, receive: true })
add(cyl(0.56, 0.56, 0.02, 48), paint(C.waterRim), [1.8, 0.01, 1.75], { cast: false, receive: true })
add(cyl(0.48, 0.48, 0.03, 48), paint(C.water, { roughness: 0.25 }), [1.8, 0.015, 1.75], { cast: false, receive: true })
add(cyl(0.07, 0.07, 0.01, 16), paint(C.leafLight), [1.65, 0.035, 1.6], { cast: false })
add(cyl(0.05, 0.05, 0.01, 16), paint(C.leafLight), [1.95, 0.035, 1.9], { cast: false })

// Dotted routes from two pins to the chest
function route(from, to, count) {
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1)
    add(cyl(0.045, 0.045, 0.012, 12), paint(C.route), [from[0] + (to[0] - from[0]) * t, 0.03, from[1] + (to[1] - from[1]) * t], { cast: false })
  }
}
route([0.65, 0.8], [1.0, 1.35], 4)
route([-0.45, -0.35], [-1.1, -0.88], 5)

// HDB blocks: white with window bands and a coloured crown
function hdb(x, z, w, d, h, crown) {
  const base = 0.22
  add(box(w - 0.08, base, d - 0.08, 0.02), paint(C.hdbBase), [x, base / 2, z])
  add(box(w, h - base, d, 0.03), paint(C.hdb), [x, base + (h - base) / 2, z], { receive: true })
  const floors = Math.floor((h - base - 0.15) / 0.24)
  for (let k = 0; k < floors; k++) {
    add(box(w + 0.02, 0.05, d + 0.02, 0.01), paint(C.hdbWindows), [x, base + 0.16 + k * 0.24, z], { cast: false })
  }
  add(box(w + 0.04, 0.12, d + 0.04, 0.03), paint(crown), [x, h + 0.04, z])
}
hdb(-1.75, -1.75, 0.9, 0.6, 1.9, C.tile)
hdb(-0.55, -1.9, 0.8, 0.55, 1.35, C.green)

// Shophouse row: pastel fronts, tiled roofs, windows facing the street
const shopColors = ['#F2C4B4', '#CFE0B4', '#F3D58A']
shopColors.forEach((color, i) => {
  const x = -1.9
  const z = -0.35 + i * 0.5
  add(box(0.55, 0.7, 0.48, 0.03), paint(color), [x, 0.35, z], { receive: true })
  add(roof(0.64, 0.22, 0.5), paint(C.tile), [x, 0.7, z])
  const front = x + 0.28
  add(box(0.012, 0.14, 0.1, 0.004), paint(C.white), [front, 0.5, z - 0.11], { cast: false })
  add(box(0.012, 0.14, 0.1, 0.004), paint(C.white), [front, 0.5, z + 0.11], { cast: false })
  add(box(0.012, 0.24, 0.15, 0.004), paint(C.woodDark), [front, 0.12, z], { cast: false })
})

// Kampong house on stilts with a steep roof
{
  const x = -1.65
  const z = 1.65
  for (const [sx, sz] of [[-0.28, -0.2], [0.28, -0.2], [-0.28, 0.2], [0.28, 0.2]]) {
    add(cyl(0.03, 0.035, 0.3, 10), paint(C.woodDark), [x + sx, 0.15, z + sz])
  }
  add(box(0.7, 0.4, 0.55, 0.02), paint(C.wood), [x, 0.5, z], { receive: true })
  add(roof(0.9, 0.42, 0.78), paint(C.thatch), [x, 0.7, z], { rotation: [0, Math.PI / 2, 0] })
  add(box(0.012, 0.24, 0.15, 0.004), paint(C.woodDark), [x + 0.355, 0.44, z + 0.08], { cast: false })
  add(box(0.012, 0.12, 0.12, 0.004), paint('#3E2A1C'), [x, 0.52, z + 0.28], { rotation: [0, Math.PI / 2, 0], cast: false })
  add(box(0.18, 0.04, 0.2, 0.01), paint(C.woodDark), [x + 0.45, 0.1, z + 0.08])
  add(box(0.12, 0.04, 0.2, 0.01), paint(C.woodDark), [x + 0.42, 0.2, z + 0.08])
}

// MRT station: glass barrel roof with line-colour stripes, plus a sign
{
  const x = 1.7
  const z = -1.75
  add(box(1.0, 0.38, 0.7, 0.03), paint(C.white), [x, 0.19, z], { receive: true })
  add(box(1.02, 0.06, 0.72, 0.02), paint(C.terracotta), [x, 0.3, z], { cast: false })
  add(box(1.02, 0.06, 0.72, 0.02), paint(C.green), [x, 0.22, z], { cast: false })
  add(cyl(0.38, 0.38, 1.04, 32, Math.PI), paint('#A9CDE0', { roughness: 0.3 }), [x, 0.38, z], { rotation: [0, 0, Math.PI / 2] })
  add(cyl(0.025, 0.025, 0.6, 10), paint('#6B5E50'), [2.2, 0.3, -1.25])
  add(cyl(0.13, 0.13, 0.03, 24), paint(C.terracotta), [2.2, 0.66, -1.25], { rotation: [Math.PI / 2, 0, Math.PI / 4] })
}

// Trees
const trees = [[-0.4, 2.0], [0.35, 2.15], [2.15, 0.35], [2.15, 0.95], [-2.1, -1.0], [0.45, -1.9], [-0.95, 2.05], [2.1, -0.45]]
trees.forEach(([x, z], i) => {
  const s = 0.85 + (i % 3) * 0.12
  add(cyl(0.04, 0.05, 0.25, 10), paint(C.trunk), [x, 0.125, z])
  add(ball(0.22), paint(i % 2 ? C.leafLight : C.leaf), [x, 0.4 * s, z], { scale: [s, s, s] })
  add(ball(0.14), paint(i % 2 ? C.leaf : C.leafLight), [x + 0.1, 0.55 * s, z + 0.06], { scale: [s, s, s] })
})

// ---------- Animated pieces ----------
// Pin colours follow the prototype: green = park, terracotta = hawker centre, blue = community club
const pins = [
  { x: 1.05, z: 1.55, color: C.green },
  { x: -1.25, z: -1.05, color: C.terracotta },
  { x: 1.6, z: -1.05, color: C.blue },
]
const pinHead = ball(0.15)
const pinPoint = new CylinderGeometry(0.11, 0, 0.32, 20)
const pinDot = ball(0.06)
const pinGroups = []

const clouds = [
  { x: -1.4, y: 2.9, z: -2.4, s: 1 },
  { x: 2.2, y: 2.5, z: -0.9, s: 0.8 },
]
const cloudGroups = []
const cloudMat = paint(C.white, { roughness: 1, emissive: '#FFFBF2', emissiveIntensity: 0.15 })

const world = shallowRef()
const sun = shallowRef()

onMounted(() => {
  if (!sun.value) return
  sun.value.shadow.mapSize.set(1024, 1024)
  Object.assign(sun.value.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4 })
  sun.value.shadow.bias = -0.0005
})

const { onBeforeRender } = useLoop()
onBeforeRender(({ elapsed }) => {
  const calm = props.reducedMotion
  if (world.value) world.value.rotation.y = calm ? 0 : Math.sin(elapsed * 0.2) * 0.06
  pinGroups.forEach((g, i) => {
    if (g) g.position.y = calm ? 0 : Math.sin(elapsed * 1.6 + i * 2) * 0.05
  })
  cloudGroups.forEach((g, i) => {
    if (g) g.position.x = clouds[i].x + (calm ? 0 : Math.sin(elapsed * 0.15 + i * 3) * 0.35)
  })
})

onUnmounted(() => {
  cache.forEach((item) => item.dispose?.())
  pinPoint.dispose()
})
</script>

<template>
  <TresHemisphereLight :args="['#FFF6E2', '#B89A6E', 1.5]" />
  <TresDirectionalLight ref="sun" :position="[-3, 7, 2.5]" :intensity="2.3" color="#FFE9C6" cast-shadow />

  <TresGroup ref="world">
    <TresMesh
      v-for="(part, i) in parts"
      :key="i"
      :geometry="part.geometry"
      :material="part.material"
      :position="part.position"
      :rotation="part.rotation"
      :scale="part.scale"
      :cast-shadow="part.cast"
      :receive-shadow="part.receive"
    />

    <!-- Map pins -->
    <TresGroup
      v-for="(pin, i) in pins"
      :key="`pin-${i}`"
      :ref="(el) => (pinGroups[i] = el)"
    >
      <TresGroup :position="[pin.x, 0, pin.z]">
        <TresMesh :geometry="pinPoint" :material="paint(pin.color)" :position="[0, 0.42, 0]" cast-shadow />
        <TresMesh :geometry="pinHead" :material="paint(pin.color)" :position="[0, 0.62, 0]" cast-shadow />
        <TresMesh :geometry="pinDot" :material="paint(C.white)" :position="[0.085, 0.64, 0.085]" />
      </TresGroup>
    </TresGroup>

    <!-- Clouds -->
    <TresGroup
      v-for="(cloud, i) in clouds"
      :key="`cloud-${i}`"
      :ref="(el) => (cloudGroups[i] = el)"
      :position="[cloud.x, cloud.y, cloud.z]"
      :scale="[cloud.s, cloud.s, cloud.s]"
    >
      <TresMesh :geometry="ball(0.3)" :material="cloudMat" />
      <TresMesh :geometry="ball(0.22)" :material="cloudMat" :position="[0.32, -0.06, 0.05]" />
      <TresMesh :geometry="ball(0.2)" :material="cloudMat" :position="[-0.3, -0.08, 0]" />
    </TresGroup>

    <!-- The treasure chest (or anything else) goes here -->
    <slot />
  </TresGroup>
</template>