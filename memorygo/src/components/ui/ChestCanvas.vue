<!--------------------------------------------------------------------------------------------------------
PSEUDOCODE
filename:   components/ui/ChestCanvas.vue
purpose:    - a small live 3D treasure chest (the same model as the chest pins on the map, lib/mapPins3d.js)
            - bobs gently and peeks its lid open every few seconds, showing the gold inside
            - "reduce motion" on → it stands still with the lid shut
            - decorative: hidden from screen readers (the text next to it says what it is)
usage:      <ChestCanvas class="set-chest" />   (size it with CSS width / height)
---------------------------------------------------------------------------------------------------------->

<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue'
import { Clock, DirectionalLight, HemisphereLight, PerspectiveCamera, Scene, WebGLRenderer } from 'three'
import { buildChest } from '@/lib/mapPins3d'

const host = ref(null)
let renderer, scene, camera, frameId, resizeObserver

onMounted(() => {
    const el = host.value
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    renderer = new WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    el.appendChild(renderer.domElement)

    // same lights as the map pins, so it looks like the chests on the map
    scene = new Scene()
    scene.add(new HemisphereLight('#FFF6E2', '#B89A6E', 1.5))
    const sun = new DirectionalLight('#FFE9C6', 2.3)
    sun.position.set(-3, 7, 2.5)
    scene.add(sun)

    const { model, lid } = buildChest()
    model.position.y = -0.6                  // centre the chest (about 1.3 tall) in the box
    model.rotation.y = -0.45                 // turned a little, so it doesn't look flat
    scene.add(model)

    camera = new PerspectiveCamera(30, 1, 0.1, 50)
    camera.position.set(0, 1.3, 3.7)
    camera.lookAt(0, 0, 0)

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

    // bob up and down; every 4 seconds the lid lifts for a moment
    const clock = new Clock()
    const animate = () => {
        const t = clock.getElapsedTime()
        model.position.y = -0.6 + Math.sin(t * 1.8) * 0.05
        const peek = t % 4                                       // 0..4 s
        lid.rotation.x = peek > 3 ? -Math.sin(((peek - 3) / 1) * Math.PI) * 0.7 : 0
        if (el.clientWidth) renderer.render(scene, camera)       // skip while hidden (e.g. phone-only card on laptop)
        frameId = requestAnimationFrame(animate)
    }
    animate()
})

onBeforeUnmount(() => {
    cancelAnimationFrame(frameId)
    resizeObserver?.disconnect()
    renderer?.dispose()
    renderer?.domElement.remove()
})
</script>

<template>
    <div ref="host" class="chest-canvas" aria-hidden="true"></div>
</template>

<style scoped>
.chest-canvas :deep(canvas) {
    display: block;
    width: 100%;
    height: 100%;
}
</style>
