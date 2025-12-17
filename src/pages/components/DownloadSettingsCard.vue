<script setup lang="ts">
import { ref, computed } from 'vue'

interface Props {
  downloadPath: string
  downloadNameFormat?: string
  downloadImageFormat?: string
  downloadSubFormat?: string
}

defineEmits<{
  'update:downloadPath': [value: string]
  'update:downloadNameFormat': [value: string]
  'update:downloadImageFormat': [value: string]
  'update:downloadSubFormat': [value: string]
  selectFolder: []
  openDownloadFolder: []
}>()

const props = withDefaults(defineProps<Props>(), {
  downloadNameFormat: '{singer} - {song}',
  downloadImageFormat: 'cover.jpg',
  downloadSubFormat: '{index}. {singer} - {song}.lrc'
})
const showAdvanced = ref(false)

const formatExamples = {
  name: '{singer} - {song}',
  image: 'cover.{ext}',
  sub: '{index}. {singer} - {song}'
}

const nameFormatPlaceholder = computed(() => {
  const formats = ['{singer}', '{song}', '{album}', '{aid}']
  return formats.join(' / ')
})
</script>

<template>
  <div class="border border-white/10 rounded-xl p-6 mb-6 hover:border-white/20 transition-colors duration-300">
    <div class="flex items-center gap-3 mb-6">
      <div class="i-mingcute:download-2-fill text-2xl text-[#ff6b6b]" />
      <h2 class="text-lg font-bold text-white">下载设置</h2>
    </div>

    <!-- 下载路径 -->
    <div class="mb-8">
      <p class="text-sm text-gray-400 mb-3">下载位置</p>
      <div class="flex gap-2 mb-4">
        <div class="flex-1">
          <input type="text" :value="downloadPath" readonly
            class="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-gray-300 text-sm font-mono focus:outline-none" />
        </div>
        <button
          class="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-medium transition-colors"
          @click="$emit('selectFolder')">
          选择位置
        </button>
        <button
          class="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-medium transition-colors"
          @click="$emit('openDownloadFolder')">
          打开文件夹
        </button>
      </div>
    </div>

    <!-- 命名格式 -->
    <div class="mb-8">
      <div class="flex items-center justify-between mb-3">
        <p class="text-sm text-gray-400">音乐文件命名格式</p>
        <span class="text-xs text-gray-500 font-mono">{{ formatExamples.name }}</span>
      </div>
      <input type="text" :value="downloadNameFormat" :placeholder="nameFormatPlaceholder"
        class="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-[#667eea] transition-colors"
        @input="$emit('update:downloadNameFormat', ($event.target as HTMLInputElement).value)" />
      <p class="text-xs text-gray-500 mt-2">支持的占位符: {singer} {song} {album} {aid}</p>
    </div>

    <!-- 高级选项 -->
    <div class="mb-4">
      <button class="flex items-center gap-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
        @click="showAdvanced = !showAdvanced">
        <span :class="showAdvanced ? 'i-mingcute:up-line' : 'i-mingcute:down-line'" />
        <span>{{ showAdvanced ? '隐藏' : '显示' }}高级选项</span>
      </button>
    </div>

    <div v-if="showAdvanced" class="space-y-6 pt-6 border-t border-white/10">
      <!-- 图片格式 -->
      <div>
        <div class="flex items-center justify-between mb-3">
          <p class="text-sm text-gray-400">封面格式</p>
          <span class="text-xs text-gray-500 font-mono">{{ formatExamples.image }}</span>
        </div>
        <input type="text" :value="downloadImageFormat" placeholder="cover.jpg"
          class="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-[#667eea] transition-colors"
          @input="$emit('update:downloadImageFormat', ($event.target as HTMLInputElement).value)" />
        <p class="text-xs text-gray-500 mt-2">默认格式: cover.jpg, cover.png, cover.webp</p>
      </div>

      <!-- 字幕格式 -->
      <div>
        <div class="flex items-center justify-between mb-3">
          <p class="text-sm text-gray-400">字幕文件命名</p>
          <span class="text-xs text-gray-500 font-mono">{{ formatExamples.sub }}</span>
        </div>
        <input type="text" :value="downloadSubFormat" placeholder="{index}. {singer} - {song}.lrc"
          class="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-[#667eea] transition-colors"
          @input="$emit('update:downloadSubFormat', ($event.target as HTMLInputElement).value)" />
        <p class="text-xs text-gray-500 mt-2">支持占位符: {index} {singer} {song} {album} {aid}</p>
      </div>
    </div>

    <!-- 说明信息 -->
    <div class="p-4 rounded-lg bg-white/5 border border-white/5 mt-6">
      <div class="flex gap-3">
        <div class="i-mingcute:information-line text-[#ff6b6b] text-lg flex-shrink-0 mt-0.5" />
        <div class="text-sm">
          <p class="font-medium text-white mb-2">下载说明</p>
          <ul class="space-y-1 text-gray-400 text-xs">
            <li>• 选择文件夹后，所有下载的音乐将保存到该位置</li>
            <li>• 可自定义文件命名格式以便更好地组织音乐库</li>
            <li>• 高级选项中可配置封面和字幕的存储格式</li>
            <li>• 修改配置后立即生效</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>
