<script setup>
defineProps({
    // Text on the left, e.g. "You've found 2 of 6 pairs."
    label: { type: String, required: true },
    // Number of segments
    total: { type: Number, default: 0 },
    // One entry per finished step: true = green segment, false = peach segment
    results: { type: Array, default: () => [] }
})
</script>

<template>
  <div class="progress-box mb-3">
    <div class="progress-inner d-flex align-items-center justify-content-between gap-3">
      <strong class="progress-label">{{ label }}</strong>

      <!-- Replace the segments with your own content if needed -->
      <slot name="end">
        <div v-if="total" class="segs d-flex gap-1" aria-hidden="true">
          <span
            v-for="n in total"
            :key="n"
            class="seg"
            :class="{
              filled: results[n - 1] === true,
              missed: results[n - 1] === false
            }"
          ></span>
        </div>
      </slot>
    </div>
  </div>
</template>

<style scoped>
.progress-label {
    font-size: 1.05rem;
    font-weight: 700;
    letter-spacing: -0.01em;
}

/* Little rounded bars instead of dots */
.seg {
    width: 20px;
    height: 10px;
    border-radius: 999px;
    background: rgba(22, 20, 18, 0.14);
}

.seg.filled {
    background: var(--green);
    animation: seg-pop 0.4s ease;
}

.seg.missed {
    background: var(--peach);
    box-shadow: inset 0 0 0 1.5px var(--accent);
}

/* Glass chip on desktop, plain row on mobile */
@media (min-width: 768px) {
    .progress-box {
        padding: 0.9rem 1.25rem;
        background: var(--glass-bg);
        border: 1px solid var(--glass-border);
        border-radius: 22px;
        box-shadow: var(--glass-shadow);
        -webkit-backdrop-filter: blur(20px) saturate(170%);
        backdrop-filter: blur(20px) saturate(170%);
    }
    .seg { width: 26px; height: 12px; }
}

@keyframes seg-pop {
    0%   { transform: scaleY(0.4); }
    60%  { transform: scaleY(1.5); }
    100% { transform: scaleY(1); }
}

@media (prefers-reduced-motion: reduce) {
    .seg.filled { animation: none; }
}
</style>