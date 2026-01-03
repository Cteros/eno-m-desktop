<script setup lang="ts">
import { computed } from 'vue'
const props = defineProps({
  modelValue: {
    type: String,
    default: 'list',
    validator: (v: string) => ['random', 'single', 'list'].includes(v)
  }
})
const emit = defineEmits(['update:modelValue', 'change'])
const loopModes: string[] = ['random', 'single', 'list']
const current = computed(() => props.modelValue)
function handleLoopChange() {
  const index = loopModes.indexOf(current.value as string)
  const next = loopModes[(index + 1) % loopModes.length]
  emit('update:modelValue', next)
  emit('change', next)
}
</script>

<template>
  <section class="cursor-pointer hover:opacity-50" @click="handleLoopChange">
    <div v-if="current === 'random'" class="i-mingcute:shuffle-fill w-1em h-1em" />
    <div v-else-if="current === 'single'" class="i-mingcute:repeat-one-fill w-1em h-1em" />
    <div v-else class="i-mingcute:repeat-fill w-1em h-1em" />
  </section>
</template>
