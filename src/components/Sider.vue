<script setup>
import { computed, ref } from 'vue'
import cn from 'classnames'
import TabItem from './TabItem.vue'
import UpdateCheck from './UpdateCheck.vue'
import { playCoreStore } from '~/playcore/store'
import Message from './message'

const updateCheckRef = ref(null)
const pcStore = playCoreStore()

const navTabs = [
  { icon: 'i-mingcute:home-5-fill', title: '首页', mode: 'home' },
  { icon: 'i-mingcute:search-2-fill', title: '搜索', mode: 'search' },
]

const libraryTabs = [
  { icon: 'i-mingcute:playlist-fill', title: '你的媒体库', mode: 'playlist' },
  { icon: 'i-mingcute:user-star-fill', title: '关注的音乐人', mode: 'singerList' },
]

const settingTabs = [
  { icon: 'i-mingcute:settings-3-fill', title: '设置', mode: 'setting' },
]

const panelClass = "bg-[#121212] rounded-lg overflow-hidden flex flex-col"

// 获取 pinned 分组
const pinnedTags = computed(() => pcStore.getPinnedTags)

function handleUpdateClick(e) {
  e.preventDefault()
  e.stopPropagation()
  updateCheckRef.value?.showUpdateDialog()
}

function handleUnpinTag(tagid, e) {
  e.preventDefault()
  e.stopPropagation()
  pcStore.unpinTag(tagid)
  Message.show({ type: 'success', message: '已取消固定' })
}
</script>

<template>
  <aside class="h-full flex flex-col gap-2 w-[280px] min-w-[280px] select-none text-[#b3b3b3]">
    <!-- 顶部导航区 -->
    <div :class="cn(panelClass, 'p-3 gap-2')">
      <div class="px-4 py-2 flex items-center gap-2 mb-2 text-white">
        <div class="i-mingcute:music-3-fill text-2xl" />
        <span class="font-bold text-lg">ENO-M</span>
      </div>
      <TabItem v-for="tab in navTabs" :key="tab.mode" :tab="tab" :open="true"
        class="font-bold hover:text-white transition-colors" />
    </div>

    <!-- 媒体库区域 -->
    <div :class="cn(panelClass, 'flex-1')">
      <div class="p-4 shadow-sm z-10">
        <div class="flex items-center gap-2 hover:text-white transition-colors cursor-pointer group">
          <div class="i-mingcute:align-left-2-fill text-2xl group-hover:scale-105 transition-transform" />
          <span class="font-bold">媒体库</span>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto px-2 pb-2 scrollbar-hide">
        <!-- 暂时用TabItem代替，后续可以是列表 -->
        <div class="flex flex-col gap-1">
          <TabItem v-for="tab in libraryTabs" :key="tab.mode" :tab="tab" :open="true"
            class="hover:text-white hover:bg-[#1f1f1f] rounded transition-colors" />
        </div>

        <!-- Pinned 分组 -->
        <div v-if="pinnedTags.length > 0" class="mt-4 pt-4 border-t border-[#282828]">
          <div class="px-2 py-2 text-xs font-bold text-gray-500 mb-2">
            固定的分组
          </div>
          <div class="flex flex-col gap-1">
            <RouterLink v-for="tag in pinnedTags" :key="tag.tagid"
              :to="{ name: 'singerList', query: { tagid: tag.tagid } }"
              class="px-3 py-2 rounded hover:bg-[#1f1f1f] transition-colors flex items-center justify-between group cursor-pointer text-sm">
              <span class="flex-1">{{ tag.name }}</span>
              <button class="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:text-red-400"
                @click="handleUnpinTag(tag.tagid, $event)" title="取消固定">
                <div class="i-mingcute:close-line text-sm" />
              </button>
            </RouterLink>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部设置区 -->
    <div :class="cn(panelClass, 'p-3 gap-2')">
      <TabItem v-for="tab in settingTabs" :key="tab.mode" :tab="tab" :open="true"
        class="font-bold hover:text-white transition-colors">
        <div v-if="tab.mode === 'setting' && updateCheckRef?.updateAvailable" @click="handleUpdateClick"
          class="ml-auto px-2 py-0.5 text-xs bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors">
          NEW
        </div>
      </TabItem>
    </div>

    <UpdateCheck ref="updateCheckRef" :custom-trigger="true" />
  </aside>
</template>

<style scoped>
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}

.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
