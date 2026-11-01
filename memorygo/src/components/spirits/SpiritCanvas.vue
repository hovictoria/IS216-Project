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
import { playEmote as runEmote, EMOTE_FOR, EMOTE_SECONDS, EMOTE_LENGTH } from '@/three/spiritEmotes'
import { lessMotion } from '@/lib/useSettings'

const props = defineProps({
    spiritId: { type: String, required: true },
    color: { type: String, default: '#B07A45' },
    label: { type: String, default: 'Your Spirit' },
})

const host = ref(null)
let renderer, scene, camera, model, removeShadow, frameId, resizeObserver

// when the current emote started, on the same clock as the idle animation (null = just standing there)
let emoteStart = null
let clock = null

// the page calls this when the Spirit is tapped, and uses the answer to decide whether to put the
// Spirit's shout on screen. Returns false when nothing started.
function playEmote() {
    if (!clock || emoteStart !== null) return false   // no clock = reduced motion; already performing
    emoteStart = clock.getElapsedTime()
    return true
}

defineExpose({ playEmote })

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

    const emote = EMOTE_FOR[props.spiritId]
    const emoteSeconds = EMOTE_LENGTH[emote] ?? EMOTE_SECONDS
    clock = new THREE.Clock()

    const animate = () => {
        const t = clock.getElapsedTime()

        // Start every frame from the resting pose. An emote writes on top of this, so whatever it
        // changed is wiped next frame instead of building up and leaving the Spirit lopsided.
        model.spirit.position.set(0, Math.sin(t * 1.6) * 0.08, 0)   // gentle bob
        model.spirit.rotation.set(0, Math.sin(t * 0.7) * 0.35, 0)   // gentle sway
        model.spirit.scale.set(1, 1, 1)
        for (const limb of model.limbs) limb.rotation.z = 0
        for (const arm of model.arms) {
            arm.shoulder.rotation.set(0, arm.rest[1], arm.rest[0])
            arm.elbow.rotation.set(0, 0, arm.rest[2])
            arm.setHand('fist')
        }
        model.parts.durian?.reset()                                 // spikes, crown and jewel as drawn

        if (emoteStart !== null) {
            const p = (t - emoteStart) / emoteSeconds
            if (p >= 1) emoteStart = null                           // done: back to just bobbing
            else runEmote(model, emote, p)
        }

        model.blink(t % 4 < 0.12 ? 0.15 : 1)                        // a blink every 4 seconds

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
