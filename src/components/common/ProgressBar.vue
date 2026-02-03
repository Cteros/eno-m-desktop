<template>
  <div class="progress-bar">
    <span v-if="showTime" class="progress-bar__time progress-bar__time--left">{{ timeDisplay.current }}</span>
    <Slider
      class="progress-bar__slider"
      :value="displayPercent"
      :disabled="disabled"
      @update:value="handleInput"
      @change="handleChange"
    />
    <span v-if="showTime" class="progress-bar__time progress-bar__time--right">{{ timeDisplay.total }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import Slider from './Slider.vue'

const props = defineProps({
  percent: { type: Number, required: true },
  current: { type: Number, required: true },
  total: { type: Number, required: true },
  disabled: { type: Boolean, default: false },
  showTime: { type: Boolean, default: true },
})

const emit = defineEmits(['seek', 'dragging'])

const dragging = ref(false)
const localPercent = ref(0)
const pendingSeek = ref<number | null>(null)

watch(
  () => props.percent,
  (val) => {
    const next = clamp(Math.round(val * 100))
    if (pendingSeek.value !== null) {
      const diff = Math.abs(next - pendingSeek.value)
      if (diff <= 1) {
        pendingSeek.value = null
      } else {
        localPercent.value = pendingSeek.value
        return
      }
    }
    if (!dragging.value)
      localPercent.value = next
  },
  { immediate: true }
)

const displayPercent = computed(() => {
  if (dragging.value)
    return localPercent.value
  if (pendingSeek.value !== null)
    return pendingSeek.value
  return clamp(Math.round(props.percent * 100))
})

function clamp(value: number) {
  return Math.max(0, Math.min(100, value))
}

function handleInput(val: number) {
  dragging.value = true
  localPercent.value = clamp(Math.round(val))
  emit('dragging', true)
}

function handleChange(val: number) {
  const percent = clamp(Math.round(val)) / 100
  dragging.value = false
  emit('dragging', false)
  pendingSeek.value = Math.round(val)
  emit('seek', percent)
}

const timeDisplay = computed(() => {
  const current = Number.isFinite(props.current) ? props.current : 0
  const total = Number.isFinite(props.total) ? props.total : 0
  return {
    current: formatTime(current),
    total: formatTime(total),
  }
})

function formatTime(seconds: number) {
  const safe = Math.max(0, seconds)
  const date = new Date(safe * 1000)
  return date.toISOString().substr(14, 5)
}
</script>

<style scoped>
.progress-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.progress-bar__time {
  min-width: 40px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
}

.progress-bar__time--left {
  text-align: right;
}

.progress-bar__slider {
  flex: 1;
  height: 4px;
}
</style>
