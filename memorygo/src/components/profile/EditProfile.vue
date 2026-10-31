<!--------------------------------------------------------------------------------------------------------
PSEUDOCODE
filename:   components/profile/EditProfile.vue
purpose:    - Edit profile (Me handoff 04 / laptop 02): pick one of your Spirits as your picture + your name,
              and the way to Delete account at the bottom
            - the name check and save are the original Edit Profile code (auth.updateName); the picture is
              saved by our server (PUT /api/me/avatar), which checks you really found that Spirit
            - no Spirits yet → your initial, and a button to the map to go find one
            - after saving: an "Updated!" message with OK, like before
            - Change password moved to its own screen (ChangePassword.vue)
emits:      close, delete (opens DeleteAccount.vue)
---------------------------------------------------------------------------------------------------------->

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useProfileStore } from '@/stores/profile'
import { pictureOf } from '@/lib/spiritPictures'
import TextField from '@/components/ui/TextField.vue'
import PrimaryButton from '@/components/ui/PrimaryButton.vue'
import HandUnderline from '@/components/ui/HandUnderline.vue'
import MeSheet from './MeSheet.vue'

const emit = defineEmits(['close', 'delete'])
const auth = useAuthStore()
const profile = useProfileStore()
const router = useRouter()

// starts as the current name
const savedName = auth.user?.user_metadata?.display_name ?? ''
const name = ref(savedName)
const nameError = ref('')

// starts as the current picture (null = their initial)
const savedSpirit = profile.avatarSpiritId
const spirit = ref(savedSpirit)
const spiritError = ref('')

const saving = ref(false)       // toggles the Save button while saving
const generalError = ref('')    // e.g. nothing was changed

// The "updated" message: holds its text while it shows
const popup = ref('')

// the Spirits they've found, newest first ('kopi' → "Kopi", 'chilli-crab' → "Chilli crab")
const foundSpirits = computed(() => (profile.data?.foundSpiritIds ?? []).map((id) => ({
    id,
    name: id.charAt(0).toUpperCase() + id.slice(1).replace(/-/g, ' '),
})))

const initial = computed(() => (name.value.trim() || auth.user?.email || '?').charAt(0).toUpperCase())

// tap the picked Spirit again to go back to your initial
function pick(id) {
    spirit.value = spirit.value === id ? null : id
}

// Checks the name before saving anything
function checkName() {
    const trimmed = name.value.trim()
    if (!trimmed) nameError.value = 'Please type your name.'
    else if (trimmed.length > 40) nameError.value = 'Please keep your name under 40 letters.'
    return !nameError.value
}

async function save() {
    nameError.value = ''
    spiritError.value = ''
    generalError.value = ''

    const nameChanged = name.value.trim() !== savedName
    const spiritChanged = spirit.value !== savedSpirit

    if (!nameChanged && !spiritChanged) {
        generalError.value = "You haven't changed anything yet."
        return
    }
    // if there is a mistake in the form, stop the save
    if (nameChanged && !checkName()) return

    saving.value = true
    const updated = []

    if (nameChanged) {
        const message = await auth.updateName(name.value.trim())
        if (message) nameError.value = message
        else updated.push('name')
    }

    if (spiritChanged) {
        const message = await profile.setAvatar(spirit.value)
        if (message) spiritError.value = updated.length ? `${message} (Your name was saved.)` : message
        else updated.push('picture')
    }

    saving.value = false

    // show the message once everything is saved
    if (!nameError.value && !spiritError.value) {
        popup.value = updated.length === 2
            ? 'Your name and picture have been updated.'
            : `Your ${updated[0]} has been updated.`
    }
}

function goFindOne() {
    emit('close')
    router.push('/map')
}
</script>

<template>
    <!-- "Updated!" after saving -->
    <MeSheet v-if="popup" label-id="updated-title" @close="emit('close')">
        <template #title>Updated!</template>
        <div class="done">
            <span class="done-tick" aria-hidden="true">
                <svg viewBox="0 0 24 24"><path d="M5 12.5 L10 17 L19 7" /></svg>
            </span>
            <p class="done-text">{{ popup }}</p>
        </div>
        <template #actions>
            <PrimaryButton type="button" @click="emit('close')">OK</PrimaryButton>
        </template>
    </MeSheet>

    <MeSheet v-else label-id="edit-title" @close="emit('close')">
        <template #title>Edit <HandUnderline>profile</HandUnderline></template>

        <!-- ".prevent" stops the browser's default behaviour of reloading the page -->
        <form id="edit-form" novalidate @submit.prevent="save">
            <!-- Picture: one of your Spirits -->
            <section class="picture-card">
                <div class="current">
                    <span class="avatar" aria-hidden="true">
                        <img v-if="spirit" :src="pictureOf(spirit)" alt="" />
                        <template v-else>{{ initial }}</template>
                    </span>
                    <div>
                        <p class="card-title">Profile picture</p>
                        <p class="card-note">
                            {{ foundSpirits.length ? 'Pick one of your Spirits.' : 'Find your first Spirit to use it as your picture.' }}
                        </p>
                    </div>
                </div>

                <div v-if="foundSpirits.length" class="spirit-row" role="radiogroup" aria-label="Your Spirits">
                    <button v-for="s in foundSpirits" :key="s.id" type="button" class="spirit-choice"
                        :class="{ picked: spirit === s.id }" role="radio" :aria-checked="spirit === s.id"
                        :aria-label="s.name" @click="pick(s.id)">
                        <img :src="pictureOf(s.id)" alt="" />
                    </button>
                </div>
                <button v-else type="button" class="outline-btn" @click="goFindOne">Find Spirits on the map</button>

                <p v-if="spiritError" class="form-error" role="alert">{{ spiritError }}</p>
            </section>

            <!-- Name -->
            <!-- autocomplete="name" tells the browser this box is a person's name, so it can offer to fill it -->
            <div>
                <TextField id="edit-name" v-model="name" label="Your name" autocomplete="name" />
                <p class="hint">This is the name shown around the app.</p>
                <p v-if="nameError" class="form-error" role="alert">{{ nameError }}</p>
            </div>

            <p v-if="generalError" class="form-error" role="alert">{{ generalError }}</p>
        </form>

        <button type="button" class="delete-link" @click="emit('delete')">Delete my account</button>

        <template #actions>
            <button type="button" class="outline-btn sheet-cancel" @click="emit('close')">Cancel</button>
            <PrimaryButton type="submit" form="edit-form" :disabled="saving">
                {{ saving ? 'Saving…' : 'Save changes' }}
            </PrimaryButton>
        </template>
    </MeSheet>
</template>

<style scoped>
form {
    display: flex;
    flex-direction: column;
    gap: 18px;
}

/* =========================================================
   Picture card (peach glass)
   ========================================================= */
.picture-card {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 20px;
    border: var(--glass-border);
    border-radius: var(--radius-card);
    background: rgba(246, 196, 164, 0.45);
    box-shadow: var(--glass-shadow);
}

.current {
    display: flex;
    align-items: center;
    gap: 16px;
}

.avatar {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    width: 88px;
    height: 88px;
    overflow: hidden;
    border: 4px solid var(--white);
    border-radius: 50%;
    background: var(--peach);
    font-size: 36px;
    font-weight: 800;
}

.avatar img {
    width: 78%;
    height: 78%;
    object-fit: contain;
}

.card-title {
    margin: 0;
    font-size: 19px;
    font-weight: 800;
}

.card-note {
    margin: 4px 0 0;
    font-size: 16px;
    font-weight: 600;
    color: var(--muted);
}

/* a row of round Spirit pictures that scrolls sideways */
.spirit-row {
    display: flex;
    gap: 10px;
    margin: 0 -4px;
    padding: 4px;
    overflow-x: auto;
}

.spirit-choice {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    width: 64px;
    height: 64px;
    padding: 0;
    border: 3px solid transparent;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.8);
}

.spirit-choice img {
    width: 82%;
    height: 82%;
    object-fit: contain;
}

.spirit-choice.picked {
    border-color: var(--ink);
}

/* =========================================================
   Text + buttons
   ========================================================= */
.hint {
    margin: 8px 0 0;
    font-size: 16px;
    font-weight: 600;
    color: var(--muted);
}

.form-error {
    margin: 8px 0 0;
    padding: 12px 14px;
    border-radius: 14px;
    background: var(--error-bg);
    color: var(--error-ink);
    font-size: 16px;
    font-weight: 700;
}

.outline-btn {
    min-height: var(--cta-height);
    padding: 0 26px;
    border: 1.5px solid var(--ink);
    border-radius: var(--radius-pill);
    background: transparent;
    color: var(--ink);
    font-size: 18px;
    font-weight: 800;
}

.picture-card .outline-btn {
    align-self: flex-start;
    min-height: var(--tap-min);
    font-size: 17px;
}

.sheet-cancel {
    flex-shrink: 0;
}

.delete-link {
    align-self: flex-start;
    min-height: var(--tap-min);
    margin-top: 6px;
    padding: 0;
    border: 0;
    background: none;
    color: var(--error-ink);
    font-size: 17px;
    font-weight: 700;
    text-decoration: underline;
    text-decoration-thickness: 2px;
    text-underline-offset: 5px;
}

/* =========================================================
   "Updated!"
   ========================================================= */
.done {
    display: flex;
    align-items: center;
    gap: 16px;
}

.done-tick {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: var(--sage);
}

.done-tick svg {
    width: 28px;
    height: 28px;
    fill: none;
    stroke: var(--ink);
    stroke-width: 3;
    stroke-linecap: round;
    stroke-linejoin: round;
}

.done-text {
    margin: 0;
    font-size: 19px;
    font-weight: 700;
}
</style>
