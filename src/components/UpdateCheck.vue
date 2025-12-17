<template>
  <div class="update-check">
    <!-- 更新通知按钮 -->
    <div v-if="updateAvailable && !customTrigger" class="update-notification">
      <button @click="showUpdateDialog" class="update-btn">
        🔄 有新版本可用 ({{ latestVersion }})
      </button>
    </div>

    <!-- 更新对话框 -->
    <div v-if="showDialog" class="update-modal-overlay" @click.self="closeDialog">
      <div class="update-modal">
        <div class="modal-header">
          <h2>检查更新</h2>
          <button @click="closeDialog" class="close-btn">✕</button>
        </div>

        <div class="modal-body">
          <div v-if="checking" class="checking-state">
            <div class="spinner"></div>
            <p>正在检查更新...</p>
          </div>

          <div v-else-if="checkError" class="error-state">
            <p class="error-text">{{ checkError }}</p>
          </div>

          <div v-else-if="!hasChecked" class="initial-state">
            <p>点击下方按钮检查最新版本</p>
          </div>

          <div v-else-if="!updateAvailable" class="no-update-state">
            <p class="success-text">✓ 您已是最新版本</p>
            <p class="version-text">当前版本: {{ currentVersion }}</p>
          </div>

          <div v-else class="update-available-state">
            <div class="version-info">
              <p>
                <strong>当前版本:</strong>
                <span>{{ currentVersion }}</span>
              </p>
              <p>
                <strong>最新版本:</strong>
                <span class="new-version">{{ latestVersion }}</span>
              </p>
            </div>

            <div v-if="releaseNotes" class="release-notes">
              <h4>更新说明:</h4>
              <div class="notes-content">
                {{ releaseNotes.slice(0, 200) }}
                <span v-if="releaseNotes.length > 200">...</span>
              </div>
            </div>

            <div v-if="downloading" class="download-progress">
              <p>正在下载更新...</p>
              <div class="progress-bar">
                <div class="progress-fill" :style="{ width: downloadProgress + '%' }"></div>
              </div>
              <p class="progress-text">{{ downloadProgress }}%</p>
            </div>

            <div v-if="downloaded" class="download-complete">
              <p class="success-text">✓ 更新已下载完毕，请重启应用以安装</p>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button @click="closeDialog" class="btn btn-secondary">
            {{ updateAvailable && downloading ? '最小化' : '关闭' }}
          </button>
          <button v-if="!checking && !hasChecked" @click="checkUpdates" class="btn btn-primary"
            :disabled="checking || downloading">
            检查更新
          </button>
          <button v-else-if="updateAvailable && !downloading && !downloaded" @click="downloadUpdate"
            class="btn btn-primary" :disabled="downloading">
            立即更新
          </button>
          <button v-else-if="downloaded" @click="quitAndInstall" class="btn btn-primary">
            重启并安装
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

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

defineExpose({
  updateAvailable,
  showUpdateDialog
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
.update-notification {
  position: fixed;
  bottom: 20px;
  right: 20px;
  animation: slideIn 0.3s ease-out;
}

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

.update-btn {
  padding: 10px 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
  transition: all 0.3s ease;
}

.update-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(102, 126, 234, 0.6);
}

.update-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}

.update-modal {
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  width: 90%;
  max-width: 500px;
  display: flex;
  flex-direction: column;
  animation: modalIn 0.3s ease-out;
}

@keyframes modalIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }

  to {
    opacity: 1;
    transform: scale(1);
  }
}

.modal-header {
  padding: 20px;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #999;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;
}

.close-btn:hover {
  background: #f0f0f0;
  color: #333;
}

.modal-body {
  padding: 20px;
  min-height: 150px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.checking-state,
.error-state,
.initial-state,
.no-update-state {
  text-align: center;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #f0f0f0;
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 15px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.error-text {
  color: #e74c3c;
  margin: 0;
}

.success-text {
  color: #27ae60;
  margin: 0 0 10px 0;
  font-weight: 500;
}

.version-text {
  color: #999;
  font-size: 14px;
  margin: 0;
}

.version-info {
  background: #f9f9f9;
  padding: 12px;
  border-radius: 6px;
  margin-bottom: 15px;
}

.version-info p {
  margin: 8px 0;
  font-size: 14px;
}

.version-info strong {
  color: #333;
  min-width: 70px;
  display: inline-block;
}

.new-version {
  color: #667eea;
  font-weight: 600;
}

.release-notes {
  margin-bottom: 15px;
}

.release-notes h4 {
  margin: 0 0 8px 0;
  font-size: 14px;
  color: #333;
}

.notes-content {
  background: #f9f9f9;
  padding: 10px;
  border-radius: 4px;
  font-size: 12px;
  color: #666;
  line-height: 1.5;
  max-height: 100px;
  overflow-y: auto;
}

.download-progress {
  margin-top: 15px;
}

.progress-bar {
  width: 100%;
  height: 4px;
  background: #e0e0e0;
  border-radius: 2px;
  overflow: hidden;
  margin: 10px 0;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #667eea, #764ba2);
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 12px;
  color: #999;
  text-align: center;
  margin: 5px 0 0 0;
}

.modal-footer {
  padding: 15px 20px;
  border-top: 1px solid #f0f0f0;
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-secondary {
  background: #f0f0f0;
  color: #333;
}

.btn-secondary:hover:not(:disabled) {
  background: #e0e0e0;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
