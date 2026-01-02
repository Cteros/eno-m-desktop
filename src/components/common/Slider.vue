<template>
  <div class="slider-container" @click.stop="onTrackClick">
    <div class="slider-track">
      <div class="slider-fill" :style="{ width: `${value}%` }" />
      <div class="slider-thumb" :style="{ left: `${value}%` }" />
      <input type="range" class="slider-input" :min="0" :max="100" :step="1" :value="value" @input="onInput"
        @change="onChange" @mousedown="dragging = true" @mouseup="dragging = false" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps({
  value: { type: Number, required: true },
  disabled: { type: Boolean, default: false },
})
const emit = defineEmits(['update:value', 'change'])
const dragging = ref(false)

function onInput(e: Event) {
  const val = Number((e.target as HTMLInputElement).value)
  emit('update:value', val)
}
function onChange(e: Event) {
  const val = Number((e.target as HTMLInputElement).value)
  emit('change', val)
}
function onTrackClick(e: MouseEvent) {
  if (props.disabled) return
  const track = (e.currentTarget as HTMLElement).querySelector('.slider-input') as HTMLInputElement
  const rect = track.getBoundingClientRect()
  const percent = ((e.clientX - rect.left) / rect.width) * 100
  emit('update:value', Math.max(0, Math.min(100, Math.round(percent))))
  emit('change', Math.max(0, Math.min(100, Math.round(percent))))
}
</script>

<style scoped>
.slider-container {
  position: relative;
  width: 100%;
  height: 24px;
  min-height: 16px;
  display: flex;
  align-items: center;
}

.slider-track {
  position: relative;
  width: 100%;
  height: 6px;
  background: #4d4d4d;
  border-radius: 999px;
  display: flex;
  align-items: center;
}

.slider-fill {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  background: #ffffff;
  opacity: 0.8;
  border-radius: 999px;
  pointer-events: none;
  transition: background 0.2s;
}

.slider-thumb {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 14px;
  height: 14px;
  background: #fff;
  /* border: 2px solid #1db954; */
  border-radius: 50%;
  box-shadow: 0 0 4px #0003;
  pointer-events: none;
  opacity: 1;
  transition: border 0.2s;
}

.slider-input {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
  z-index: 10;
}

.slider-input:focus-visible {
  outline: 2px solid #1db954;
  outline-offset: 2px;
  opacity: 0.3;
}
</style>
