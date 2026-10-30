<!--------------------------------------------------------------------------------------------------------
PSEUDOCODE
filename:   components/ui/TextField.vue
purpose:    - one label + one input, styled like the handoff (white, 18px corners, label above)
            - type="password" adds a Show/Hide button inside the box
            - v-model works on it like on a normal <input> (defineModel does the wiring)
props:      id, label, type, autocomplete, placeholder
usage:      <TextField id="login-email" v-model="email" label="Email" type="email" autocomplete="email" />
---------------------------------------------------------------------------------------------------------->

<script setup>
import { ref, computed } from 'vue'

// The value the parent passes with v-model. Typing updates the parent's ref
const model = defineModel({ type: String, default: '' })

const props = defineProps({
    id: { type: String, required: true },
    label: { type: String, required: true },
    type: { type: String, default: 'text' },
    autocomplete: { type: String, default: 'off' },
    placeholder: { type: String, default: '' },
})

const shown = ref(false)                                   // is the password visible?
const isPassword = computed(() => props.type === 'password')

// A visible password is just a text input
const inputType = computed(() => (isPassword.value && shown.value ? 'text' : props.type))
</script>

<template>
    <div class="field">
        <label :for="id">{{ label }}</label>

        <div class="box">
            <input :id="id" v-model="model" :type="inputType" :autocomplete="autocomplete"
                :placeholder="placeholder" :class="{ 'has-toggle': isPassword }" required />

            <button v-if="isPassword" type="button" class="toggle"
                :aria-label="shown ? 'Hide password' : 'Show password'" @click="shown = !shown">
                {{ shown ? 'Hide' : 'Show' }}
            </button>
        </div>
    </div>
</template>

<style scoped>
label {
    display: block;
    margin-bottom: 6px;
    font-size: 16px;
    font-weight: 700;
}

/* position: relative so the Show/Hide button can sit inside the box */
.box {
    position: relative;
}

input {
    width: 100%;
    height: var(--input-height);
    box-sizing: border-box;
    padding: 0 16px;
    border: 1.5px solid var(--line);
    border-radius: var(--radius-input);
    background: var(--white);
    color: var(--ink);
    font-family: inherit;
    font-size: 18px;
}

input::placeholder {
    color: rgba(22, 20, 18, 0.45);
}

input:focus-visible {
    outline: none;
    border-color: var(--user-blue);
    box-shadow: 0 0 0 3px rgba(47, 102, 143, 0.3);
}

/* leave room on the right for the toggle */
input.has-toggle {
    padding-right: 90px;
}

.toggle {
    position: absolute;
    top: 50%;
    right: 6px;
    transform: translateY(-50%);
    height: var(--tap-min);
    padding: 0 14px;
    border: 0;
    border-radius: 13px;
    background: var(--sky);
    color: var(--ink);
    font-family: inherit;
    font-size: 16px;
    font-weight: 800;
    cursor: pointer;
}
</style>
