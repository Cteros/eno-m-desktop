<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useDownloadStore } from '~/store/downloadStore'
import Message from '~/components/message'
import BiliLoginCard from './components/BiliLoginCard.vue'
import AppInfoCard from './components/AppInfoCard.vue'
import FFmpegCard from './components/FFmpegCard.vue'
import DownloadSettingsCard from './components/DownloadSettingsCard.vue'

const downloadStore = useDownloadStore()

// FFmpeg 检查状态
const ffmpegAvailable = ref<boolean | null>(null)
const ffmpegChecking = ref(false)
const ffmpegInfo = ref<any>(null)
const ffmpegError = ref('')
const downloadingFFmpeg = ref(false)
const ffmpegDownloadProgress = ref(0)

const user = ref<{ isLogin: boolean; uname?: string; face?: string } | null>(null)

async function refreshBiliUser() {
  try {
    const res = await (window as any).ipcRenderer?.invoke('bili-user-info')
    if (res?.info) {
      user.value = res.info
      console.log('User info updated:', res.info)
    } else if (res?.error) {
      console.warn('Failed to get user info:', res.error)
      user.value = null
    }
  } catch (error) {
    console.error('Error refreshing user info:', error)
    user.value = null
  }
}

// 检查 FFmpeg
async function checkFFmpeg() {
  ffmpegChecking.value = true
  ffmpegError.value = ''
  try {
    const info = await (window as any).ipcRenderer?.invoke('get-ffmpeg-info')
    ffmpegInfo.value = info
    ffmpegAvailable.value = info.found

    if (info.found) {
      downloadStore.setFFmpegInfo({
        installed: true,
        version: info.version,
        path: info.path
      })
    } else {
      downloadStore.setFFmpegInfo({
        installed: false,
        version: '',
        path: ''
      })
      Message.show({
        type: 'error',
        message: '✗ 未找到 FFmpeg，请先安装',
      })
    }
  } catch (error: any) {
    ffmpegAvailable.value = false
    ffmpegError.value = error.message || '检查 FFmpeg 失败'
    Message.show({
      type: 'error',
      message: ffmpegError.value,
    })
  } finally {
    ffmpegChecking.value = false
  }
}

// 下载 FFmpeg
async function downloadFFmpeg() {
  downloadingFFmpeg.value = true
  ffmpegError.value = ''
  ffmpegDownloadProgress.value = 0

  try {
    const result = await (window as any).ipcRenderer?.invoke('download-ffmpeg')
    if (result?.success) {
      Message.show({
        type: 'success',
        message: 'FFmpeg 下载完成，请稍候...',
      })
      // 重新检查 FFmpeg
      setTimeout(() => checkFFmpeg(), 2000)
    } else {
      ffmpegError.value = result?.error || '下载 FFmpeg 失败'
      Message.show({
        type: 'error',
        message: ffmpegError.value,
      })
    }
  } catch (error: any) {
    ffmpegError.value = error.message || '下载 FFmpeg 出错'
    Message.show({
      type: 'error',
      message: ffmpegError.value,
    })
  } finally {
    downloadingFFmpeg.value = false
  }
}

// 选择下载目录
async function selectDownloadPath() {
  try {
    const result = await (window as any).ipcRenderer.invoke('select-directory')
    if (result.success && result.path) {
      downloadStore.setDownloadPath(result.path)
      Message.show({
        type: 'success',
        message: `下载目录已设置为：${result.path}`,
      })
    }
  } catch (error) {
    console.error(error)
    Message.show({
      type: 'error',
      message: '选择目录失败',
    })
  }
}

// 打开下载文件夹
async function openDownloadFolder() {
  try {
    const path = downloadStore.config.downloadPath
    if (path) {
      await (window as any).ipcRenderer.invoke('open-folder', path)
    }
  } catch (error) {
    Message.show({
      type: 'error',
      message: '打开文件夹失败',
    })
  }
}

// 组件挂载时初始化
onMounted(() => {
  ffmpegInfo.value = {
    found: downloadStore.config.ffmpegInstalled,
    version: downloadStore.config.ffmpegVersion,
    path: downloadStore.config.ffmpegPath
  }
  ffmpegAvailable.value = downloadStore.config.ffmpegInstalled ? true : null
  refreshBiliUser()
})

// 处理登录事件
function handleBiliLogin() {
  refreshBiliUser()
}

// 处理登出事件
function handleBiliLogout() {
  user.value = null
}

function clearLocalCache() {
  const ok = window.confirm('确定清除本地缓存吗？这会清空本地保存的播放列表、偏好设置和登录状态。')
  if (!ok)
    return

  try {
    localStorage.clear()
    Message.show({
      type: 'success',
      message: '本地缓存已清除，正在刷新...',
    })
    setTimeout(() => {
      window.location.reload()
    }, 300)
  } catch (error) {
    console.error('Failed to clear local cache:', error)
    Message.show({
      type: 'error',
      message: '清除缓存失败',
    })
  }
}
</script>

<template>
  <div class="relative px-8 py-6 settings-page">
    <div class="relative z-10 max-w-6xl mx-auto">
      <div class="settings-hero">
        <div>
          <h1 class="text-3xl font-bold text-white mb-2">设置</h1>
          <p class="text-sm text-gray-400">更快地完成下载配置与系统工具检查</p>
        </div>
        <div class="settings-hero__meta">
          <span class="text-xs text-gray-500">偏好设置已自动保存</span>
          <button class="eno-btn eno-btn-ghost text-red-300 hover:text-red-200 ml-3" @click="clearLocalCache">
            清除本地缓存
          </button>
        </div>
      </div>

      <!-- B站扫码登录卡片 -->
      <!-- <BiliLoginCard :user="user" @login="handleBiliLogin" @logout="handleBiliLogout" /> -->

      <div class="settings-grid">
        <div class="settings-col">
          <DownloadSettingsCard
            :download-path="downloadStore.config.downloadPath || '未设置（使用默认目录）'"
            v-model:download-name-format="downloadStore.config.fileNameFormat"
            v-model:download-image-format="downloadStore.config.imageNameFormat"
            v-model:download-sub-format="downloadStore.config.lyricNameFormat"
            @selectFolder="selectDownloadPath"
            @openDownloadFolder="openDownloadFolder"
          />
        </div>
        <div class="settings-col">
          <FFmpegCard
            :ffmpeg-info="ffmpegInfo"
            :ffmpeg-loading="ffmpegChecking"
            :ffmpeg-error="ffmpegError"
            :downloading-ffmpeg="downloadingFFmpeg"
            :download-progress="ffmpegDownloadProgress"
            @checkFFmpeg="checkFFmpeg"
            @downloadFFmpeg="downloadFFmpeg"
          />
          <AppInfoCard />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.settings-page {
  min-height: 100%;
}

.settings-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  gap: 12px;
}

.settings-hero__meta {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 6px 10px;
  border-radius: 999px;
}

.settings-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 20px;
}

.settings-col {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

@media (max-width: 1024px) {
  .settings-grid {
    grid-template-columns: 1fr;
  }
}
</style>
