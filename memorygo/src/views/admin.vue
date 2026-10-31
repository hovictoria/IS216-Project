<!--------------------------------------------------------------------------------------------------------
PSEUDOCODE
filename:   views/admin.vue
purpose:    - PROTOTYPE admin page: see every user, edit their details, delete them
            - phone: one card per user. laptop: a table.
            - Edit opens a side sheet (bottom sheet on phones), Delete asks "are you sure?" first
data:       mock users below. To make it real, replace the three functions marked  >> API <<
            (loadUsers, saveUser, removeUser) with calls to your server.
note:       the real check that someone is an admin MUST happen on the server (see the answer),
            hiding this page in the router is not enough.
---------------------------------------------------------------------------------------------------------->

<script setup>
import { ref, reactive, computed, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
// import AppNav from '@/components/ui/AppNav.vue'   // add <AppNav /> at the top of the template if you want the tab bar here

// true  = fake users on this page only (no server needed, handy for design work)
// false = the real server: GET / PATCH / DELETE  /api/admin/users
const USE_MOCK = false

/* ---------- Mock data ---------- */
const auth = useAuthStore()
const CURRENT_ADMIN_ID = USE_MOCK ? 1 : auth.user?.id   // the person using this page (can't delete or demote themselves)

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function daysAgo(n) {
    const d = new Date()
    d.setDate(d.getDate() - n)
    return d.toLocaleDateString('en-CA') // YYYY-MM-DD
}

const mockUsers = () => [
    { id: 1, name: 'Victoria Ho', email: 'victoria@memorygo.app', role: 'admin', xp: 640, coins: 310, streak: 12, lastPlayed: daysAgo(0), joined: '2026-06-02' },
    { id: 2, name: 'Mary Tan', email: 'mary.tan@example.com', role: 'player', xp: 420, coins: 205, streak: 5, lastPlayed: daysAgo(0), joined: '2026-07-14' },
    { id: 3, name: 'Lim Ah Kow', email: 'ahkow.lim@example.com', role: 'player', xp: 310, coins: 150, streak: 0, lastPlayed: daysAgo(4), joined: '2026-07-20' },
    { id: 4, name: 'Siti Rahman', email: 'siti.r@example.com', role: 'player', xp: 880, coins: 455, streak: 21, lastPlayed: daysAgo(1), joined: '2026-06-18' },
    { id: 5, name: 'Raj Kumar', email: 'raj.kumar@example.com', role: 'player', xp: 150, coins: 80, streak: 2, lastPlayed: daysAgo(1), joined: '2026-09-03' },
    { id: 6, name: 'Chen Mei Ling', email: 'meiling.chen@example.com', role: 'player', xp: 95, coins: 40, streak: 0, lastPlayed: daysAgo(12), joined: '2026-09-21' },
    { id: 7, name: 'David Ong', email: 'david.ong@example.com', role: 'admin', xp: 20, coins: 10, streak: 1, lastPlayed: daysAgo(0), joined: '2026-10-01' },
    { id: 8, name: 'Aisha Binte Yusof', email: 'aisha.y@example.com', role: 'player', xp: 560, coins: 270, streak: 8, lastPlayed: daysAgo(0), joined: '2026-07-30' },
    { id: 9, name: 'Tan Boon Huat', email: 'boonhuat.tan@example.com', role: 'player', xp: 0, coins: 0, streak: 0, lastPlayed: null, joined: '2026-10-25' },
    { id: 10, name: 'Grace Lee', email: 'grace.lee@example.com', role: 'player', xp: 335, coins: 165, streak: 3, lastPlayed: daysAgo(2), joined: '2026-08-11' },
]

/* >> API << load every user */
async function loadUsers() {
    if (USE_MOCK) {
        await delay(500)
        return mockUsers()
    }
    const { data } = await api.get('/admin/users')
    return data
}

/* >> API << save changes to one user */
async function saveUser(id, changes) {
    if (USE_MOCK) return delay(500)
    await api.patch(`/admin/users/${id}`, changes)
}

/* >> API << delete one user */
async function removeUser(id) {
    if (USE_MOCK) return delay(500)
    await api.delete(`/admin/users/${id}`)
}

// the server's own message (e.g. "Please enter a valid email address.") if it sent one
const reason = (e, fallback) => e.response?.data?.message || fallback

/* ---------- Page state ---------- */
const users = ref([])
const loading = ref(true)
const loadError = ref('')

async function load() {
    loading.value = true
    loadError.value = ''
    try {
        users.value = await loadUsers()
    } catch (e) {
        console.error(e)
        loadError.value = reason(e, 'Could not load the users. Please try again.')
    } finally {
        loading.value = false
    }
}
onMounted(load)

/* ---------- Search, filter, sort ---------- */
const query = ref('')
const roleFilter = ref('all') // all | player | admin
const sortBy = ref('name')    // name | recent | xp

const shown = computed(() => {
    const q = query.value.trim().toLowerCase()

    const list = users.value.filter((u) => {
        if (roleFilter.value !== 'all' && u.role !== roleFilter.value) return false
        return !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    })

    return list.sort((a, b) => {
        if (sortBy.value === 'xp') return b.xp - a.xp
        if (sortBy.value === 'recent') return (b.lastPlayed || '').localeCompare(a.lastPlayed || '')
        return a.name.localeCompare(b.name)
    })
})

const stats = computed(() => {
    const today = daysAgo(0)
    return {
        total: users.value.length,
        today: users.value.filter((u) => u.lastPlayed === today).length,
        admins: users.value.filter((u) => u.role === 'admin').length,
    }
})

/* ---------- Display helpers ---------- */
const avatarColours = ['#f6c4a4', '#f3d57c', '#cfe5c8', '#c9daf0']
// ids are long random strings, so turn the id into a number to pick a colour
const avatarColour = (u) => avatarColours[[...String(u.id)].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % avatarColours.length]
const initial = (u) => u.name.trim().charAt(0).toUpperCase()

function lastPlayedLabel(date) {
    if (!date) return 'Never'
    const days = Math.round((Date.parse(daysAgo(0)) - Date.parse(date)) / 86400000)
    if (days <= 0) return 'Today'
    if (days === 1) return 'Yesterday'
    return `${days} days ago`
}

/* ---------- Toast ---------- */
const toast = ref('')
let toastTimer
function showToast(message) {
    toast.value = message
    clearTimeout(toastTimer)
    toastTimer = setTimeout(() => (toast.value = ''), 3200)
}

/* ---------- Edit ---------- */
const editing = ref(false)
const busy = ref(false)
const form = reactive({ id: null, name: '', email: '', role: 'player', xp: 0, coins: 0, streak: 0 })
const errors = ref({})
const nameInput = ref(null)

function openEdit(user) {
    Object.assign(form, {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        xp: user.xp,
        coins: user.coins,
        streak: user.streak,
    })
    errors.value = {}
    editing.value = true
    nextTick(() => nameInput.value?.focus())
}

function closeEdit() {
    if (busy.value) return
    editing.value = false
}

function validate() {
    const e = {}
    if (!form.name.trim()) e.name = 'Please enter a name.'
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) e.email = 'Please enter a valid email address.'
    for (const key of ['xp', 'coins', 'streak']) {
        const n = Number(form[key])
        if (form[key] === '' || !Number.isInteger(n) || n < 0) e[key] = 'Use a whole number, 0 or more.'
    }
    return e
}

async function submitEdit() {
    errors.value = validate()
    if (Object.keys(errors.value).length) return

    const changes = {
        name: form.name.trim(),
        email: form.email.trim(),
        role: form.role,
        xp: Number(form.xp),
        coins: Number(form.coins),
        streak: Number(form.streak),
    }

    busy.value = true
    try {
        await saveUser(form.id, changes)
        const i = users.value.findIndex((u) => u.id === form.id)
        users.value[i] = { ...users.value[i], ...changes }
        editing.value = false
        showToast(`Saved changes to ${changes.name}`)
    } catch (e) {
        console.error(e)
        errors.value = { form: reason(e, 'Could not save. Please try again.') }
    } finally {
        busy.value = false
    }
}

/* ---------- Delete ---------- */
const deleting = ref(null) // the user being deleted, or null
const deleteError = ref('')
const cancelBtn = ref(null)

function askDelete(user) {
    deleting.value = user
    deleteError.value = ''
    nextTick(() => cancelBtn.value?.focus())
}

function closeDelete() {
    if (busy.value) return
    deleting.value = null
}

async function confirmDelete() {
    const user = deleting.value
    busy.value = true
    try {
        await removeUser(user.id)
        users.value = users.value.filter((u) => u.id !== user.id)
        deleting.value = null
        showToast(`${user.name} was deleted`)
    } catch (e) {
        console.error(e)
        deleteError.value = reason(e, 'Could not delete. Please try again.')
    } finally {
        busy.value = false
    }
}

/* Esc closes whichever panel is open */
function onKey(e) {
    if (e.key !== 'Escape') return
    if (deleting.value) closeDelete()
    else if (editing.value) closeEdit()
}
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => {
    window.removeEventListener('keydown', onKey)
    clearTimeout(toastTimer)
})
</script>

<template>
  <div class="admin-page">
    <main class="admin-main">

      <!-- Heading -->
      <header class="head">
        <div>
          <p class="eyebrow"><span class="dot"></span>Admin</p>
          <h1 class="title">
            <span class="title-mark">Users
              <svg viewBox="0 0 100 12" preserveAspectRatio="none" aria-hidden="true">
                <path d="M2 7 C 25 2.5, 55 2.5, 98 6 M 20 10 C 45 6.5, 70 7.5, 90 10" />
              </svg>
            </span>
          </h1>
        </div>

        <ul class="stats" aria-label="Summary">
          <li class="stat"><strong>{{ stats.total }}</strong><span>users</span></li>
          <li class="stat"><strong>{{ stats.today }}</strong><span>played today</span></li>
          <li class="stat"><strong>{{ stats.admins }}</strong><span>admins</span></li>
        </ul>
      </header>

      <!-- Search + filters -->
      <section class="toolbar" aria-label="Find users">
        <label class="search">
          <span class="sr-only">Search by name or email</span>
          <i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
          <input v-model="query" type="search" placeholder="Search by name or email" />
        </label>

        <div class="chips" role="group" aria-label="Show">
          <button v-for="f in [['all', 'Everyone'], ['player', 'Players'], ['admin', 'Admins']]" :key="f[0]"
            type="button" class="chip" :class="{ on: roleFilter === f[0] }" :aria-pressed="roleFilter === f[0]"
            @click="roleFilter = f[0]">{{ f[1] }}</button>
        </div>

        <label class="sort">
          <span>Sort by</span>
          <select v-model="sortBy">
            <option value="name">Name</option>
            <option value="recent">Last played</option>
            <option value="xp">Most XP</option>
          </select>
        </label>
      </section>

      <!-- States -->
      <p v-if="loading" class="note" role="status">Loading users…</p>

      <div v-else-if="loadError" class="note error" role="alert">
        {{ loadError }}
        <button type="button" class="link" @click="load">Try again</button>
      </div>

      <p v-else-if="!shown.length" class="note" role="status">
        No users match “{{ query }}”.
        <button type="button" class="link" @click="query = ''; roleFilter = 'all'">Clear search</button>
      </p>

      <template v-else>
        <!-- Laptop: table -->
        <div class="table-wrap">
          <table class="users">
            <caption class="sr-only">All users</caption>
            <thead>
              <tr>
                <th scope="col">User</th>
                <th scope="col">Role</th>
                <th scope="col" class="num">Streak</th>
                <th scope="col" class="num">XP</th>
                <th scope="col" class="num">Coins</th>
                <th scope="col">Last played</th>
                <th scope="col"><span class="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="u in shown" :key="u.id">
                <td>
                  <div class="who">
                    <span class="avatar" :style="{ background: avatarColour(u) }" aria-hidden="true">{{ initial(u) }}</span>
                    <div>
                      <div class="name">{{ u.name }} <span v-if="u.id === CURRENT_ADMIN_ID" class="you">You</span></div>
                      <div class="email">{{ u.email }}</div>
                    </div>
                  </div>
                </td>
                <td><span class="role" :class="u.role">{{ u.role === 'admin' ? 'Admin' : 'Player' }}</span></td>
                <td class="num">{{ u.streak }}</td>
                <td class="num">{{ u.xp }}</td>
                <td class="num">{{ u.coins }}</td>
                <td>{{ lastPlayedLabel(u.lastPlayed) }}</td>
                <td>
                  <div class="actions">
                    <button type="button" class="btn-small" :aria-label="`Edit ${u.name}`" @click="openEdit(u)">
                      <i class="fa-solid fa-pen" aria-hidden="true"></i>Edit
                    </button>
                    <button type="button" class="btn-small danger" :aria-label="`Delete ${u.name}`"
                      :disabled="u.id === CURRENT_ADMIN_ID" @click="askDelete(u)">
                      <i class="fa-solid fa-trash" aria-hidden="true"></i>Delete
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Phone: cards -->
        <ul class="cards">
          <li v-for="u in shown" :key="u.id" class="card">
            <div class="who">
              <span class="avatar" :style="{ background: avatarColour(u) }" aria-hidden="true">{{ initial(u) }}</span>
              <div class="grow">
                <div class="name">{{ u.name }} <span v-if="u.id === CURRENT_ADMIN_ID" class="you">You</span></div>
                <div class="email">{{ u.email }}</div>
              </div>
              <span class="role" :class="u.role">{{ u.role === 'admin' ? 'Admin' : 'Player' }}</span>
            </div>

            <dl class="facts">
              <div><dt>Streak</dt><dd>{{ u.streak }}</dd></div>
              <div><dt>XP</dt><dd>{{ u.xp }}</dd></div>
              <div><dt>Coins</dt><dd>{{ u.coins }}</dd></div>
              <div><dt>Played</dt><dd>{{ lastPlayedLabel(u.lastPlayed) }}</dd></div>
            </dl>

            <div class="actions">
              <button type="button" class="btn-small" :aria-label="`Edit ${u.name}`" @click="openEdit(u)">
                <i class="fa-solid fa-pen" aria-hidden="true"></i>Edit
              </button>
              <button type="button" class="btn-small danger" :aria-label="`Delete ${u.name}`"
                :disabled="u.id === CURRENT_ADMIN_ID" @click="askDelete(u)">
                <i class="fa-solid fa-trash" aria-hidden="true"></i>Delete
              </button>
            </div>
          </li>
        </ul>
      </template>
    </main>

    <!-- Edit sheet -->
    <Transition name="fade">
      <div v-if="editing" class="scrim" @click.self="closeEdit"></div>
    </Transition>
    <Transition name="slide">
      <aside v-if="editing" class="sheet" role="dialog" aria-modal="true" aria-labelledby="edit-title">
        <header class="sheet-head">
          <h2 id="edit-title">Edit user</h2>
          <button type="button" class="close" aria-label="Close" @click="closeEdit">
            <i class="fa-solid fa-xmark" aria-hidden="true"></i>
          </button>
        </header>

        <form class="form" novalidate @submit.prevent="submitEdit">
          <div class="field">
            <label for="f-name">Display name</label>
            <input id="f-name" ref="nameInput" v-model="form.name" type="text" autocomplete="off"
              :aria-invalid="!!errors.name" aria-describedby="e-name" />
            <p id="e-name" class="err" v-if="errors.name">{{ errors.name }}</p>
          </div>

          <div class="field">
            <label for="f-email">Email</label>
            <input id="f-email" v-model="form.email" type="email" autocomplete="off"
              :aria-invalid="!!errors.email" aria-describedby="e-email" />
            <p id="e-email" class="err" v-if="errors.email">{{ errors.email }}</p>
          </div>

          <div class="field">
            <label for="f-role">Role</label>
            <select id="f-role" v-model="form.role" :disabled="form.id === CURRENT_ADMIN_ID">
              <option value="player">Player</option>
              <option value="admin">Admin</option>
            </select>
            <p class="hint" v-if="form.id === CURRENT_ADMIN_ID">You can't change your own role.</p>
          </div>

          <div class="row3">
            <div class="field">
              <label for="f-streak">Streak</label>
              <input id="f-streak" v-model="form.streak" type="number" min="0" inputmode="numeric"
                :aria-invalid="!!errors.streak" aria-describedby="e-streak" />
              <p id="e-streak" class="err" v-if="errors.streak">{{ errors.streak }}</p>
            </div>
            <div class="field">
              <label for="f-xp">XP</label>
              <input id="f-xp" v-model="form.xp" type="number" min="0" inputmode="numeric"
                :aria-invalid="!!errors.xp" aria-describedby="e-xp" />
              <p id="e-xp" class="err" v-if="errors.xp">{{ errors.xp }}</p>
            </div>
            <div class="field">
              <label for="f-coins">Coins</label>
              <input id="f-coins" v-model="form.coins" type="number" min="0" inputmode="numeric"
                :aria-invalid="!!errors.coins" aria-describedby="e-coins" />
              <p id="e-coins" class="err" v-if="errors.coins">{{ errors.coins }}</p>
            </div>
          </div>

          <p v-if="errors.form" class="err" role="alert">{{ errors.form }}</p>

          <div class="form-actions">
            <button type="submit" class="btn-primary" :disabled="busy">
              {{ busy ? 'Saving…' : 'Save changes' }}
            </button>
            <button type="button" class="link" :disabled="busy" @click="closeEdit">Cancel</button>
          </div>
        </form>
      </aside>
    </Transition>

    <!-- Delete confirmation -->
    <Transition name="fade">
      <div v-if="deleting" class="scrim centre" @click.self="closeDelete">
        <div class="dialog" role="alertdialog" aria-modal="true" aria-labelledby="del-title" aria-describedby="del-text">
          <h2 id="del-title">Delete {{ deleting.name }}?</h2>
          <p id="del-text">
            This removes their account and all their progress (streak, XP and coins).
            This can't be undone.
          </p>
          <p v-if="deleteError" class="err" role="alert">{{ deleteError }}</p>
          <div class="dialog-actions">
            <button ref="cancelBtn" type="button" class="btn-outline" :disabled="busy" @click="closeDelete">Keep user</button>
            <button type="button" class="btn-danger" :disabled="busy" @click="confirmDelete">
              {{ busy ? 'Deleting…' : 'Yes, delete' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Toast -->
    <Transition name="fade">
      <div v-if="toast" class="toast" role="status"><span class="dot"></span>{{ toast }}</div>
    </Transition>
  </div>
</template>

<style>
@import url("https://fonts.googleapis.com/css2?family=Inter+Tight:wght@500;600;700;800&display=swap");
</style>

<style scoped>
.admin-page {
    --paper: #f4f0e8;
    --ink: #161412;
    --muted: #5a5148;
    --peach: #f6c4a4;
    --accent: #c9673f;
    --danger: #b4492a;
    --blue: #2f6fb0;
    --green: #3f8f4e;
    --green-dot: #8fd18b;
    --line: rgba(22, 20, 18, 0.14);
    --glass-bg: rgba(255, 255, 255, 0.82);
    --glass-border: rgba(255, 255, 255, 0.95);
    --glass-shadow: inset 0 1px 0 #fff, 0 10px 28px rgba(22, 20, 18, 0.12);

    min-height: 100vh;
    background: var(--paper);
    color: var(--ink);
    font-family: 'Inter Tight', 'Helvetica Neue', Arial, sans-serif;
    font-size: 1.05rem;
    font-weight: 500;
}

.admin-main {
    max-width: 1100px;
    margin: 0 auto;
    padding: 1.5rem 1rem 6rem;
}

/* don't rely on Bootstrap for this: padding stays inside the width */
.admin-page *,
.admin-page *::before,
.admin-page *::after {
    box-sizing: border-box;
}

.sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
}

:focus-visible {
    outline: 3px solid var(--blue);
    outline-offset: 3px;
}

/* ---------- Heading ---------- */
.head {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    justify-content: space-between;
    gap: 1.25rem;
    margin-bottom: 1.5rem;
}

.eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    margin: 0 0 12px;
    padding: 6px 14px;
    border-radius: 999px;
    background: var(--ink);
    color: #fff;
    font-size: 0.9rem;
    font-weight: 700;
}

.dot {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: var(--green-dot);
}

.title {
    margin: 0;
    font-size: clamp(2.4rem, 7vw, 3.4rem);
    font-weight: 700;
    line-height: 1;
    letter-spacing: -0.045em;
}

.title-mark {
    position: relative;
    display: inline-block;
    padding-bottom: 4px;
}

.title-mark svg {
    position: absolute;
    left: -2%;
    bottom: -9px;
    width: 104%;
    height: 12px;
}

.title-mark path {
    fill: none;
    stroke: var(--accent);
    stroke-width: 2.8;
    stroke-linecap: round;
}

.stats {
    display: flex;
    gap: 10px;
    margin: 0;
    padding: 0;
    list-style: none;
}

.stat {
    display: flex;
    flex-direction: column;
    min-width: 96px;
    padding: 10px 16px;
    border: 1px solid var(--glass-border);
    border-radius: 20px;
    background: var(--glass-bg);
    box-shadow: var(--glass-shadow);
}

.stat strong {
    font-size: 1.7rem;
    font-weight: 800;
    line-height: 1.1;
    letter-spacing: -0.03em;
}

.stat span {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--muted);
}

/* ---------- Toolbar ---------- */
.toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 12px;
    margin-bottom: 1.25rem;
}

.search {
    position: relative;
    flex: 1 1 260px;
}

.search i {
    position: absolute;
    left: 18px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--muted);
}

.search input {
    width: 100%;
    height: 52px;
    padding: 0 18px 0 46px;
    border: 1.5px solid var(--line);
    border-radius: 999px;
    background: #fff;
    font: inherit;
    color: var(--ink);
}

.chips {
    display: flex;
    gap: 6px;
}

.chip {
    height: 48px;
    padding: 0 18px;
    border: 1.5px solid var(--ink);
    border-radius: 999px;
    background: transparent;
    font: inherit;
    font-weight: 700;
    color: var(--ink);
}

.chip.on {
    background: var(--ink);
    color: #fff;
}

.sort {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
    color: var(--muted);
}

.sort select {
    height: 48px;
    padding: 0 14px;
    border: 1.5px solid var(--line);
    border-radius: 999px;
    background: #fff;
    font: inherit;
    font-weight: 700;
    color: var(--ink);
}

/* ---------- States ---------- */
.note {
    padding: 2rem 1rem;
    text-align: center;
    color: var(--muted);
    font-weight: 600;
}

.note.error {
    color: var(--danger);
}

.link {
    margin-left: 8px;
    padding: 6px 4px;
    border: 0;
    background: none;
    font: inherit;
    font-weight: 700;
    color: var(--ink);
    text-decoration: underline;
    text-decoration-thickness: 2px;
    text-underline-offset: 5px;
}

/* ---------- Shared bits ---------- */
.who {
    display: flex;
    align-items: center;
    gap: 12px;
}

.grow {
    flex: 1;
    min-width: 0;
}

.avatar {
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 46px;
    height: 46px;
    border: 3px solid #fff;
    border-radius: 50%;
    box-shadow: 0 4px 12px rgba(22, 20, 18, 0.12);
    font-weight: 800;
    font-size: 1.1rem;
}

.name {
    font-weight: 700;
    letter-spacing: -0.01em;
}

.email {
    font-size: 0.92rem;
    color: var(--muted);
    overflow-wrap: anywhere;
}

.card .email {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.you {
    margin-left: 6px;
    padding: 2px 9px;
    border-radius: 999px;
    background: var(--peach);
    font-size: 0.75rem;
    font-weight: 800;
}

.role {
    display: inline-block;
    padding: 4px 12px;
    border-radius: 999px;
    border: 1.5px solid var(--line);
    background: #fff;
    font-size: 0.85rem;
    font-weight: 700;
}

.role.admin {
    border-color: var(--ink);
    background: var(--ink);
    color: #fff;
}

.actions {
    display: flex;
    gap: 8px;
}

.btn-small {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-height: 44px;
    padding: 0 16px;
    border: 1.5px solid var(--ink);
    border-radius: 999px;
    background: #fff;
    font: inherit;
    font-size: 0.95rem;
    font-weight: 700;
    color: var(--ink);
}

.btn-small:hover:not(:disabled) {
    background: #fffaf3;
    box-shadow: 0 0 0 2px var(--ink);
}

.btn-small.danger {
    border-color: var(--danger);
    color: var(--danger);
}

.btn-small.danger:hover:not(:disabled) {
    box-shadow: 0 0 0 2px var(--danger);
}

.btn-small:disabled {
    opacity: 0.35;
    cursor: not-allowed;
}

/* ---------- Table (laptop) ---------- */
.table-wrap {
    display: none;
    overflow-x: auto;
    border: 1px solid var(--glass-border);
    border-radius: 26px;
    background: var(--glass-bg);
    box-shadow: var(--glass-shadow);
}

.users {
    width: 100%;
    border-collapse: collapse;
}

.users th {
    padding: 14px 16px;
    text-align: left;
    font-size: 0.85rem;
    font-weight: 700;
    letter-spacing: 0.02em;
    color: var(--muted);
    border-bottom: 1.5px solid var(--line);
    white-space: nowrap;
}

.users td {
    padding: 14px 16px;
    border-bottom: 1px solid var(--line);
    vertical-align: middle;
}

.users tbody tr:last-child td {
    border-bottom: 0;
}

.users tbody tr:hover {
    background: rgba(246, 196, 164, 0.18);
}

.num {
    text-align: right !important;
    font-variant-numeric: tabular-nums;
}

/* ---------- Cards (phone) ---------- */
.cards {
    display: grid;
    gap: 12px;
    margin: 0;
    padding: 0;
    list-style: none;
}

.card {
    padding: 16px;
    border: 1px solid var(--glass-border);
    border-radius: 24px;
    background: var(--glass-bg);
    box-shadow: var(--glass-shadow);
}

.facts {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    margin: 14px 0;
    padding: 12px 0;
    border-top: 1px solid var(--line);
    border-bottom: 1px solid var(--line);
}

.facts dt {
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--muted);
}

.facts dd {
    margin: 0;
    font-size: 1rem;
    font-weight: 700;
}

.card .actions .btn-small {
    flex: 1;
}

@media (min-width: 768px) {
    .admin-main {
        padding: 5.5rem 2rem 4rem;   /* room for the nav pill at the top-right */
    }

    .table-wrap {
        display: block;
    }

    .cards {
        display: none;
    }
}

/* ---------- Edit sheet ---------- */
.scrim {
    position: fixed;
    inset: 0;
    z-index: 40;
    background: rgba(22, 20, 18, 0.38);
}

.scrim.centre {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    z-index: 60;
}

.sheet {
    position: fixed;
    z-index: 50;
    right: 0;
    bottom: 0;
    left: 0;
    max-height: 92vh;
    overflow-y: auto;
    padding: 20px 20px 28px;
    border-radius: 30px 30px 0 0;
    background: var(--paper);
    box-shadow: 0 -10px 40px rgba(22, 20, 18, 0.25);
}

.sheet-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 18px;
}

.sheet-head h2 {
    margin: 0;
    font-size: 1.8rem;
    font-weight: 700;
    letter-spacing: -0.04em;
}

.close {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    border: 1px solid var(--glass-border);
    border-radius: 50%;
    background: var(--glass-bg);
    box-shadow: var(--glass-shadow);
    font-size: 1.1rem;
    color: var(--ink);
}

.form {
    display: grid;
    gap: 16px;
}

.field label {
    display: block;
    margin-bottom: 6px;
    font-weight: 700;
}

.field input,
.field select {
    width: 100%;
    height: 54px;
    padding: 0 16px;
    border: 1.5px solid var(--line);
    border-radius: 16px;
    background: #fff;
    font: inherit;
    color: var(--ink);
}

.field input[aria-invalid='true'] {
    border-color: var(--danger);
}

.field select:disabled {
    background: #ece7dc;
    color: var(--muted);
}

.row3 {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
}

.err {
    margin: 6px 0 0;
    font-size: 0.92rem;
    font-weight: 700;
    color: var(--danger);
}

.hint {
    margin: 6px 0 0;
    font-size: 0.92rem;
    color: var(--muted);
}

.form-actions {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    margin-top: 6px;
}

.btn-primary,
.btn-danger,
.btn-outline {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 58px;
    padding: 0 26px;
    border-radius: 999px;
    border: 0;
    font: inherit;
    font-size: 1.1rem;
    font-weight: 700;
}

.btn-primary {
    width: 100%;
    background: var(--ink);
    color: #fff;
}

.btn-primary::before {
    content: '';
    width: 9px;
    height: 9px;
    margin-right: 10px;
    border-radius: 50%;
    background: var(--green-dot);
}

.btn-danger {
    background: var(--danger);
    color: #fff;
}

.btn-outline {
    border: 2px solid var(--ink);
    background: transparent;
    color: var(--ink);
}

.btn-primary:disabled,
.btn-danger:disabled,
.btn-outline:disabled {
    opacity: 0.45;
    cursor: wait;
}

@media (min-width: 768px) {
    .sheet {
        left: auto;
        top: 0;
        width: 440px;
        max-height: none;
        padding: 28px 28px 32px;
        border-radius: 30px 0 0 30px;
        box-shadow: -10px 0 40px rgba(22, 20, 18, 0.22);
    }
}

/* ---------- Delete dialog ---------- */
.dialog {
    width: 100%;
    max-width: 440px;
    padding: 28px 24px 24px;
    border-radius: 28px;
    background: var(--paper);
    box-shadow: 0 20px 60px rgba(22, 20, 18, 0.35);
}

.dialog h2 {
    margin: 0 0 10px;
    font-size: 1.7rem;
    font-weight: 700;
    letter-spacing: -0.04em;
    line-height: 1.1;
}

.dialog p {
    margin: 0 0 12px;
    color: #3a332d;
}

.dialog-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 18px;
}

.dialog-actions > * {
    flex: 1 1 140px;
}

/* ---------- Toast ---------- */
.toast {
    position: fixed;
    z-index: 70;
    left: 50%;
    bottom: 28px;
    transform: translateX(-50%);
    display: inline-flex;
    align-items: center;
    gap: 10px;
    max-width: calc(100vw - 32px);
    padding: 14px 22px;
    border-radius: 999px;
    background: var(--ink);
    color: #fff;
    font-weight: 700;
    box-shadow: 0 10px 30px rgba(22, 20, 18, 0.3);
}

/* ---------- Transitions ---------- */
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}

.slide-enter-active,
.slide-leave-active {
    transition: transform 0.28s ease;
}

.slide-enter-from,
.slide-leave-to {
    transform: translateY(100%);
}

@media (min-width: 768px) {
    .slide-enter-from,
    .slide-leave-to {
        transform: translateX(100%);
    }
}

@media (prefers-reduced-motion: reduce) {
    .fade-enter-active,
    .fade-leave-active,
    .slide-enter-active,
    .slide-leave-active {
        transition: none;
    }
}
</style>