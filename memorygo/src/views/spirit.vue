<!--------------------------------------------------------------------------------------------------------
PSEUDOCODE
filename:   views/spirit.vue
purpose:    - one Spirit's page (/spirits/:id), opened from a tile on the Spirits tab
            - found:   the live 3D Spirit (SpiritCanvas), rarity, name, lore, and 4 info tiles
                       (Found at, On, Game, Set), plus "Show on map" and a share button
            - not yet: the grey "?" drawing, where it hides, and "Show on map" so they know where to go
            - same data as the Spirits tab (GET /api/spirits), so the server needs nothing new
            - iPad: stacked like the phone, plus a row with the 4 Spirits of its set (tap one to open it)
            - laptop (laptop handoff 07-WebSpiritDetail): full-height peach panel on the left, the nav
              top-right, details + set row on the right
---------------------------------------------------------------------------------------------------------->

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import SpiritCanvas from '@/components/spirits/SpiritCanvas.vue'
import PaperMap from '@/components/spirits/PaperMap.vue'
import HandUnderline from '@/components/ui/HandUnderline.vue'
import AppNav from '@/components/ui/AppNav.vue'
import { GAME_LABELS } from '@/data/placeLabels'
import { api } from '@/lib/api'
import { savedSpirits } from '@/lib/spiritsCache'
// the spirit drawings, for the set row (same as the Spirits tab)
const pictures = import.meta.glob('@/assets/spirits/*.svg', { eager: true, import: 'default' })
const pictureOf = (id) => pictures[`/src/assets/spirits/${id}.svg`]
const lockedPicture = pictureOf('_locked')

const route = useRoute()
const router = useRouter()

const spirits = ref([])
const found = ref([])
const loading = ref(true)
const errorMsg = ref('')
const coins = ref(null)
const canShare = typeof navigator !== 'undefined' && !!navigator.share

// the nav only shows on laptop (top-right, beside the details); on phone / iPad the bottom bar
// would cover "Show on map" and the top pill would cover the rarity chip
const wideQuery = window.matchMedia('(min-width: 1024px)')
const isWide = ref(wideQuery.matches)
const onWideChange = (e) => { isWide.value = e.matches }

const spirit = computed(() => spirits.value.find((s) => s.id === route.params.id) ?? null)
const foundRow = computed(() => found.value.find((f) => f.spirit_id === route.params.id) ?? null)

const isFound = (id) => found.value.some((f) => f.spirit_id === id)

// the 4 Spirits in this one's set, for the row on iPad / laptop
const setSpirits = computed(() => (spirit.value ? spirits.value.filter((s) => s.set === spirit.value.set) : []))

// "Civic District · 3 of 4"
const setProgress = computed(() => {
    if (!spirit.value) return ''
    const inSet = spirits.value.filter((s) => s.set === spirit.value.set)
    const foundInSet = inSet.filter((s) => found.value.some((f) => f.spirit_id === s.id)).length
    return `${spirit.value.set} · ${foundInSet} of ${inSet.length}`
})

// ex: 29 Oct 2026 (same as the Spirits tab)
const formatDate = (iso) =>
    new Date(iso).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })

onMounted(async () => {
    try {
        // opened from the Spirits tab: it already has the data, so no waiting
        const data = savedSpirits() ?? (await api.get('/spirits')).data
        spirits.value = data.spirits
        found.value = data.found
        if (!spirit.value) errorMsg.value = 'We couldn’t find that Spirit.'
    } catch (e) {
        errorMsg.value = 'We couldn’t load this Spirit. Please try again.'
    } finally {
        loading.value = false
    }

    wideQuery.addEventListener('change', onWideChange)

    // coins for the nav (not important if it fails)
    api.get('/progress')
        .then(({ data }) => { coins.value = data.coins })
        .catch(() => { coins.value = null })
})

onBeforeUnmount(() => wideQuery.removeEventListener('change', onWideChange))

// back to the collection (always the Spirits tab, even after hopping between Spirits in the set row)
function goBack() {
    router.push('/spirits')
}

// the map opens this place's card (views/map.vue reads ?place=)
function showOnMap() {
    router.push({ path: '/map', query: { place: spirit.value.placeId } })
}

// phone share sheet ("Share with a kaki"); a closed sheet throws, which is fine
async function share() {
    try {
        await navigator.share({
            title: 'MemoryGo',
            text: `I found ${spirit.value.name} at ${spirit.value.placeName} on MemoryGo!`,
        })
    } catch (e) {
        // they closed the share sheet
    }
}
</script>

<template>
    <div class="spirit-page">
        <p v-if="loading" class="note">Loading…</p>
        <div v-else-if="errorMsg" class="note">
            <p role="alert">{{ errorMsg }}</p>
            <RouterLink to="/spirits" class="text-link">Back to Spirits</RouterLink>
        </div>

        <main v-else class="layout">
            <!-- hero: the Spirit big, on peach, standing on a faint paper map -->
            <section class="hero" :class="{ locked: !foundRow }">
                <button type="button" class="back" aria-label="Back to all Spirits" @click="goBack">
                    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor"
                        stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M15 5 L8 12 L15 19" />
                    </svg>
                    <span class="back-label">All Spirits</span>
                </button>
                <span v-if="foundRow" class="rarity">
                    {{ spirit.rarity }}
                </span>

                <PaperMap />

                <div class="model">
                    <SpiritCanvas v-if="foundRow" :key="spirit.id" :spirit-id="spirit.id" :color="spirit.color" :label="spirit.name" />
                    <img v-else :src="lockedPicture" alt="" class="locked-picture" />
                </div>
            </section>

            <section class="info">
                <h1 class="name">
                    <HandUnderline>{{ foundRow ? spirit.name : '???' }}</HandUnderline>
                </h1>

                <!-- found: its story · not yet: where to go -->
                <p v-if="foundRow" class="lore">{{ spirit.lore }}</p>
                <p v-else class="lore">
                    A Spirit is hiding at <strong>{{ spirit.placeName }}</strong>.
                    Play a game there to find out who it is.
                </p>

                <dl class="tiles">
                    <div class="tile">
                        <dt>{{ foundRow ? 'Found at' : 'Hiding at' }}</dt>
                        <dd>{{ spirit.placeName }}</dd>
                    </div>
                    <template v-if="foundRow">
                        <div class="tile">
                            <dt>On</dt>
                            <dd>{{ formatDate(foundRow.found_at) }}</dd>
                        </div>
                        <div class="tile">
                            <dt>Game</dt>
                            <dd>{{ GAME_LABELS[foundRow.game] ?? 'A game' }}</dd>
                        </div>
                    </template>
                    <div class="tile">
                        <dt>Set</dt>
                        <dd>{{ setProgress }}</dd>
                    </div>
                </dl>

                <!-- iPad / laptop: the 4 Spirits of this set (this one outlined in ink) -->
                <section class="set-row">
                    <h2 class="set-row-title">{{ spirit.set }} set</h2>
                    <ul class="set-tiles">
                        <li v-for="s in setSpirits" :key="s.id">
                            <RouterLink :to="`/spirits/${s.id}`" class="set-tile"
                                :class="{ current: s.id === spirit.id, locked: !isFound(s.id) }"
                                :aria-current="s.id === spirit.id ? 'page' : undefined">
                                <img :src="isFound(s.id) ? pictureOf(s.id) : lockedPicture" alt="" />
                                <span>{{ isFound(s.id) ? s.name : s.placeName }}</span>
                            </RouterLink>
                        </li>
                    </ul>
                </section>

                <div class="actions">
                    <button type="button" class="map-btn" :disabled="!spirit.placeId" @click="showOnMap">
                        <span>Show on map</span>
                        <svg width="46" height="24" viewBox="0 0 46 24" aria-hidden="true" fill="none" stroke="currentColor"
                            stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M3 13.5 C 13 11, 26 13.5, 41 11" />
                            <path d="M32 4.5 C 35.5 7.5, 38.5 9.5, 42 11 C 38 13, 34.5 16, 32.5 19.5" />
                        </svg>
                    </button>
                    <button v-if="foundRow && canShare" type="button" class="share-btn" aria-label="Share with a kaki"
                        @click="share">
                        <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor"
                            stroke-width="2" stroke-linecap="round">
                            <circle cx="18" cy="5.5" r="2.5" />
                            <circle cx="6" cy="12" r="2.5" />
                            <circle cx="18" cy="18.5" r="2.5" />
                            <path d="M8.2 10.8 L15.8 6.7 M8.2 13.2 L15.8 17.3" />
                        </svg>
                    </button>
                </div>
            </section>
        </main>

        <AppNav v-if="isWide" :coins="coins" />
    </div>
</template>

<style scoped>
.spirit-page {
    min-height: 100vh;
    background: var(--paper);
    color: var(--ink);
    font-family: var(--font);
}

.note {
    padding: 40px 20px;
    font-size: 17px;
    font-weight: 600;
}

.text-link {
    color: var(--ink);
    font-weight: 700;
}

.layout {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
}

/* =========================================================
   Hero (peach, rounded bottom corners)
   ========================================================= */
.hero {
    position: relative;
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    height: 380px;
    overflow: hidden;
    border-radius: 0 0 40px 40px;
    background: var(--peach);
}

.hero.locked {
    background: #E6E0D6;
}

/* not found yet: the paper map in greys to match */
.hero.locked :deep(.paper-map) {
    --map-river: #DCD6CC;
    --map-road: #CFC8BC;
    --map-block: #D8D1C6;
    --map-park: #D3CFC0;
    --map-route: #A39B90;
}

.back {
    position: absolute;
    top: 16px;
    left: 16px;
    z-index: 2;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    border: 0;
    border-radius: 50%;
    background: var(--white);
    color: var(--ink);
    cursor: pointer;
}

.rarity {
    position: absolute;
    top: 22px;
    right: 20px;
    z-index: 2;
    padding: 5px 12px;
    border-radius: var(--radius-pill);
    background: var(--ink);
    color: var(--white);
    font-size: 16px;
    font-weight: 800;
}

.model {
    position: relative;
    width: 280px;
    height: 280px;
}

.locked-picture {
    width: 100%;
    height: 100%;
    padding: 50px;
}

/* =========================================================
   Name, lore, info tiles, buttons
   ========================================================= */
.info {
    display: flex;
    flex: 1;
    flex-direction: column;
    padding: 22px 20px 28px;
}

.name {
    margin: 0;
    font-family: var(--font);          /* the app font (not the browser's heading font) */
    font-size: 60px;
    font-weight: 700;
    line-height: 0.95;
    letter-spacing: -0.055em;
}

.lore {
    margin: 20px 0 0;
    font-size: 18px;
    font-weight: 500;
    line-height: 1.4;
}

.tiles {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
    margin: 18px 0 0;
}

.tile {
    padding: 12px 14px;
    border: 1.5px solid rgba(22, 20, 18, 0.1);
    border-radius: 20px;
    background: var(--white);
}

.tile dt {
    font-size: 16px;
    font-weight: 700;
    opacity: 0.7;
}

.tile dd {
    margin: 0;
    overflow-wrap: anywhere;
    font-size: 17px;
    font-weight: 800;
    line-height: 1.2;
}

.actions {
    display: flex;
    gap: 10px;
    margin-top: auto;
    padding-top: 24px;
}

.map-btn {
    display: flex;
    flex: 1;
    align-items: center;
    justify-content: space-between;
    height: 60px;
    padding: 0 16px 0 22px;
    border: 0;
    border-radius: var(--radius-pill);
    background: var(--ink);
    color: var(--white);
    font: 700 18px var(--font);
    cursor: pointer;
}

.map-btn:disabled {
    opacity: 0.5;
    cursor: default;
}

.share-btn {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    width: 60px;
    height: 60px;
    border: 1.5px solid var(--ink);
    border-radius: 50%;
    background: transparent;
    color: var(--ink);
    cursor: pointer;
}

/* iPad / laptop only (hidden on phone) */
.back-label,
.set-row {
    display: none;
}

/* =========================================================
   iPad: same as phone (stacked), a bit wider, plus the set row
   ========================================================= */
@media (min-width: 768px) {
    .layout {
        max-width: 720px;
        margin: 0 auto;
    }

    .hero {
        border-radius: 0 0 48px 48px;
    }

    /* the 4 Spirits of this set */
    .set-row {
        display: block;
        margin-top: 28px;
    }

    .set-row-title {
        margin: 0 0 12px;
        font-family: var(--font);
        font-size: 20px;
        font-weight: 800;
        letter-spacing: -0.02em;
    }

    .set-tiles {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 12px;
        margin: 0;
        padding: 0;
        list-style: none;
    }

    .set-tiles > li {
        display: flex;
    }

    .set-tile {
        display: flex;
        flex: 1;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 6px;
        padding: 12px 8px;
        border: 1.5px solid rgba(22, 20, 18, 0.1);
        border-radius: 20px;
        background: var(--white);
        color: var(--ink);
        text-align: center;
        text-decoration: none;
        transition: transform 0.18s ease;
    }

    .set-tile img {
        width: 56px;
        height: 56px;
    }

    .set-tile span {
        overflow-wrap: break-word;
        font-size: 16px;
        font-weight: 800;
        line-height: 1.15;
    }

    .set-tile.current {
        border: 2px solid var(--ink);
        background: #F7D9C5;
    }

    .set-tile.locked {
        border-style: dashed;
        border-color: rgba(22, 20, 18, 0.25);
        background: rgba(255, 255, 255, 0.4);
    }

    .set-tile.locked span {
        font-weight: 700;
        opacity: 0.75;
    }

}

/* =========================================================
   Laptop (laptop handoff 07-WebSpiritDetail):
   full-height peach panel on the left, details on the right, nav top-right
   ========================================================= */
@media (min-width: 1024px) {
    .layout {
        max-width: none;
        margin: 0;
    }

    .layout {
        flex-direction: row;
        align-items: stretch;
    }

    .hero {
        position: sticky;
        top: 0;
        flex: 0 0 46%;
        max-width: 660px;
        height: 100vh;
        border-radius: 0 48px 48px 0;
    }

    /* back button becomes a pill: "< All Spirits" */
    .back {
        top: 28px;
        left: 32px;
        gap: 8px;
        width: auto;
        padding: 0 20px 0 16px;
        border-radius: var(--radius-pill);
    }

    .back-label {
        display: inline;
        font: 800 17px var(--font);
    }

    .rarity {
        top: 34px;
        right: 40px;
    }

    .model {
        width: 360px;
        height: 360px;
    }

    .info {
        flex: 1;
        min-width: 0;
        padding: 120px 6% 40px 6%;
    }

    .name {
        font-size: 72px;
        line-height: 0.9;
    }

    .lore {
        max-width: 600px;
        font-size: 20px;
    }

    .tiles {
        gap: 12px;
    }

    .tile dd {
        font-size: 19px;
    }

    .actions {
        margin-top: auto;
        padding-top: 32px;
    }

    .map-btn {
        height: 62px;
        font-size: 19px;
    }
}

/* big laptop: bigger Spirit and name, like the 1440px design */
@media (min-width: 1200px) {
    .model {
        width: 420px;
        height: 420px;
    }

    .name {
        font-size: 104px;
        line-height: 0.88;
    }

    .lore {
        margin-top: 30px;                  /* room for the underline under the big name */
        font-size: 21px;
    }
}

@media (hover: hover) and (min-width: 768px) {
    .set-tile:hover {
        transform: translateY(-3px);
    }
}

@media (prefers-reduced-motion: reduce) {
    .set-tile {
        transition: none;
    }
    .set-tile:hover {
        transform: none;
    }
}
</style>
