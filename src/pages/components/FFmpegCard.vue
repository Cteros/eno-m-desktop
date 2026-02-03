<script setup lang="ts">
import { computed } from 'vue'

interface FFmpegInfo {
  found?: boolean
  installed?: boolean
  version?: string
  path?: string
}

interface Props {
  ffmpegInfo: FFmpegInfo | null
  ffmpegLoading: boolean
  ffmpegError: string
  downloadingFfmpeg: boolean
  downloadProgress: number
}

const props = defineProps<Props>()
defineEmits<{
  checkFFmpeg: []
  downloadFFmpeg: []
}>()

const isInstalled = computed(() => {
  if (!props.ffmpegInfo) return false
  return props.ffmpegInfo.found !== undefined ? props.ffmpegInfo.found : props.ffmpegInfo.installed || false
})

const statusText = computed(() => {
  if (!props.ffmpegInfo) return '未检测'
  return isInstalled.value ? '已安装' : '未安装'
})

const statusColor = computed(() => {
  if (!props.ffmpegInfo) return 'text-text-tertiary'
  return isInstalled.value ? 'text-[#1db954]' : 'text-orange-400'
})
</script>

<template>
  <div class="settings-card">
    <details class="ffmpeg-details">
      <summary class="settings-card__header ffmpeg-summary">
        <div class="flex items-center gap-2">
          <div class="settings-card__title">
            <div class="i-mingcute:tool-fill text-xl text-[#667eea]" />
            <span>FFmpeg 工具</span>
          </div>
          <span :class="isInstalled ? 'ffmpeg-dot' : 'ffmpeg-dot ffmpeg-dot--off'" aria-label="安装状态" />
        </div>
        <div class="flex items-center gap-2">
          <button :disabled="ffmpegLoading" class="eno-btn eno-btn-ghost" @click.prevent="$emit('checkFFmpeg')">
            {{ ffmpegLoading ? '检测中...' : '重新检测' }}
          </button>
          <div class="ffmpeg-chevron i-mingcute:down-line text-lg text-white/50" />
        </div>
      </summary>

      <!-- 状态信息 -->
      <div class="space-y-6 ffmpeg-body">
        <div class="flex items-center justify-between">
          <div class="flex flex-col gap-1">
            <span class="text-sm text-gray-400">安装状态</span>
            <span :class="statusColor" class="text-base font-medium">{{ statusText }}</span>
          </div>
        </div>

      <!-- 下载进度 -->
      <div v-if="downloadingFfmpeg" class="space-y-2">
        <div class="flex items-center justify-between text-xs text-gray-400">
          <span>下载进度</span>
          <span>{{ Math.round(downloadProgress) }}%</span>
        </div>
        <div class="h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div class="h-full bg-[#667eea] transition-all duration-300" :style="{ width: downloadProgress + '%' }" />
        </div>
      </div>

      <!-- 下载按钮 -->
      <div v-if="!isInstalled && !downloadingFfmpeg">
        <button class="w-full eno-btn eno-btn-primary" @click="$emit('downloadFFmpeg')">
          <div class="i-mingcute:download-line text-lg" />
          <span>下载 FFmpeg</span>
        </button>
      </div>

      <!-- 错误信息 -->
      <div v-if="ffmpegError" class="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
        <p class="text-xs text-red-400">{{ ffmpegError }}</p>
      </div>

      <!-- 说明信息 -->
      <div class="p-4 rounded-lg bg-white/5 border border-white/5">
        <div class="flex gap-3">
          <div class="i-mingcute:information-line text-[#667eea] text-lg flex-shrink-0 mt-0.5" />
          <div class="text-sm">
            <p class="font-medium text-white mb-2">关于 FFmpeg</p>
            <div class="text-gray-400 text-xs leading-relaxed">
              FFmpeg 用于音频转码与封装。未检测到时可一键下载安装，也可自行安装到系统环境变量。
            </div>
          </div>
        </div>
      </div>
      </div>
    </details>
  </div>
</template>

<style scoped>
.ffmpeg-details {
  width: 100%;
}

.ffmpeg-summary {
  cursor: pointer;
  list-style: none;
}

.ffmpeg-summary::-webkit-details-marker {
  display: none;
}

.ffmpeg-body {
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.ffmpeg-details[open] .ffmpeg-chevron {
  transform: rotate(180deg);
  transition: transform 0.2s ease;
}

.ffmpeg-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: #1db954;
  box-shadow: 0 0 8px rgba(29, 185, 84, 0.6);
  display: inline-block;
}

.ffmpeg-dot--off {
  background: rgba(255, 255, 255, 0.25);
  box-shadow: none;
}
</style>
