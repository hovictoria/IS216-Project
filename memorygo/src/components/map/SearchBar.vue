<!--------------------------------------------------------------------------------------------------------
PSEUDOCODE
filename:   components/map/SearchBar.vue
purpose:    - the glass "Good morning! Where to?" bar with a microphone button
            - LOOK ONLY for now: the Search screen (08-Search.html) isn't built yet, so it doesn't do anything
            - always "Good morning" for now: we're building the morning look first. Night mode (with
              "Good evening" from 19:00, Singapore time) comes later (DESIGN_SPEC.md section 6)
---------------------------------------------------------------------------------------------------------->

<script setup>
const greeting = 'Good morning'
</script>

<template>
    <div class="search" aria-label="Search (coming soon)">
        <svg class="search-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor"
            stroke-width="2.4" stroke-linecap="round">
            <circle cx="10.5" cy="10.5" r="6.5" />
            <path d="M15.5 15.5 L20.5 20.5" />
        </svg>

        <span class="search-text">{{ greeting }}! Where to?</span>

        <span class="mic" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"
                stroke-linejoin="round">
                <rect x="9" y="3" width="6" height="11" rx="3" />
                <path d="M5.5 11 A6.5 6.5 0 0 0 18.5 11 M12 17.5 V21" />
            </svg>
        </span>
    </div>
</template>

<style scoped>
/* strong glass recipe from the design spec */
.search {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
    height: 56px;
    padding: 0 8px 0 16px;
    border: 1px solid rgba(255, 255, 255, 0.95);
    border-radius: var(--radius-pill);
    background: var(--glass-strong-bg);
    -webkit-backdrop-filter: var(--glass-blur);
    backdrop-filter: var(--glass-blur);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 1), 0 10px 28px rgba(22, 20, 18, 0.14);
    box-sizing: border-box;
}

.search-icon {
    flex-shrink: 0;
    width: 22px;
    height: 22px;
}

/* not called .placeholder: Bootstrap uses that name for grey loading bars */
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
    border-radius: 50%;
    background: var(--ink);
    color: var(--white);
}

.mic svg {
    width: 20px;
    height: 20px;
}
</style>
