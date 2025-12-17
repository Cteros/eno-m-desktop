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
  <div class="border border-white/10 rounded-xl p-6 mb-6 hover:border-white/20 transition-colors duration-300">
    <div class="flex items-center gap-3 mb-6">
      <div class="i-mingcute:tool-fill text-2xl text-[#667eea]" />
      <h2 class="text-lg font-bold text-white">FFmpeg 工具</h2>
    </div>

    <!-- 状态信息 -->
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div class="flex flex-col gap-1">
          <span class="text-sm text-gray-400">安装状态</span>
          <span :class="statusColor" class="text-base font-medium">{{ statusText }}</span>
        </div>
        <button :disabled="ffmpegLoading"
          class="px-3 py-1.5 rounded-md bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-medium transition-colors"
          @click="$emit('checkFFmpeg')">
          {{ ffmpegLoading ? '检测中...' : '重新检测' }}
        </button>
      </div>

      <!-- 版本信息 -->
      <div v-if="isInstalled" class="space-y-4">
        <div class="flex flex-col gap-1">
          <span class="text-sm text-gray-400">版本</span>
          <span class="text-base font-mono text-white">{{ ffmpegInfo?.version || '未知' }}</span>
        </div>
        <div class="flex flex-col gap-1">
          <span class="text-sm text-gray-400">路径</span>
          <div class="p-3 rounded-lg bg-white/5 border border-white/5">
            <p class="text-xs text-gray-400 font-mono break-all">{{ ffmpegInfo?.path || '未知' }}</p>
          </div>
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
        <button
          class="w-full py-2.5 rounded-lg bg-[#667eea] hover:bg-[#5a6fd6] text-white font-medium transition-colors flex items-center justify-center gap-2 text-sm"
          @click="$emit('downloadFFmpeg')">
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
            <ul class="space-y-1 text-gray-400 text-xs">
              <li>• FFmpeg 是一个强大的多媒体框架，用于处理音视频</li>
              <li>• 本应用使用 FFmpeg 进行音频转码和处理</li>
              <li>• 系统未检测到 FFmpeg 时，可点击下载自动安装</li>
              <li>• 也可以自行安装到系统环境变量中</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
