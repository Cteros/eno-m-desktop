<script setup>
import { useRouter, useRoute } from 'vue-router'
import { inject, ref, computed, onMounted } from 'vue'
import { playCoreStore } from '~/playcore/store'
import { MessageAPI, Dialog } from '@cloudfly/eno-ui'
import LoginDialog from './LoginDialog.vue'

const router = useRouter()
const route = useRoute()
const userInfo = inject('userInfo', null)
const showLoginDialog = ref(false)
const showCreateTagDialog = ref(false)
const pcStore = playCoreStore()

// 创建分组的状态
const newTagName = ref('')
const isCreatingTag = ref(false)

// 当前路由
const currentRoute = computed(() => router.currentRoute.value.name)

// Singer 页面的 tab 数据
const selectedTagId = computed(() => {
  if (currentRoute.value === 'singerList') {
    const tagidFromRoute = route.query.tagid ? Number(route.query.tagid) : null
    return tagidFromRoute !== null ? tagidFromRoute : null
  }
  return null
})

// 所有分组(排除默认分组 tagid=0)
const allTags = computed(() => {
  return Object.values(pcStore.singerTagsCache).filter(tag => tag.tagid !== 0)
})

// 加载分组数据
onMounted(async () => {
  if (allTags.value.length === 0) {
    await pcStore.fetchFollowingTags()
  }
})

function goBack() {
  router.back()
}

function goForward() {
  router.forward()
}

function handleTagClick(tagid) {
  router.push({ name: 'singerList', query: tagid !== null ? { tagid } : {} })
}

function handleTogglePin(tagid, e) {
  e.stopPropagation()
  if (pcStore.isTagPinned(tagid)) {
    pcStore.unpinTag(tagid)
    MessageAPI.show({ type: 'success', message: '已取消固定' })
    return
  }
  if (!pcStore.pinTag(tagid)) {
    MessageAPI.show({ type: 'warning', message: '最多只能固定 5 个分组' })
    return
  }
  MessageAPI.show({ type: 'success', message: '已固定到侧边栏' })
}

async function handleDeleteTag(tagid, e) {
  e.stopPropagation()

  try {
    const tag = pcStore.singerTagsCache[tagid]
    if (!confirm(`确定要删除分组 "${tag?.name}" 吗?`)) {
      return
    }

    await pcStore.deleteTag(tagid)
    MessageAPI.show({ type: 'success', message: '分组已删除' })

    // 如果删除的是当前选中的分组,切换到其他分组
    if (selectedTagId.value === tagid) {
      const remainingTags = allTags.value.filter(t => t.tagid !== tagid)
      if (remainingTags.length > 0) {
        // 切换到第一个剩余分组
        router.push({ name: 'singerList', query: { tagid: remainingTags[0].tagid } })
      } else {
        // 没有其他分组,清空选择
        router.push({ name: 'singerList' })
      }
    }
  } catch (error) {
    MessageAPI.show({ type: 'error', message: error.message || '删除分组失败' })
  }
}

async function handleCreateTag() {
  if (!newTagName.value.trim()) {
    MessageAPI.show({ type: 'warning', message: '分组名称不能为空' })
    return
  }

  isCreatingTag.value = true
  try {
    const newTag = await pcStore.createTag(newTagName.value)
    if (newTag) {
      MessageAPI.show({ type: 'success', message: `分组 "${newTag.name}" 创建成功` })
      newTagName.value = ''
      showCreateTagDialog.value = false
    }
  } catch (error) {
    MessageAPI.show({ type: 'error', message: error.message || '创建分组失败' })
  } finally {
    isCreatingTag.value = false
  }
}
</script>

<template>
  <div class="header-shell">
    <!-- 导航栏 -->
    <div class="flex items-center gap-4 h-16 px-6" style="-webkit-app-region: drag">
      <div class="flex gap-2" style="-webkit-app-region: no-drag">
        <button
          class="w-8 h-8 rounded-full bg-black/50 flex items-center justify-center cursor-pointer hover:bg-black/70 text-white transition-colors"
          @click="goBack">
          <div class="i-mingcute:left-line text-xl" />
        </button>
        <button
          class="w-8 h-8 rounded-full bg-black/50 flex items-center justify-center cursor-pointer hover:bg-black/70 text-white transition-colors"
          @click="goForward">
          <div class="i-mingcute:right-line text-xl" />
        </button>
      </div>
      <!-- 这里可以预留搜索框或者用户信息的位置 -->
      <div class="flex-1" />

      <!-- 用户信息/登录按钮 -->
      <div class="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
        @click="showLoginDialog = true" style="-webkit-app-region: no-drag">
        <template v-if="userInfo?.isLogin">
          <img :src="userInfo?.face" alt="avatar" class="w-8 h-8 rounded-full border border-[#333]" />
          <span class="text-white text-sm">{{ userInfo?.uname }}</span>
        </template>
        <template v-else>
          <div class="w-8 h-8 rounded-full bg-[#282828] flex items-center justify-center border border-[#333]">
            <div class="i-mingcute:user-3-line text-gray-400" />
          </div>
          <span class="text-gray-400 text-sm">未登录</span>
        </template>
      </div>

      <!-- 登录弹窗 -->
      <LoginDialog v-model="showLoginDialog" />
    </div>

    <!-- Singer 页面 Tab 栏 - 显示所有分组(排除默认分组) -->
    <div v-if="currentRoute === 'singerList'" class="border-t border-[#333333]" style="-webkit-app-region: no-drag">
      <!-- 分组标签行 -->
      <div class="px-6 py-3 flex items-center gap-2 overflow-x-auto">
        <!-- 分组标签(不显示"所有分组"和"默认分组") -->
        <button
          type="button"
          class="tag-chip"
          :class="{ 'tag-chip--active': selectedTagId === null }"
          @click="handleTagClick(null)"
        >
          全部
        </button>
        <button
          v-for="tag in allTags"
          :key="tag.tagid"
          type="button"
          class="tag-chip group"
          :class="{ 'tag-chip--active': selectedTagId === tag.tagid }"
          @click="handleTagClick(tag.tagid)"
        >
          <span>{{ tag.name }}</span>
          <span class="tag-chip__count">{{ pcStore.getTagFollowerCount(tag.tagid) }}</span>
          <span
            class="tag-pin"
            :class="{ 'tag-pin--on': pcStore.isTagPinned(tag.tagid) }"
            :title="pcStore.isTagPinned(tag.tagid) ? '取消固定' : '固定到侧边栏'"
            @click="handleTogglePin(tag.tagid, $event)"
          >
            <div v-if="pcStore.isTagPinned(tag.tagid)" class="i-mingcute:pin-fill" />
            <div v-else class="i-mingcute:pin-line" />
          </span>
        </button>

        <!-- 创建分组按钮 -->
        <div class="flex-shrink-0">
          <button @click="showCreateTagDialog = true"
            class="px-4 py-2 rounded-full bg-[#282828] hover:bg-[#333333] text-white transition-colors flex items-center gap-2 text-body-small"
            title="创建新分组">
            <div class="i-mingcute:add-line text-lg" />
            <span>新分组</span>
          </button>
        </div>
      </div>

      <!-- 分组操作行 -->
      <div v-if="selectedTagId !== null && allTags.some(tag => tag.tagid === selectedTagId)"
        class="px-6 py-2 border-t border-[#282828] flex items-center gap-3 bg-[#0a0a0a]">
        <span class="text-xs text-gray-500">操作:</span>
        <button
          type="button"
          class="flex items-center gap-1 text-sm transition-colors"
          :class="pcStore.isTagPinned(selectedTagId) ? 'text-[#1ed760]' : 'text-gray-400 hover:text-white'"
          :title="pcStore.isTagPinned(selectedTagId) ? '取消固定' : '固定到侧边栏'"
          @click="handleTogglePin(selectedTagId, $event)"
        >
          <div v-if="pcStore.isTagPinned(selectedTagId)" class="i-mingcute:pin-fill" />
          <div v-else class="i-mingcute:pin-line" />
          <span>{{ pcStore.isTagPinned(selectedTagId) ? '已固定' : '固定到侧边栏' }}</span>
        </button>
        <button @click="handleDeleteTag(selectedTagId, $event)"
          class="flex items-center gap-1 text-sm text-gray-400 hover:text-red-400 transition-colors" title="删除分组">
          <div class="i-mingcute:delete-2-line" />
          <span>删除分组</span>
        </button>
      </div>
    </div>

    <!-- 创建分组 Dialog -->
    <Dialog :open="showCreateTagDialog" @visibleChange="showCreateTagDialog = $event" title="创建新分组">
      <div class="space-y-4 min-w-[320px]">
        <div>
          <label class="text-sm font-medium text-gray-300 mb-2 block">分组名称</label>
          <input v-model="newTagName" type="text" placeholder="例:我喜欢的歌手" maxlength="20" @keyup.enter="handleCreateTag"
            class="w-full px-3 py-2 rounded bg-[#1a1a1a] text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#1ed760] border border-[#333333]"
            autofocus
          >
          <p class="text-xs text-gray-500 mt-1">
            {{ newTagName.length }}/20
          </p>
        </div>
      </div>

      <template #footer>
        <button
          class="px-4 py-2 rounded-full bg-[#282828] hover:bg-[#333333] text-white transition-colors"
          @click="showCreateTagDialog = false"
        >
          取消
        </button>
        <button
          class="px-4 py-2 rounded-full bg-[#1ed760] hover:bg-[#3be477] text-black font-700 transition-colors disabled:opacity-50"
          :disabled="isCreatingTag || !newTagName.trim()"
          @click="handleCreateTag"
        >
          {{ isCreatingTag ? '创建中...' : '创建' }}
        </button>
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.header-shell {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  z-index: 10;
  background: #121212;
}

.tag-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  height: 32px;
  padding: 0 14px;
  border: 0;
  border-radius: 999px;
  background: #282828;
  color: #fff;
  font-size: 13px;
  white-space: nowrap;
  cursor: pointer;
  transition: background-color 0.16s var(--eno-ease), color 0.16s var(--eno-ease);
}

.tag-chip:hover {
  background: #333;
}

.tag-chip--active {
  background: #1ed760;
  color: #000;
  font-weight: 700;
}

.tag-chip__count {
  font-size: 11px;
  opacity: 0.7;
}

.tag-pin {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  opacity: 0.45;
  color: inherit;
  cursor: pointer;
}

.tag-chip:hover .tag-pin,
.tag-pin--on {
  opacity: 1;
}

.tag-chip--active .tag-pin--on {
  color: #000;
}
</style>
