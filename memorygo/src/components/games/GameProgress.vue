<script setup>
defineProps({
    // Text on the left, e.g. "You've found 2 of 6 pairs."
    label: { type: String, required: true },
    // Number of dots
    total: { type: Number, default: 0 },
    // One entry per finished step: true = green dot, false = muted red dot
    results: { type: Array, default: () => [] }
})
</script>

<template>
  <div class="progress-box p-md-2 mb-3">
    <div class="progress-inner d-flex align-items-center justify-content-between p-md-3">
      <strong>{{ label }}</strong>

      <!-- Replace the dots with your own content if needed -->
      <slot name="end">
        <div v-if="total" class="d-flex gap-1" aria-hidden="true">
          <span
            v-for="n in total"
            :key="n"
            class="dot rounded-circle"
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
/* Boxed on desktop, plain row on mobile */
@media (min-width: 768px) {
    .progress-box {
        border: 1px solid #e6dfc9;
        border-radius: 18px;
        background: #fdfaef;
    }

    .progress-inner {
        border: 1px dashed #ddd5bb;
        border-radius: 14px;
    }
}

.dot {
    width: 14px;
    height: 14px;
    border: 1.5px dashed #c9c3ad;
}

.dot.filled {
    border: none;
    background: var(--green);
}

.dot.missed {
    border: none;
    background: #d9b3ad;
}
</style>