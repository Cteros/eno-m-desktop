<!-- eslint-disable no-console -->
<script setup lang="ts">
import './styles/index.ts'
import { ref, onMounted, provide, watch } from 'vue'
import Play from './components/Play/Play.vue'
import Sider from './components/Sider.vue'
import Header from './components/Header.vue'
import SongItem from './components/SongItem.vue'
import WallpaperGen from './components/wallpaper-gen/index.vue'
import AddSong from './playlist/AddSong.vue'
import UpdateCheck from './components/UpdateCheck.vue'
import GlobalGlow from './components/GlobalGlow.vue'
import { useBlblStore } from './blbl/store'
import { invokeBiliApi, BLBL } from './api/bili'
import { useUIStore } from './store/uiStore'
import { useImageThemeColor } from './composables/useImageThemeColor'

const userInfo = ref({})
const store = useBlblStore()
const uiStore = useUIStore()
const { getColor } = useImageThemeColor()
console.log('App version: 3.2.19')

// 播放列表显隐状态（可以由Play组件或全局控制）
const showPlaylist = ref(false)

// 提供给 Play 组件修改
provide('showPlaylist', showPlaylist)

onMounted(() => {
  // 获取当前用户信息
  const fetchUserInfo = async () => {
    try {
      const res = await invokeBiliApi(BLBL.GET_NAV)
      if (res.data && res.data.isLogin) {
        userInfo.value = res.data
        console.log('User info fetched:', res.data.uname)
      } else {
        userInfo.value = {}
      }
    } catch (error) {
      console.error('Failed to fetch user info:', error)
      userInfo.value = {}
    }
  }

  fetchUserInfo()

    // 监听用户信息更新事件（扫码登陆或退出登陆时触发）
    ; (window as any).ipcRenderer?.on('bili-user-updated', () => {
      console.log('bili-user-updated event received, refreshing user info...')
      fetchUserInfo()
    })
})
provide('userInfo', userInfo)

function deleteSong(index: number) {
  store.playList.splice(index, 1)
}

function toRgb(color: string) {
  if (!color)
    return null
  if (color.startsWith('#') && color.length === 7) {
    return {
      r: parseInt(color.slice(1, 3), 16),
      g: parseInt(color.slice(3, 5), 16),
      b: parseInt(color.slice(5, 7), 16),
    }
  }
  const match = color.match(/rgba?\\(([^)]+)\\)/)
  if (!match)
    return null
  const parts = match[1].split(',').map(part => Number(part.trim()))
  if (parts.length < 3 || parts.some((v) => Number.isNaN(v)))
    return null
  return { r: parts[0], g: parts[1], b: parts[2] }
}

function toRgba(color: string, alpha: number) {
  const rgb = toRgb(color)
  if (!rgb)
    return color
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`
}

function setThemeVars(color: string) {
  if (typeof document === 'undefined')
    return
  const root = document.documentElement
  root.style.setProperty('--eno-glow', color)
  root.style.setProperty('--eno-glow-soft', toRgba(color, 0.2))
  root.style.setProperty('--eno-glow-strong', toRgba(color, 0.45))
  root.style.setProperty('--eno-accent', color)
  root.style.setProperty('--eno-accent-soft', toRgba(color, 0.25))
}

watch(
  () => (store.play as any)?.cover,
  async (cover) => {
    if (!cover) {
      uiStore.resetGlowColor()
      setThemeVars('#404040')
      return
    }
    const color = await getColor(cover, '#404040')
    if (color) {
      uiStore.setGlowColor(color)
      setThemeVars(color)
    }
  },
  { immediate: true }
)
</script>

<template>
  <!-- 全局顶部拖拽条 (覆盖 p-2 间隙) -->
  <div class="fixed top-0 left-0 w-full h-4 z-[9999] pointer-events-none" style="-webkit-app-region: drag"></div>

  <main class="h-screen w-screen overflow-hidden text-[#b3b3b3] font-sans app-shell p-2 gap-2">
    <GlobalGlow />
    <div class="app-shell__main" :class="{ 'playlist-open': showPlaylist }">
      <!-- 左侧侧边栏 -->
      <div class="app-shell__sider">
        <Sider />
      </div>

      <!-- 主内容区 -->
      <div class="app-shell__content">
        <Header />
        <div class="app-shell__content-body scrollbar-styled">
          <div class="min-h-full">
            <router-view v-slot="{ Component }">
              <transition name="fade">
                <keep-alive include="search, playlist, singerList, setting">
                  <component :is="Component" />
                </keep-alive>
              </transition>
            </router-view>
          </div>
        </div>
      </div>

      <!-- 右侧播放列表 -->
      <div class="app-shell__right" :class="{ 'is-open': showPlaylist }">
        <div class="playlist-panel">
          <div class="playlist-panel__header">
            <div class="flex flex-col">
              <span class="text-lg font-bold text-white">播放列表</span>
              <span class="text-xs text-gray-500">共 {{ (store.playList as any[]).length }} 首</span>
            </div>
            <button class="eno-btn eno-btn-ghost" @click="showPlaylist = false">
              <div class="i-mingcute:close-line" />
              关闭
            </button>
          </div>
          <div class="playlist-panel__body scrollbar-styled">
            <SongItem
              v-for="(song, index) in (store.playList as any[])"
              :key="(song as any).id"
              show-active
              del
              :song="song"
              size="mini"
              @delete-song="deleteSong(index)"
              class="playlist-panel__item"
              :style="{ transitionDelay: `${Math.min(index, 12) * 12}ms` }"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- 底部播放栏 -->
    <div class="app-shell__player">
      <Play />
    </div>

    <WallpaperGen />
    <AddSong />
    <UpdateCheck />
  </main>
</template>

<style>
.app-shell {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.app-shell__main {
  flex: 1;
  display: flex;
  gap: 8px;
  min-height: 0;
}

.app-shell__sider {
  flex: 0 0 auto;
}

.app-shell__content {
  flex: 1 1 auto;
  min-width: 0;
  background: #121212;
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: transform 0.3s ease, filter 0.3s ease;
}

.app-shell__content-body {
  flex: 1;
  overflow-y: auto;
  position: relative;
}

.app-shell__right {
  flex: 0 0 auto;
  width: 0;
  min-width: 0;
  overflow: hidden;
  pointer-events: none;
  display: flex;
  height: 100%;
  transition: width 0.34s cubic-bezier(0.2, 0.7, 0, 1);
}

.app-shell__right.is-open {
  width: 320px;
  pointer-events: auto;
}

.app-shell__main.playlist-open .app-shell__content {
  transform: scale(0.992);
  filter: saturate(0.98) brightness(0.98);
}

.app-shell__player {
  height: 72px;
  z-index: 50;
}

.playlist-panel {
  background: rgba(18, 18, 18, 0.94);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 16px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  width: 100%;
  min-height: 0;
  flex: 1;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.35);
}

.playlist-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  background: linear-gradient(180deg, rgba(32, 32, 32, 0.95), rgba(18, 18, 18, 0.95));
}

.playlist-panel__body {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
  min-height: 0;
}

.playlist-panel__item {
  border-radius: 10px;
  transition: background-color 0.2s ease, transform 0.2s ease;
}

.playlist-panel__item:hover {
  background: rgba(255, 255, 255, 0.06);
}

.playlist-panel {
  opacity: 0;
  transform: translateX(12px) scale(0.985);
  transition: opacity 0.28s ease, transform 0.28s ease;
}

.app-shell__right.is-open .playlist-panel {
  opacity: 1;
  transform: translateX(0) scale(1);
}


html {
  background: #000;
}

/* 全局滚动条样式优化 */
*::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

*::-webkit-scrollbar-track {
  background: transparent;
}

*::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.3);
  border-radius: 4px;
}

*::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.5);
}

img {
  position: relative;
}

img::before {
  content: "";
  display: block;
  width: 100%;
  height: 100%;
  background-image: url("/assets/broken-image.png");
  background-size: 25px;
  background-position: center;
  background-repeat: no-repeat;
}

.fade-enter-active {
  animation: fadeIn 0.5s;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}
</style>
