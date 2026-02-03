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
  <div class="settings-card">
    <div class="settings-card__header">
      <div>
        <div class="settings-card__title">
          <div class="i-mingcute:information-line text-xl text-[#1db954]" />
          <span>关于应用</span>
        </div>
        <div class="settings-card__subtitle">版本与更新信息</div>
      </div>
      <button
        :class="updateStatusColor"
        class="eno-btn eno-btn-ghost"
        @click="updater?.showUpdateDialog()"
      >
        {{ updateStatusText }}
      </button>
    </div>

    <!-- 版本信息 -->
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div class="flex flex-col gap-1">
          <span class="text-sm text-gray-400">当前版本</span>
          <span class="text-base font-mono text-white">{{ currentVersion || '...' }}</span>
        </div>
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
        <div class="text-xs text-gray-400 leading-relaxed" v-html="releaseNotes"></div>
      </div>
    </div>

    <!-- 隐藏的更新组件 -->
    <UpdateCheck ref="updater" :custom-trigger="true" @update-status="onUpdateStatus" />
  </div>
</template>
