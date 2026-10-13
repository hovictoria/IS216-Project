<script setup>
// The WebGL canvas for the splash screen: camera, renderer settings, map and chest.
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { TresCanvas } from '@tresjs/core'
import { ACESFilmicToneMapping, PCFShadowMap, SRGBColorSpace } from 'three'
import SplashMap from './SplashMap.vue'
import TreasureChest from './TreasureChest.vue'

defineProps({
  reducedMotion: { type: Boolean, default: false },
})

const emit = defineEmits(['error'])

// ---------- Keep the whole map in view at any screen shape ----------
// The camera was framed for a phone-shaped area (about 0.78 wide : 1 tall).
// Narrower areas (e.g. an iPad held upright) move the camera back so the board still fits;
// wider areas move it in a little so the board doesn't look small.
const TARGET = [0, 1.15, 0]
const OFFSET = [10.8, 7.85, 10.8] // camera position relative to TARGET
const REFERENCE_ASPECT = 0.78

const wrap = ref()
const aspect = ref(REFERENCE_ASPECT)
let observer

onMounted(() => {
  observer = new ResizeObserver(([entry]) => {
    const { width, height } = entry.contentRect
    if (width > 0 && height > 0) aspect.value = width / height
  })
  observer.observe(wrap.value)
})

onUnmounted(() => observer?.disconnect())

const cameraPosition = computed(() => {
  const scale = Math.max(0.88, REFERENCE_ASPECT / aspect.value)
  return OFFSET.map((v, i) => TARGET[i] + v * scale)
})
</script>

<template>
  <div ref="wrap" class="scene-wrap">
    <TresCanvas
      alpha
      :clear-alpha="0"
      shadows
      :shadow-map-type="PCFShadowMap"
      :tone-mapping="ACESFilmicToneMapping"
      :tone-mapping-exposure="1.05"
      :output-color-space="SRGBColorSpace"
      :dpr="[1, 2]"
      power-preference="low-power"
      @error="emit('error', $event)"
    >
      <TresPerspectiveCamera :position="cameraPosition" :fov="30" :look-at="TARGET" />

      <SplashMap :reduced-motion="reducedMotion">
        <TresGroup :position="[0.15, 0, 0.2]" :rotation="[0, 0.62, 0]" :scale="[0.72, 0.72, 0.72]">
          <TreasureChest :reduced-motion="reducedMotion" />
        </TresGroup>
      </SplashMap>
    </TresCanvas>
  </div>
</template>

<style scoped>
.scene-wrap {
  position: absolute;
  inset: 0;
}
</style>