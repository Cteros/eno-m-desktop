<script setup lang="ts">
import { ref, computed } from 'vue'
import UpdateCheck from '~/components/UpdateCheck.vue'

const updater = ref()
const currentVersion = ref('')
const latestVersion = ref('')
const updateAvailable = ref(false)
const releaseNotes = ref('')

function onUpdateStatus(status: any) {
  currentVersion.value = status.currentVersion
  latestVersion.value = status.latestVersion
  updateAvailable.value = status.updateAvailable
  releaseNotes.value = status.releaseNotes
}

const updateStatusText = computed(() => {
  if (updateAvailable.value) return '发现新版本'
  return '检查更新'
})

const updateStatusColor = computed(() => {
  if (updateAvailable.value) return 'text-[#ffa500]'
  return 'text-gray-400 hover:text-white'
})
</script>

<template>
  <div class="border border-white/10 rounded-xl p-6 mb-6 hover:border-white/20 transition-colors duration-300">
    <div class="flex items-center gap-3 mb-6">
      <div class="i-mingcute:information-line text-2xl text-[#1db954]" />
      <h2 class="text-lg font-bold text-white">关于应用</h2>
    </div>

    <!-- 版本信息 -->
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div class="flex flex-col gap-1">
          <span class="text-sm text-gray-400">当前版本</span>
          <span class="text-base font-mono text-white">{{ currentVersion || '...' }}</span>
        </div>
        <button :class="updateStatusColor" class="text-sm font-medium transition-colors cursor-pointer"
          @click="updater?.showUpdateDialog()">
          {{ updateStatusText }}
        </button>
      </div>

      <div v-if="updateAvailable" class="flex items-center justify-between">
        <div class="flex flex-col gap-1">
          <span class="text-sm text-gray-400">最新版本</span>
          <span class="text-base font-mono text-[#ffa500]">{{ latestVersion }}</span>
        </div>
      </div>

      <!-- 发布说明 -->
      <div v-if="releaseNotes" class="p-4 rounded-lg bg-white/5 border border-white/5">
        <p class="text-sm font-medium text-white mb-2">更新内容</p>
        <p class="text-xs text-gray-400 whitespace-pre-wrap leading-relaxed">{{ releaseNotes }}</p>
      </div>
    </div>

    <!-- 隐藏的更新组件 -->
    <UpdateCheck ref="updater" :custom-trigger="true" @update-status="onUpdateStatus" />
  </div>
</template>
