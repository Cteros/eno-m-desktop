<script setup>
import { onMounted, onBeforeUnmount, inject } from 'vue'
// 第三方库
import { useLocalStorage } from '@vueuse/core'
import { Howl } from 'howler'
import cn from 'classnames'

// store
import { VIDEO_MODE, useBlblStore } from '../../blbl/store'
import { usePlaylistStore } from '../../playlist/store.ts'
import { useDownloadStore } from '../../store/downloadStore'
import { formatFileName } from '~/utils/filename'
import { LoopSwitch, ProgressBar, Slider, PlayControlBar } from '../common'
import FullscreenPlayer from '../FullscreenPlayer/index.vue'

// hooks & utils
import useControl from './keys'
import Message from '../message'
// @ts-ignore
import { invokeBiliApi, BLBL } from '~/api/bili'

const PLstore = usePlaylistStore()
const store = useBlblStore()
const downloadStore = useDownloadStore()

// 注入全局播放列表控制
const showPlaylist = inject('showPlaylist')

onMounted(() => {
  // 注册系统媒体会话
  if ('mediaSession' in navigator) {
    navigator.mediaSession.setActionHandler('previoustrack', () => change('prev'))
    navigator.mediaSession.setActionHandler('nexttrack', () => change('next'))
  }
})

function getUpUrl(obj) {
  const url1 = obj.baseUrl || ''
  const url2 = obj.backup_url?.[0] || ''
  const url3 = obj.backup_url?.[1] || ''

  // 找到第一个不是https://xy 开头的url
  const urlList = [url1, url2, url3].filter(url => !url.startsWith('https://xy'))
  return urlList[0] || url1
}

const isPlaying = ref(false)
// const showList = ref(false) // 移除本地状态
const historyList = ref([])
const progress = reactive({
  percent: 0,
  current: 0,
  total: 0,
})
const voice = useLocalStorage('voice', 100)
const isCloseVoice = ref(false)
const isDragging = ref(false)
const progressRafId = ref(0)

useControl({
  play: () => playControl(),
  forward: () => changeSeek(10),
  back: () => changeSeek(-10),
})

function changeSeek(number) {
  if (!store.play?.id)
    return
  if (!store.howl)
    return
  if (!progress.total)
    return
  store.howl.pause()

  progress.current = (progress.current + number + progress.total) % progress.total
  store.howl.seek(progress.current)

  store.howl.play()
}

function stopProgressLoop() {
  if (progressRafId.value) {
    cancelAnimationFrame(progressRafId.value)
    progressRafId.value = 0
  }
}

function updateProgess() {
  if (!store.howl)
    return
  if (!isDragging.value) {
    progress.current = store.howl.seek()
    progress.percent = progress.total ? progress.current / progress.total : 0
  }
  if (store.howl.playing())
    progressRafId.value = requestAnimationFrame(updateProgess)
  else
    stopProgressLoop()
}

function startProgressLoop() {
  stopProgressLoop()
  progressRafId.value = requestAnimationFrame(updateProgess)
}

function initMusic() {
  const url = store.play.url
  // 重置进度
  progress.percent = 0
  progress.current = 0

  if (store.howl) {
    store.howl.stop()
    store.howl.unload()
  }
  stopProgressLoop()

  // 判断当前歌曲是否在播放列表中，如果不在就插入，用于点击歌曲播放时防止 history 无法记录
  const index = store.playList.findIndex(({ id }) => id === store.play.id)
  if (index !== historyList.value.at(-1)) {
    historyList.value.push(index)
  }

  if ('mediaSession' in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: store.play.title,
      artist: store.play.author,
      album: store.play.album,
      artwork: [{ src: store.play.cover }],
    })
  }

  store.howl = new Howl({
    src: [url],
    html5: true,
    volume: 1,
    mute: false,
    xhrWithCredentials: false,
    format: ['m4s', 'mp3', 'aac'],
    onload: () => {
      // 音频加载完成后，设置crossOrigin
      const audioNode = store.howl._sounds[0]?._node
      if (audioNode) {
        audioNode.crossOrigin = 'anonymous'

        // 初始化音频可视化连接
        try {
          if (!store.audioContext) {
            const AudioContext = window.AudioContext || window.webkitAudioContext
            store.audioContext = new AudioContext()
          }

          if (!store.analyser) {
            store.analyser = store.audioContext.createAnalyser()
            store.analyser.fftSize = 256
          }

          // 避免重复连接同一个 audio 元素
          if (!audioNode._isConnectedToEno) {
            const source = store.audioContext.createMediaElementSource(audioNode)
            source.connect(store.analyser)
            store.analyser.connect(store.audioContext.destination)
            audioNode._isConnectedToEno = true
          }
        } catch (e) {
          console.error('Audio Context Error:', e)
        }
      }
    },
    onplay: () => {
      if (store.audioContext && store.audioContext.state === 'suspended') {
        store.audioContext.resume()
      }
      isPlaying.value = true
      progress.total = store.howl.duration()
      startProgressLoop()
    },
    onpause: () => {
      isPlaying.value = false
      stopProgressLoop()
    },
    onend: () => {
      stopProgressLoop()
      if (store.loopMode === 'single')
        initMusic()
      else change('next')
    },
  })
  store.howl.play()
  store.howl.volume(voice.value)
  isCloseVoice.value = store.howl.volume() === 0
}
async function getBvidUrl(item) {
  try {
    const res = await invokeBiliApi(BLBL.GET_VIDEO_INFO, {
      bvid: item.bvid,
    })
    const { cid } = res.data

    const dashRes = await invokeBiliApi(BLBL.GET_AUDIO_OF_VIDEO, {
      cid,
      bvid: item.bvid,
    })
    const dash = dashRes.data.dash

    const url = getUpUrl(dash.audio[0])
    const video = getUpUrl(dash.video[0])

    return {
      ...item,
      url,
      video,
      dash,
    }
  } catch (error) {
    console.error('Failed to get video url:', error)
    return item
  }
}
async function getCidUrl(item) {
  try {
    const dashRes = await invokeBiliApi(BLBL.GET_AUDIO_OF_VIDEO, {
      cid: item.cid,
      bvid: item.bvid,
    })
    const dash = dashRes.data.dash

    const url = getUpUrl(dash.audio[0])
    const video = getUpUrl(dash.video[0])

    return {
      ...item,
      url,
      video,
      dash,
    }
  } catch (error) {
    console.error('Failed to get cid url:', error)
    return item
  }
}
async function getSidUrl(item) {
  try {
    const res = await invokeBiliApi(BLBL.GET_SONG, {
      sid: item.id,
    })
    const url = res.data.cdns[0]

    return {
      ...item,
      url,
    }
  } catch (error) {
    console.error('Failed to get song url:', error)
    return item
  }
}

async function getPlayUrl(currentSong) {
  if (!currentSong)
    return
  if (currentSong.url) {
    store.play = currentSong
    return
  }
  const play = currentSong.eno_song_type === 'bvid'
    ? await getBvidUrl(currentSong)
    : currentSong.eno_song_type === 'cid'
      ? await getCidUrl(currentSong)
      : await getSidUrl(currentSong)
  store.play = play
}

// 监听歌曲切换
watch(() => store.play?.id, async () => {
  const currentSong = store.play
  if (!currentSong)
    return
  await getPlayUrl(currentSong)
  initMusic()
})
// 顺序切换
function change(type) {
  let index = historyList.value.at(-1) || 0
  const { playList, loopMode } = store

  if (loopMode === 'random') {
    if (type === 'next') {
      index = Math.floor(Math.random() * playList.length)
    }
    else if (type === 'prev') {
      // 移除最后两个，并播放上一个
      const remove = historyList.value.splice(-2)
      index = remove[0] || 0
    }
  }
  else {
    const currentLength = playList.length

    if (type === 'next')
      index = (index + 1) % currentLength
    else if (type === 'prev')
      index = (index - 1 + currentLength) % currentLength
  }

  historyList.value.push(index)
  store.play = playList[index]
}
function handleSeekPercent(percent) {
  if (!store.play?.id)
    return
  if (!store.howl)
    return
  if (!progress.total)
    return
  store.howl.seek(progress.total * percent)
  isDragging.value = false
}

function handleDragging(val) {
  isDragging.value = val
}

// 处理全屏播放器的seek事件
function handleFullscreenSeek(percent) {
  if (!store.play?.id)
    return
  if (!progress.total)
    return
  store.howl.seek(progress.total * percent)
}

function toggleList() {
  // showList.value = !showList.value
  if (showPlaylist) {
    showPlaylist.value = !showPlaylist.value
  }
}

function deleteSong(index) {
  store.playList.splice(index, 1)
}

const displayData = computed(() => {
  return {
    title: store.play.title || '暂无歌曲',
  }
})

async function playControl() {
  // 当前未播放，点击加载音乐
  if (!store.howl) {
    await getPlayUrl(store.play)
    return initMusic()
  }

  if (isPlaying.value)
    store.howl.pause()
  else
    store.howl.play()
}
const progressTrans = computed(() => {
  return {
    transform: `translateX(${(1 - progress.percent) * -100}%)`,
  }
})
function handleChangeVoice(val) {
  // 确保 store.howl 存在，防止报错
  if (store.howl) {
    store.howl.volume(val / 100)
  }
  voice.value = val
}
// 设置打开声音和静音
function setVoice() {
  if (!store.howl)
    return
  if (isCloseVoice.value) {
    store.howl.volume(voice.value)
    isCloseVoice.value = false
  }
  else {
    store.howl.volume(0)
    isCloseVoice.value = true
  }
}
const fullScreenStatus = ref(false)
const isDownloading = ref(false)
const downloadProgress = ref(0)
const showFullscreenPlayer = ref(false)

function fullScreenTheBody() {
  // 切换全屏状态
  if (document.fullscreenElement)
    document.exitFullscreen()
  else
    document.body.requestFullscreen()

  fullScreenStatus.value = document.fullscreenElement
}

onBeforeUnmount(() => {
  stopProgressLoop()
  if ('mediaSession' in navigator) {
    navigator.mediaSession.setActionHandler('previoustrack', null)
    navigator.mediaSession.setActionHandler('nexttrack', null)
  }
})
function openBlTab() {
  showFullscreenPlayer.value = true
}
function changeVideoMode() {
  store.videoMode = store.videoMode === VIDEO_MODE.FLOATING ? VIDEO_MODE.DRAWER : VIDEO_MODE.HIDDEN
}

async function downloadSong() {
  if (!store.play?.url || !store.play?.title) {
    Message.show({
      type: 'error',
      message: '无法下载：歌曲信息不完整',
      duration: 3000,
    })
    return
  }

  isDownloading.value = true
  downloadProgress.value = 0

  try {
    // 获取音频URL，处理m4s文件
    const url = store.play.url
    const fileName = formatFileName(downloadStore.config.fileNameFormat || '{singer} - {song}', {
      singer: store.play.author,
      song: store.play.title,
      aid: store.play.id
    })

    const result = await window.ipcRenderer.invoke('download-song', {
      url,
      fileName: fileName,
      author: store.play.author,
      songInfo: {
        title: store.play.title,
        artist: store.play.author,
        album: store.play.album || store.play.title, // B站视频通常没有专辑概念，可以用标题代替或留空
        cover: store.play.cover,
      },
      basePath: downloadStore.config.downloadPath,
      createAuthorFolder: downloadStore.config.createAuthorFolder,
    })

    const { success, filePath, error } = result

    if (success) {
      Message.show({
        type: 'success',
        message: `下载完成：${filePath}`,
        duration: 4000,
      })
    } else {
      Message.show({
        type: 'error',
        message: `下载失败：${error}`,
        duration: 4000,
      })
    }
  } catch (err) {
    console.error('Download error:', err)
    Message.show({
      type: 'error',
      message: '下载异常，请检查FFmpeg是否已安装',
      duration: 4000,
    })
  } finally {
    isDownloading.value = false
    downloadProgress.value = 0
  }
}
</script>

<template>
  <section class="flex flex-col w-full h-full bg-black text-[#b3b3b3]">
    <div class="flex h-full items-center justify-between px-4 gap-4">
      <!-- 左侧信息区 -->
      <div class="flex items-center gap-4 w-[30%] min-w-[200px]">
        <div class="relative group cursor-pointer" @click.stop="openBlTab">
          <img v-if="store.play.cover" :src="store.play.cover" class="w-14 h-14 rounded object-cover bg-[#282828]">
          <div v-else class="w-14 h-14 rounded bg-[#282828] flex items-center justify-center">
            <div class="i-mingcute:music-2-fill text-2xl" />
          </div>
          <!-- 展开视频图标 -->
          <div class="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center rounded">
            <div class="i-mingcute:arrow-up-circle-fill text-2xl text-white" />
          </div>
        </div>

        <div class="flex flex-col overflow-hidden">
          <div class="text-white text-sm truncate cursor-pointer" v-html="displayData.title" />
          <div class="text-xs truncate hover:text-white cursor-pointer">
            {{ store.play.author }}
          </div>
        </div>

        <div class="flex gap-3 pl-2">
          <div class="i-mingcute:heart-line hover:text-white cursor-pointer text-lg"
            @click.stop="PLstore.startAddSong(store.play)" />
        </div>
      </div>

      <!-- 中间控制区 -->
      <div class="flex flex-col items-center w-[40%] max-w-[722px] gap-1">
        <PlayControlBar :isPlaying="isPlaying" @play="playControl" @prev="() => change('prev')"
          @next="() => change('next')" @forward="() => changeSeek(15)" @backward="() => changeSeek(-15)">
          <template #left>
            <LoopSwitch v-model="store.loopMode" />
          </template>
          <template #right>
            <div class="i-mingcute:repeat-one-line hover:text-white cursor-pointer text-lg opacity-0" />
          </template>
        </PlayControlBar>

        <ProgressBar
          :percent="progress.percent"
          :current="progress.current"
          :total="progress.total"
          @seek="handleSeekPercent"
          @dragging="handleDragging"
        />
      </div>

      <!-- 右侧功能区 -->
      <div class="flex items-center justify-end gap-3 w-[30%] min-w-[200px]">
        <div
          :class="cn('i-mingcute:playlist-fill cursor-pointer text-lg transition-colors', showPlaylist ? 'text-[#1db954]' : 'hover:text-white')"
          @click="toggleList" />

        <div
          :class="cn('cursor-pointer text-lg transition-colors hover:text-white relative group', isDownloading ? 'text-[#1db954]' : '')"
          @click="!isDownloading && downloadSong()" :title="isDownloading ? '下载中...' : '下载歌曲'">
          <div v-if="isDownloading" class="i-mingcute:loading-3-fill animate-spin" />
          <div v-else class="i-mingcute:download-2-fill" />
          <!-- 下载进度提示 -->
          <div v-if="isDownloading && downloadProgress > 0"
            class="absolute -top-8 right-0 bg-black/80 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
            {{ Math.round(downloadProgress) }}%
          </div>
        </div>

        <div class="flex items-center gap-2 w-32 group">
          <div v-if="isCloseVoice" class="i-mingcute:volume-mute-line text-lg" @click="setVoice" />
          <div v-else class="i-mingcute:volume-line text-lg" @click="setVoice" />
          <Slider v-if="!isCloseVoice" class="flex-1 h-1" :value="voice" @update:value="val => (voice = val)"
            @change="handleChangeVoice" />
        </div>

        <div class="i-mingcute:fullscreen-line hover:text-white cursor-pointer text-lg" @click="fullScreenTheBody" />
      </div>
    </div>
    <FullscreenPlayer v-model:show="showFullscreenPlayer" :isPlaying="isPlaying" :progress="progress"
      @play="playControl" @prev="() => change('prev')" @next="() => change('next')" @seek="handleFullscreenSeek"
      @volume="handleChangeVoice" />
  </section>
</template>

<style scoped>
/* 移除默认的 range input 样式，使用自定义样式 */
input[type=range] {
  -webkit-appearance: none;
  background: transparent;
  cursor: pointer;
  z-index: 20;
}

input[type=range]::-webkit-slider-thumb {
  -webkit-appearance: none;
  height: 12px;
  width: 12px;
  opacity: 0;
}
</style>
