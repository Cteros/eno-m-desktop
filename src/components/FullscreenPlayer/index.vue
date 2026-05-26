<script setup>
import { ref, watch } from 'vue'
import { useBlblStore } from '../../blbl/store'
import { ProgressBar } from '@cloudfly/eno-ui'
import { useImageThemeColor } from '@/composables/useImageThemeColor'
const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  isPlaying: {
    type: Boolean,
    default: false
  },
  progress: {
    type: Object,
    default: () => ({ percent: 0, current: 0, total: 0 })
  }
})

const emit = defineEmits(['update:show', 'close', 'play', 'prev', 'next', 'seek'])

const store = useBlblStore()
const themeColor = ref('#1db954')
const { getColor } = useImageThemeColor()
const updateThemeFromCover = async (imageUrl) => {
  if (!imageUrl)
    return
  const color = await getColor(imageUrl, '#1db954')
  if (color)
    themeColor.value = color
}

const rgbToRgba = (rgb, alpha) => {
  if (rgb.startsWith('rgba')) return rgb
  if (rgb.startsWith('rgb')) {
    return rgb.replace('rgb', 'rgba').replace(')', `, ${alpha})`)
  }
  return rgb
}

const togglePlay = () => {
  emit('play')
}

const prevSong = () => {
  emit('prev')
}

const nextSong = () => {
  emit('next')
}

const changeProgress = (percent) => {
  if (!store.play?.id)
    return
  emit('seek', percent)
}

watch(() => props.show, async (newVal) => {
  if (newVal && store.play?.cover)
    await updateThemeFromCover(store.play.cover)
})

const close = () => {
  emit('update:show', false)
  emit('close')
  const isTiny = window?.innerWidth <= 360 || window?.innerHeight <= 520
  if (isTiny && window?.ipcRenderer?.invoke) {
    window.ipcRenderer.invoke('set-window-size', { width: 960, height: 640 })
  }
}

</script>

<template>
  <Transition enter-active-class="transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]"
    leave-active-class="transition-all duration-400 ease-[cubic-bezier(0.32,0.72,0,1)]"
    enter-from-class="opacity-0 translate-y-10 scale-[0.98]" enter-to-class="opacity-100 translate-y-0 scale-100"
    leave-to-class="opacity-0 translate-y-10 scale-[0.98]">
    <div v-if="show" class="fixed inset-0 z-[9999] flex flex-col overflow-hidden bg-[#1c1c1e]">
      <!-- 动态背景层 -->
      <div class="absolute inset-0 z-0">
        <div class="absolute inset-0 bg-[#2c2c2e]" />
        <div class="absolute inset-0 opacity-60 transition-colors duration-1000 ease-in-out" :style="{
          background: `radial-gradient(circle at 50% 30%, ${rgbToRgba(themeColor, 0.4)} 0%, transparent 70%)`
        }" />
        <div class="absolute inset-0 opacity-40 transition-colors duration-1000 ease-in-out" :style="{
          background: `radial-gradient(circle at 80% 80%, ${rgbToRgba(themeColor, 0.3)} 0%, transparent 60%)`
        }" />
        <img v-if="store.play?.cover" :src="store.play.cover"
          class="absolute inset-0 w-full h-full object-cover opacity-30 blur-[120px] scale-125 transition-opacity duration-700" />
      </div>

      <!-- 内容区域 -->
      <div class="relative z-10 flex h-full flex-col">
        <!-- 顶部栏 -->
        <div class="relative flex items-center justify-between px-6 pt-8 pb-3">
          <div class="hidden" @click="close"></div>
          <div class="relative z-[3]">
            <button @click="close"
              class="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/14 bg-white/8 p-0 text-white/75 transition-all duration-200 hover:bg-white/14 hover:text-white">
              <div class="i-mingcute:down-line text-xl" />
            </button>
          </div>
          <div class="relative z-[3] flex items-center gap-3" />
        </div>

        <!-- 主布局容器 -->
        <div
          class="mx-auto flex h-full w-full max-w-[460px] items-center justify-center px-8 pb-4">
          <div class="flex min-h-0 items-center justify-center overflow-hidden">
            <div class="mx-auto flex h-full flex-col items-center justify-end gap-4">
              <div class="w-[400px] flex flex-col justify-end p-[14px_14px_12px]">
                <div class="w-full mx-auto mb-3 flex justify-center">
                  <div class="cover-core w-full h-full rounded-2xl overflow-hidden shadow-2xl relative"
                    :style="{ boxShadow: `0 20px 50px -12px ${rgbToRgba(themeColor, 0.5)}` }">
                    <img v-if="store.play?.cover" :src="store.play.cover" class="w-full" />
                    <div v-else class="w-full h-full bg-neutral-800 flex items-center justify-center">
                      <div class="i-mingcute:music-2-fill text-7xl text-neutral-700" />
                    </div>
                  </div>
                </div>

                <div class="flex items-start justify-between mb-2">
                  <div class="flex-1 pr-4 text-center overflow-hidden">
                    <div class="mask-fade overflow-hidden whitespace-nowrap">
                      <h1 class="text-lg font-bold text-white leading-tight mb-1 inline-block h-[26px]"
                        :class="{ marquee: (store.play?.title?.length || 0) > 12 }" :title="store.play?.title">
                        {{ store.play?.title || '暂无播放' }}
                      </h1>
                    </div>
                    <div class="mask-fade overflow-hidden whitespace-nowrap">
                      <p class="text-sm text-white/58 font-medium inline-block cursor-pointer hover:text-white/80 transition-colors h-[20px]"
                        :class="{ marquee: (store.play?.author?.length || 0) > 20 }">
                        {{ store.play?.author || '未知歌手' }}
                        <span
                          class="inline-block i-mingcute:right-line text-sm align-middle opacity-0 hover:opacity-100 ml-1"></span>
                      </p>
                    </div>
                  </div>
                </div>

                <div class="w-full mb-4">
                  <ProgressBar class="progress-thin" :percent="props.progress.percent" :current="props.progress.current"
                    :total="props.progress.total" track-color="rgba(255,255,255,0.14)"
                    fill-color="rgba(226,244,255,0.96)" time-color="rgba(235,245,255,0.62)" @seek="changeProgress" />
                </div>

                <div class="mb-4 flex items-center justify-center gap-4">
                  <button @click="prevSong"
                    class="inline-flex h-[46px] w-[46px] items-center justify-center rounded-full border border-white/14 bg-white/8 text-white/75 transition-all duration-200 hover:bg-white/14 hover:text-white">
                    <div class="i-mingcute:skip-previous-fill text-[30px]" />
                  </button>
                  <button @click="togglePlay"
                    class="flex h-[60px] w-[60px] items-center justify-center rounded-full border-0 bg-white text-black shadow-[0_8px_24px_rgba(0,0,0,0.28)] transition-all hover:scale-105 active:scale-95">
                    <div v-if="props.isPlaying" class="i-mingcute:pause-fill text-[30px]" />
                    <div v-else class="i-mingcute:play-fill text-[30px] ml-0.5" />
                  </button>
                  <button @click="nextSong"
                    class="inline-flex h-[46px] w-[46px] items-center justify-center rounded-full border border-white/14 bg-white/8 text-white/75 transition-all duration-200 hover:bg-white/14 hover:text-white">
                    <div class="i-mingcute:skip-forward-fill text-[30px]" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.mask-fade {
  mask-image: linear-gradient(to right, transparent 0, #000 12px, #000 calc(100% - 12px), transparent 100%);
}

.marquee {
  animation: marquee-bounce 8s linear infinite alternate;
}

.progress-thin :deep(.slider-track) {
  height: 3px;
}

.progress-thin :deep(.slider-container) {
  height: 12px;
  min-height: 12px;
}

@keyframes marquee-bounce {

  0%,
  25% {
    transform: translateX(0);
  }

  75%,
  100% {
    transform: translateX(calc(-100% + 240px));
  }
}

</style>
