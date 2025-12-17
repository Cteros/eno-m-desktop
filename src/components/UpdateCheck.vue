<template>
  <div class="update-check">
    <!-- 更新通知按钮 -->
    <div v-if="updateAvailable && !customTrigger" class="fixed bottom-5 right-5 animate-slide-in z-50">
      <button @click="showUpdateDialog"
        class="flex items-center gap-2 px-4 py-2.5 bg-[#667eea] hover:bg-[#5a6fd6] text-white rounded-lg shadow-lg transition-all hover:-translate-y-0.5 font-medium text-sm">
        <div class="i-mingcute:refresh-2-fill text-lg" />
        <span>有新版本可用 ({{ latestVersion }})</span>
      </button>
    </div>

    <!-- 更新对话框 -->
    <Dialog :open="showDialog" title="检查更新" @visibleChange="closeDialog" class="w-[400px]">
      <div class="flex flex-col justify-center min-h-[120px] px-1 py-2">
        <!-- 检查中 -->
        <div v-if="checking" class="flex flex-col items-center gap-3 py-4">
          <div class="i-svg-spinners:90-ring-with-bg text-2xl text-[#667eea]" />
          <p class="text-sm text-gray-400">正在检查更新...</p>
        </div>

        <!-- 错误 -->
        <div v-else-if="checkError" class="text-center py-4">
          <div class="i-mingcute:close-circle-fill text-3xl text-red-500 mb-2 mx-auto" />
          <p class="text-sm text-red-400">{{ checkError }}</p>
        </div>

        <!-- 初始状态 -->
        <div v-else-if="!hasChecked" class="text-center py-4">
          <p class="text-sm text-gray-400">点击下方按钮检查最新版本</p>
        </div>

        <!-- 无更新 -->
        <div v-else-if="!updateAvailable" class="flex flex-col items-center gap-2 py-4">
          <div class="i-mingcute:check-circle-fill text-3xl text-green-500" />
          <p class="text-sm font-medium text-white">您已是最新版本</p>
          <p class="text-xs text-gray-500">当前版本: {{ currentVersion }}</p>
        </div>

        <!-- 有更新 -->
        <div v-else class="flex flex-col gap-4">
          <div class="bg-white/5 rounded-lg p-3 flex flex-col gap-1.5">
            <div class="flex justify-between items-center text-sm">
              <span class="text-gray-400">当前版本</span>
              <span class="font-mono text-gray-200">{{ currentVersion }}</span>
            </div>
            <div class="flex justify-between items-center text-sm">
              <span class="text-gray-400">最新版本</span>
              <span class="font-mono text-[#667eea] font-bold">{{ latestVersion }}</span>
            </div>
          </div>

          <div v-if="releaseNotes" class="flex flex-col gap-2">
            <h4 class="text-xs font-bold text-gray-300">更新说明</h4>
            <div
              class="bg-black/20 rounded p-2 text-xs text-gray-400 leading-relaxed max-h-[100px] overflow-y-auto custom-scrollbar">
              {{ releaseNotes.slice(0, 200) }}
              <span v-if="releaseNotes.length > 200">...</span>
            </div>
          </div>

          <div v-if="downloading" class="flex flex-col gap-2">
            <div class="flex justify-between text-xs text-gray-400">
              <span>正在下载更新...</span>
              <span>{{ downloadProgress }}%</span>
            </div>
            <div class="h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div class="h-full bg-[#667eea] transition-all duration-300" :style="{ width: downloadProgress + '%' }">
              </div>
            </div>
          </div>

          <div v-if="downloaded" class="flex items-center gap-2 text-green-500 bg-green-500/10 p-2 rounded text-xs">
            <div class="i-mingcute:check-circle-fill" />
            <span>更新已下载完毕，请重启应用以安装</span>
          </div>
        </div>
      </div>

      <template #footer>
        <button @click="closeDialog"
          class="px-3 py-1.5 rounded text-xs font-medium text-gray-400 hover:bg-white/5 transition-colors">
          {{ updateAvailable && downloading ? '最小化' : '关闭' }}
        </button>

        <button v-if="!checking && !hasChecked" @click="checkUpdates"
          class="px-4 py-1.5 rounded bg-[#667eea] hover:bg-[#5a6fd6] text-white text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="checking || downloading">
          检查更新
        </button>

        <button v-else-if="updateAvailable && !downloading && !downloaded" @click="downloadUpdate"
          class="px-4 py-1.5 rounded bg-[#667eea] hover:bg-[#5a6fd6] text-white text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="downloading">
          立即更新
        </button>

        <button v-else-if="downloaded" @click="quitAndInstall"
          class="px-4 py-1.5 rounded bg-[#667eea] hover:bg-[#5a6fd6] text-white text-xs font-medium transition-colors">
          重启并安装
        </button>
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import Dialog from './dialog/index.vue'

const props = defineProps({
  customTrigger: {
    type: Boolean,
    default: false
  }
})

const updateAvailable = ref(false)
const currentVersion = ref('')
const latestVersion = ref('')
const releaseNotes = ref('')
const checking = ref(false)
const downloading = ref(false)
const downloaded = ref(false)
const downloadProgress = ref(0)
const checkError = ref('')
const showDialog = ref(false)
const hasChecked = ref(false)

const emit = defineEmits(['update-status'])

defineExpose({
  updateAvailable,
  showUpdateDialog,
  currentVersion,
  latestVersion
})

// 检查更新
async function checkUpdates() {
  checking.value = true
  checkError.value = ''

  try {
    const result = await (window as any).ipcRenderer?.invoke('check-for-updates')

    if (result?.success) {
      currentVersion.value = result.currentVersion
      latestVersion.value = result.latestVersion
      releaseNotes.value = result.releaseNotes || ''
      updateAvailable.value = result.updateAvailable
      hasChecked.value = true

      emit('update-status', {
        updateAvailable: result.updateAvailable,
        currentVersion: result.currentVersion,
        latestVersion: result.latestVersion,
        releaseNotes: result.releaseNotes
      })
    } else {
      checkError.value = result?.error || '检查更新失败'
    }
  } catch (error: any) {
    checkError.value = error.message || '检查更新出错'
  } finally {
    checking.value = false
  }
}

// 监听下载进度
const onDownloadProgress = (_event: any, progressObj: any) => {
  downloadProgress.value = Math.round(progressObj.percent)
}

const onUpdateDownloaded = () => {
  downloading.value = false
  downloaded.value = true
}

const onUpdateError = (_event: any, message: string) => {
  checkError.value = message
  downloading.value = false
}

// 重启并安装
async function quitAndInstall() {
  await (window as any).ipcRenderer?.invoke('quit-and-install')
}

// 下载并安装更新
async function downloadUpdate() {
  downloading.value = true
  checkError.value = ''

  try {
    // 注册监听器
    (window as any).ipcRenderer?.on('update-download-progress', onDownloadProgress);
    (window as any).ipcRenderer?.on('update-downloaded', onUpdateDownloaded);
    (window as any).ipcRenderer?.on('update-error', onUpdateError);

    const result = await (window as any).ipcRenderer?.invoke('download-and-install-update')

    if (!result?.success) {
      checkError.value = result?.error || '下载更新失败'
      downloading.value = false
      cleanupListeners()
    }
  } catch (error: any) {
    checkError.value = error.message || '下载更新出错'
    downloading.value = false
    cleanupListeners()
  }
}

function cleanupListeners() {
  (window as any).ipcRenderer?.off('update-download-progress', onDownloadProgress);
  (window as any).ipcRenderer?.off('update-downloaded', onUpdateDownloaded);
  (window as any).ipcRenderer?.off('update-error', onUpdateError);
}

function showUpdateDialog() {
  showDialog.value = true
}

function closeDialog() {
  showDialog.value = false
}

// 组件挂载时获取版本信息
onMounted(async () => {
  try {
    const versionInfo = await (window as any).ipcRenderer?.invoke('get-app-version')
    if (versionInfo) {
      currentVersion.value = `v${versionInfo.version}`
    }
    // 自动检查更新
    await checkUpdates()
  } catch (error) {
    console.error('Failed to get app version or check updates:', error)
  }
})

onUnmounted(() => {
  cleanupListeners()
})
</script>

<style scoped>
@keyframes slideIn {
  from {
    transform: translateX(400px);
    opacity: 0;
  }

  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.animate-slide-in {
  animation: slideIn 0.3s ease-out;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
</style>
