<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { playCoreStore } from '~/playcore/store'
import SingerItem from '~/components/SingerItem.vue'
import Message from '~/components/message'

const route = useRoute()
const router = useRouter()
const store = playCoreStore()

const selectedTagId = ref(null)
const listKey = ref(0) // 用于强制重新渲染列表

// 从路由查询参数获取 tagid
const tagidFromRoute = computed(() => {
  return route.query.tagid ? Number(route.query.tagid) : null
})

// 当路由改变时，同步 selectedTagId
watch(() => tagidFromRoute.value, (newTagId) => {
  selectedTagId.value = newTagId
  listKey.value++ // 切换分组时更新key，触发动画
}, { immediate: true })

// 当前分组的up主列表（mid列表）
const currentFollowers = computed(() => {
  if (selectedTagId.value === null) {
    // 显示所有关注的人
    return store.allFollowersCache.map(f => f.mid)
  } else {
    // 显示特定分组的人
    return store.getFollowersByTag(selectedTagId.value).map(f => f.mid)
  }
})

// 获取当前分组的信息
const currentTag = computed(() => {
  if (selectedTagId.value === null) {
    return { name: '所有分组', count: store.allFollowersCache.length }
  }
  const tag = store.singerTagsCache[selectedTagId.value]
  return tag ? { ...tag, count: store.getTagFollowerCount(selectedTagId.value) } : null
})

// 格式化最后同步时间
const lastSyncTimeText = computed(() => {
  if (!store.lastUpdateTime) return '从未同步'
  const now = Date.now()
  const diff = now - store.lastUpdateTime
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  return `${days}天前`
})

watch(() => selectedTagId.value, (newTagId) => {
  store.setCurrentTag(newTagId)
})

// 手动同步数据
const syncData = async () => {
  if (store.isSyncing) return

  try {
    if (selectedTagId.value === null) {
      // 同步所有分组数据
      await store.fetchFollowingTags()
      await store.fetchAllFollowers()
    } else {
      // 同步特定分组
      await store.fetchFollowersByTag(selectedTagId.value)
    }
    listKey.value++ // 同步后更新key，触发动画
    Message.show({ type: 'success', message: '同步成功' })
  } catch (error) {
    console.error('Failed to sync:', error)
    Message.show({ type: 'error', message: '同步失败' })
  }
}
</script>

<template>
  <div class="page-container flex flex-col h-full">
    <!-- 页面内容 -->
    <section class="flex-1 overflow-auto page-inner relative">
      <!-- 内容区域 -->
      <div class="relative z-10">
        <!-- 标题区域 -->
        <div class="mb-8 mt-4">
          <div class="flex items-end justify-between gap-6">
            <div>
              <h2 class="text-display mb-2">
                {{ currentTag?.name || '加载中...' }}
              </h2>
              <p class="text-body-small">
                {{ currentFollowers.length }} 位音乐人
              </p>
            </div>
            <div class="flex items-center gap-3">
              <span class="text-xs text-gray-500">
                最后同步: {{ lastSyncTimeText }}
              </span>
              <button @click="syncData" :disabled="store.isSyncing"
                class="px-4 py-2 bg-[#1db954] text-white rounded-full font-medium hover:bg-[#1ed760] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 hover:scale-105 active:scale-95">
                <div :class="[
                  'i-mingcute:refresh-2-line text-lg',
                  store.isSyncing ? 'animate-spin' : ''
                ]" />
                {{ store.isSyncing ? '同步中...' : '同步数据' }}
              </button>
            </div>
          </div>
        </div>

        <!-- 加载状态 -->
        <div v-if="store.isLoadingFollowers" class="flex flex-col items-center justify-center py-16">
          <div class="animate-spin i-mingcute:loading-3-line text-4xl mb-4" />
          <p class="text-body-small">加载中...</p>
        </div>

        <!-- 歌手网格 -->
        <TransitionGroup v-if="currentFollowers.length > 0" name="card-list" tag="div"
          class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 auto-rows-max">
          <SingerItem v-for="(mid, index) in currentFollowers" :key="`${listKey}-${mid}`" :singer-mid="mid"
            type="card-modern" class="h-56" :style="{ '--stagger-index': index }" />
        </TransitionGroup>

        <!-- 空状态 -->
        <div v-else class="flex flex-col items-center justify-center py-16 text-center">
          <div class="i-mingcute:user-star-line text-6xl mb-4 opacity-20" />
          <h3 class="text-heading-1 mb-2">暂无音乐人</h3>
          <p class="text-body-small">该分组下暂无关注的音乐人</p>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.page-container {
  width: 100%;
  height: 100%;

  /* TransitionGroup 动画 */
  .card-list-move,
  .card-list-enter-active {
    transition: all 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  }

  .card-list-enter-from {
    opacity: 0;
    transform: translateY(20px) scale(0.95);
  }

  .card-list-enter-to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }

  .card-list-leave-active {
    transition: all 0.3s ease;
    position: absolute;
  }

  .card-list-leave-to {
    opacity: 0;
    transform: scale(0.9);
  }

  /* 交错动画效果 */
  .card-list-enter-active {
    transition-delay: calc(var(--stagger-index, 0) * 0.05s);
  }
}
</style>
