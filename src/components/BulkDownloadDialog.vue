<script setup>
import { computed } from 'vue'
import Dialog from '~/components/dialog/index.vue'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  songList: {
    type: Array,
    default: () => []
  },
  isLoading: {
    type: Boolean,
    default: false
  },
  isDownloading: {
    type: Boolean,
    default: false
  },
  downloadIndex: {
    type: Number,
    default: 0
  },
  selectAll: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits([
  'close',
  'toggle-select-all',
  'toggle-select',
  'start-download',
  'stop-download',
  'item-change'
])

const selectedCount = computed(() => {
  return props.songList.filter(s => s.selected).length
})

const canStartDownload = computed(() => {
  return !props.isDownloading && !props.isLoading && props.songList.length > 0 && selectedCount.value > 0
})

function handleToggleSelectAll() {
  emit('toggle-select-all')
}

function handleToggleSelect(idx) {
  emit('toggle-select', idx)
}

function handleItemCheckboxChange(idx, e) {
  // 防止事件冒泡
  e.stopPropagation()
  emit('item-change', idx, e)
}

function handleStartDownload() {
  emit('start-download')
}

function handleStop() {
  if (props.isDownloading) {
    emit('stop-download')
  } else {
    emit('close')
  }
}
</script>

<template>
  <Dialog
    :open="show"
    class="w-[720px] max-w-[95%]"
    bodyClass="pt-3"
    @visibleChange="(val: any) => !val && emit('close')"
  >
    <template #header>
      <div class="flex items-center justify-between w-full">
        <div class="flex flex-col gap-1">
          <div class="text-lg font-bold">批量下载</div>
          <div class="text-xs text-gray-400">共 {{ songList.length }} 首</div>
        </div>
        <div class="text-sm text-gray-400">
          {{ isDownloading ? `${downloadIndex}/${songList.length}` : '' }}
        </div>
      </div>
    </template>

    <!-- 工具栏 -->
    <div class="flex items-center justify-between mb-2">
      <div class="flex items-center gap-3">
        <button
          class="px-3 py-1 rounded bg-[#222] hover:bg-[#333] text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          @click="handleToggleSelectAll"
          :disabled="isLoading"
        >
          {{ selectAll ? '取消全选' : '全选' }}
        </button>
        <div class="text-sm text-gray-400">已选 {{ selectedCount }} / {{ songList.length }}</div>
      </div>
      <div class="text-sm text-gray-400">{{ isDownloading ? `${downloadIndex}/${songList.length}` : (isLoading ? '加载中...' : '') }}</div>
    </div>

    <!-- 歌曲列表 -->
    <div class="max-h-64 overflow-auto mb-4 p-2 bg-[#121212] rounded">
      <div v-if="isLoading" class="flex flex-col items-center justify-center py-12 text-gray-400">
        <div class="i-mingcute:loading-3-fill animate-spin text-3xl mb-3" />
        <div>正在获取歌曲列表，请稍候...</div>
      </div>
      <ul v-else class="space-y-2">
        <li
          v-for="(s, idx) in songList"
          :key="s.id"
          class="flex items-center justify-between gap-2 px-2 py-1 rounded hover:bg-[#1a1a1a] transition-colors"
        >
          <div class="flex items-center gap-3 flex-1">
            <input
              type="checkbox"
              class="w-4 h-4 cursor-pointer"
              :checked="s.selected"
              :disabled="isDownloading"
              @change="handleItemCheckboxChange(idx, $event)"
            />
            <div class="text-sm text-white/80 truncate" style="max-width:520px">{{ idx + 1 }}. {{ s.title }}</div>
          </div>
          <div class="text-sm flex-shrink-0">
            <span v-if="s.status === 'pending'" class="text-gray-400">待下载</span>
            <span v-else-if="s.status === 'existed'" class="text-blue-400">已存在</span>
            <span v-else-if="s.status === 'downloading'" class="text-yellow-400">下载中</span>
            <span v-else-if="s.status === 'success'" class="text-green-400">完成</span>
            <span v-else-if="s.status === 'failed'" class="text-red-400">失败</span>
          </div>
        </li>
      </ul>
    </div>

    <template #footer>
      <button class="eno-btn eno-btn-ghost" @click="handleStop">
        {{ isDownloading ? '停止' : '取消' }}
      </button>
      <button class="eno-btn eno-btn-primary" @click="handleStartDownload" :disabled="!canStartDownload">
        <span v-if="!isDownloading">开始下载</span>
        <span v-else>正在下载 {{ downloadIndex }} / {{ songList.length }}</span>
      </button>
    </template>
  </Dialog>
</template>

<style scoped>
/* 防止事件冒泡导致的问题 */
input[type="checkbox"] {
  pointer-events: auto;
}
</style>
