<!--------------------------------------------------------------------------------------------------------
PSEUDOCODE
filename:   components/spirits/SpiritCanvas.vue
purpose:    - one live, animated 3D Spirit (bobs, sways, blinks) for the Spirit detail page and the
              "You found a Spirit!" reveal (from the design handoff's SpiritCanvas.vue)
            - the model comes from three/spiritModel.js, so it matches the Spirit's 2D drawing
            - only ever one on screen at a time: the collection grid uses the SVG drawings instead
            - "reduce motion" on → the Spirit stands still
props:      spiritId ('kopi', 'chilli-crab', ...), color, label (read out by screen readers)
---------------------------------------------------------------------------------------------------------->

<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue'
import * as THREE from 'three'
import { buildSpirit, addSpiritLights, addSpiritShadow } from '@/three/spiritModel'
import { lessMotion } from '@/lib/useSettings'

const props = defineProps({
    spiritId: { type: String, required: true },
    color: { type: String, default: '#B07A45' },
    label: { type: String, default: 'Your Spirit' },
})

const host = ref(null)
let renderer, scene, camera, model, removeShadow, frameId, resizeObserver

onMounted(() => {
    const el = host.value
    const reduceMotion = lessMotion()   // the Me page's switch, or the device's setting

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    el.appendChild(renderer.domElement)

    scene = new THREE.Scene()
    camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50)
    camera.position.set(0, 0.5, 6.2)
    camera.lookAt(0, 0.25, 0)
    addSpiritLights(scene)
    removeShadow = addSpiritShadow(scene)

    model = buildSpirit({ id: props.spiritId, color: props.color })
    scene.add(model.spirit)

    // keep the drawing sharp at whatever size the box is
    const resize = () => {
        const { clientWidth: w, clientHeight: h } = el
        if (!w || !h) return
        renderer.setSize(w, h, false)
        camera.aspect = w / h
        camera.updateProjectionMatrix()
        renderer.render(scene, camera)
    }
    resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(el)
    resize()

    if (reduceMotion) return

    // gentle bob up and down, sway left and right, and a blink every 4 seconds
    const clock = new THREE.Clock()
    const animate = () => {
        const t = clock.getElapsedTime()
        model.spirit.position.y = Math.sin(t * 1.6) * 0.08
        model.spirit.rotation.y = Math.sin(t * 0.7) * 0.35
        model.blink(t % 4 < 0.12 ? 0.15 : 1)
        renderer.render(scene, camera)
        frameId = requestAnimationFrame(animate)
    }
    animate()
})

onBeforeUnmount(() => {
    cancelAnimationFrame(frameId)
    resizeObserver?.disconnect()
    model?.dispose()
    removeShadow?.()
    renderer?.dispose()
    renderer?.domElement.remove()
})
</script>

<template>
    <div ref="host" class="spirit-canvas" role="img" :aria-label="label"></div>
</template>

<style scoped>
.spirit-canvas {
    width: 100%;
    height: 100%;
}

.spirit-canvas :deep(canvas) {
    display: block;
    width: 100%;
    height: 100%;
}
</style>
