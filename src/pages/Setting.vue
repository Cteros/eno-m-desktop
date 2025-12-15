<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useDownloadStore } from '~/store/downloadStore'
import Message from '~/components/message'
import BiliLoginCard from './components/BiliLoginCard.vue'
import AppInfoCard from './components/AppInfoCard.vue'
import FFmpegCard from './components/FFmpegCard.vue'
import DownloadSettingsCard from './components/DownloadSettingsCard.vue'

const downloadStore = useDownloadStore()

// 更新检查状态
const checkingUpdate = ref(false)
const downloadingUpdate = ref(false)
const downloadProgress = ref(0)
const updateAvailable = ref(false)
const currentVersion = ref('')
const latestVersion = ref('')
const releaseNotes = ref('')
const updateError = ref('')
const updateChecked = ref(false)

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

// 检查更新
async function checkForUpdates() {
  checkingUpdate.value = true
  updateError.value = ''
  updateChecked.value = false

  try {
    const result = await (window as any).ipcRenderer?.invoke('check-for-updates')

    if (result?.success) {
      currentVersion.value = result.currentVersion
      latestVersion.value = result.latestVersion
      releaseNotes.value = result.releaseNotes || ''
      updateAvailable.value = result.updateAvailable
      updateChecked.value = true

      if (result.updateAvailable) {
        Message.show({
          type: 'success',
          message: `发现新版本 ${result.latestVersion}`,
        })
      } else {
        Message.show({
          type: 'info',
          message: '已是最新版本',
        })
      }
    } else {
      updateError.value = result?.error || '检查更新失败'
      Message.show({
        type: 'error',
        message: updateError.value,
      })
    }
  } catch (error: any) {
    updateError.value = error.message || '检查更新出错'
    Message.show({
      type: 'error',
      message: updateError.value,
    })
  } finally {
    checkingUpdate.value = false
  }
}

// 下载并安装更新
async function downloadAndInstallUpdate() {
  downloadingUpdate.value = true
  updateError.value = ''
  downloadProgress.value = 0

  try {
    const result = await (window as any).ipcRenderer?.invoke('download-and-install-update')

    if (result?.success) {
      Message.show({
        type: 'success',
        message: '更新已下载，安装程序即将启动',
      })
    } else {
      updateError.value = result?.error || '下载更新失败'
      Message.show({
        type: 'error',
        message: updateError.value,
      })
    }
  } catch (error: any) {
    updateError.value = error.message || '下载更新出错'
    Message.show({
      type: 'error',
      message: updateError.value,
    })
  } finally {
    downloadingUpdate.value = false
  }
}

// 获取应用版本
async function initVersion() {
  try {
    const versionInfo = await (window as any).ipcRenderer?.invoke('get-app-version')
    if (versionInfo) {
      currentVersion.value = `v${versionInfo.version}`
    }
  } catch (error) {
    console.error('Failed to get app version:', error)
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
      // Message.show({
      //   type: 'success',
      //   message: '✓ FFmpeg 已安装',
      // })
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
  initVersion()
  if (downloadStore.config.ffmpegInstalled) {
    ffmpegInfo.value = {
      found: true,
      version: downloadStore.config.ffmpegVersion,
      path: downloadStore.config.ffmpegPath
    }
    ffmpegAvailable.value = true
  } else {
    checkFFmpeg()
  }
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
</script>

<template>
  <div class="page-inner relative">
    <!-- 内容区域 -->
    <div class="relative z-10 max-w-4xl">
      <!-- 页面标题 -->
      <div class="mb-12 mt-4">
        <h1 class="text-display mb-2">设置</h1>
        <p class="text-body-small">自定义你的下载和应用配置</p>
      </div>

      <!-- B站扫码登录卡片 - 优先显示 -->
      <BiliLoginCard :user="user" @login="handleBiliLogin" @logout="handleBiliLogout" />

      <!-- 关于应用卡片 -->
      <AppInfoCard :current-version="currentVersion" :latest-version="latestVersion" :release-notes="releaseNotes"
        :update-available="updateAvailable" :update-checked="updateChecked" :checking-update="checkingUpdate"
        :downloading-update="downloadingUpdate" :download-progress="downloadProgress" :update-error="updateError"
        @checkUpdates="checkForUpdates" @downloadUpdate="downloadAndInstallUpdate" />

      <!-- FFmpeg 工具卡片 -->
      <FFmpegCard :ffmpeg-info="ffmpegInfo" :ffmpeg-loading="ffmpegChecking" :ffmpeg-error="ffmpegError"
        :downloading-ffmpeg="downloadingFFmpeg" :download-progress="ffmpegDownloadProgress" @checkFFmpeg="checkFFmpeg"
        @downloadFFmpeg="downloadFFmpeg" />

      <!-- 下载设置卡片 -->
      <DownloadSettingsCard :download-path="downloadStore.config.downloadPath || '未设置（使用默认目录）'"
        v-model:download-name-format="downloadStore.config.fileNameFormat"
        v-model:download-image-format="downloadStore.config.imageNameFormat"
        v-model:download-sub-format="downloadStore.config.lyricNameFormat" @selectFolder="selectDownloadPath"
        @openDownloadFolder="openDownloadFolder" />
    </div>
  </div>
</template>
