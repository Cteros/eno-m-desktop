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
import { LoopSwitch, ProgressBar, Slider, MessageAPI } from '@cloudfly/eno-ui'
import FullscreenPlayer from '../FullscreenPlayer/index.vue'

// hooks & utils
import useControl from './keys'

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
  store.recordHistoryIndex(index)

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
    onplay: () => {
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
    const pages = Array.isArray(res?.data?.pages) ? res.data.pages : []
    const resolvedCid = Number(item?.cid || 0)
    const fallbackCid = Number(res?.data?.cid || pages?.[0]?.cid || 0)
    const cid = resolvedCid && pages.some(p => Number(p?.cid || 0) === resolvedCid)
      ? resolvedCid
      : fallbackCid
    const aid = Number(res?.data?.aid || item?.aid || 0)
    if (!cid)
      throw new Error('No cid resolved for bvid')

    const dashRes = await invokeBiliApi(BLBL.GET_AUDIO_OF_VIDEO, {
      cid,
      bvid: item.bvid,
    })
    const dash = dashRes.data.dash

    const url = getUpUrl(dash.audio[0])
    const video = getUpUrl(dash.video[0])

    return {
      ...item,
      aid,
      cid,
      bvid: res?.data?.bvid || item?.bvid,
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
    let aid = Number(item?.aid || 0)
    if ((!aid || !item?.bvid) && item?.bvid) {
      try {
        const info = await invokeBiliApi(BLBL.GET_VIDEO_INFO, { bvid: item.bvid })
        aid = Number(info?.data?.aid || aid || 0)
      } catch (e) {
        console.warn('Failed to enrich aid for cid item:', e)
      }
    }
    const dashRes = await invokeBiliApi(BLBL.GET_AUDIO_OF_VIDEO, {
      cid: item.cid,
      bvid: item.bvid,
    })
    const dash = dashRes.data.dash

    const url = getUpUrl(dash.audio[0])
    const video = getUpUrl(dash.video[0])

    return {
      ...item,
      aid,
      cid: Number(item?.cid || 0),
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
  const needStableIds = (song) => {
    const type = song?.eno_song_type
    if (type !== 'bvid' && type !== 'cid')
      return false
    return !(Number(song?.cid || 0) > 0 && Number(song?.aid || 0) > 0)
  }

  if (currentSong.url && !needStableIds(currentSong)) {
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
  if (type === 'next')
    store.playNext()
  else if (type === 'prev')
    store.playPrevious()
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
async function openBlTab() {
  if (store.play && !store.play?.url) {
    try {
      await getPlayUrl(store.play)
    } catch (e) {
      console.warn('Failed to prepare play url before opening fullscreen:', e)
    }
  }
  showFullscreenPlayer.value = true
}
function changeVideoMode() {
  store.videoMode = store.videoMode === VIDEO_MODE.FLOATING ? VIDEO_MODE.DRAWER : VIDEO_MODE.HIDDEN
}

async function downloadSong() {
  if (!store.play?.url || !store.play?.title) {
    MessageAPI.show({
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
      MessageAPI.show({
        type: 'success',
        message: `下载完成：${filePath}`,
        duration: 4000,
      })
    } else {
      MessageAPI.show({
        type: 'error',
        message: `下载失败：${error}`,
        duration: 4000,
      })
    }
  } catch (err) {
    console.error('Download error:', err)
    MessageAPI.show({
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
  <section class="eno-player">
    <div class="eno-player-shell">
      <div class="eno-left">
        <div class="eno-cover-wrap group" @click.stop="openBlTab">
          <img v-if="store.play.cover" :src="store.play.cover" class="eno-cover">
          <div v-else class="eno-cover eno-cover--empty">
            <div class="i-mingcute:music-2-fill text-2xl" />
          </div>
          <div class="eno-cover-mask">
            <div class="i-mingcute:arrow-up-circle-fill text-2xl text-white" />
          </div>
        </div>

        <div class="eno-meta">
          <div class="eno-title" v-html="displayData.title" />
          <div class="eno-author">
            {{ store.play.author }}
          </div>
        </div>

        <div class="eno-mini-actions">
          <div
            class="i-mingcute:heart-line"
            @click.stop="PLstore.startAddSong(store.play)"
          />
          <div
            :class="cn('relative', isDownloading ? 'text-[#1ed760]' : '')"
            :title="isDownloading ? '下载中...' : '下载歌曲'"
            @click="!isDownloading && downloadSong()"
          >
            <div v-if="isDownloading" class="i-mingcute:loading-3-fill animate-spin" />
            <div v-else class="i-mingcute:download-2-fill" />
          </div>
        </div>
      </div>

      <div class="eno-center">
        <div class="eno-controls">
          <LoopSwitch v-model="store.loopMode" />
          <div class="i-mingcute:skip-backward-fill eno-ctrl" @click.stop="change('prev')" />
          <button
            type="button"
            class="eno-play-btn"
            aria-label="播放/暂停"
            @click.stop="playControl"
          >
            <span
              v-if="isPlaying"
              class="eno-play-icon i-mingcute:pause-fill"
            />
            <span
              v-else
              class="eno-play-icon i-mingcute:play-fill"
            />
          </button>
          <div class="i-mingcute:skip-forward-fill eno-ctrl" @click.stop="change('next')" />
        </div>

        <ProgressBar
          :percent="progress.percent"
          :current="progress.current"
          :total="progress.total"
          @seek="handleSeekPercent"
          @dragging="handleDragging"
        />
      </div>

      <div class="eno-right">
        <div class="eno-volume">
          <div v-if="isCloseVoice" class="i-mingcute:volume-mute-line eno-ctrl" @click="setVoice" />
          <div v-else class="i-mingcute:volume-line eno-ctrl" @click="setVoice" />
          <Slider
            v-if="!isCloseVoice"
            class="flex-1 h-1"
            :value="voice"
            @update:value="val => (voice = val)"
            @change="handleChangeVoice"
          />
        </div>
        <div
          :class="cn('i-mingcute:playlist-fill eno-ctrl', showPlaylist ? 'text-[#1ed760]' : '')"
          @click="toggleList"
        />
        <div class="i-mingcute:fullscreen-line eno-ctrl" @click="fullScreenTheBody" />
      </div>
    </div>
    <FullscreenPlayer
      v-model:show="showFullscreenPlayer"
      :is-playing="isPlaying"
      :progress="progress"
      @play="playControl"
      @prev="() => change('prev')"
      @next="() => change('next')"
      @seek="handleFullscreenSeek"
    />
  </section>
</template>

<style scoped>
.eno-player {
  width: 100%;
  height: 100%;
  color: #b3b3b3;
  background: #000;
}

.eno-player-shell {
  display: grid;
  grid-template-columns: minmax(240px, 1fr) minmax(360px, 1.6fr) minmax(240px, 1fr);
  align-items: center;
  gap: 16px;
  height: 100%;
  padding: 0 16px;
}

.eno-left {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 12px;
}

.eno-cover-wrap {
  position: relative;
  width: 56px;
  height: 56px;
  flex-shrink: 0;
  cursor: pointer;
}

.eno-cover {
  width: 100%;
  height: 100%;
  border-radius: 4px;
  object-fit: cover;
}

.eno-cover--empty {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #282828;
}

.eno-cover-mask {
  position: absolute;
  inset: 0;
  display: none;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  background: rgb(0 0 0 / 50%);
}

.group:hover .eno-cover-mask {
  display: flex;
}

.eno-meta {
  min-width: 0;
  flex: 1;
}

.eno-title {
  overflow: hidden;
  color: #fff;
  font-size: 14px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.eno-author {
  overflow: hidden;
  margin-top: 2px;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.eno-mini-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 18px;
}

.eno-mini-actions > * {
  cursor: pointer;
}

.eno-mini-actions > *:hover {
  color: #fff;
}

.eno-center {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: center;
}

.eno-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
}

.eno-ctrl {
  font-size: 18px;
  color: #b3b3b3;
  cursor: pointer;
  transition: color 0.12s var(--eno-ease);
}

.eno-ctrl:hover {
  color: #fff;
}

button.eno-play-btn {
  display: inline-flex;
  width: 32px;
  height: 32px;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 50%;
  color: #000;
  background: #fff;
  background-color: #fff;
  cursor: pointer;
  transition: transform 0.12s var(--eno-ease);
}

button.eno-play-btn:hover {
  transform: scale(1.06);
  background: #fff;
  background-color: #fff;
  color: #000;
}

button.eno-play-btn .eno-play-icon {
  display: block;
  width: 16px;
  height: 16px;
  font-size: 16px;
  color: #000;
  background-color: #000;
}

.eno-right {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
}

.eno-volume {
  display: flex;
  width: 128px;
  align-items: center;
  gap: 8px;
}

:deep(.progress-bar),
:deep(.eno-progress) {
  width: 100%;
}
</style>
