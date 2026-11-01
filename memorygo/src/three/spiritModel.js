// ----------------------------------------------------------------------------------------------------------
// PSEUDOCODE
// filename:   three/spiritModel.js
// purpose:    - builds a MemoryGo Spirit in three.js, to match its 2D drawing (assets/spirits/<id>.svg)
//             - based on the design handoff's spiritModel.js (MemoryGo-spirits-handoff 2), reworked for the final
//               designs where the food is part of the character (Kopi holds its cup, Chilli Crab has claws, ...)
//             - every drawing has the same body: a circle at (50, 58) with radius 30. So drawing coordinates turn
//               into 3D with x → (x − 50) / 30 and y → (58 − y) / 30, and each part sits exactly where it was drawn
//             - three kinds of parts:
//                 1. PAINTED on the body (Kaya's kaya layer, Kueh Lapis's stripes, Boba's pearls, ...): taken straight
//                    from the drawing (the part clipped to the body circle) and painted onto the 3D body as a texture
//                 2. the FACE: eyes, cheeks and smile, at the height the drawing has them (read from the drawing)
//                 3. parts that STICK OUT (leaves, cups, bowls, claws, crowns, ...): built per Spirit in DECOR below.
//                    Flat ones are traced straight from the SVG paths and given some thickness
// usage:      const model = buildSpirit({ id: 'kopi', color: '#B07A45' })
//             scene.add(model.spirit); await model.ready (painted parts load a moment later)
//             model.blink(0.15); model.dispose()
//             addSpiritLights(scene); addSpiritShadow(scene)
// ----------------------------------------------------------------------------------------------------------

import * as THREE from 'three'

// the 24 drawings as text, so their painted parts and eye heights can be read
const DRAWINGS = import.meta.glob('../assets/spirits/*.svg', { query: '?raw', import: 'default', eager: true })
const drawingOf = (id) => DRAWINGS[`../assets/spirits/${id}.svg`] ?? ''

// ---------- Drawing coordinates → 3D ----------
const toX = (x) => (x - 50) / 30
const toY = (y) => (58 - y) / 30
const BODY_SQUASH = 0.94                     // the body is a sphere squashed to 94% height

// a point on the front of the body at drawing (x, y): where it is, and which way the surface faces
function onBody(x, y) {
    const px = toX(x)
    const py = toY(y)
    const pz = Math.sqrt(Math.max(0, 1 - px * px - (py / BODY_SQUASH) ** 2))
    const normal = new THREE.Vector3(px, py / BODY_SQUASH ** 2, pz).normalize()
    return { position: new THREE.Vector3(px, py, pz), normal }
}

// a flat shape traced from an SVG path (absolute M / L / C / Q / Z only), in 3D units.
// `transform` copies the drawing's translate(tx ty) rotate(deg) on that path
function svgShape(d, transform = null) {
    const shape = new THREE.Shape()
    const tokens = d.match(/[MLCQZ]|-?\d*\.?\d+/gi)
    let i = 0
    const next = () => Number(tokens[i++])
    const place = (x, y) => {
        if (!transform) return [toX(x), toY(y)]
        const a = (transform.rotate * Math.PI) / 180
        return [
            toX(transform.x + x * Math.cos(a) - y * Math.sin(a)),
            toY(transform.y + x * Math.sin(a) + y * Math.cos(a)),
        ]
    }
    const point = () => place(next(), next())
    while (i < tokens.length) {
        const command = tokens[i++].toUpperCase()
        if (command === 'M') shape.moveTo(...point())
        else if (command === 'L') shape.lineTo(...point())
        else if (command === 'C') shape.bezierCurveTo(...point(), ...point(), ...point())
        else if (command === 'Q') shape.quadraticCurveTo(...point(), ...point())
        else if (command === 'Z') shape.closePath()
    }
    return shape
}

// the SVG shape turned into a rounded solid, centred on depth z = 0
function extrude(d, depth = 0.2, transform = null) {
    const geometry = new THREE.ExtrudeGeometry(svgShape(d, transform), {
        depth,
        bevelEnabled: true,
        bevelThickness: 0.04,
        bevelSize: 0.03,
        bevelSegments: 3,
        curveSegments: 20,
    })
    geometry.translate(0, 0, -depth / 2)
    return geometry
}

// a smooth tube through drawing points, e.g. arms, stalks, steam
function tube(points, radius, z = 0) {
    const curve = new THREE.CatmullRomCurve3(points.map(([x, y]) => new THREE.Vector3(toX(x), toY(y), z)))
    return new THREE.TubeGeometry(curve, 40, radius, 12, false)
}

// a ring lying flat (like a waistband) at drawing height y
function flatRing(radius, thickness, y) {
    const geometry = new THREE.TorusGeometry(radius, thickness, 16, 72)
    geometry.rotateX(Math.PI / 2)
    geometry.translate(0, toY(y), 0)
    return geometry
}

// A darker, slightly richer version of a colour, for limbs. Arms in the Spirit's own body colour
// disappear into the body, since the body is that colour too — darkening them is what separates the
// two, the same way each drawing paints its limbs in its darkest tone.
// `amount` comes off the lightness outright rather than scaling it: scaling leaves an already-dark
// Spirit (Ondeh) with limbs barely a shade off its body.
function limbColour(color, amount = 0.14) {
    const c = new THREE.Color(color)
    const hsl = { h: 0, s: 0, l: 0 }
    c.getHSL(hsl)
    return c.setHSL(hsl.h, Math.min(1, hsl.s * 1.1), Math.max(0.07, hsl.l - amount))
}

const clay = (color, roughness = 0.6, extra = {}) =>
    new THREE.MeshStandardMaterial({ color, roughness, metalness: 0, ...extra })

// ---------- Painting part of a drawing onto a 3D surface ----------
// Front-facing surfaces get texture coordinates as if the drawing were projected straight onto them from
// the front; surfaces facing away get the plain background colour (the drawing's top-left corner)
function projectFromFront(geometry) {
    const position = geometry.attributes.position
    const normal = geometry.attributes.normal
    const uv = new Float32Array(position.count * 2)
    for (let i = 0; i < position.count; i++) {
        const facingAway = normal.getZ(i) < -0.05
        const x = position.getX(i) * 30 + 50
        const y = 58 - position.getY(i) * 30
        uv[i * 2] = facingAway ? 0.002 : (x + 6) / 112
        uv[i * 2 + 1] = facingAway ? 0.998 : 1 - (y + 6) / 112
    }
    geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
    return geometry
}

// a material showing `markup` (pieces of SVG in the drawing's coordinates) on a `background` colour.
// The picture loads a moment later; until then the surface is plain `background`
function paintedMaterial(markup, background, roughness, loading) {
    const material = clay(background, roughness)
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="-6 -6 112 112">`
        + `<rect x="-6" y="-6" width="112" height="112" fill="${background}"/>${markup}</svg>`
    loading.push(new Promise((resolve) => {
        new THREE.TextureLoader().load(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`, (texture) => {
            texture.colorSpace = THREE.SRGBColorSpace
            texture.anisotropy = 4
            material.map = texture
            material.color.set('#FFFFFF')        // show the picture's own colours
            material.needsUpdate = true
            resolve()
        }, undefined, resolve)                   // a failed picture just leaves the plain colour
    }))
    return material
}

// what the drawing paints onto its body: everything clipped to the body circle, minus the face
// (the face is built separately so the eyes can blink)
function bodyPaintOf(drawing) {
    const clipped = drawing.match(/<g clip-path="url\(#csp\d+\)">([\s\S]*?)<\/g>/)
    if (!clipped) return ''
    return clipped[1]
        .replace(/<ellipse[^>]*rx="2\.7"[^>]*>(<\/ellipse>)?/g, '')
        .replace(/<ellipse[^>]*#E9786E[^>]*>(<\/ellipse>)?/g, '')
        .replace(/<path d="M46 [^"]*"[^>]*stroke="#161412"[^>]*>(<\/path>)?/g, '')
        .trim()
}

// how high the eyes sit in the drawing (most at 58; Spirits holding or wearing something have them higher/lower)
function eyeHeightOf(drawing) {
    const eye = drawing.match(/<ellipse cx="41" cy="([\d.]+)" rx="2\.7"/)
    return eye ? Number(eye[1]) : 58
}

// ---------- Jointed arms ----------
// shoulder → elbow → wrist as nested groups: turning the shoulder swings the whole arm, turning the
// elbow bends only the forearm.
// Each arm is built hanging straight down and is then posed entirely by rotation, so the resting pose is
// just another pose — which lets the arm be long enough to reach across the body for a gesture while
// still tucking in close when it is doing nothing.
// Segments are tapered cylinders with a ball at the elbow, so a limb reads as a limb and not as pipework.
// Every Spirit gets its own proportions; one arm shared by all of them looked like a kit of parts.
const ARM_PROFILES = {
    //             upper  fore  radii (shoulder, elbow, wrist)  hand  z     resting [sh.z, sh.y, el.z]
    boba:         { upper: 0.55, fore: 0.50, r: [2.5, 2.1, 1.8], hand: 3.6, z: 0.40, limbShade: 0.15, rest: [-1.05, 0.15, 1.45] },
    'kueh-lapis': { upper: 0.42, fore: 0.36, r: [3.7, 3.3, 2.9], hand: 4.9, z: 0.30, limbShade: 0.15, rest: [-1.25, 0.10, 1.20] },
    ondeh:        { upper: 0.48, fore: 0.42, r: [2.3, 2.0, 1.7], hand: 3.3, z: 0.30, limbShade: 0.14, rest: [-1.00, 0.20, 1.50] },
    chendol:      { upper: 0.50, fore: 0.44, r: [3.1, 2.4, 1.7], hand: 4.0, z: 0.35, limbShade: 0.16, rest: [-1.15, 0.12, 1.30] },
}
const SHOULDER = { left: [30, 60], right: [70, 60] }

function buildArm({ add, color }, side, profile) {
    const skin = clay(limbColour(color, profile.limbShade), 0.62)
    const { upper, fore, r, hand, z } = profile
    const [sx, sy] = SHOULDER[side]

    const shoulder = new THREE.Group()
    shoulder.position.set(toX(sx), toY(sy), z)        // a little forward of the body's middle

    // upper arm, hanging straight down and tapering towards the elbow
    const upperMesh = add(new THREE.CylinderGeometry(r[0] / 30, r[1] / 30, upper, 16), skin, shoulder)
    upperMesh.position.y = -upper / 2

    const elbow = new THREE.Group()
    elbow.position.y = -upper
    shoulder.add(elbow)

    add(new THREE.SphereGeometry(r[1] / 30, 14, 10), skin, elbow)    // ball joint, hides the seam

    const foreMesh = add(new THREE.CylinderGeometry(r[1] / 30, r[2] / 30, fore, 16), skin, elbow)
    foreMesh.position.y = -fore / 2

    const wrist = new THREE.Group()
    wrist.position.y = -fore
    elbow.add(wrist)

    // Every hand shape is built now and all but one hidden, so a gesture just swaps which is showing.
    // Each is its own group: a mesh's children inherit its scale, so a finger parented to a squashed
    // palm would be squashed to nothing with it.
    const handShape = (parts) => {
        const group = new THREE.Group()
        wrist.add(group)
        for (const [geometry, sx2, sy2, sz2, oy] of parts) {
            const mesh = add(geometry, skin, group)
            mesh.scale.set(sx2 / 30, sy2 / 30, sz2 / 30)
            mesh.position.y = oy / 30
        }
        return group
    }
    const ball = () => new THREE.SphereGeometry(1, 18, 12)
    const h = hand
    const hands = {
        fist: handShape([[ball(), h, h * 0.9, h * 0.82, 0]]),
        open: handShape([[ball(), h * 1.22, h * 1.05, h * 0.5, 0]]),       // a flat palm
        cupped: handShape([[ball(), h * 1.1, h * 1.1, h * 0.55, 0]]),      // curved, for the heart
        point: handShape([                                                 // a fist with one finger out
            [ball(), h * 0.85, h * 0.8, h * 0.75, 0],
            [new THREE.CylinderGeometry(0.9 / 30, 0.9 / 30, 6 / 30, 10), 1, 1, 1, -4],
        ]),
    }
    const setHand = (name) => {
        for (const key of Object.keys(hands)) hands[key].visible = key === name
    }
    setHand('fist')

    // mirrored limbs take the negated angles, so the right arm rests the same way round
    const flip = side === 'right' ? -1 : 1
    const rest = profile.rest.map((v) => v * flip)
    shoulder.rotation.set(0, rest[1], rest[0])
    elbow.rotation.set(0, 0, rest[2])

    return { shoulder, elbow, wrist, setHand, rest }
}

// Two jointed arms, for Spirits the designs drew without any. Only give these to a Spirit whose sides
// are clear: Milo's flying flecks, for one, sit exactly where its right arm would be
function plainArms(kit, id) {
    const profile = ARM_PROFILES[id]
    const left = buildArm(kit, 'left', profile)
    const right = buildArm(kit, 'right', profile)
    kit.spirit.add(left.shoulder, right.shoulder)
    kit.arms.push(left, right)        // arms[0] = left, arms[1] = right
}

// ---------- Each Spirit's parts that stick out (from its drawing) ----------
// Each builder gets kit = { add(geometry, material, parent?), color, painted(markup, background, roughness),
// pivot(x, y, ...meshes) }
const DECOR = {
    // Kopi: steam above its head, holding a kopi cup on a saucer in front of its tummy
    kopi({ add, color }) {
        const steam = clay('#B9B0A4', 0.9)
        add(tube([[50, 29], [46.5, 23.5], [50, 18], [53.5, 12.5], [50, 7]], 0.045), steam)
        add(tube([[58, 31], [54.5, 26.5], [58, 22]], 0.035), steam)

        const china = clay('#FFFFFF', 0.35)
        const front = 0.78                                       // how far in front of the body the cup sits
        const cup = add(new THREE.CylinderGeometry(10 / 30, 7.5 / 30, 11.5 / 30, 40), china)
        cup.position.set(0, toY(78.75), front)
        const coffee = add(new THREE.CircleGeometry(9.5 / 30, 40), clay('#7A4E2A', 0.3))
        coffee.rotation.x = -Math.PI / 2
        coffee.position.set(0, toY(73.2), front)
        const handle = add(new THREE.TorusGeometry(0.1, 0.028, 12, 24, Math.PI), china)
        handle.rotation.z = -Math.PI / 2
        handle.position.set(toX(61), toY(79), front)
        const saucer = add(new THREE.CylinderGeometry(13 / 30, 12 / 30, 0.04, 48), china)
        saucer.position.set(0, toY(86), front)

        // two little hands holding the cup
        for (const x of [36, 64]) {
            const hand = add(new THREE.SphereGeometry(1, 24, 16), clay(color, 0.65))
            hand.scale.set(5.5 / 30, 4 / 30, 0.13)
            hand.position.set(toX(x), toY(79), front - 0.02)
        }
    },

    // Pandan: pandan-leaf hair on top and two leaf arms
    pandan({ add, pivot }) {
        const dark = clay('#4E8A3A', 0.55)
        add(extrude('M49 32 C 44 20, 34 12, 26 8 C 38 10, 47 18, 53 31 Z', 0.08), dark).position.z = -0.05
        add(extrude('M51 32 C 56 20, 66 12, 74 8 C 62 10, 53 18, 47 31 Z', 0.08), dark).position.z = -0.05
        add(extrude('M49 31 C 47 18, 49 7, 54 0 C 55 11, 54 21, 53 31 Z', 0.08), clay('#6AA650', 0.55))
        const leaf = 'M0 0 C 4 -6, 14 -7, 18 0 C 14 7, 4 6, 0 0 Z'
        const left = add(extrude(leaf, 0.08, { x: 22, y: 62, rotate: 200 }), dark)
        left.position.z = 0.1
        const right = add(extrude(leaf, 0.08, { x: 78, y: 62, rotate: -20 }), dark)
        right.position.z = 0.1
        // its leaf arms hold nothing, so they are free to wave (limbs[0] = left, limbs[1] = right)
        pivot(22, 62, left)
        pivot(78, 62, right)
    },

    // Boba: a pink straw poking out of its head (the tapioca pearls are painted on)
    boba(kit) {
        const straw = kit.add(new THREE.CylinderGeometry(3 / 30, 3 / 30, 30 / 30, 20), clay('#E9786E', 0.4))
        straw.position.set(toX(58), toY(21), -0.05)
        straw.rotation.z = (-14 * Math.PI) / 180          // the drawing's rotate(14), turned into 3D
        plainArms(kit, 'boba')
    },

    // Kueh Lapis and Ondeh are painted on the body with nothing sticking out, so arms are all they have.
    // Kaya has none: everything it needs is painted on
    'kueh-lapis': (kit) => plainArms(kit, 'kueh-lapis'),
    ondeh: (kit) => plainArms(kit, 'ondeh'),

    // Ice Kachang: a mound of shaved ice on its head with red and green syrup, a cherry on top
    'ice-kachang'({ add, painted }) {
        const mound = new THREE.SphereGeometry(1, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2)
        mound.scale(0.95, 0.72, 0.95)
        mound.translate(0, toY(46), 0)
        const syrup = '<path d="M32 40 Q40 22 50 14" stroke="#E25A6A" stroke-width="5" fill="none" stroke-linecap="round"/>'
            + '<path d="M54 42 Q62 30 66 24" stroke="#7CC36B" stroke-width="5" fill="none" stroke-linecap="round"/>'
            + '<circle cx="42" cy="34" r="1.8" fill="#F3C64A"/><circle cx="60" cy="38" r="1.8" fill="#F3C64A"/>'
        add(projectFromFront(mound), painted(syrup, '#FFFFFF', 0.85))

        const cherry = add(new THREE.SphereGeometry(4.4 / 30, 24, 16), clay('#D42E12', 0.25))
        cherry.position.set(0, toY(19), 0.05)
        add(tube([[50, 15], [51.5, 11], [56, 9]], 0.02, 0.05), clay('#5E8545'))
    },

    // Murtabak: a folded murtabak resting on its head
    murtabak({ add, painted }) {
        const slab = extrude('M22 40 L50 16 L78 40 Q50 48 22 40 Z', 0.12)
        projectFromFront(slab)
        // tip it back so it lies on the head, hinged at its bottom edge
        slab.translate(0, -toY(42), 0)
        slab.rotateX(-0.35)
        slab.translate(0, toY(42) - 0.05, 0.5)
        const lines = '<path d="M36 28 L64 28 M29 34 L71 34 M44 21 L40 42 M56 21 L60 42" stroke="#B47A3A" stroke-width="2"/>'
        add(slab, painted(lines, '#E2A54E', 0.6))
    },

    // Teh Tarik: pulling tea from a cup up high into a cup down low, in an arc over its head
    'teh-tarik'({ add, color }) {
        const china = clay('#FFFFFF', 0.35)
        const tea = clay('#C9A27A', 0.4)
        const high = add(new THREE.CylinderGeometry(10 / 30, 7.5 / 30, 15 / 30, 36), china)
        high.position.set(toX(16), toY(25.5), 0.2)
        high.rotation.z = -0.35                                   // tipped, pouring
        const low = add(new THREE.CylinderGeometry(10 / 30, 7.5 / 30, 16 / 30, 36), china)
        low.position.set(toX(84), toY(70), 0.2)
        const inLow = add(new THREE.CircleGeometry(9 / 30, 32), clay('#FFF6E8', 0.5))
        inLow.rotation.x = -Math.PI / 2
        inLow.position.set(toX(84), toY(63), 0.2)

        // the pulled tea: one long stream from the high cup to the low cup
        const stream = new THREE.CubicBezierCurve3(
            new THREE.Vector3(toX(18), toY(26), 0.25), new THREE.Vector3(toX(40), toY(4), 0.3),
            new THREE.Vector3(toX(76), toY(30), 0.3), new THREE.Vector3(toX(83), toY(64), 0.22))
        add(new THREE.TubeGeometry(stream, 60, 2 / 30, 10, false), tea)

        for (const [x, y] of [[22, 36], [76, 62]]) {
            const hand = add(new THREE.SphereGeometry(1, 24, 16), clay(color, 0.6))
            hand.scale.set(5.5 / 30, 4 / 30, 0.13)
            hand.position.set(toX(x), toY(y), 0.3)
        }
    },

    // Durian: covered in spikes, wearing a gold crown with a red jewel (the king of fruits).
    // The legendary one, so its parts are kept so the emote can animate them: the spikes bristle
    // outwards, the crown lifts off and spins, the jewel flares and a ring sweeps the ground
    durian({ add, parts, spirit }) {
        const spikeMaterial = clay('#8C8A2E', 0.7)
        const spike = new THREE.ConeGeometry(0.15, 0.32, 10)
        spike.translate(0, 0.16, 0)                              // grow outwards from the base
        const up = new THREE.Vector3(0, 1, 0)
        const count = 64
        const spikes = []
        for (let i = 0; i < count; i++) {
            // spread evenly over the body (a "Fibonacci sphere"), but leave the face clear
            const y = 1 - (2 * (i + 0.5)) / count
            const r = Math.sqrt(1 - y * y)
            const theta = Math.PI * (1 + Math.sqrt(5)) * i
            const dir = new THREE.Vector3(r * Math.cos(theta), y, r * Math.sin(theta))
            if (dir.z > 0.45 && Math.abs(dir.y) < 0.7) continue
            const mesh = add(spike, spikeMaterial)
            mesh.position.set(dir.x * 0.97, dir.y * 0.97 * BODY_SQUASH, dir.z * 0.97)
            mesh.quaternion.setFromUnitVectors(up, dir)
            // each spike pushes straight out along the way it already points
            spikes.push({ mesh, base: mesh.position.clone(), dir: dir.clone().normalize() })
        }

        const crown = add(extrude('M38 26 L41 15 L46 22 L50 12 L54 22 L59 15 L62 26 Z', 0.12), clay('#F3C64A', 0.35))
        crown.position.z = 0.05
        const jewel = add(new THREE.SphereGeometry(1.8 / 30, 16, 12), clay('#D42E12', 0.3))
        jewel.position.set(0, toY(12), 0.05)

        // A ring that bursts outwards at the big moment. It faces the viewer and sits just behind the
        // body, so it starts hidden and sweeps out from behind the silhouette. It has to travel with the
        // body rather than lie on the ground: everything here is parented to the Spirit, which the emote
        // lifts, so a ground ring would rise into the air with it.
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: '#F3C64A', transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false,
        })
        const ring = add(new THREE.RingGeometry(0.82, 1, 48), ringMaterial)
        ring.position.z = -0.05
        ring.visible = false

        // The crown and jewel ride together, so lifting the crown lifts its jewel with it.
        // They are re-parented after being placed, which keeps them exactly where they were drawn.
        const regalia = new THREE.Group()
        spirit.add(regalia)
        for (const piece of [crown, jewel]) regalia.add(piece)

        parts.durian = {
            spikes, regalia, jewel, ring, ringMaterial, spikeMaterial,
            crownBase: regalia.position.clone(),
            // put everything back the way it was drawn, for when the Spirit is just standing there
            reset() {
                for (const s of spikes) {
                    s.mesh.position.copy(s.base)
                    s.mesh.scale.set(1, 1, 1)
                }
                regalia.position.copy(this.crownBase)
                regalia.rotation.set(0, 0, 0)
                jewel.scale.setScalar(1)
                jewel.material.emissiveIntensity = 0
                spikeMaterial.emissiveIntensity = 0
                ringMaterial.opacity = 0
                ring.visible = false
            },
        }
        // these two start black-emissive so the emote can flare them without changing their colour
        jewel.material.emissive = new THREE.Color('#D42E12')
        jewel.material.emissiveIntensity = 0
        spikeMaterial.emissive = new THREE.Color('#F3C64A')
        spikeMaterial.emissiveIntensity = 0
    },

    // Chendol: a drop of gula melaka on its head (the green strands and syrup are painted on)
    chendol(kit) {
        kit.add(extrude('M46 28 C 44 22, 48 18, 50 16 C 52 18, 56 22, 54 28 Z', 0.14), clay('#6B3E1F', 0.3)).position.z = 0.1
        plainArms(kit, 'chendol')
    },

    // Chilli Crab: eyes on stalks, arms out to the sides ending in big claws
    'chilli-crab'({ add, spirit, arms }) {
        const shell = clay('#C93B26', 0.5)
        add(tube([[44, 33], [42, 25], [40, 18]], 0.05, 0.1), shell)
        add(tube([[56, 33], [58, 25], [60, 18]], 0.05, 0.1), shell)
        for (const x of [40, 60]) {
            const eye = add(new THREE.SphereGeometry(3.6 / 30, 24, 16), clay('#FFFFFF', 0.35))
            eye.position.set(toX(x), toY(16), 0.1)
            const pupil = add(new THREE.SphereGeometry(1.6 / 30, 16, 12), clay('#161412', 0.3))
            pupil.position.set(toX(x + 0.5), toY(16.5), 0.1 + 3 / 30)
        }

        // Its arm and claw become a jointed limb: the arm swings from the shoulder and the claw turns at
        // the wrist, so it can bend them in front of itself the way the plain arms do. In one rigid group
        // it could only swing stiffly from the shoulder.
        const claw = clay('#E2614A', 0.5)
        const clawArm = (shoulderAt, elbowAt, armPoints, clawPath, clawMiddle) => {
            const shoulder = new THREE.Group()
            shoulder.position.set(toX(shoulderAt[0]), toY(shoulderAt[1]), 0)

            const arm = add(tube(armPoints, 0.085), shell, shoulder)
            arm.position.set(-shoulder.position.x, -shoulder.position.y, 0)

            // the wrist, where the arm meets the claw
            const elbow = new THREE.Group()
            elbow.position.set(toX(elbowAt[0]) - shoulder.position.x, toY(elbowAt[1]) - shoulder.position.y, 0)
            shoulder.add(elbow)

            const pincer = add(extrude(clawPath, 0.16), claw, elbow)
            pincer.position.set(-toX(elbowAt[0]), -toY(elbowAt[1]), 0)

            // where the claw actually sits, so a gesture can be aimed at it
            const wrist = new THREE.Group()
            wrist.position.set(toX(clawMiddle[0]) - toX(elbowAt[0]), toY(clawMiddle[1]) - toY(elbowAt[1]), 0)
            elbow.add(wrist)

            spirit.add(shoulder)
            // rest is all zeros: a claw is drawn where it hangs, so its resting pose needs no rotation
            return { shoulder, elbow, wrist, setHand: () => {}, rest: [0, 0, 0] }
        }

        arms.push(
            clawArm([30, 60], [14, 54], [[30, 60], [21, 61.5], [14, 54]],
                'M14 54 C 2 50, 2 34, 12 30 C 18 28, 22 34, 18 38 L 12 40 C 16 44, 20 46, 22 50 Z', [12, 40]),
            clawArm([70, 60], [86, 54], [[70, 60], [79, 61.5], [86, 54]],
                'M86 54 C 98 50, 98 34, 88 30 C 82 28, 78 34, 82 38 L 88 40 C 84 44, 80 46, 78 50 Z', [88, 40]),
        )
    },

    // Milo: a heap of Milo powder on its head (Milo Dinosaur), with a few flecks flying off
    milo({ add, painted }) {
        const heap = new THREE.SphereGeometry(1, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2)
        heap.scale(0.82, 0.6, 0.82)
        heap.translate(0, toY(41), 0)
        const crumbs = [[40, 30], [50, 22], [58, 30], [46, 34], [62, 36], [36, 38]]
            .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.4" fill="#5E3A1E"/>`).join('')
        add(projectFromFront(heap), painted(crumbs, '#9A6634', 0.95))

        const fleck = clay('#5E3A1E', 0.9)
        for (const [x, y] of [[76, 46], [80, 56], [80, 66], [76, 76]]) {
            add(extrude(`M${x} ${y} L${x + 7} ${y - 3} L${x + 5} ${y + 4} Z`, 0.06), fleck).position.z = -0.1
        }
    },

    // Rojak: pineapple leaves sprouting from its head (the sauce and toppings are painted on)
    rojak({ add }) {
        add(extrude('M50 30 L42 10 L50 18 L50 4 L56 18 L64 10 L56 30 Z', 0.1), clay('#5E8545', 0.55)).position.z = -0.05
    },

    // Bak Kwa: holding a slice of bak kwa in front of its tummy
    'bak-kwa'({ add, color, painted }) {
        const slice = extrude('M37 68 L63 68 Q67 68 67 72 L67 84 Q67 88 63 88 L37 88 Q33 88 33 84 L33 72 Q33 68 37 68 Z', 0.08)
        projectFromFront(slice)
        slice.translate(0, 0, 0.8)
        const marks = [[40, 74, 1.5], [52, 72, 1.3], [60, 80, 1.5], [45, 83, 1.3]]
            .map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#D9604A"/>`).join('')
            + '<path d="M36 70 Q42 68 46 70" stroke="#F2A28E" stroke-width="1.4" fill="none" stroke-linecap="round"/>'
        add(slice, painted(marks, '#A8321E', 0.55))
        for (const x of [36, 64]) {
            const hand = add(new THREE.SphereGeometry(1, 24, 16), clay(color, 0.6))
            hand.scale.set(5.5 / 30, 4 / 30, 0.13)
            hand.position.set(toX(x), toY(79), 0.86)
        }
    },

    // Tau Huay: sitting in a pale blue bowl (the syrup is painted on its head)
    'tau-huay'({ add }) {
        // the bowl's side, from the drawing's curve M14 64 ... Q18 94 50 94, spun around to make a bowl
        const profile = []
        for (let t = 0; t <= 1.0001; t += 0.1) {
            const x = (1 - t) ** 2 * 14 + 2 * t * (1 - t) * 18 + t * t * 50
            const y = (1 - t) ** 2 * 64 + 2 * t * (1 - t) * 94 + t * t * 94
            profile.push(new THREE.Vector2(Math.max(0.001, (50 - x) / 30), toY(y)))
        }
        add(new THREE.LatheGeometry(profile.reverse(), 64), clay('#A9CDE8', 0.35, { side: THREE.DoubleSide }))
        const rim = clay('#86AFCF', 0.4)
        add(flatRing(36 / 30, 0.035, 64), rim)
        add(flatRing(34.6 / 30, 0.015, 70), rim).position.z = 0.02
    },

    // Mooncake: sitting in front of a giant mooncake with its pattern
    mooncake({ add, painted }) {
        const cake = new THREE.CylinderGeometry(44 / 30, 44 / 30, 0.36, 72)
        cake.rotateX(Math.PI / 2)
        cake.translate(0, toY(50), -0.7)
        add(cake, clay('#B9773A', 0.6))
        const face = new THREE.CircleGeometry(44 / 30, 72)
        face.translate(0, toY(50), -0.7 + 0.181)
        const pattern = '<circle cx="50" cy="50" r="38" fill="#D9A15A"/>'
            + '<path d="M50 8 V20 M50 80 V92 M8 50 H20 M80 50 H92 M20 20 L28 28 M80 20 L72 28 M20 80 L28 72 M80 80 L72 72"'
            + ' stroke="#B9773A" stroke-width="2.4" fill="none" stroke-linecap="round"/>'
        add(projectFromFront(face), painted(pattern, '#B9773A', 0.6))
    },

    // Prata: a round, flaky prata balanced on its head
    prata({ add }) {
        const prata = new THREE.Group()
        prata.position.set(0, toY(33), 0)
        prata.rotation.set(0.55, 0, (8 * Math.PI) / 180)         // tipped towards you, like the drawing
        add(new THREE.CylinderGeometry(1, 0.98, 0.12, 64), clay('#E9C27A', 0.7), prata)
        add(new THREE.TorusGeometry(0.99, 0.03, 10, 72).rotateX(Math.PI / 2), clay('#C98B4A', 0.6), prata)
        // the flaky swirl on top
        const swirl = []
        for (let a = 0; a <= Math.PI * 5; a += 0.12) {
            const r = 0.06 + 0.042 * a
            swirl.push(new THREE.Vector3(Math.cos(a) * r, 0.065, Math.sin(a) * r))
        }
        add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(swirl), 160, 0.016, 6, false), clay('#C98B4A', 0.6), prata)
        return prata
    },

    // Putu Mayam: a nest of white and pink string-hopper noodles with a ball of palm sugar on top
    'putu-mayam'({ add }) {
        const white = clay('#FFFFFF', 0.6)
        const pink = clay('#F3C0C8', 0.6)
        const rings = [[34, 36, 7, white], [44, 28, 7, pink], [56, 28, 7, white], [66, 36, 7, pink],
            [40, 34, 6, pink], [60, 34, 6, white], [50, 32, 6, white]]
        rings.forEach(([x, y, r, material], i) => {
            const ring = add(new THREE.TorusGeometry(r / 30, 1.2 / 30, 10, 40), material)
            ring.position.set(toX(x), toY(y), -0.25 + (i % 3) * 0.08)
        })
        const sugar = add(new THREE.SphereGeometry(6 / 30, 24, 16), clay('#C9822E', 0.4))
        sugar.position.set(0, toY(20), 0)
    },

    // Kacang: sitting in a paper cone of kacang puteh, a few nuts on its head
    kacang({ add }) {
        // wide enough that the body sits inside it (the drawing's cone is a little bigger than the body)
        const tip = toY(102)
        const top = toY(64)
        const height = top - tip
        const width = 1.15
        const cone = new THREE.ConeGeometry(width, height, 48, 1, true)
        cone.rotateZ(Math.PI)                                     // tip pointing down
        cone.translate(0, tip + height / 2, 0)
        add(cone, clay('#FFFFFF', 0.7, { side: THREE.DoubleSide }))
        const blue = clay('#7FA6D8', 0.5)
        add(flatRing(width, 0.025, 64), blue)
        for (const y of [75, 84]) add(flatRing(((toY(y) - tip) / height) * width + 0.01, 0.018, y), blue)

        const nut = clay('#B9773A', 0.55)
        for (const [x, y] of [[38, 32], [48, 28], [58, 29], [66, 35], [32, 39]]) {
            const { position, normal } = onBody(x, y)
            const mesh = add(new THREE.SphereGeometry(1, 16, 12), nut)
            mesh.scale.set(4 / 30, 3 / 30, 3 / 30)
            mesh.position.copy(position).addScaledVector(normal, 0.05)
        }
    },

    // Vadai: wearing its vadai like a swim ring around the waist
    vadai({ add }) {
        add(flatRing(34 / 30, 5 / 30, 72), clay('#C07A36', 0.6))
        add(flatRing(34 / 30, 0.05, 71), clay('#D9964E', 0.5)).position.y += 0.12
        const seed = clay('#8C5A2A', 0.6)
        for (const x of [26, 40, 56, 72]) {
            const px = toX(x)
            const mesh = add(new THREE.SphereGeometry(1.2 / 30, 10, 8), seed)
            mesh.position.set(px, toY(72) - 0.05, Math.sqrt(Math.max(0, (34 / 30) ** 2 - px * px)) + 0.14)
        }
    },

    // Potong: sandwiched in rainbow bread, top and bottom (pink, green and yellow layers)
    potong({ add }) {
        const pink = clay('#F4A6B8', 0.75)
        const green = clay('#A6D49A', 0.75)
        const yellow = clay('#F3D57C', 0.75)
        const R = 1.05
        // a band of the bread shell between two drawing heights
        const band = (yTop, yBottom, material) => {
            const angle = (y) => Math.acos(Math.max(-1, Math.min(1, y / (R * BODY_SQUASH))))
            const start = yTop === null ? 0 : angle(toY(yTop))
            const end = yBottom === null ? Math.PI : angle(toY(yBottom))
            const geometry = new THREE.SphereGeometry(R, 56, 16, 0, Math.PI * 2, start, end - start)
            geometry.scale(1, BODY_SQUASH, 1)
            add(geometry, material)
        }
        band(null, 40, pink)
        band(40, 46, green)
        band(46, 50, yellow)
        band(76, 80, yellow)
        band(80, 84, green)
        band(84, null, pink)
    },

    // Chwee Kueh: sitting in its fluted cup (the chai poh is painted on its head)
    'chwee-kueh'({ add }) {
        const cup = new THREE.CylinderGeometry(36 / 30, 28 / 30, (94 - 64) / 30, 18, 1, true)
        cup.translate(0, (toY(64) + toY(94)) / 2, 0)
        add(cup, clay('#D9D6D0', 0.55, { side: THREE.DoubleSide, flatShading: true }))
        const base = new THREE.CircleGeometry(28 / 30, 18)
        base.rotateX(Math.PI / 2)
        base.translate(0, toY(94), 0)
        add(base, clay('#D9D6D0', 0.55, { side: THREE.DoubleSide }))
        add(flatRing(36 / 30, 0.03, 64), clay('#AEA9A0', 0.5))
    },

    // Otah: wrapped in a banana leaf around the middle, tied with string
    otah({ add }) {
        const leaf = new THREE.CylinderGeometry(1.1, 1.0, (92 - 66) / 30, 64, 1, true)
        leaf.translate(0, (toY(66) + toY(92)) / 2, 0)
        add(leaf, clay('#4E8A3A', 0.5, { side: THREE.DoubleSide }))
        const vein = clay('#3E7230', 0.5)
        add(flatRing(1.09, 0.014, 74), vein)
        add(flatRing(1.06, 0.014, 82), vein)
        const string = add(flatRing(1.12, 0.03, 70), clay('#E8D3A8', 0.7))
        string.rotation.z = 0.03
    },
}

// ---------- The whole Spirit ----------
export function buildSpirit({ id, color = '#B07A45' } = {}) {
    const spirit = new THREE.Group()
    const toDispose = new Set()
    const loading = []
    const add = (geometry, material, parent = spirit) => {
        toDispose.add(geometry)
        toDispose.add(material)
        const mesh = new THREE.Mesh(geometry, material)
        parent.add(mesh)
        return mesh
    }
    const painted = (markup, background, roughness = 0.6) => paintedMaterial(markup, background, roughness, loading)
    const drawing = drawingOf(id)

    // Limbs that can swing on their own (Pandan's leaf arms, Chilli Crab's claw arms), for emotes.
    // A part's geometry has its drawing coordinates baked in, so rotating the mesh would swing it around
    // the Spirit's centre. Putting it in a group at its shoulder and shifting it back by the same amount
    // leaves it where it was drawn, but now it turns around the shoulder instead.
    const limbs = []
    const pivot = (x, y, ...meshes) => {
        const group = new THREE.Group()
        group.position.set(toX(x), toY(y), 0)
        for (const mesh of meshes) {
            mesh.position.sub(group.position)
            group.add(mesh)                  // three.js takes it off `spirit` for us
        }
        spirit.add(group)
        limbs.push(group)
        return group
    }

    // body: a slightly squashed sphere with a soft, clay-like finish (a little glossy, for the drawings' highlight).
    // Whatever the drawing paints on the body (stripes, pearls, sauce, ...) is painted onto it here
    const bodyGeometry = new THREE.SphereGeometry(1, 64, 48)
    bodyGeometry.scale(1, BODY_SQUASH, 1)
    let paint = bodyPaintOf(drawing)
    // Chendol's green strands are drawn over its body (outside the clipped part), so they're painted on too
    if (id === 'chendol') paint += drawing.match(/<g fill="none" stroke="#7CC36B"[\s\S]*?<\/g>/)?.[0] ?? ''
    add(paint ? projectFromFront(bodyGeometry) : bodyGeometry, paint ? painted(paint, color, 0.42) : clay(color, 0.42))

    // face, placed on the body's surface where the drawing has it
    const eyeY = eyeHeightOf(drawing)
    const eyeMaterial = clay('#161412', 0.3)
    const eyes = [41, 59].map((x) => {
        const { position, normal } = onBody(x, eyeY)
        const eye = add(new THREE.SphereGeometry(1, 20, 14), eyeMaterial)
        eye.scale.set(2.7 / 30, 3.7 / 30, 0.05)
        eye.position.copy(position).addScaledVector(normal, 0.01)
        eye.lookAt(eye.position.clone().add(normal))
        eye.userData.baseScaleY = eye.scale.y
        return eye
    })

    const cheekMaterial = new THREE.MeshBasicMaterial({ color: '#E9786E', transparent: true, opacity: 0.5, depthWrite: false })
    for (const x of [33, 67]) {
        const { position, normal } = onBody(x, eyeY + 7)
        const cheek = add(new THREE.CircleGeometry(1, 28), cheekMaterial)
        cheek.scale.set(4.4 / 30, 2.5 / 30, 1)
        cheek.position.copy(position).addScaledVector(normal, 0.012)
        cheek.lookAt(cheek.position.clone().add(normal))
    }

    // the small smile: a thin tube along the drawing's curve, hugging the face
    const smilePoints = [[46, eyeY + 7], [50, eyeY + 10.5], [54, eyeY + 7]].map(([x, y]) => {
        const { position, normal } = onBody(x, y)
        return position.addScaledVector(normal, 0.014)
    })
    add(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(...smilePoints), 24, 0.03, 8, false), clay('#161412', 0.4))

    // its own parts (cup, claws, crown, bowl, ...). A builder may return a group of parts to add
    const arms = []
    const parts = {}                                 // anything an emote needs to animate directly
    const group = DECOR[id]?.({ add, color, painted, pivot, spirit, arms, parts })
    if (group) spirit.add(group)

    return {
        id,
        spirit,
        eyes,
        limbs,
        arms,                                        // jointed arms (shoulder/elbow/hand), for gestures
        parts,                                       // per-Spirit pieces an emote drives (Durian's spikes, crown, ...)
        ready: Promise.all(loading),                 // painted parts loaded
        // amount 1 = open, 0.15 = nearly shut
        blink: (amount) => eyes.forEach((eye) => { eye.scale.y = eye.userData.baseScaleY * amount }),
        dispose: () => toDispose.forEach((item) => {
            item.map?.dispose()
            item.dispose()
        }),
    }
}

// soft studio lighting. The main light comes from the top-left, like the bright highlight in the drawings
export function addSpiritLights(scene) {
    scene.add(new THREE.HemisphereLight('#FFF8EE', '#D8C8B0', 2.0))
    const key = new THREE.DirectionalLight('#FFFFFF', 2.2)
    key.position.set(-2.5, 3, 4)
    scene.add(key)
    const fill = new THREE.DirectionalLight('#FFF1E0', 0.6)
    fill.position.set(3, 0, 2)
    scene.add(fill)
}

// the soft oval shadow under the Spirit, like the drawings (stays on the ground when the Spirit bobs)
export function addSpiritShadow(scene) {
    const geometry = new THREE.CircleGeometry(1, 40)
    const material = new THREE.MeshBasicMaterial({ color: '#161412', transparent: true, opacity: 0.14, depthWrite: false })
    const shadow = new THREE.Mesh(geometry, material)
    shadow.rotation.x = -Math.PI / 2
    shadow.scale.set(24 / 30, 4 / 30 * 2.2, 1)
    shadow.position.y = toY(94)
    scene.add(shadow)
    return () => { geometry.dispose(); material.dispose() }
}
