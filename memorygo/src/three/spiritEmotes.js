// ----------------------------------------------------------------------------------------------------------
// PSEUDOCODE
// filename:   three/spiritEmotes.js
// purpose:    - the little performance a Spirit does when you tap it on its detail page
//             - these run in three.js, on the 3D model, NOT in CSS. CSS can only move the whole <canvas>
//               as one flat picture, which reads as the drawing sliding about rather than the Spirit acting
//             - most Spirits are an armless body, so their emotes are carried by squash and stretch
//               (the body flattening as it lands, stretching as it rises). That, not rotation, is what
//               makes motion look alive
//             - only Pandan (leaf arms) and Chilli Crab (claw arms) have limbs that hold nothing, so they
//               are the only two that can really raise an arm. The others hold a cup/slice/tray, and moving
//               those hands would tear them off what they are holding
// usage:      playEmote(model, 'jump', p)   // p = how far through, 0 → 1
//             EMOTE_FOR['kopi']             // which emote that Spirit does
// ----------------------------------------------------------------------------------------------------------

const TAU = Math.PI * 2

// ---------- Gesture poses ----------
// Each entry is [shoulder.z, shoulder.y, elbow.z] for ONE arm, found by solving for the joint angles
// that put the hand where the gesture needs it, preferring the pose closest to resting so the arm takes
// the natural route instead of swinging round the back.
// Per Spirit, because they no longer share one arm: different limb lengths need different angles.
// Each was also checked along the whole blend from resting into the pose, not just at the pose itself —
// a hand can sweep straight through the body on the way to a position that is perfectly clear.
const ARM_POSES = {
    // dabUp keeps elbow.z at 0 so the raised arm is dead straight — the spec raises it diagonally,
    // and any bend there reads as a broken arm rather than a dab
    boba: { dabUp: [-2.60, 0, 0], dabAcross: [-2.30, 0.90, 0.90] },
    ondeh: { sixSeven: [-1.35, 2.05, 0.55] },
    'kueh-lapis': { flossArm: [-1.05, 1.30, 0.40] },
    chendol: { onHip: [-1.05, 0.25, 1.90], pointUp: [-2.70, 2.20, -0.50], pointDown: [-1.20, 1.00, 1.30] },
}

const SIX_SEVEN_CLAW = [0.76, 1.88, 1.00]   // the same gesture solved for Chilli Crab's claw limb

// the same angles on the opposite arm, which mirrors the pose
const mirror = ([sz, sy, ez]) => [-sz, -sy, -ez]

// eases into a pose, holds it long enough to read, then releases
function hold(p, inAt = 0.14, outAt = 0.84) {
    if (p < inAt) return p / inAt
    if (p > outAt) return Math.max(0, 1 - (p - outAt) / (1 - outAt))
    return 1
}

// The body of the 6-7 gesture. Both limb types do the same thing, just from different angles:
// a hand and a claw are not the same length, so each has its own solved pose.
// `beats` is how many times the hands swap over in one run — Chilli Crab's claws go quicker than
// Ondeh's hands, which is why the rate is a parameter and not baked in
function weighUpHands(model, p, pose, hand, beats = 3) {
    const [left, right] = model.arms
    const { spirit } = model
    const k = hold(p, 0.16, 0.86)
    const beat = Math.sin(p * beats * TAU)
    spirit.position.y += Math.abs(beat) * 0.06 * k        // the small bounce
    if (!left || !pose) return
    // the same extra turn on both limbs lifts one side and drops the other
    const tip = beat * 0.38
    const [lz, ly, le] = pose
    const [rz, ry, re] = mirror(pose)
    setArm(left, [lz + tip, ly, le], k, hand)
    setArm(right, [rz + tip, ry, re], k, hand)
}

// move one arm `k` of the way from its resting pose into `pose`.
// Resting is a pose like any other, which is what lets an arm be long enough to reach across the body
// for a gesture and still tuck in close when it is doing nothing.
function setArm(arm, [sz, sy, ez], k, hand) {
    const [rz, ry, re] = arm.rest
    arm.shoulder.rotation.set(0, ry + (sy - ry) * k, rz + (sz - rz) * k)
    arm.elbow.rotation.set(0, 0, re + (ez - re) * k)
    arm.setHand(hand)
}


// Squash and stretch while keeping the Spirit's bulk believable: taller means thinner, flatter means wider.
// s > 1 stretches up, s < 1 squashes down.
function squash(spirit, s) {
    const sideways = 1 / Math.sqrt(s)
    spirit.scale.set(sideways, s, sideways)
}

const EMOTES = {
    // two hops: crouch, launch (stretched), land (flattened), settle
    jump(model, p) {
        const q = (p * 2) % 1                       // 0 → 1 within one hop
        const { spirit } = model
        if (q < 0.18) {
            squash(spirit, 1 - 0.2 * Math.sin((q / 0.18) * Math.PI))          // crouch to gather
        } else if (q < 0.62) {
            const a = (q - 0.18) / 0.44
            spirit.position.y += Math.sin(a * Math.PI) * 0.8                  // the arc
            squash(spirit, 1 + 0.18 * Math.sin(a * Math.PI))                  // stretched in the air
        } else if (q < 0.82) {
            squash(spirit, 1 - 0.24 * Math.sin(((q - 0.62) / 0.2) * Math.PI)) // splat on landing
        }
    },

    // bounces from side to side on a beat, flattening a little each time it lands
    dance(model, p) {
        const a = p * 4 * TAU
        const { spirit } = model
        spirit.position.x = Math.sin(a) * 0.2
        spirit.position.y += Math.abs(Math.sin(a)) * 0.22
        spirit.rotation.z = Math.sin(a) * 0.24
        squash(spirit, 1 - 0.1 * Math.abs(Math.cos(a)))
    },

    // tips towards you and back, agreeing
    nod(model, p) {
        model.spirit.rotation.x = (1 - Math.cos(p * 3 * TAU)) * 0.22
    },

    // two full turns, hopping as it goes
    spin(model, p) {
        const { spirit } = model
        spirit.rotation.y += p * 2 * TAU
        spirit.position.y += Math.abs(Math.sin(p * TAU)) * 0.5
        squash(spirit, 1 + 0.1 * Math.abs(Math.sin(p * TAU)))
    },

    // leans back and shakes, keeping its normal face
    laugh(model, p) {
        const shake = Math.sin(p * TAU * 9)
        const { spirit } = model
        spirit.rotation.z = -0.12 + shake * 0.07
        spirit.position.y += Math.abs(shake) * 0.08
        squash(spirit, 1 + shake * 0.06)
    },

    // a quick little side-to-side shuffle
    shimmy(model, p) {
        const a = p * TAU * 5
        const { spirit } = model
        spirit.position.x = Math.sin(a) * 0.24
        spirit.rotation.z = -Math.sin(a) * 0.14
        squash(spirit, 1 - 0.06 * Math.abs(Math.sin(a * 2)))
    },

    // raises its left arm and swings it: a real wave, because the arm moves and the body does not.
    // Kept inside -1.25: past that the hand sinks into the round body and the arm vanishes
    wave(model, p) {
        const [left] = model.limbs
        const { spirit } = model
        spirit.rotation.z = 0.07                                 // leans away from the raised arm
        spirit.position.y += Math.sin(p * TAU * 2) * 0.05
        if (!left) return
        const raise = Math.min(1, p / 0.18)                      // lifts the arm, then swings it
        left.rotation.z = (-0.9 - Math.sin(p * 4 * TAU) * 0.35) * raise
    },

    // ---------- Gestures, for the Spirits with jointed arms ----------

    // one arm thrown up and out, the other folded across the face, head tipped into the bent elbow
    dab(model, p) {
        const [left, right] = model.arms
        const { spirit } = model
        const k = hold(p, 0.12, 0.8)
        spirit.rotation.x = 0.26 * k
        spirit.rotation.z = -0.14 * k
        squash(spirit, 1 - 0.05 * k)
        const pose = ARM_POSES[model.id]
        if (!left || !pose) return
        setArm(left, pose.dabUp, k, 'fist')
        setArm(right, pose.dabAcross, k, 'fist')      // already solved for the right arm
    },

    // ---------- Durian, the legendary one ----------
    // A staged reveal rather than one motion: it settles, its spikes bristle out and its crown lifts
    // clear of its head, it turns once while the jewel flares and a ring bursts out, then it settles back.
    // It barely moves upwards on purpose. The canvas tops out at y = 1.896 and the crown already sits at
    // 1.53 when standing still, so there is only 0.28 of headroom — and `squash` scales the crown along
    // with the body, which eats that too. So the body SINKS slightly while the crown holds its height:
    // the crown still visibly leaves the head, and nothing is pushed out of frame.
    legendary(model, p) {
        const { spirit } = model
        const d = model.parts.durian
        const ease = (t) => t * t * (3 - 2 * t)              // slow in, slow out
        const SINK = -0.05, CROWN_UP = 0.12, GROW = 0.55, STRETCH = 0.03

        // --- the body ---
        let lift = 0, stretch = 1
        if (p < 0.12) {                                       // gather
            stretch = 1 - 0.14 * Math.sin((p / 0.12) * Math.PI)
        } else if (p < 0.34) {                                // settle into the pose
            const a = ease((p - 0.12) / 0.22)
            lift = a * SINK
            stretch = 1 + STRETCH * a
        } else if (p < 0.74) {                                // hold, turning
            lift = SINK
            stretch = 1 + STRETCH + Math.sin((p - 0.34) / 0.4 * TAU) * 0.02   // breathing
            spirit.rotation.y += ease((p - 0.34) / 0.4) * TAU                 // one full majestic turn
        } else if (p < 0.88) {                                // rise back to normal
            const a = ease((p - 0.74) / 0.14)
            lift = SINK * (1 - a)
            stretch = 1 + STRETCH - STRETCH * a
        } else {                                              // settle
            stretch = 1 - 0.2 * Math.sin(((p - 0.88) / 0.12) * Math.PI)
        }
        spirit.position.y += lift
        squash(spirit, stretch)
        if (!d) return

        // --- the spikes bristle out, longest while it holds ---
        // They grow rather than slide outwards: sliding a spike along its own normal opens a gap
        // between the body and the spike's base, and 64 spikes visibly float off the fruit.
        // The cone's base sits at its own origin, so scaling its length pushes only the tip out.
        const bristle = p < 0.12 ? -0.1 * Math.sin((p / 0.12) * Math.PI)   // dips and returns, no snap
            : p < 0.34 ? ease((p - 0.12) / 0.22)
            : p < 0.74 ? 1
            : p < 0.88 ? 1 - ease((p - 0.74) / 0.14)
            : 0
        for (const s of d.spikes) {
            s.mesh.scale.set(1 + bristle * 0.1, 1 + bristle * GROW, 1 + bristle * 0.1)
            s.mesh.position.copy(s.base).addScaledVector(s.dir, bristle * 0.02)
        }

        // --- the crown lifts clear of the head, spins, and comes back down ---
        const crownUp = p < 0.12 ? 0
            : p < 0.34 ? ease((p - 0.12) / 0.22) * CROWN_UP
            : p < 0.74 ? CROWN_UP
            : p < 0.9 ? CROWN_UP * (1 - ease((p - 0.74) / 0.16))
            : 0
        d.regalia.position.copy(d.crownBase)
        d.regalia.position.y += crownUp
        d.regalia.rotation.y = crownUp > 0.001 ? p * 5 * TAU : 0      // spins only while it is up

        // --- the jewel flares while it holds, and the spikes catch the light with it ---
        const flare = p > 0.3 && p < 0.78 ? Math.sin((p - 0.3) / 0.48 * Math.PI) : 0
        d.jewel.material.emissiveIntensity = flare * 2.4
        d.jewel.scale.setScalar(1 + flare * 0.5)
        d.spikeMaterial.emissiveIntensity = flare * 0.5

        // --- a ring bursts outwards from behind the body, sideways where there is room ---
        if (p > 0.3 && p < 0.72) {
            const a = (p - 0.3) / 0.42
            d.ring.visible = true
            d.ring.scale.setScalar(0.6 + a * 2.2)
            d.ringMaterial.opacity = (1 - a) * 0.75
        } else {
            d.ring.visible = false
            d.ringMaterial.opacity = 0
        }
    },

    // 6-7: both forearms bend up with the hands held out in front of the waist, then one hand lifts
    // as the other drops, three times, bouncing a little, like weighing two options
    sixSeven(model, p) {
        weighUpHands(model, p, ARM_POSES[model.id]?.sixSeven, 'open', EMOTE_BEATS.sixSeven)
    },

    // the same gesture, aimed at Chilli Crab's claws instead of hands
    sixSevenClaw(model, p) {
        weighUpHands(model, p, SIX_SEVEN_CLAW, 'open', EMOTE_BEATS.sixSevenClaw)   // claws snap quicker
    },

    // the floss: both arms swing to one side, one passing in front of the body and the other behind,
    // hips going the opposite way
    floss(model, p) {
        const [left, right] = model.arms
        const { spirit } = model
        const k = hold(p, 0.12, 0.88)
        const swing = Math.sin(p * 3 * TAU)
        spirit.position.x = -swing * 0.12 * k          // hips opposite to the arms
        spirit.rotation.z = swing * 0.1 * k
        const pose = ARM_POSES[model.id]
        if (!left || !pose) return
        // one shoulder.y value on mirrored arms sends one arm forward and the other back
        const [lz, ly, le] = pose.flossArm
        setArm(left, [lz, ly * swing, le], k, 'fist')
        setArm(right, [-lz, ly * swing, -le], k, 'fist')
    },

    // disco point: one hand on the hip, the other pointing, sweeping between up and down three times
    discoPoint(model, p) {
        const [left, right] = model.arms
        const { spirit } = model
        const k = hold(p, 0.14, 0.88)
        const sway = Math.sin(p * 3 * TAU)
        spirit.position.x = sway * 0.08 * k
        spirit.rotation.z = -sway * 0.07 * k
        const pose = ARM_POSES[model.id]
        if (!left || !pose) return
        setArm(left, pose.onHip, k, 'fist')
        const down = (Math.sin(p * 3 * TAU - Math.PI / 2) + 1) / 2      // 0 up, 1 down, three times
        setArm(right, pose.pointUp.map((v, i) => v + (pose.pointDown[i] - v) * down), k, 'point')
    },

}

// which emote each Spirit does. The two with free arms get the arm emotes; the rest are carried
// by the body, since they have no arms to raise
export const EMOTE_FOR = {
    // the five given jointed arms in spiritModel.js each do one gesture
    boba: 'dab',
    ondeh: 'sixSeven',
    'kueh-lapis': 'floss',
    chendol: 'discoPoint',

    // Chilli Crab's arm and claw are jointed too, so it does the real 6-7
    'chilli-crab': 'sixSevenClaw',
    // Pandan's leaf arms are one tube with no elbow, so it waves instead
    pandan: 'wave',

    kacang: 'jump',
    prata: 'jump',

    'putu-mayam': 'dance',
    rojak: 'dance',
    milo: 'dance',

    durian: 'legendary',   // the legendary one gets its own reveal
    mooncake: 'nod',
    murtabak: 'nod',

    vadai: 'spin',
    'ice-kachang': 'spin',

    // these three hold a cup, a slice and a tray, so they laugh with their whole body
    kopi: 'laugh',
    'bak-kwa': 'laugh',
    'teh-tarik': 'laugh',

    kaya: 'shimmy',
    otah: 'shimmy',
    potong: 'shimmy',
    'tau-huay': 'shimmy',
    'chwee-kueh': 'shimmy',
}


// how long one performance lasts, in seconds
export const EMOTE_SECONDS = 3.2

// emotes that need longer than the usual run
export const EMOTE_LENGTH = { legendary: 5.2 }

// how many times the hands swap over in one run of the 6-7. Shared with the page, so the "67" it
// throws up on screen bobs in time with the hands instead of drifting against them
export const EMOTE_BEATS = { sixSeven: 3, sixSevenClaw: 5 }

// what a Spirit shouts while it performs, drawn over the canvas
export const SHOUT_FOR = { sixSeven: '67', sixSevenClaw: '67' }

// run `name`'s emote on the model at progress p (0 → 1). Unknown names do nothing.
export function playEmote(model, name, p) {
    EMOTES[name]?.(model, p)
}
