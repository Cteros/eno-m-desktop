<template>
  <div class="flex items-center gap-6 text-xl mb-1">
    <slot name="left"></slot>
    <div class="i-mingcute:skip-previous-fill hover:text-white cursor-pointer" @click="$emit(prevKey)" />
    <div class="i-mingcute:rewind-backward-square-15-line hover:text-white cursor-pointer"
      @click="$emit(backwardKey)" />
    <div
      class="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform cursor-pointer"
      @click="$emit(playKey)">
      <div v-if="isPlaying" class="i-mingcute:pause-fill text-xl" />
      <div v-else class="i-mingcute:play-fill text-xl pl-0.5" />
    </div>
    <div class="i-mingcute:rewind-forward-square-15-line hover:text-white cursor-pointer" @click="$emit(forwardKey)" />
    <div class="i-mingcute:skip-forward-fill hover:text-white cursor-pointer" @click="$emit(nextKey)" />
    <slot name="right"></slot>
  </div>
</template>

<script setup lang="ts">
const props = defineProps({
  isPlaying: Boolean,
  playKey: { type: String, default: 'play' },
  prevKey: { type: String, default: 'prev' },
  nextKey: { type: String, default: 'next' },
  forwardKey: { type: String, default: 'forward' },
  backwardKey: { type: String, default: 'backward' },
})
</script>
