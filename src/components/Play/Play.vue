<script setup>
import { onMounted, inject } from 'vue'
// 第三方库
import { useLocalStorage } from '@vueuse/core'
import { Howl } from 'howler'
import cn from 'classnames'

// store
import { VIDEO_MODE, useBlblStore } from '../../blbl/store'
import { usePlaylistStore } from '../../playlist/store.ts'
import { useDownloadStore } from '../../store/downloadStore'
import { formatFileName } from '~/utils/filename'
import LoopSwitch from './LoopSwitch.vue'

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
const voice = useLocalStorage('voice', 1)
const isCloseVoice = ref(false)
const progressTimer = ref(null)
const isDragging = ref(false)

useControl({
  play: () => playControl(),
  forward: () => changeSeek(10),
  back: () => changeSeek(-10),
})

function changeSeek(number) {
  if (!store.play?.id)
    return
  store.howl.pause()

  progress.current = (progress.current + number + progress.total) % progress.total
  store.howl.seek(progress.current)

  store.howl.play()
}

function updateProgess() {
  if (!isDragging.value) {
    progress.current = store.howl.seek()
    progress.percent = progress.current / progress.total
  }
  if (store.howl.playing())
    requestAnimationFrame(updateProgess)
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
    onplay: () => {
      isPlaying.value = true
      progress.total = store.howl.duration()
      requestAnimationFrame(updateProgess)
    },
    onpause: () => {
      isPlaying.value = false
      clearInterval(progressTimer.value)
    },
    onend: () => {
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
function changeProgress(e) {
  // 如果当前没有歌曲,就返回
  if (!store.play?.id)
    return
  // 如果是 input 事件（拖动中），只更新 isDragging，不seek
  if (e.type === 'input') {
    isDragging.value = true
    return
  }

  store.howl.seek(progress.total * e.target.value)
  isDragging.value = false
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
const timeDisplay = computed(() => {
  return {
    current: new Date(progress.current * 1000).toISOString().substr(14, 5) || '00:00',
    total: new Date(progress.total * 1000).toISOString().substr(14, 5) || '00:00',
  }
})
const progressTrans = computed(() => {
  return {
    transform: `translateX(${(1 - progress.percent) * -100}%)`,
  }
})
function handleChangeVoice(e) {
  // 确保 store.howl 存在，防止报错
  if (store.howl) {
    store.howl.volume(e.target.value)
  }
  voice.value = e.target.value
}
// 设置打开声音和静音
function setVoice() {
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

function fullScreenTheBody() {
  // 切换全屏状态
  if (document.fullscreenElement)
    document.exitFullscreen()
  else
    document.body.requestFullscreen()

  fullScreenStatus.value = document.fullscreenElement
}
async function openBlTab() {
  const url = `https://www.bilibili.com/video/${store.play.bvid}`
  try {
    await window.ipcRenderer.invoke('open-external-window', url)
  } catch (e) {
    console.warn('open-external-window failed, fallback to browser open', e)
    try {
      window.open(url, '_blank')
    } catch (err) {
      console.error('Fallback window.open failed', err)
    }
  }
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
          <div class="text-white text-sm truncate hover:underline cursor-pointer" v-html="displayData.title" />
          <div class="text-xs truncate hover:text-white cursor-pointer hover:underline">
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
        <div class="flex items-center gap-6 text-xl mb-1">
          <LoopSwitch />
          <div class="i-mingcute:skip-previous-fill hover:text-white cursor-pointer" @click.stop="change('prev')" />

          <div
            class="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform cursor-pointer"
            @click.stop="playControl">
            <div v-if="isPlaying" class="i-mingcute:pause-fill text-xl" />
            <div v-else class="i-mingcute:play-fill text-xl pl-0.5" />
          </div>

          <div class="i-mingcute:skip-forward-fill hover:text-white cursor-pointer" @click.stop="change('next')" />
          <div class="i-mingcute:repeat-one-line hover:text-white cursor-pointer text-lg opacity-0" /> <!-- 占位 -->
        </div>

        <div class="flex items-center w-full gap-2 text-xs font-mono">
          <span class="min-w-[40px] text-right">{{ timeDisplay.current }}</span>
          <div class="group relative flex-1 h-1 bg-[#4d4d4d] rounded-full cursor-pointer">
            <div class="absolute top-0 left-0 h-full bg-white rounded-full group-hover:bg-green-500"
              :style="{ width: `${progress.percent * 100}%` }" />
            <!-- 滑块 -->
            <div
              class="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 shadow pointer-events-none"
              :style="{ left: `${progress.percent * 100}%`, marginLeft: '-6px' }" />
            <input v-model="progress.percent" type="range"
              class="absolute inset-0 w-full h-full opacity-0 cursor-pointer" min="0" max="1" step="0.001"
              @input="changeProgress" @change="changeProgress">
          </div>
          <span class="min-w-[40px]">{{ timeDisplay.total }}</span>
        </div>
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

          <div class="flex-1 h-1 bg-[#4d4d4d] rounded-full cursor-pointer relative" @click="handleChangeVoice">
            <div class="absolute top-0 left-0 h-full bg-white rounded-full group-hover:bg-green-500"
              :style="{ width: `${voice * 100}%` }" />
            <input v-if="!isCloseVoice" v-model="voice" type="range"
              class="absolute inset-0 w-full h-full opacity-0 cursor-pointer" min="0" max="1" step="0.01"
              @change="handleChangeVoice">
          </div>
        </div>

        <div class="i-mingcute:fullscreen-line hover:text-white cursor-pointer text-lg" @click="fullScreenTheBody" />
      </div>
    </div>
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
