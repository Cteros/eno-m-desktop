<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { playCoreStore } from '~/playcore/store'
import SingerItem from '~/components/SingerItem.vue'
import Message from '~/components/message'

const route = useRoute()
const router = useRouter()
const store = playCoreStore()

const selectedTagId = ref(null)
const isLoading = ref(false)

// 从路由查询参数获取 tagid
const tagidFromRoute = computed(() => {
  return route.query.tagid ? Number(route.query.tagid) : null
})

// 当路由改变时，同步 selectedTagId
watch(() => tagidFromRoute.value, (newTagId) => {
  selectedTagId.value = newTagId
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

onMounted(async () => {
  // 初始化加载数据
  if (store.allFollowersCache.length === 0) {
    await loadData()
  }

  // 如果没有指定 tagid，默认导航到第一个有值的 tag
  if (tagidFromRoute.value === null) {
    const firstTag = Object.values(store.singerTagsCache)
      .filter(tag => tag.tagid !== 0 && store.getTagFollowerCount(tag.tagid) > 0)
      .sort((a, b) => a.tagid - b.tagid)[0]

    if (firstTag) {
      router.replace({ name: 'singerList', query: { tagid: firstTag.tagid } })
    }
  }
})

watch(() => selectedTagId.value, async (newTagId) => {
  store.setCurrentTag(newTagId)

  // 如果选择了特定分组且该分组还没有加载过，则加载
  if (newTagId !== null && store.getFollowersByTag(newTagId).length === 0) {
    isLoading.value = true
    try {
      await store.fetchFollowersByTag(newTagId)
    } finally {
      isLoading.value = false
    }
  }
})

const loadData = async () => {
  isLoading.value = true
  try {
    await store.fetchFollowingTags()
    await store.fetchAllFollowers()
    Message.show({ type: 'success', message: '分组数据已加载' })
  } catch (error) {
    console.error('Failed to load data:', error)
    Message.show({ type: 'error', message: '加载失败' })
  } finally {
    isLoading.value = false
  }
}

// 刷新当前分组的列表
const refreshCurrentTag = async () => {
  if (selectedTagId.value === null) {
    // 刷新所有分组
    isLoading.value = true
    try {
      await store.fetchAllFollowers()
      Message.show({ type: 'success', message: '已刷新' })
    } catch (error) {
      console.error('Failed to refresh:', error)
      Message.show({ type: 'error', message: '刷新失败' })
    } finally {
      isLoading.value = false
    }
  } else {
    // 刷新特定分组
    isLoading.value = true
    try {
      await store.fetchFollowersByTag(selectedTagId.value)
      Message.show({ type: 'success', message: '已刷新' })
    } catch (error) {
      console.error('Failed to refresh:', error)
      Message.show({ type: 'error', message: '刷新失败' })
    } finally {
      isLoading.value = false
    }
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
            <!-- 刷新按钮 -->
            <button @click="refreshCurrentTag" :disabled="isLoading"
              class="flex items-center gap-2 px-4 py-2 rounded bg-[#1db954] hover:bg-[#1ed760] text-black font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              <div :class="isLoading ? 'animate-spin i-mingcute:loading-3-line' : 'i-mingcute:refresh-line'" />
              <span>{{ isLoading ? '刷新中...' : '刷新' }}</span>
            </button>
          </div>
        </div>

        <!-- 加载状态 -->
        <div v-if="isLoading" class="flex flex-col items-center justify-center py-16">
          <div class="animate-spin i-mingcute:loading-3-line text-4xl mb-4" />
          <p class="text-body-small">加载中...</p>
        </div>

        <!-- 歌手网格 -->
        <div v-else-if="currentFollowers.length > 0"
          class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 auto-rows-max">
          <SingerItem v-for="mid in currentFollowers" :key="mid" :singer-mid="mid" type="card-modern" class="h-56" />
        </div>

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
}
</style>
