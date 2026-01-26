<script setup lang="ts">
import { inject, computed } from 'vue'
import { useRouter } from 'vue-router'
import { usePlaylistStore } from './store'
import BLFav from './BL-Fav.vue'

const router = useRouter()
const userInfo = inject<any>('userInfo')
const PLStore = usePlaylistStore()

// 手动同步数据
const handleSync = async () => {
  if (!userInfo.value.mid) {
    return
  }
  await PLStore.fetchFavLists(userInfo.value.mid)
}

// 格式化最后同步时间
const lastSyncTimeText = computed(() => {
  if (!PLStore.lastSyncTime) return '从未同步'
  const now = Date.now()
  const diff = now - PLStore.lastSyncTime
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  return `${days}天前`
})

</script>

<template>
  <div class="w-full h-full bg-[#121212] overflow-y-auto overflow-x-hidden scrollbar-styled">
    <!-- 内容区域 -->
    <div class="w-full max-w-7xl mx-auto px-8 py-12 pt-0">
      <!-- 标题 -->
      <div class="mb-12 mt-6">
        <div class="flex items-end justify-between mb-4">
          <div>
            <h2 class="text-4xl font-black text-white mb-2 tracking-tight">
              我的收藏
            </h2>
            <p class="text-gray-400 text-sm">
              {{ PLStore.favList.length + PLStore.collectedFavList.length }} 个收藏夹
            </p>
          </div>
          <div class="flex items-center gap-3">
            <span class="text-xs text-gray-500">
              最后同步: {{ lastSyncTimeText }}
            </span>
            <button @click="handleSync" :disabled="PLStore.isSyncing || !userInfo.mid"
              class="px-4 py-2 bg-[#1db954] text-white rounded-full font-medium hover:bg-[#1ed760] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 hover:scale-105 active:scale-95">
              <div :class="[
                'i-mingcute:refresh-2-line text-lg',
                PLStore.isSyncing ? 'animate-spin' : ''
              ]" />
              {{ PLStore.isSyncing ? '同步中...' : '同步数据' }}
            </button>
          </div>
        </div>
      </div>

      <!-- 我创建的收藏夹 -->
      <div class="mb-4">
        <h3 class="text-2xl font-bold text-white mb-6 flex items-center gap-3">
          <div class="w-1 h-8 bg-gradient-to-b from-[#1db954] to-transparent rounded-full" />
          我创建的收藏夹
        </h3>
        <div v-if="PLStore.favList.length" class="flex flex-wrap gap-8">
          <BLFav v-for="fav in PLStore.favList" :key="fav.id" :fav="fav" />
        </div>
        <div v-else class="text-gray-500 text-center py-12">
          <div class="i-mingcute:inbox-line text-4xl mb-3 opacity-50" />
          <p>暂无创建的收藏夹</p>
        </div>
      </div>

      <!-- 收藏的其他内容（包含合集和列表） -->
      <div class="mb-8">
        <h3 class="text-2xl font-bold text-white mb-6 flex items-center gap-3">
          <div class="w-1 h-8 bg-gradient-to-b from-[#1db954] to-transparent rounded-full" />
          收藏的其他内容
        </h3>

        <!-- 其他收藏内容 -->
        <div v-if="PLStore.collectedFavList.length > 0" class="flex flex-wrap gap-8">
          <BLFav v-for="fav in PLStore.collectedFavList" :key="fav.id" :fav="fav" tag="collected" />
        </div>

        <!-- 空状态 -->
        <div v-if="PLStore.collectedFavList.length === 0" class="text-gray-500 text-center py-12">
          <div class="i-mingcute:inbox-line text-4xl mb-3 opacity-50" />
          <p>暂无收藏的内容</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 复用全局滚动条样式 */
</style>
