<script setup>
defineProps({
  readAloud: { type: Boolean, default: false },
});
const emit = defineEmits(["update:readAloud"]);

const navItems = [
  { to: "/", label: "Today", icon: "fa-sun" },
  { to: "/map", label: "Map", icon: "fa-map" },
  { to: "/spirits", label: "Spirits", icon: "fa-wand-sparkles" },
  { to: "/me", label: "Me", icon: "fa-user" },
];
</script>

<template>
  <!-- Mobile top bar -->
  <header class="d-md-none d-flex align-items-center gap-2 px-3 py-2 mobile-header">
    <svg class="brand-pin" viewBox="0 0 32 40" aria-hidden="true">
      <path d="M16 38C16 38 3 24 3 15a13 13 0 0 1 26 0c0 9-13 23-13 23Z" fill="var(--terracotta)" />
      <rect x="10" y="9" width="12" height="12" rx="2" fill="var(--card)" />
    </svg>
    <router-link to="/" class="brand">Memory Go</router-link>
  </header>

  <!-- Desktop sidebar -->
  <aside class="sidebar d-none d-md-flex flex-column">
    <router-link to="/" class="d-flex align-items-center gap-2 mb-4 text-decoration-none">
      <svg class="brand-pin" viewBox="0 0 32 40" aria-hidden="true">
        <path d="M16 38C16 38 3 24 3 15a13 13 0 0 1 26 0c0 9-13 23-13 23Z" fill="var(--terracotta)" />
        <rect x="10" y="9" width="12" height="12" rx="2" fill="var(--card)" />
      </svg>
      <span class="brand">Memory Go</span>
    </router-link>

    <nav aria-label="Main" class="ps-2">
      <ul class="list-unstyled d-flex flex-column gap-2 m-0">
        <li v-for="item in navItems" :key="item.to">
          <router-link :to="item.to" class="nav-ribbon" active-class="" exact-active-class="active">
            <i class="fa-solid" :class="item.icon" aria-hidden="true"></i>
            <span>{{ item.label }}</span>
          </router-link>
        </li>
      </ul>
    </nav>

    <div class="card-soft sidebar-card mt-auto">
      <div class="d-flex align-items-center justify-content-between gap-2">
        <span id="readAloudLabel" class="fw-bold lh-sm">Read pages aloud</span>
        <button
          type="button"
          role="switch"
          class="switch"
          :class="{ on: readAloud }"
          :aria-checked="readAloud"
          aria-labelledby="readAloudLabel"
          @click="emit('update:readAloud', !readAloud)"
        >
          <span class="switch-text">{{ readAloud ? "On" : "Off" }}</span>
          <span class="switch-knob"></span>
        </button>
      </div>
      <router-link to="/help" class="help-link mt-2">
        <i class="fa-regular fa-circle-question" aria-hidden="true"></i>
        <span>Help and how to play</span>
      </router-link>
    </div>
  </aside>

  <!-- Mobile bottom nav -->
  <nav class="bottom-nav d-md-none" aria-label="Main">
    <router-link
      v-for="item in navItems"
      :key="item.to"
      :to="item.to"
      class="bottom-link"
      active-class=""
      exact-active-class="active"
    >
      <i class="fa-solid fs-5" :class="item.icon" aria-hidden="true"></i>
      <span>{{ item.label }}</span>
    </router-link>
  </nav>
</template>

<style scoped>
.brand {
  font-size: 1.55rem;
  text-decoration: none;
}
.brand-pin {
  width: 28px;
  height: 36px;
  flex-shrink: 0;
}

/* ---------- Sidebar ---------- */
.sidebar {
  position: fixed;
  inset: 0 auto 0 0;
  width: 250px;
  padding: 1.5rem 1rem 1.25rem 1.25rem;
  background: var(--sidebar);
  border-right: 1px solid var(--dash);
  z-index: 10;
}

.nav-ribbon {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.85rem 1.75rem 0.85rem 1.1rem;
  margin-left: -1.25rem;
  padding-left: 2.35rem;
  background: var(--card);
  color: var(--ink);
  font-weight: 800;
  text-decoration: none;
  clip-path: polygon(0 0, 100% 0, 91% 50%, 100% 100%, 0 100%);
  border-radius: 14px 0 0 14px;
}
.nav-ribbon::before {
  content: "";
  position: absolute;
  inset: 5px 22px 5px 5px;
  border: 1.5px dashed var(--dash);
  border-radius: 10px;
  pointer-events: none;
}
.nav-ribbon i {
  width: 1.4rem;
  text-align: center;
}
.nav-ribbon.active {
  background: var(--terracotta);
  color: #fff;
}
.nav-ribbon.active::before {
  border-color: rgba(255, 255, 255, 0.55);
}
.nav-ribbon:not(.active):hover {
  background: #fff;
}

.sidebar-card {
  padding: 1rem 1rem 1rem 1.1rem;
  border-radius: 20px;
}
.sidebar-card::before {
  inset: 5px;
  border-radius: 15px;
}

/* On/Off switch */
.switch {
  position: relative;
  flex-shrink: 0;
  width: 80px;
  height: 44px;
  border: 0;
  border-radius: 999px;
  background: #9b8f7c;
  color: #fff;
  font-weight: 800;
  text-align: left;
  padding: 0 0 0 14px;
}
.switch.on {
  background: var(--green);
}
.switch-text {
  position: relative;
  z-index: 1;
}
.switch-knob {
  position: absolute;
  top: 4px;
  left: 4px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #fff;
  transition: transform 0.15s;
}
.switch.on .switch-knob {
  transform: translateX(36px);
}
.switch:not(.on) .switch-text {
  padding-left: 30px;
}
@media (prefers-reduced-motion: reduce) {
  .switch-knob {
    transition: none;
  }
}

.help-link {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  color: var(--blue);
  font-weight: 800;
  line-height: 1.25;
  text-decoration: underline;
  text-underline-offset: 3px;
}
.help-link i {
  margin-top: 0.2rem;
}

/* ---------- Mobile header ---------- */
.mobile-header {
  background: var(--sidebar);
  border-bottom: 1px solid var(--dash);
}

/* ---------- Mobile bottom nav ---------- */
.bottom-nav {
  position: fixed;
  inset: auto 0 0 0;
  height: 70px;
  display: flex;
  background: var(--sidebar);
  border-top: 1px solid var(--dash);
  z-index: 1000;
}
.bottom-link {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--ink);
  text-decoration: none;
}
.bottom-link.active {
  color: var(--terracotta);
}
</style>