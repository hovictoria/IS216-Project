<!--------------------------------------------------------------------------------------------------------
PSEUDOCODE
filename:   components/map/SearchBar.vue
purpose:    - the glass "Good morning! Where to?" bar at the top of the map on PHONES
            - it's a button: tapping it opens the full-screen search (PlaceSearch variant="screen");
              tapping the mic opens it already listening
            - iPad / laptop use PlaceSearch variant="dropdown" in the sidebar instead (you type right in it)
            - always "Good morning" for now (morning look first; night mode later)
emits:      open (tapped the bar), mic (tapped the microphone)
---------------------------------------------------------------------------------------------------------->

<script setup>
const greeting = 'Good morning'
defineEmits(['open', 'mic'])

// hide the mic where the browser can't listen (Firefox, or not https / localhost)
const canListen = Boolean(window.SpeechRecognition || window.webkitSpeechRecognition) && window.isSecureContext
</script>

<template>
    <div class="search">
        <button type="button" class="open" @click="$emit('open')">
            <svg class="search-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor"
                stroke-width="2.4" stroke-linecap="round">
                <circle cx="10.5" cy="10.5" r="6.5" />
                <path d="M15.5 15.5 L20.5 20.5" />
            </svg>
            <!-- not called .placeholder: Bootstrap uses that name for grey loading bars -->
            <span class="search-text">{{ greeting }}! Where to?</span>
        </button>

        <button v-if="canListen" type="button" class="mic" aria-label="Search by voice" @click="$emit('mic')">
            <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2"
                stroke-linecap="round" stroke-linejoin="round">
                <rect x="9" y="3" width="6" height="11" rx="3" />
                <path d="M5.5 11 A6.5 6.5 0 0 0 18.5 11 M12 17.5 V21" />
            </svg>
        </button>
    </div>
</template>

<style scoped>
/* strong glass recipe from the design spec */
.search {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    height: 56px;
    padding: 0 8px 0 6px;
    border: 1px solid rgba(255, 255, 255, 0.95);
    border-radius: var(--radius-pill);
    background: var(--glass-strong-bg);
    -webkit-backdrop-filter: var(--glass-blur);
    backdrop-filter: var(--glass-blur);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 1), 0 10px 28px rgba(22, 20, 18, 0.14);
    box-sizing: border-box;
}

.open {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
    height: 100%;
    padding: 0 0 0 10px;
    border: 0;
    border-radius: var(--radius-pill);
    background: transparent;
    color: var(--ink);
    font-family: inherit;
    text-align: left;
    cursor: pointer;
}

.search-icon {
    flex-shrink: 0;
    width: 22px;
    height: 22px;
}

.search-text {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    color: #4A423B;
    font-size: 17px;
    font-weight: 600;
    white-space: nowrap;
    text-overflow: ellipsis;          /* "Good morning! Wh…" on very narrow phones */
}

.mic {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 40px;
    height: 40px;
    border: 0;
    border-radius: 50%;
    background: var(--ink);
    color: var(--white);
    cursor: pointer;
}

.mic svg {
    width: 20px;
    height: 20px;
}
</style>
