<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import cn from 'classnames'
import { useRoute, useRouter } from 'vue-router'
import UpdateCheck from './UpdateCheck.vue'
import { useSingerStore } from '~/playcore/store'
import { MessageAPI } from '@cloudfly/eno-ui'

const router = useRouter()
const route = useRoute()
const updateCheckRef = ref<any>(null)
const singerStore = useSingerStore()

const primaryTabs = [
  { icon: 'i-mingcute:search-2-line', title: '搜索', mode: 'search' },
]

const libraryTabs = [
  { icon: 'i-mingcute:playlist-2-line', title: '媒体库', mode: 'playlist' },
  { icon: 'i-mingcute:user-star-line', title: '关注的音乐人', mode: 'singerList' },
]

const pinnedTags = computed(() => singerStore.getPinnedTags)
const pinnedTagId = computed(() => {
  if (route.name !== 'singerList')
    return null
  return route.query.tagid ? Number(route.query.tagid) : null
})

onMounted(() => {
  if (!singerStore.getAllTags.length)
    singerStore.fetchFollowingTags()
})

function isActive(mode: string) {
  return route.name === mode || route.path === `/${mode}`
}

function navigate(mode: string) {
  router.push({ path: `/${mode}` })
}

function handleUpdateClick(e: Event) {
  e.preventDefault()
  e.stopPropagation()
  updateCheckRef.value?.showUpdateDialog()
}

function handleUnpinTag(tagid: number, e: Event) {
  e.preventDefault()
  e.stopPropagation()
  singerStore.unpinTag(tagid)
  MessageAPI.show({ type: 'success', message: '已取消固定' })
}
</script>

<template>
  <aside class="sider-shell">
    <div class="sider-nav">
      <div class="drag-strip" />
      <div class="brand-row">
        <div class="i-mingcute:disc-fill brand-icon" />
        <span class="brand-text">ENO-M</span>
      </div>
      <button
        v-for="tab in primaryTabs"
        :key="tab.mode"
        type="button"
        :class="cn('nav-item', { 'nav-item--active': isActive(tab.mode) })"
        @click="navigate(tab.mode)"
      >
        <div class="nav-icon" :class="tab.icon" />
        <span>{{ tab.title }}</span>
      </button>
    </div>

    <div class="sider-library">
      <div class="library-head">
        <div class="library-toggle">
          <div class="i-mingcute:book-2-line nav-icon" />
          <span>你的音乐库</span>
        </div>
      </div>

      <div class="sider-scroll">
        <button
          v-for="tab in libraryTabs"
          :key="tab.mode"
          type="button"
          :class="cn('lib-item', { 'lib-item--active': isActive(tab.mode) })"
          @click="navigate(tab.mode)"
        >
          <div class="lib-icon" :class="tab.icon" />
          <span class="lib-text">{{ tab.title }}</span>
        </button>

        <div class="pinned-block">
          <div class="pinned-label">
            固定的分组
          </div>
          <RouterLink
            v-for="tag in pinnedTags"
            :key="tag.tagid"
            :to="{ name: 'singerList', query: { tagid: tag.tagid } }"
            class="pinned-item"
            :class="{ 'pinned-item--active': pinnedTagId === tag.tagid }"
          >
            <div class="i-mingcute:pin-fill pinned-icon" />
            <span class="lib-text">{{ tag.name }}</span>
            <button
              type="button"
              class="unpin-btn"
              title="取消固定"
              @click="handleUnpinTag(tag.tagid, $event)"
            >
              <div class="i-mingcute:close-line text-sm" />
            </button>
          </RouterLink>
          <div v-if="!pinnedTags.length" class="pinned-empty">
            在关注的音乐人里点击图钉，固定分组到这里
          </div>
        </div>
      </div>

      <div class="sider-foot">
        <button
          type="button"
          :class="cn('foot-item', { 'foot-item--active': isActive('setting') })"
          @click="navigate('setting')"
        >
          <div class="i-mingcute:settings-3-line nav-icon" />
          <span>设置</span>
          <span
            v-if="updateCheckRef?.updateAvailable"
            class="update-badge"
            @click="handleUpdateClick"
          >
            NEW
          </span>
        </button>
      </div>
    </div>

    <Teleport to="body">
      <UpdateCheck ref="updateCheckRef" :custom-trigger="true" />
    </Teleport>
  </aside>
</template>

<style scoped>
.sider-shell {
  display: flex;
  width: 280px;
  height: 100%;
  flex-shrink: 0;
  flex-direction: column;
  gap: 8px;
  color: #b3b3b3;
  user-select: none;
}

.sider-nav,
.sider-library {
  display: flex;
  flex-direction: column;
  border-radius: 8px;
  background: #121212;
}

.sider-nav {
  position: relative;
  padding: 8px 12px 12px;
  gap: 4px;
}

.drag-strip {
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  z-index: 5;
  height: 36px;
  -webkit-app-region: drag;
  pointer-events: none;
}

.brand-row {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 40px;
  margin-top: 20px;
  padding: 0 12px;
  color: #fff;
}

.brand-icon {
  width: 24px;
  height: 24px;
  font-size: 24px;
}

.brand-text {
  font-size: 15px;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.sider-library {
  min-height: 0;
  flex: 1;
  padding: 8px 8px 12px;
}

.nav-item,
.foot-item,
.library-toggle,
.lib-item {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 16px;
  height: 40px;
  padding: 0 12px;
  border: 0;
  border-radius: 4px;
  color: #b3b3b3;
  background: transparent;
  font-size: 16px;
  font-weight: 700;
  text-align: left;
  cursor: pointer;
  transition: color 0.16s var(--eno-ease), background-color 0.16s var(--eno-ease);
}

.nav-item:hover,
.foot-item:hover,
.lib-item:hover,
.pinned-item:hover {
  color: #fff;
}

.nav-item--active,
.foot-item--active,
.lib-item--active {
  color: #fff;
}

.lib-item--active {
  background: #1a1a1a;
}

.nav-icon,
.lib-icon {
  width: 24px;
  height: 24px;
  font-size: 22px;
  flex-shrink: 0;
}

.library-head {
  padding: 4px 0 8px;
}

.library-toggle {
  color: #b3b3b3;
  cursor: default;
}

.sider-scroll {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  gap: 2px;
  overflow: auto;
}

.lib-item {
  height: 48px;
  font-size: 14px;
  font-weight: 600;
}

.lib-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pinned-block {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #282828;
}

.pinned-label {
  margin: 0 12px 8px;
  font-size: 12px;
  font-weight: 700;
  color: #7c7c7c;
}

.pinned-item {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 40px;
  padding: 0 12px;
  border-radius: 4px;
  color: #b3b3b3;
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
}

.pinned-item--active {
  color: #fff;
  background: #1a1a1a;
}

.pinned-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  color: #1ed760;
}

.pinned-empty {
  margin: 0 12px;
  font-size: 12px;
  line-height: 1.5;
  color: #6a6a6a;
}

.unpin-btn {
  display: none;
  margin-left: auto;
  border: 0;
  color: inherit;
  background: transparent;
  cursor: pointer;
}

.pinned-item:hover .unpin-btn {
  display: inline-flex;
}

.sider-foot {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-top: 8px;
}

.foot-item {
  height: 36px;
  font-size: 13px;
  font-weight: 600;
}

.update-badge {
  margin-left: auto;
  border-radius: 999px;
  padding: 2px 8px;
  background: #e91429;
  color: #fff;
  font-size: 10px;
  font-weight: 700;
}
</style>
