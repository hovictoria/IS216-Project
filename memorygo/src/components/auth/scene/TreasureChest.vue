<script setup>
// A treasure chest that opens, throws up a fountain of coins, and closes again on a loop.
// Must be rendered inside <TresCanvas> because it uses useLoop().
import { onUnmounted, shallowRef } from 'vue'
import { useLoop } from '@tresjs/core'
import { CylinderGeometry, DoubleSide, MeshStandardMaterial, OctahedronGeometry, SphereGeometry } from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'

const props = defineProps({
  reducedMotion: { type: Boolean, default: false },
  // Seconds for one open-and-close cycle.
  cycle: { type: Number, default: 5.5 },
})

// ---------- Dimensions ----------
const W = 1.5
const H = 0.85
const D = 0.95
const R = D / 2
const COIN_COUNT = 10
const SPARKLE_COUNT = 8
const OPEN_ANGLE = -1.95

// ---------- Timeline (seconds into each cycle) ----------
const OPEN_AT = 1.2
const CLOSE_AT = 3.7
const COINS_FROM = 1.4

// ---------- Materials ----------
const mat = {
  wood: new MeshStandardMaterial({ color: '#9A6340', roughness: 0.75 }),
  woodDark: new MeshStandardMaterial({ color: '#6E4329', roughness: 0.8 }),
  lidInside: new MeshStandardMaterial({ color: '#7A4B2E', roughness: 0.8, side: DoubleSide }),
  gold: new MeshStandardMaterial({ color: '#E9B949', roughness: 0.35, metalness: 0.35 }),
  keyhole: new MeshStandardMaterial({ color: '#2B1D14', roughness: 0.9 }),
  treasure: new MeshStandardMaterial({ color: '#FFD36A', emissive: '#FFB52E', emissiveIntensity: 0.6, roughness: 0.4 }),
  coin: new MeshStandardMaterial({ color: '#F2C14E', emissive: '#B07A10', emissiveIntensity: 0.25, roughness: 0.3, metalness: 0.4 }),
  sparkle: new MeshStandardMaterial({ color: '#FFF4CC', emissive: '#FFE08A', emissiveIntensity: 2 }),
}

// ---------- Geometries ----------
const geo = {
  base: new RoundedBoxGeometry(W, H, D, 4, 0.06),
  trim: new RoundedBoxGeometry(W + 0.05, 0.12, D + 0.05, 3, 0.04),
  band: new RoundedBoxGeometry(0.12, H + 0.02, D + 0.04, 3, 0.03),
  groove: new RoundedBoxGeometry(W - 0.06, 0.025, 0.012, 1, 0.005),
  lid: new CylinderGeometry(R, R, W, 40, 1, false, 0, Math.PI),
  lidBand: new CylinderGeometry(R + 0.025, R + 0.025, 0.12, 40, 1, false, 0, Math.PI),
  lock: new RoundedBoxGeometry(0.24, 0.3, 0.08, 3, 0.04),
  keyhole: new CylinderGeometry(0.035, 0.035, 0.02, 16),
  treasure: new SphereGeometry(0.6, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2),
  coin: new CylinderGeometry(0.15, 0.15, 0.045, 28),
  sparkle: new OctahedronGeometry(1),
}

// Each coin gets a fixed launch so the fountain looks the same every loop.
const coins = Array.from({ length: COIN_COUNT }, (_, i) => {
  const angle = (i / COIN_COUNT) * Math.PI * 2
  return {
    delay: COINS_FROM + i * 0.11,
    x0: Math.cos(angle) * 0.12,
    z0: Math.sin(angle) * 0.08,
    vx: Math.cos(angle * 1.7) * 0.28,
    vz: Math.sin(angle * 1.3) * 0.16,
    vy: 3.3 + (i % 4) * 0.3,
    spin: 7 + (i % 3) * 3,
  }
})

// ---------- Refs ----------
const lid = shallowRef()
const body = shallowRef()
const glowLight = shallowRef()
const coinMeshes = []
const sparkleMeshes = []

// ---------- Loop ----------
let lidAngle = 0
let lidVelocity = 0
let glow = 0
const GRAVITY = 9.8

const { onBeforeRender } = useLoop()

onBeforeRender(({ delta, elapsed }) => {
  const dt = Math.min(delta, 1 / 20)
  const calm = props.reducedMotion
  const t = elapsed % props.cycle

  // Lid target for this moment in the cycle.
  let target = 0
  let hop = 0
  if (calm) {
    target = OPEN_ANGLE
  } else if (t >= OPEN_AT && t < CLOSE_AT) {
    target = OPEN_ANGLE
  } else if (t > OPEN_AT - 0.6 && t < OPEN_AT) {
    // A small excited peek and hop just before it opens.
    const pulse = Math.sin(((t - (OPEN_AT - 0.6)) / 0.6) * Math.PI)
    target = -0.15 * pulse
    hop = 0.06 * pulse
  }

  if (calm) {
    lidAngle = target
    lidVelocity = 0
  } else {
    // Spring for a bouncy, toy-like lid. Sub-stepped so it stays stable on slow phones.
    let remaining = dt
    while (remaining > 0) {
      const step = Math.min(remaining, 1 / 120)
      remaining -= step
      const accel = 45 * (target - lidAngle) - 9 * lidVelocity
      lidVelocity += accel * step
      lidAngle += lidVelocity * step
    }
  }
  if (lid.value) lid.value.rotation.x = lidAngle
  if (body.value) body.value.position.y = hop

  // Warm light spilling out as the lid lifts.
  const glowTarget = Math.min(-lidAngle * 3.2, 6)
  glow += (glowTarget - glow) * Math.min(1, dt * 8)
  if (glowLight.value) glowLight.value.intensity = glow

  // Coin fountain: each coin follows a fixed arc up out of the chest and back in.
  coins.forEach((c, i) => {
    const mesh = coinMeshes[i]
    if (!mesh) return
    const s = t - c.delay
    const y = H + c.vy * s - 0.5 * GRAVITY * s * s
    const inFlight = !calm && s > 0 && y > H - 0.05
    mesh.visible = inFlight
    if (!inFlight) return
    mesh.position.set(c.x0 + c.vx * s, y, c.z0 + c.vz * s)
    mesh.rotation.set(Math.PI / 2 + c.spin * s, c.spin * 0.3 * s, 0)
  })

  // Sparkles while the chest is open.
  const sparkleStrength = Math.min(1, Math.max(0, -lidAngle / 1.2))
  sparkleMeshes.forEach((m, i) => {
    if (!m) return
    m.visible = sparkleStrength > 0.05
    if (!m.visible) return
    const phase = i * 1.9
    const a = phase + (calm ? 0 : elapsed * 0.4)
    const r = 0.55 + (i % 3) * 0.22
    const rise = calm ? (i % 4) * 0.3 : (elapsed * 0.35 + i * 0.41) % 1.3
    m.position.set(Math.cos(a) * r, H + 0.4 + rise, Math.sin(a) * r * 0.8)
    const twinkle = calm ? 0.6 : Math.max(0, Math.sin(elapsed * 2.6 + phase))
    m.scale.setScalar((0.055 * twinkle + 0.01) * sparkleStrength)
    m.rotation.y = elapsed
  })
})

onUnmounted(() => {
  Object.values(mat).forEach((m) => m.dispose())
  Object.values(geo).forEach((g) => g.dispose())
})
</script>

<template>
  <TresGroup>
    <TresGroup ref="body">
      <TresMesh :geometry="geo.base" :material="mat.wood" :position="[0, H / 2, 0]" cast-shadow receive-shadow />
      <TresMesh :geometry="geo.trim" :material="mat.woodDark" :position="[0, 0.06, 0]" cast-shadow />
      <TresMesh :geometry="geo.groove" :material="mat.woodDark" :position="[0, 0.36, D / 2 + 0.004]" />
      <TresMesh :geometry="geo.groove" :material="mat.woodDark" :position="[0, 0.6, D / 2 + 0.004]" />
      <TresMesh :geometry="geo.band" :material="mat.gold" :position="[-0.48, H / 2, 0]" cast-shadow />
      <TresMesh :geometry="geo.band" :material="mat.gold" :position="[0.48, H / 2, 0]" cast-shadow />

      <!-- Glowing treasure, hidden under the lid until it opens -->
      <TresMesh :geometry="geo.treasure" :material="mat.treasure" :position="[0, H - 0.02, 0]" :scale="[1.05, 0.28, 0.66]" />
      <TresPointLight ref="glowLight" color="#FFC75A" :intensity="0" :distance="4" :decay="1.6" :position="[0, H + 0.35, 0.1]" />

      <!-- Lid pivots on the back top edge -->
      <TresGroup ref="lid" :position="[0, H, -D / 2]">
        <TresMesh :geometry="geo.lid" :material="mat.wood" :position="[0, 0, D / 2]" :rotation="[0, 0, Math.PI / 2]" cast-shadow />
        <TresMesh :geometry="geo.lid" :material="mat.lidInside" :position="[0, 0, D / 2]" :rotation="[0, 0, Math.PI / 2]" :scale="[0.96, 0.985, 0.96]" />
        <TresMesh :geometry="geo.lidBand" :material="mat.gold" :position="[-0.48, 0, D / 2]" :rotation="[0, 0, Math.PI / 2]" cast-shadow />
        <TresMesh :geometry="geo.lidBand" :material="mat.gold" :position="[0.48, 0, D / 2]" :rotation="[0, 0, Math.PI / 2]" cast-shadow />
        <TresMesh :geometry="geo.lock" :material="mat.gold" :position="[0, -0.04, D + 0.035]" cast-shadow />
        <TresMesh :geometry="geo.keyhole" :material="mat.keyhole" :position="[0, -0.06, D + 0.08]" :rotation="[Math.PI / 2, 0, 0]" />
      </TresGroup>
    </TresGroup>

    <TresMesh
      v-for="i in COIN_COUNT"
      :key="`coin-${i}`"
      :ref="(el) => (coinMeshes[i - 1] = el)"
      :geometry="geo.coin"
      :material="mat.coin"
      :visible="false"
      cast-shadow
    />
    <TresMesh
      v-for="i in SPARKLE_COUNT"
      :key="`sparkle-${i}`"
      :ref="(el) => (sparkleMeshes[i - 1] = el)"
      :geometry="geo.sparkle"
      :material="mat.sparkle"
      :visible="false"
    />
  </TresGroup>
</template>