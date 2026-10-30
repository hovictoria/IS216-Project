// src/lib/gameImages.js
// One place that loads every game picture, so all the games share the same set.
//
// Folder layout (src/assets/game-images/):
//   shared/            pictures every game can use      shared/apple.png
//   memory/            extras only Memory Match uses     memory/flour.webp
//   whats-missing/     extras only What's Missing uses
//   object-id/ ...     (folder name = the game's name)
//   categories/fruit/  grouped pictures for Odd One Out  categories/fruit/apple.png
//
// File name = what it shows. "tea-cup.png" is called "tea cup".

const files = import.meta.glob('@/assets/game-images/**/*.{png,jpg,jpeg,webp,svg,avif}', {
    eager: true,
    import: 'default'
})

const all = Object.entries(files).map(([path, src]) => {
    const parts = path.split('game-images/')[1].split('/')   // e.g. ['shared', 'apple.png']
    const file = parts.pop().replace(/\.[^.]+$/, '')
    return {
        id: file,
        name: file.replace(/[-_]+/g, ' '),
        src,
        group: parts[0],         // 'shared', a game name, or 'categories'
        sub: parts[1] || null    // category name, e.g. 'fruit'
    }
})

// Shared pictures plus any extras in the game's own folder (no duplicates by name).
export function getImages(game) {
    const seen = new Set()
    return all.filter((img) => {
        if (img.group !== 'shared' && img.group !== game) return false
        if (seen.has(img.id)) return false
        seen.add(img.id)
        return true
    })
}

// { fruit: [...], animal: [...] } from game-images/categories/<name>/
export function getCategories() {
    const out = {}
    all.filter((img) => img.group === 'categories' && img.sub).forEach((img) => {
        ;(out[img.sub] ||= []).push(img)
    })
    return out
}

// Load pictures into the browser cache so they don't pop in late
export function preload(images) {
    images.forEach((img) => {
        const el = new Image()
        el.src = img.src
    })
}