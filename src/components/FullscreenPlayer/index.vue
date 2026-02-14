<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { useBlblStore } from '../../blbl/store'
import { ProgressBar } from '../common'
import { useImageThemeColor } from '@/composables/useImageThemeColor'
import { invokeBiliApi, BLBL } from '~/api/bili'

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
const subtitleLines = ref([])
const subtitleLoading = ref(false)
const subtitleError = ref('')
const subtitleCache = new Map()
const subtitleTrackPreference = new Map()
const subtitleRequestId = ref(0)
const lyricItemRefs = ref([])
const lyricsScrollRef = ref(null)
const subtitleDebug = ref({
  fetchedAt: '',
  bvid: '',
  storePlaySnapshot: {},
  videoInfo: {},
  subtitleMeta: {},
  selectedTrack: {},
  subtitleUrl: '',
  lineCount: 0,
  cacheHit: false,
  error: '',
})

const normalizeSubtitleUrl = (url) => {
  if (!url)
    return ''
  if (url.startsWith('//'))
    return `https:${url}`
  return url
}

const sortSubtitleTracks = (subtitles) => {
  if (!Array.isArray(subtitles) || !subtitles.length)
    return []
  const isZh = (track) => /zh|中文|汉语|国语/i.test(`${track?.lan || ''} ${track?.lan_doc || ''}`)
  const isAi = (track) => {
    const aiStatus = Number(track?.ai_status || 0)
    const aiType = Number(track?.ai_type || 0)
    const text = `${track?.lan_doc || ''} ${track?.lan || ''}`
    return aiStatus === 1 || aiType > 0 || /ai|智能|自动/i.test(text)
  }

  const getWeight = (track) => {
    if (isAi(track) && isZh(track))
      return 0
    if (isAi(track))
      return 1
    if (isZh(track))
      return 2
    return 3
  }

  const getStableId = (track) => String(
    track?.id
    || track?.id_str
    || track?.subtitle_url
    || track?.url
    || `${track?.lan || ''}:${track?.lan_doc || ''}`
  )

  // 固定排序，避免后端返回顺序波动导致同视频命中不同轨道
  return subtitles
    .slice()
    .sort((a, b) => {
      const w = getWeight(a) - getWeight(b)
      if (w !== 0)
        return w
      return getStableId(a).localeCompare(getStableId(b))
    })
}

const parseSubtitleBody = (data) => {
  const body = data?.body
  if (!Array.isArray(body))
    return []
  return body
    .map(item => ({
      from: Number(item?.from || 0),
      to: Number(item?.to || 0),
      content: String(item?.content || '').trim(),
    }))
    .filter(item => item.content && item.to > item.from)
}

const isTrackStillCurrent = (target) => {
  const currentBvid = String(store.play?.bvid || '')
  const currentCid = Number(store.play?.cid || 0)
  // 当当前播放未携带 cid 时，仅按 bvid 绑定，避免误判为“已切歌”
  return currentBvid === String(target.bvid || '') && (!currentCid || currentCid === Number(target.cid || 0))
}

const withTimeout = (promise, ms = 12000, label = 'request') => {
  let timer = 0
  const timeoutPromise = new Promise((_, reject) => {
    timer = window.setTimeout(() => reject(new Error(`${label} timeout`)), ms)
  })
  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timer)
      window.clearTimeout(timer)
  })
}

const fetchSubtitles = async () => {
  const bvid = store.play?.bvid
  let cid = Number(store.play?.cid || 0)
  let aid = store.play?.aid
  if (!bvid) {
    subtitleLines.value = []
    subtitleLoading.value = false
    subtitleError.value = '暂无字幕'
    subtitleDebug.value = {
      fetchedAt: new Date().toISOString(),
      bvid: '',
      storePlaySnapshot: { ...(store.play || {}) },
      videoInfo: {},
      subtitleMeta: {},
      selectedTrack: {},
      subtitleUrl: '',
      lineCount: 0,
      cacheHit: false,
      error: subtitleError.value,
    }
    return
  }

  const requestId = ++subtitleRequestId.value
  subtitleLoading.value = true
  subtitleError.value = ''
  subtitleLines.value = []
  subtitleDebug.value = {
    fetchedAt: new Date().toISOString(),
    bvid: bvid || '',
    storePlaySnapshot: { ...(store.play || {}) },
    videoInfo: {},
    subtitleMeta: {},
    selectedTrack: {},
    subtitleUrl: '',
    lineCount: 0,
    cacheHit: false,
    error: '',
  }

  try {
    // 先拉视频信息，确保字幕请求参数绑定到当前播放项
    const info = await withTimeout(
      invokeBiliApi(BLBL.GET_VIDEO_INFO, { bvid }),
      12000,
      'get video info'
    )
    const pages = Array.isArray(info?.data?.pages) ? info.data.pages : []
    subtitleDebug.value.videoInfo = {
      aid: info?.data?.aid,
      cid: info?.data?.cid,
      pages: pages.map(page => ({
        cid: page?.cid,
        page: page?.page,
        part: page?.part,
      })),
    }
    const latestAid = info?.data?.aid
    const latestCid = Number(info?.data?.cid || pages?.[0]?.cid || 0)
    if (!cid)
      cid = latestCid
    else if (pages.length && !pages.some(page => Number(page?.cid || 0) === cid))
      cid = latestCid
    aid = latestAid || aid

    const cacheKey = `${bvid}:${cid || 0}`
    const boundTrack = { bvid: String(bvid), cid: Number(cid || 0) }

    if (subtitleCache.has(cacheKey)) {
      if (!isTrackStillCurrent(boundTrack))
        return
      subtitleLines.value = subtitleCache.get(cacheKey)
      subtitleDebug.value.cacheHit = true
      subtitleDebug.value.lineCount = subtitleLines.value.length
      return
    }

    const subtitleMeta = await withTimeout(
      invokeBiliApi(BLBL.GET_VIDEO_SUBTITLE, { bvid, cid: cid || 0, aid: aid || 0 }),
      12000,
      'get subtitle meta'
    )
    subtitleDebug.value.subtitleMeta = {
      aid: subtitleMeta?.data?.aid,
      bvid: subtitleMeta?.data?.bvid,
      cid: subtitleMeta?.data?.cid,
      subtitleCount: subtitleMeta?.data?.subtitle?.subtitles?.length || 0,
    }
    const metaCid = Number(subtitleMeta?.data?.cid || 0)
    if (metaCid && metaCid !== Number(cid || 0))
      console.warn('Subtitle meta cid mismatch:', { expectedCid: cid, metaCid })

    const tracks = subtitleMeta?.data?.subtitle?.subtitles || []
    const candidateTracks = sortSubtitleTracks(tracks)
    const preferredKey = `${bvid}:${cid || 0}`
    const preferredId = subtitleTrackPreference.get(preferredKey)
    const getStableId = (track) => String(
      track?.id
      || track?.id_str
      || track?.subtitle_url
      || track?.url
      || `${track?.lan || ''}:${track?.lan_doc || ''}`
    )
    if (preferredId) {
      const preferredTrack = candidateTracks.find(track => getStableId(track) === preferredId)
      if (preferredTrack) {
        const restTracks = candidateTracks.filter(track => getStableId(track) !== preferredId)
        candidateTracks.splice(0, candidateTracks.length, preferredTrack, ...restTracks)
      }
    }
    subtitleDebug.value.selectedTrack = candidateTracks[0] || {}

    if (!candidateTracks.length) {
      subtitleError.value = '暂无字幕'
      subtitleDebug.value.error = subtitleError.value
      return
    }
    let lines = []
    let lastTrackError = ''
    for (const track of candidateTracks) {
      const subtitleUrl = normalizeSubtitleUrl(track?.subtitle_url || track?.url || '')
      if (!subtitleUrl)
        continue
      subtitleDebug.value.selectedTrack = track || {}
      subtitleDebug.value.subtitleUrl = subtitleUrl
      try {
        const subtitleContent = await withTimeout(
          invokeBiliApi(BLBL.GET_VIDEO_SUBTITLE_CONTENT, { url: subtitleUrl }),
          12000,
          'get subtitle content'
        )
        if (requestId !== subtitleRequestId.value)
          return
        if (!isTrackStillCurrent(boundTrack))
          return
        lines = parseSubtitleBody(subtitleContent)
        if (lines.length) {
          subtitleTrackPreference.set(preferredKey, getStableId(track))
          break
        }
      } catch (trackError) {
        lastTrackError = String(trackError?.message || trackError || 'track load error')
      }
    }

    subtitleLines.value = lines
    if (lines.length)
      subtitleCache.set(cacheKey, lines)
    subtitleDebug.value.lineCount = lines.length
    if (!lines.length) {
      subtitleError.value = '暂无字幕'
      subtitleDebug.value.error = lastTrackError || subtitleError.value
    }
  } catch (error) {
    console.error('Failed to fetch subtitles:', error)
    if (requestId === subtitleRequestId.value)
      subtitleError.value = '字幕加载失败'
    subtitleDebug.value.error = String(error?.message || error || 'unknown error')
  } finally {
    if (requestId === subtitleRequestId.value)
      subtitleLoading.value = false
  }
}

const activeSubtitleIndex = computed(() => {
  const current = Number(props.progress?.current || 0)
  if (!subtitleLines.value.length)
    return -1
  return subtitleLines.value.findIndex(item => current >= item.from && current <= item.to)
})

const setLyricItemRef = (el, index) => {
  if (!el)
    return
  lyricItemRefs.value[index] = el
}

const scrollActiveLyricIntoView = async () => {
  const index = activeSubtitleIndex.value
  if (index < 0)
    return
  await nextTick()
  const container = lyricsScrollRef.value
  const target = lyricItemRefs.value[index]
  if (container && target) {
    const top = Math.max(0, target.offsetTop - (container.clientHeight / 2) + (target.clientHeight / 2))
    container.scrollTo({
      top,
      behavior: 'smooth',
    })
    return
  }
  if (target?.scrollIntoView) {
    target.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }
}

const seekToSubtitle = (line) => {
  const total = Number(props.progress?.total || 0)
  if (!total || !line?.from)
    return
  const percent = Math.max(0, Math.min(1, line.from / total))
  emit('seek', percent)
}

const updateThemeFromCover = async (imageUrl) => {
  if (!imageUrl)
    return
  const color = await getColor(imageUrl, '#1db954')
  if (color)
    themeColor.value = color
}

// 将 RGB 颜色转换为 RGBA
const rgbToRgba = (rgb, alpha) => {
  if (rgb.startsWith('rgba')) return rgb
  if (rgb.startsWith('rgb')) {
    return rgb.replace('rgb', 'rgba').replace(')', `, ${alpha})`)
  }
  return rgb
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

const changeProgress = (percent) => {
  if (!store.play?.id)
    return
  emit('seek', percent)
}

// 监听显示状态
watch(() => props.show, async (newVal) => {
  if (newVal) {
    // 提取主题色
    if (store.play?.cover)
      await updateThemeFromCover(store.play.cover)
    await fetchSubtitles()
    await scrollActiveLyricIntoView()
  }
})

// 监听播放标识变化（同一首歌切换 cid 分P 也需要重拉字幕）
watch(() => [store.play?.bvid, store.play?.cid, store.play?.aid], async () => {
  if (props.show && store.play?.cover)
    await updateThemeFromCover(store.play.cover)
  if (props.show)
    await fetchSubtitles()
  lyricItemRefs.value = []
})

watch(() => activeSubtitleIndex.value, () => {
  scrollActiveLyricIntoView()
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
          class="relative mx-auto grid h-full w-full max-w-[1280px] min-h-0 grid-cols-[minmax(340px,460px)_minmax(360px,560px)] grid-rows-1 items-center gap-14 overflow-hidden px-8 pb-4">
          <div class="flex min-h-0 justify-end overflow-hidden">
            <div class="mx-auto flex h-full flex-col items-center justify-end gap-4">
              <div class="w-[400px]  flex flex-col justify-end p-[14px_14px_12px]">
                <div class="w-full mx-auto mb-3 flex justify-center">
                  <div class="cover-core w-full h-full rounded-2xl overflow-hidden shadow-2xl relative"
                    :style="{ boxShadow: `0 20px 50px -12px ${rgbToRgba(themeColor, 0.5)}` }">
                    <img v-if="store.play?.cover" :src="store.play.cover" class="w-full" />
                    <div v-else class="w-full h-full bg-neutral-800 flex items-center justify-center">
                      <div class="i-mingcute:music-2-fill text-7xl text-neutral-700" />
                    </div>
                  </div>
                </div>

                <!-- 歌曲信息布局 (Apple Music 样式：左对齐标题，右侧更多按钮) -->
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
                  <!-- 收藏/更多操作 -->
                  <!-- <button class="text-white/40 hover:text-primary active:scale-90 transition-all mt-1">
                    <div class="i-mingcute:heart-line text-2xl" />
                  </button> -->
                </div>

                <!-- 进度条区域 -->
                <div class="w-full mb-4">
                  <ProgressBar class="progress-thin" :percent="props.progress.percent" :current="props.progress.current"
                    :total="props.progress.total" track-color="rgba(255,255,255,0.14)"
                    fill-color="rgba(226,244,255,0.96)" time-color="rgba(235,245,255,0.62)" @seek="changeProgress" />
                </div>

                <!-- 播放控制 -->
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
          <!-- 字幕 -->
          <div ref="lyricsScrollRef"
            class="lyrics-scroll lyrics-vertical-fade h-[90vh] max-h-[90vh] w-full self-center overflow-y-auto px-8 py-5">
            <div v-if="subtitleLoading" class="pt-[18vh] text-center text-sm text-white/45">
              正在加载字幕...
            </div>
            <div v-else-if="subtitleError || !subtitleLines.length" class="pt-[18vh] text-center text-sm text-white/45">
              {{ subtitleError || '暂无字幕' }}
            </div>
            <div v-else class="mx-auto flex w-full max-w-[520px] flex-col items-start justify-start gap-3">
              <button v-for="(line, index) in subtitleLines" :key="`${line.from}-${index}`"
                :ref="el => setLyricItemRef(el, index)" type="button"
                class="w-full overflow-hidden border-none bg-transparent px-0 py-[1px] text-left text-[20px] leading-[1.5] font-semibold text-ellipsis whitespace-nowrap transition-all duration-250 hover:text-white/45"
                :class="{ 'text-white text-[27px] font-black scale-110': index === activeSubtitleIndex }"
                @click="seekToSubtitle(line)">
                {{ line.content }}
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  </Transition>
</template>

<style scoped>
.lyrics-scroll {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.mask-fade {
  mask-image: linear-gradient(to right, transparent 0, #000 12px, #000 calc(100% - 12px), transparent 100%);
}

.marquee {
  animation: marquee-bounce 8s linear infinite alternate;
}

.lyrics-vertical-fade {
  -webkit-mask-image: linear-gradient(to bottom, transparent 0, #000 8%, #000 92%, transparent 100%);
  mask-image: linear-gradient(to bottom, transparent 0, #000 8%, #000 92%, transparent 100%);
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

.lyrics-scroll::-webkit-scrollbar {
  display: none;
}
</style>
