<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, inject } from 'vue'
import { useBlblStore } from '../../blbl/store'
import { useLocalStorage } from '@vueuse/core'
import { Slider } from '../common'

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

const emit = defineEmits(['update:show', 'close', 'play', 'prev', 'next', 'seek', 'volume'])

const store = useBlblStore()
const canvasRef = ref(null)
const containerRef = ref(null)
const themeColor = ref('#1db954')
const animationFrameId = ref(null)
const voice = useLocalStorage('voice', 100)
const isDragging = ref(false)

// 提取主题色
const extractThemeColor = async (imageUrl) => {
  if (!imageUrl) return '#1db954'

  try {
    const img = new Image()
    img.crossOrigin = 'Anonymous'
    img.src = imageUrl

    await new Promise((resolve, reject) => {
      img.onload = resolve
      img.onerror = reject
    })

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    canvas.width = img.width
    canvas.height = img.height
    ctx.drawImage(img, 0, 0)

    // 采样多个点获取主色调
    const samples = []
    const step = Math.floor(img.width / 5)
    for (let x = step; x < img.width; x += step) {
      for (let y = step; y < img.height; y += step) {
        const pixel = ctx.getImageData(x, y, 1, 1).data
        samples.push({ r: pixel[0], g: pixel[1], b: pixel[2] })
      }
    }

    // 计算平均颜色
    const avg = samples.reduce((acc, color) => ({
      r: acc.r + color.r,
      g: acc.g + color.g,
      b: acc.b + color.b
    }), { r: 0, g: 0, b: 0 })

    avg.r = Math.floor(avg.r / samples.length)
    avg.g = Math.floor(avg.g / samples.length)
    avg.b = Math.floor(avg.b / samples.length)

    return `rgb(${avg.r}, ${avg.g}, ${avg.b})`
  } catch (error) {
    console.error('Failed to extract theme color:', error)
    return '#1db954'
  }
}

// 将 RGB 颜色转换为 RGBA
const rgbToRgba = (rgb, alpha) => {
  if (rgb.startsWith('rgba')) return rgb
  if (rgb.startsWith('rgb')) {
    return rgb.replace('rgb', 'rgba').replace(')', `, ${alpha})`)
  }
  return rgb
}

// 真实音频可视化
const drawVisualization = () => {
  if (!canvasRef.value || !props.show) return

  const canvas = canvasRef.value
  const ctx = canvas.getContext('2d')
  const width = canvas.width
  const height = canvas.height

  ctx.clearRect(0, 0, width, height)

  // 如果没有分析器，或者不在播放，使用简单的模拟动画保持画面些许活力
  if (!store.analyser || !props.isPlaying) {
    // 简单的呼吸效果
    const time = Date.now() / 2000
    const alpha = (Math.sin(time) * 0.5 + 0.5) * 0.1
    ctx.fillStyle = rgbToRgba(themeColor.value, alpha)
    ctx.fillRect(0, 0, width, height)
  } else {
    const bufferLength = store.analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)
    store.analyser.getByteFrequencyData(dataArray)

    // 绘制更加平滑柔和的波浪
    ctx.beginPath()
    ctx.moveTo(0, height)

    // 我们只需要一部分频率数据（低中频），通常高频部分能量很少
    const sliceWidth = width * 1.0 / (bufferLength * 0.6)
    let x = 0

    // 使用 Catmull-Rom 或者简单的控制点插值来获得平滑曲线
    // 这里使用简单的三次贝塞尔曲线模拟

    // 先收集点
    const points = []
    const limit = Math.floor(bufferLength * 0.6)
    for (let i = 0; i < limit; i++) {
      const v = dataArray[i] / 255.0
      // 增加灵敏度并限制最大高度
      const y = height - (v * height * 0.5)
      points.push({ x: i * sliceWidth, y })
    }

    // 绘制曲线
    if (points.length > 0) {
      ctx.moveTo(points[0].x, points[0].y)

      for (let i = 0; i < points.length - 1; i++) {
        const xc = (points[i].x + points[i + 1].x) / 2
        const yc = (points[i].y + points[i + 1].y) / 2
        ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc)
      }
      // 连接最后一个点
      ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y)
    }

    ctx.lineTo(width, height)
    ctx.lineTo(0, height)
    ctx.closePath()

    const gradient = ctx.createLinearGradient(0, height, 0, height / 2)
    gradient.addColorStop(0, rgbToRgba(themeColor.value, 0.4))
    gradient.addColorStop(1, rgbToRgba(themeColor.value, 0))
    ctx.fillStyle = gradient
    ctx.fill()
  }

  if (props.show) {
    animationFrameId.value = requestAnimationFrame(drawVisualization)
  }
}

// 音频控制
const togglePlay = () => {
  emit('play')
}

const prevSong = () => {
  emit('prev')
}

const nextSong = () => {
  emit('next')
}

const cycleLoopMode = () => {
  const modes = ['list', 'single', 'random']
  const currentIndex = modes.indexOf(store.loopMode)
  const nextIndex = (currentIndex + 1) % modes.length
  store.loopMode = modes[nextIndex]
}

const changeProgress = (value) => {
  if (!store.play?.id) return
  emit('seek', value / 100)
}

const handleVolumeChange = (value) => {
  voice.value = value
  emit('volume', value)
}

// 时间格式化
const timeDisplay = computed(() => {
  const remaining = props.progress.total - props.progress.current
  return {
    current: new Date(props.progress.current * 1000).toISOString().substr(14, 5) || '00:00',
    total: new Date(props.progress.total * 1000).toISOString().substr(14, 5) || '00:00',
    remaining: new Date(remaining * 1000).toISOString().substr(14, 5) || '00:00',
  }
})

// 循环模式文字
const loopModeText = computed(() => {
  const modes = {
    list: '列表循环',
    single: '单曲循环',
    random: '随机播放'
  }
  return modes[store.loopMode] || '列表循环'
})

// 监听显示状态
watch(() => props.show, async (newVal) => {
  if (newVal) {
    // 提取主题色
    if (store.play?.cover) {
      themeColor.value = await extractThemeColor(store.play.cover)
    }

    // 启动可视化
    setTimeout(() => {
      drawVisualization()
    }, 100)
  } else {
    // 停止动画
    if (animationFrameId.value) {
      cancelAnimationFrame(animationFrameId.value)
      animationFrameId.value = null
    }
  }
})

// 监听歌曲变化
watch(() => store.play?.id, async () => {
  if (props.show && store.play?.cover) {
    themeColor.value = await extractThemeColor(store.play.cover)
  }
})

// 调整 canvas 尺寸
const resizeCanvas = () => {
  if (canvasRef.value && containerRef.value) {
    const container = containerRef.value
    canvasRef.value.width = container.clientWidth
    canvasRef.value.height = container.clientHeight
  }
}

onMounted(() => {
  window.addEventListener('resize', resizeCanvas)
  resizeCanvas()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeCanvas)
  if (animationFrameId.value) {
    cancelAnimationFrame(animationFrameId.value)
  }
})

const close = () => {
  emit('update:show', false)
  emit('close')
}

const openBilibili = () => {
  const url = `https://www.bilibili.com/video/${store.play.bvid}`
  window.open(url, '_blank')
}
</script>

<template>
  <Transition name="fullscreen-player">
    <div v-if="show" ref="containerRef" class="fixed inset-0 z-[9999] flex flex-col overflow-hidden bg-[#1c1c1e]">
      <!-- 动态背景层 -->
      <div class="absolute inset-0 z-0">
        <!-- 主背景色 -->
        <div class="absolute inset-0 bg-[#2c2c2e]" />

        <!-- 动态渐变光晕 -->
        <div class="absolute inset-0 opacity-60 transition-colors duration-1000 ease-in-out" :style="{
          background: `radial-gradient(circle at 50% 30%, ${rgbToRgba(themeColor, 0.4)} 0%, transparent 70%)`
        }" />
        <div class="absolute inset-0 opacity-40 transition-colors duration-1000 ease-in-out" :style="{
          background: `radial-gradient(circle at 80% 80%, ${rgbToRgba(themeColor, 0.3)} 0%, transparent 60%)`
        }" />

        <!-- 模糊封面背景 -->
        <img v-if="store.play?.cover" :src="store.play.cover"
          class="absolute inset-0 w-full h-full object-cover opacity-30 blur-[120px] scale-125 transition-opacity duration-700" />

        <!-- 噪点纹理 (可选，增加质感) -->
        <!-- <div class="absolute inset-0 opacity-[0.03]" style="background-image: url('data:image/svg+xml;base64,...')" /> -->
      </div>

      <!-- Canvas 可视化层 (保持微妙) -->
      <canvas ref="canvasRef"
        class="absolute inset-0 w-full h-full opacity-10 mix-blend-screen pointer-events-none z-0" />

      <!-- 内容区域 -->
      <div class="relative z-10 flex flex-col h-full backdrop-blur-[0px]">
        <!-- 顶部栏 -->
        <div class="flex items-center justify-between px-6 pt-12 pb-4"> <!-- 增加顶部 padding 适配刘海屏感觉 -->
          <div
            class="w-12 h-1 bg-white/20 rounded-full mx-auto absolute top-4 left-0 right-0 cursor-pointer hover:bg-white/40 transition-colors md:hidden"
            @click="close"></div>

          <button @click="close"
            class="flex items-center justify-center w-8 h-8 rounded-full bg-black/10 hover:bg-white/10 text-white/70 hover:text-white transition-all backdrop-blur-md">
            <div class="i-mingcute:down-line text-xl" />
          </button>

          <div class="text-white/50 text-xs font-semibold tracking-widest uppercase">正在播放</div>

          <button @click="openBilibili"
            class="flex items-center justify-center w-8 h-8 rounded-full bg-black/10 hover:bg-white/10 text-white/70 hover:text-white transition-all backdrop-blur-md">
            <div class="i-mingcute:more-1-fill text-xl" />
          </button>
        </div>

        <!-- 主布局容器 -->
        <div
          class="flex-1 flex flex-col md:flex-row items-center md:justify-center px-8 pb-12 gap-8 md:gap-24 overflow-y-auto custom-scrollbar">

          <!-- 左侧/上方：封面 -->
          <div class="w-full max-w-[360px] md:max-w-[48vh] aspect-square flex-shrink-0 relative group mt-4 md:mt-0">
            <div
              class="w-full h-full rounded-xl md:rounded-2xl overflow-hidden shadow-2xl relative transition-transform duration-500 ease-out"
              :class="{ 'scale-90 opacity-80': !isPlaying, 'scale-100 opacity-100': isPlaying }"
              :style="{ boxShadow: `0 20px 50px -12px ${rgbToRgba(themeColor, 0.5)}` }">
              <img v-if="store.play?.cover" :src="store.play.cover" class="w-full h-full object-cover" />
              <div v-else
                class="w-full h-full bg-gradient-to-br from-neutral-800 to-neutral-900 flex items-center justify-center">
                <div class="i-mingcute:music-2-fill text-8xl text-neutral-700" />
              </div>
            </div>
          </div>

          <!-- 右侧/下方：信息与控制 -->
          <div class="w-full max-w-[360px] md:max-w-[400px] flex flex-col justify-center flex-shrink-0">

            <!-- 歌曲信息布局 (Apple Music 样式：左对齐标题，右侧更多按钮) -->
            <div class="flex items-start justify-between mb-2">
              <div class="flex-1 pr-4 text-left">
                <h1 class="text-2xl md:text-3xl font-bold text-white leading-tight mb-1 line-clamp-2"
                  :title="store.play?.title">
                  {{ store.play?.title || '暂无播放' }}
                </h1>
                <p
                  class="text-lg text-white/60 font-medium truncate cursor-pointer hover:text-white/80 transition-colors">
                  {{ store.play?.author || '未知歌手' }}
                  <span
                    class="inline-block i-mingcute:right-line text-sm align-middle opacity-0 hover:opacity-100 ml-1"></span>
                </p>
              </div>
              <!-- 收藏/更多操作 -->
              <button class="text-white/40 hover:text-primary active:scale-90 transition-all mt-1">
                <div class="i-mingcute:heart-line text-2xl" />
              </button>
            </div>

            <!-- 进度条区域 -->
            <div class="w-full mb-8 group/slider">
              <div class="relative h-6 flex items-center">
                <Slider class="apple-slider w-full" :value="Math.round(props.progress.percent * 100)"
                  @update:value="val => { isDragging = true }" @change="changeProgress" />
              </div>
              <div
                class="flex justify-between text-[11px] font-medium text-white/30 group-hover/slider:text-white/50 transition-colors px-0.5 -mt-2">
                <span>{{ timeDisplay.current }}</span>
                <span>{{ timeDisplay.total }}</span>
              </div>
            </div>

            <!-- 播放控制 -->
            <div class="flex items-center justify-between mb-8">
              <!-- 循环模式 (放在左侧或者单独一排? AM放在底部，这里为了平衡放在两边) -->
              <!-- 上一首 -->
              <button @click="prevSong"
                class="text-white/60 hover:text-white transition-all hover:scale-110 active:scale-95">
                <div class="i-mingcute:skip-previous-fill text-4xl" />
              </button>

              <!-- 播放/暂停 (中心大按钮) -->
              <button @click="togglePlay"
                class="w-20 h-20 rounded-full bg-white/10 hover:bg-white/20 active:bg-white/10 text-white flex items-center justify-center transition-all hover:scale-105 active:scale-95 backdrop-blur-md shadow-lg border border-white/5">
                <div v-if="props.isPlaying" class="i-mingcute:pause-fill text-4xl" />
                <div v-else class="i-mingcute:play-fill text-4xl ml-1" />
              </button>

              <!-- 下一首 -->
              <button @click="nextSong"
                class="text-white/60 hover:text-white transition-all hover:scale-110 active:scale-95">
                <div class="i-mingcute:skip-forward-fill text-4xl" />
              </button>
            </div>

            <!-- 底部辅助控制 (音量/模式) -->
            <div class="flex items-center justify-between gap-6 px-2">
              <!-- 播放模式 -->
              <button @click="cycleLoopMode"
                class="text-white/40 hover:text-white/80 transition-colors p-2 rounded-lg hover:bg-white/5"
                :title="loopModeText">
                <div class="relative">
                  <div v-if="store.loopMode === 'list'" class="i-mingcute:repeat-line text-xl" />
                  <div v-else-if="store.loopMode === 'single'" class="i-mingcute:repeat-one-line text-xl" />
                  <div v-else class="i-mingcute:shuffle-line text-xl" />
                  <!-- 只有单曲循环时显示小点 -->
                  <div v-if="store.loopMode === 'single'"
                    class="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-current rounded-full" />
                </div>
              </button>

              <!-- 音量条 -->
              <div class="flex items-center gap-3 flex-1 group/volume">
                <div class="i-mingcute:volume-line text-sm text-white/40" />
                <Slider class="apple-slider-sm flex-1 opacity-60 group-hover/volume:opacity-100 transition-opacity"
                  :value="voice" @update:value="val => (voice = val)" @change="handleVolumeChange" />
                <div class="i-mingcute:volume-fill text-sm text-white/40" />
              </div>

              <!-- 歌词/列表入口 (占位) -->
              <button class="text-white/40 hover:text-white/80 transition-colors p-2 rounded-lg hover:bg-white/5">
                <div class="i-mingcute:list-check-line text-xl" />
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  display: none;
}

.custom-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

/* 覆盖 Slider 样式以适配 Apple 风格 */
:deep(.apple-slider .slider-track) {
  height: 4px;
  background-color: rgba(255, 255, 255, 0.15);
  transition: height 0.2s ease;
}

/* Hover 放大交互 */
:deep(.apple-slider:hover .slider-track) {
  height: 6px;
}

:deep(.apple-slider .slider-fill) {
  background-color: rgba(255, 255, 255, 0.8);
}

:deep(.apple-slider:hover .slider-fill) {
  background-color: #fff;
}

:deep(.apple-slider .slider-thumb) {
  width: 8px;
  /* 默认隐藏或很小 */
  height: 8px;
  transform: translate(-50%, -50%) scale(0);
  background: #fff;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
  opacity: 0;
  transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.2s;
}

:deep(.apple-slider:hover .slider-thumb),
:deep(.apple-slider .slider-input:active ~ .slider-thumb) {
  transform: translate(-50%, -50%) scale(2.5);
  /* 放大 */
  opacity: 1;
}

/* 音量条样式更细 */
:deep(.apple-slider-sm .slider-track) {
  height: 3px;
  background-color: rgba(255, 255, 255, 0.1);
}

:deep(.apple-slider-sm .slider-fill) {
  background-color: rgba(255, 255, 255, 0.6);
}

:deep(.apple-slider-sm .slider-thumb) {
  width: 12px;
  height: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.fullscreen-player-enter-active {
  transition: all 0.5s cubic-bezier(0.32, 0.72, 0, 1);
}

.fullscreen-player-leave-active {
  transition: all 0.4s cubic-bezier(0.32, 0.72, 0, 1);
}

.fullscreen-player-enter-from {
  opacity: 0;
  transform: translateY(40px) scale(0.98);
}

.fullscreen-player-enter-to {
  opacity: 1;
  transform: translateY(0) scale(1);
}

.fullscreen-player-leave-to {
  opacity: 0;
  transform: translateY(40px) scale(0.98);
}
</style>
