<!--------------------------------------------------------------------------------------------------------
PSEUDOCODE
filename:   views/me.vue
purpose:    - the Me tab (/me), from the Me handoff (ME_SPEC.md), trimmed to what the app has:
                profile (Spirit picture or initial, name, joined date, level + XP bar, coins · Spirits · places),
                Spirits companion → Spirits tab, Easier to use (text size, reduce motion, solid
                backgrounds), Look & feel (mood), Account (Edit profile, Change password, Language), Sign out
            - no My kakis (friends): dropped to keep the app simple
            - phone: one scrolling list · laptop (1024px+): profile column on the left (400px), settings on
              the right (layout "A")
            - data: GET /api/me/profile through stores/profile.js; settings change straight away and save in
              the background (lib/useSettings.js)
            - Edit profile / Change password / Delete account open over the page (components/profile/)
note:       replaces views/profile.vue (the first Me page). Its Edit / Delete code lives on in components/profile
---------------------------------------------------------------------------------------------------------->

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AppNav from '@/components/ui/AppNav.vue'
import HandUnderline from '@/components/ui/HandUnderline.vue'
import EditProfile from '@/components/profile/EditProfile.vue'
import ChangePassword from '@/components/profile/ChangePassword.vue'
import DeleteAccount from '@/components/profile/DeleteAccount.vue'
import { useAuthStore } from '@/stores/auth'
import { useProfileStore } from '@/stores/profile'
import { settings, changeSetting, lessMotion } from '@/lib/useSettings'
import { pictureOf } from '@/lib/spiritPictures'
import { progressToNext } from '@/config/progression'
import mapBackground from '@/assets/spirits-map-bg.webp'

const auth = useAuthStore()
const profile = useProfileStore()
const router = useRouter()

// which pop-up is open: null | 'edit' | 'password' | 'delete'
const open = ref(null)

// a setting that couldn't be saved to the account (it still works on this device)
const settingNote = ref('')

const me = computed(() => profile.data)

// "Ariq Lim" → first part plain, last word with the hand-drawn underline
const name = computed(() => auth.user?.user_metadata?.display_name || auth.user?.email || 'Explorer')
const nameStart = computed(() => name.value.split(' ').slice(0, -1).join(' '))
const nameEnd = computed(() => name.value.split(' ').slice(-1)[0])
const initial = computed(() => name.value.trim().charAt(0).toUpperCase())

// "Explorer since Oct 2026"
const joined = computed(() => {
    if (!me.value?.joinedAt) return ''
    const when = new Date(me.value.joinedAt).toLocaleDateString('en-SG', { month: 'short', year: 'numeric' })
    return `Explorer since ${when}`
})

// Level 3 · 70 / 200 XP to Level 4 (config/progression.js)
const level = computed(() => progressToNext(me.value?.xp ?? 0))
const levelNote = computed(() => (level.value.nextLevel
    ? `${level.value.xpIntoLevel} / ${level.value.xpNeeded} XP to Level ${level.value.nextLevel}`
    : 'Top level reached'))

// Spirits companion: their picked Spirit, or else the newest one they found
const companion = computed(() => {
    const newest = me.value?.newestSpirits ?? []
    const picked = newest.find((s) => s.id === me.value?.avatarSpiritId)
    if (picked) return picked
    if (me.value?.avatarSpiritId) return { id: me.value.avatarSpiritId, name: me.value.avatarSpiritId.charAt(0).toUpperCase() + me.value.avatarSpiritId.slice(1).replace(/-/g, ' ') }
    return newest[0] ?? null
})

// the "Reduce motion" switch shows the device's setting until they choose
const reduceMotionOn = computed(() => settings.reduceMotion ?? lessMotion())

const TEXT_SIZES = [
    { value: 'normal', label: 'Normal text size', size: 16 },
    { value: 'large', label: 'Large text', size: 20 },
    { value: 'larger', label: 'Larger text', size: 25 },
]

const MOODS = [
    { value: 'auto', label: 'Auto' },
    { value: 'day', label: 'Morning' },
    { value: 'night', label: 'Night' },
]

async function setSetting(nameOf, value) {
    settingNote.value = (await changeSetting(nameOf, value)) ?? ''
}

// "Keep my account" goes back to the Edit profile pop-up they came from
function closeDelete() {
    open.value = 'edit'
}

async function onSignOut() {
    await auth.signOut()
    router.push('/')
}

// fresh numbers every time the tab opens (the store already has the last ones, so it shows straight away)
onMounted(() => profile.load())
</script>

<template>
    <div class="me-page">
        <!-- background: the blurred map with peach + sage glows (same as the Journey tab) -->
        <div class="backdrop" aria-hidden="true">
            <img :src="mapBackground" alt="" class="backdrop-map" />
            <span class="glow glow-peach"></span>
            <span class="glow glow-sage"></span>
        </div>

        <p class="wordmark">MemoryGo</p>

        <main class="content">
            <h1 class="visually-hidden">Me</h1>

            <p v-if="!me && profile.loading" class="note">Loading your profile…</p>
            <p v-else-if="!me && profile.error" class="note" role="alert">{{ profile.error }}</p>

            <div v-if="me" class="layout">
                <!-- ===================== left: about me ===================== -->
                <div class="col col-left">
                    <section class="profile">
                        <div class="who">
                            <span class="avatar" aria-hidden="true">
                                <img v-if="me.avatarSpiritId" :src="pictureOf(me.avatarSpiritId)" alt="" class="avatar-spirit" />
                                <template v-else>{{ initial }}</template>
                                <!-- their newest Spirit peeks from the corner (when the picture is their initial) -->
                                <img v-if="!me.avatarSpiritId && me.newestSpirits.length"
                                    :src="pictureOf(me.newestSpirits[0].id)" alt="" class="peek" />
                            </span>
                            <div class="who-text">
                                <h2 class="name">
                                    <template v-if="nameStart">{{ `${nameStart} ` }}</template><HandUnderline>{{ nameEnd }}</HandUnderline>
                                </h2>
                                <p class="joined">{{ joined }}</p>
                            </div>
                        </div>

                        <!-- level + XP bar -->
                        <div class="level">
                            <div class="level-row">
                                <span class="level-chip">Level {{ level.level }}</span>
                                <span class="level-note">{{ levelNote }}</span>
                            </div>
                            <div class="xp-bar" role="progressbar" :aria-valuenow="level.percent" aria-valuemin="0"
                                aria-valuemax="100" :aria-label="`Level ${level.level}: ${levelNote}`">
                                <span class="xp-fill" :style="{ width: `${level.percent}%` }"></span>
                            </div>
                        </div>

                        <dl class="stats">
                            <div class="stat">
                                <dt>coins</dt>
                                <dd>{{ me.coins.toLocaleString() }}</dd>
                            </div>
                            <div class="stat">
                                <dt>Spirits</dt>
                                <dd>{{ me.spiritsFound }}/{{ me.spiritsTotal }}</dd>
                            </div>
                            <div class="stat">
                                <dt>places</dt>
                                <dd>{{ me.placesPlayed }}</dd>
                            </div>
                        </dl>

                        <button type="button" class="outline-btn edit-btn" @click="open = 'edit'">Edit profile</button>
                    </section>

                    <!-- Spirits companion -->
                    <RouterLink v-if="companion" to="/spirits" class="glass-card peach companion">
                        <span class="companion-pics" aria-hidden="true">
                            <img v-for="s in me.newestSpirits" :key="s.id" :src="pictureOf(s.id)" alt="" />
                        </span>
                        <span class="companion-text">Your Spirits companion: {{ companion.name }}</span>
                        <svg class="arrow" viewBox="0 0 46 24" aria-hidden="true">
                            <path d="M3 13.5 C 13 11, 26 13.5, 41 11" />
                            <path d="M32 4.5 C 35.5 7.5, 38.5 9.5, 42 11 C 38 13, 34.5 16, 32.5 19.5" />
                        </svg>
                    </RouterLink>
                    <RouterLink v-else to="/map" class="glass-card peach companion">
                        <span class="companion-text">Find your first Spirit on the map</span>
                        <svg class="arrow" viewBox="0 0 46 24" aria-hidden="true">
                            <path d="M3 13.5 C 13 11, 26 13.5, 41 11" />
                            <path d="M32 4.5 C 35.5 7.5, 38.5 9.5, 42 11 C 38 13, 34.5 16, 32.5 19.5" />
                        </svg>
                    </RouterLink>

                    <button type="button" class="outline-btn sign-out" @click="onSignOut">Sign out</button>
                </div>

                <!-- ===================== right: settings ===================== -->
                <div class="col col-right">
                    <section class="glass-card" aria-labelledby="easier-title">
                        <h2 id="easier-title" class="card-title">Easier to use</h2>

                        <div class="setting stacked">
                            <p id="text-size-label" class="setting-name">Text size</p>
                            <div class="segmented" role="radiogroup" aria-labelledby="text-size-label">
                                <button v-for="t in TEXT_SIZES" :key="t.value" type="button" role="radio"
                                    :aria-checked="settings.textSize === t.value" :aria-label="t.label"
                                    :class="{ on: settings.textSize === t.value }" :style="{ fontSize: `${t.size}px` }"
                                    @click="setSetting('textSize', t.value)">A</button>
                            </div>
                        </div>

                        <div class="setting">
                            <span class="setting-text">
                                <span id="motion-label" class="setting-name">Reduce motion</span>
                                <span class="setting-note">Stops the moving 3D and animations</span>
                            </span>
                            <button type="button" class="switch" role="switch" :aria-checked="reduceMotionOn"
                                aria-labelledby="motion-label" @click="setSetting('reduceMotion', !reduceMotionOn)">
                                <span class="knob"></span>
                            </button>
                        </div>

                        <div class="setting">
                            <span class="setting-text">
                                <span id="solid-label" class="setting-name">Solid backgrounds</span>
                                <span class="setting-note">Turns off see-through glass</span>
                            </span>
                            <button type="button" class="switch" role="switch" :aria-checked="settings.solidBackgrounds"
                                aria-labelledby="solid-label"
                                @click="setSetting('solidBackgrounds', !settings.solidBackgrounds)">
                                <span class="knob"></span>
                            </button>
                        </div>
                    </section>

                    <section class="glass-card" aria-labelledby="look-title">
                        <h2 id="look-title" class="card-title">Look &amp; feel</h2>
                        <div class="setting stacked">
                            <p id="mood-label" class="setting-name">Mood</p>
                            <div class="segmented" role="radiogroup" aria-labelledby="mood-label">
                                <button v-for="m in MOODS" :key="m.value" type="button" role="radio"
                                    :aria-checked="settings.mood === m.value" :class="{ on: settings.mood === m.value }"
                                    @click="setSetting('mood', m.value)">{{ m.label }}</button>
                            </div>
                        </div>
                    </section>

                    <p v-if="settingNote" class="setting-warning" role="status">{{ settingNote }}</p>

                    <section class="glass-card" aria-labelledby="account-title">
                        <h2 id="account-title" class="card-title">Account</h2>
                        <button type="button" class="account-row" @click="open = 'edit'">
                            <span class="setting-name">Edit profile</span>
                            <svg class="arrow" viewBox="0 0 46 24" aria-hidden="true">
                                <path d="M3 13.5 C 13 11, 26 13.5, 41 11" />
                                <path d="M32 4.5 C 35.5 7.5, 38.5 9.5, 42 11 C 38 13, 34.5 16, 32.5 19.5" />
                            </svg>
                        </button>
                        <button type="button" class="account-row" @click="open = 'password'">
                            <span class="setting-name">Change password</span>
                            <svg class="arrow" viewBox="0 0 46 24" aria-hidden="true">
                                <path d="M3 13.5 C 13 11, 26 13.5, 41 11" />
                                <path d="M32 4.5 C 35.5 7.5, 38.5 9.5, 42 11 C 38 13, 34.5 16, 32.5 19.5" />
                            </svg>
                        </button>
                        <!-- Language: English only for now (placeholder) -->
                        <div class="account-row">
                            <span class="setting-text">
                                <span class="setting-name">Language</span>
                                <span class="setting-note">More languages coming soon</span>
                            </span>
                            <span class="row-value">English</span>
                        </div>
                    </section>
                </div>
            </div>
        </main>

        <AppNav :coins="me?.coins ?? null" />

        <EditProfile v-if="open === 'edit'" @close="open = null" @delete="open = 'delete'" />
        <ChangePassword v-if="open === 'password'" @close="open = null" />
        <DeleteAccount v-if="open === 'delete'" @close="closeDelete" />
    </div>
</template>

<style scoped>
/* =========================================================
   Page + background (same as the Journey tab)
   ========================================================= */
.me-page {
    position: relative;
    min-height: 100vh;
    overflow-x: hidden;
    background: var(--paper);
    color: var(--ink);
    font-family: var(--font);
}

.backdrop {
    position: fixed;
    inset: 0;
    z-index: 0;
    overflow: hidden;
    pointer-events: none;
}

.backdrop-map {
    width: 100%;
    height: 100%;
    object-fit: cover;
    filter: blur(16px) saturate(1.3);
    opacity: 0.55;
    transform: scale(1.4);
}

.glow {
    position: absolute;
    width: 320px;
    height: 320px;
    border-radius: 50%;
    filter: blur(60px);
}

.glow-peach { top: 60px; left: -100px; background: var(--peach); opacity: 0.7; }
.glow-sage { bottom: -60px; right: -100px; background: var(--sage); opacity: 0.8; }

.wordmark {
    display: none;
}

.content {
    position: relative;
    z-index: 2;
    max-width: 640px;
    margin: 0 auto;
    padding: 32px var(--gutter) 130px;      /* bottom: room for the phone's bottom nav */
}

.visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
}

.note {
    font-size: 17px;
    font-weight: 600;
}

/* =========================================================
   Phone: one list. The two columns "disappear" (display: contents)
   so Sign out can move to the very end with `order`
   ========================================================= */
.layout {
    display: flex;
    flex-direction: column;
    gap: 14px;
}

.col {
    display: contents;
}

.sign-out {
    order: 1;
}

/* glass recipe from the design */
.glass-card {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 18px 20px;
    border: var(--glass-border);
    border-radius: var(--radius-card);
    background: var(--glass-light-bg);
    -webkit-backdrop-filter: var(--glass-blur);
    backdrop-filter: var(--glass-blur);
    box-shadow: var(--glass-shadow);
    color: var(--ink);
}

.glass-card.peach {
    background: rgba(246, 196, 164, 0.6);
}

.card-title {
    margin: 0 0 6px;
    font-family: var(--font);
    font-size: 24px;
    font-weight: 800;
    letter-spacing: -0.04em;
}

/* =========================================================
   Profile
   ========================================================= */
.profile {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.who {
    display: flex;
    align-items: center;
    gap: 16px;
}

.avatar {
    position: relative;
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    width: 88px;
    height: 88px;
    border: 4px solid var(--white);
    border-radius: 50%;
    background: var(--peach);
    box-shadow: var(--shadow-soft);
    font-size: 38px;
    font-weight: 800;
}

.avatar-spirit {
    width: 76%;
    height: 76%;
    object-fit: contain;
}

/* the newest Spirit peeking from the bottom-right corner */
.peek {
    position: absolute;
    right: -12px;
    bottom: -8px;
    width: 42px;
    height: 42px;
    object-fit: contain;
}

.who-text {
    min-width: 0;
}

.name {
    margin: 0;
    font-family: var(--font);
    font-size: 40px;
    font-weight: 800;
    line-height: 1;
    letter-spacing: -0.06em;
    overflow-wrap: anywhere;
}

.joined {
    margin: 10px 0 0;
    font-size: 16px;
    font-weight: 600;
    color: var(--muted);
}

.level-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px 12px;
}

.level-chip {
    padding: 4px 14px;
    border-radius: var(--radius-pill);
    background: var(--ink);
    color: var(--white);
    font-size: 16px;
    font-weight: 800;
}

.level-note {
    font-size: 16px;
    font-weight: 700;
}

.xp-bar {
    height: 10px;
    margin-top: 10px;
    overflow: hidden;
    border-radius: var(--radius-pill);
    background: rgba(22, 20, 18, 0.12);
}

.xp-fill {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: var(--terracotta);
}

/* coins · Spirits · places: its own glass strip on phones */
.stats {
    display: flex;
    justify-content: space-around;
    margin: 0;
    padding: 16px 12px;
    border: var(--glass-border);
    border-radius: var(--radius-card);
    background: var(--glass-light-bg);
    -webkit-backdrop-filter: var(--glass-blur);
    backdrop-filter: var(--glass-blur);
    box-shadow: var(--glass-shadow);
    text-align: center;
}

.stat {
    display: flex;
    flex-direction: column-reverse;       /* number on top, label under it */
}

.stat dd {
    margin: 0;
    font-size: 32px;
    font-weight: 800;
    letter-spacing: -0.06em;
    line-height: 1;
}

.stat dt {
    margin-top: 4px;
    font-size: 16px;
    font-weight: 700;
    color: var(--muted);
}

/* outlined pill (Edit profile on laptop, Sign out) */
.outline-btn {
    min-height: 54px;
    padding: 0 24px;
    border: 1.5px solid var(--ink);
    border-radius: var(--radius-pill);
    background: rgba(255, 255, 255, 0.35);
    color: var(--ink);
    font-size: 18px;
    font-weight: 800;
}

/* phone: Edit profile is in the Account list instead */
.edit-btn {
    display: none;
}

/* =========================================================
   Spirits companion
   ========================================================= */
.companion {
    flex-direction: row;
    align-items: center;
    gap: 14px;
    min-height: 84px;
    text-decoration: none;
}

.companion:hover {
    color: var(--ink);
}

.companion-pics {
    display: flex;
    flex-shrink: 0;
}

.companion-pics img {
    width: 48px;
    height: 48px;
    object-fit: contain;
}

.companion-pics img + img {
    margin-left: -12px;
}

.companion-text {
    flex: 1;
    font-size: 18px;
    font-weight: 800;
    line-height: 1.25;
}

.arrow {
    flex-shrink: 0;
    width: 40px;
    height: 22px;
    fill: none;
    stroke: currentColor;
    stroke-width: 3;
    stroke-linecap: round;
    stroke-linejoin: round;
}

/* =========================================================
   Settings
   ========================================================= */
.setting,
.account-row {
    display: flex;
    align-items: center;
    gap: 14px;
    min-height: 64px;
    padding: 10px 0;
    border-top: 1px solid rgba(22, 20, 18, 0.1);
}

.card-title + .setting,
.card-title + .account-row {
    border-top: 0;
}

.setting.stacked {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
}

.setting-text {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-width: 0;
}

.setting-name {
    margin: 0;
    font-size: 18px;
    font-weight: 800;
}

.setting-note {
    font-size: 16px;
    font-weight: 600;
    color: var(--muted);
}

/* switch: 58 × 34 pill, ink when on with the knob on the right */
.switch {
    position: relative;
    flex-shrink: 0;
    width: 58px;
    height: 34px;
    padding: 0;
    border: 0;
    border-radius: var(--radius-pill);
    background: rgba(22, 20, 18, 0.18);
    transition: background 0.2s ease;
}

.knob {
    position: absolute;
    top: 3px;
    left: 3px;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: var(--white);
    box-shadow: 0 2px 6px rgba(22, 20, 18, 0.25);
    transition: transform 0.2s ease;
}

.switch[aria-checked="true"] {
    background: var(--ink);
}

.switch[aria-checked="true"] .knob {
    transform: translateX(24px);
}

/* segmented control: 3px padded track, the chosen option is an ink pill */
.segmented {
    display: grid;
    grid-auto-columns: 1fr;
    grid-auto-flow: column;
    padding: 3px;
    border-radius: var(--radius-pill);
    background: rgba(22, 20, 18, 0.06);
}

.segmented button {
    min-height: 48px;
    border: 0;
    border-radius: var(--radius-pill);
    background: transparent;
    color: var(--ink);
    font-size: 17px;
    font-weight: 800;
}

.segmented button.on {
    background: var(--ink);
    color: var(--white);
}

.setting-warning {
    margin: 0;
    padding: 12px 14px;
    border-radius: 14px;
    background: var(--error-bg);
    color: var(--error-ink);
    font-size: 16px;
    font-weight: 700;
}

/* Account rows (named account-row because Bootstrap already styles the name "row") */
.account-row {
    width: 100%;
    border-right: 0;
    border-bottom: 0;
    border-left: 0;
    background: none;
    color: var(--ink);
    text-align: left;
}

button.account-row .setting-name {
    flex: 1;
}

.row-value {
    font-size: 17px;
    font-weight: 700;
    color: var(--muted);
}

/* =========================================================
   Laptop (1024px+): profile column left, settings right
   ========================================================= */
@media (min-width: 1024px) {
    .wordmark {
        display: block;
        position: absolute;
        top: 30px;
        left: 7%;
        z-index: 2;
        margin: 0;
        font-size: 28px;
        font-weight: 800;
        letter-spacing: -0.05em;
    }

    .content {
        max-width: none;
        padding: 110px 7% 60px;
    }

    .glow {
        width: 520px;
        height: 520px;
        filter: blur(80px);
    }

    .layout {
        display: grid;
        grid-template-columns: 400px minmax(0, 1fr);
        gap: 32px;                  /* both columns are as tall as the taller one */
    }

    .col {
        display: flex;
        flex-direction: column;
        gap: 16px;
    }

    /* the profile becomes a glass card with the stats inside, between hairlines */
    .profile {
        padding: 24px;
        border: var(--glass-border);
        border-radius: var(--radius-card);
        background: rgba(246, 196, 164, 0.35);
        -webkit-backdrop-filter: var(--glass-blur);
        backdrop-filter: var(--glass-blur);
        box-shadow: var(--glass-shadow);
    }

    .avatar {
        width: 104px;
        height: 104px;
        font-size: 44px;
    }

    .name {
        font-size: 44px;
    }

    .stats {
        padding: 14px 0;
        border: 0;
        border-top: 1px solid rgba(22, 20, 18, 0.12);
        border-bottom: 1px solid rgba(22, 20, 18, 0.12);
        border-radius: 0;
        background: none;
        -webkit-backdrop-filter: none;
        backdrop-filter: none;
        box-shadow: none;
    }

    .edit-btn {
        display: block;
    }

    /* Sign out sits at the bottom, level with the end of the settings column */
    .sign-out {
        order: 0;
        margin-top: auto;
    }

    .glass-card {
        padding: 22px 24px;
    }

    /* keep the A / A / A and Auto / Morning / Night buttons compact on the wide cards */
    .segmented {
        max-width: 480px;
    }

    /* a little tighter, so the whole page fits a 1440 × 900 screen like the design */
    .content {
        padding-top: 100px;
    }

    .glass-card {
        padding: 18px 24px;
    }

    .setting,
    .account-row {
        min-height: 56px;
        padding: 6px 0;
    }

    .segmented button {
        min-height: 44px;
    }
}
</style>
