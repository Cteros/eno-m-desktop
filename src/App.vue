<!-- eslint-disable no-console -->
<script setup lang="ts">
import './styles/index.ts'
import { ref, onMounted, provide, watch, computed } from 'vue'
import { useRoute } from 'vue-router'
import Play from './components/Play/Play.vue'
import Sider from './components/Sider.vue'
import Header from './components/Header.vue'
import SongItem from './components/SongItem.vue'
import WallpaperGen from './components/wallpaper-gen/index.vue'
import AddSong from './playlist/AddSong.vue'
// import UpdateCheck from './components/UpdateCheck.vue'
import GlobalGlow from './components/GlobalGlow.vue'
import { useBlblStore } from './blbl/store'
import { invokeBiliApi, BLBL } from './api/bili'
import { useUIStore } from './store/uiStore'
import { useImageThemeColor } from './composables/useImageThemeColor'

const userInfo = ref({})
const store = useBlblStore()
const uiStore = useUIStore()
const { getColor } = useImageThemeColor()
const route = useRoute()
const isMiniPlayer = computed(() => route.name === 'miniplayer')
console.log('App version: 3.3.4')

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

/**
 * 颜色转换工具：将16进制颜色转换为带透明度的16进制
 */
function colorWithAlpha(color: string, alpha: number) {
  if (!color || !color.startsWith('#')) return color
  const a = Math.round(alpha * 255).toString(16).padStart(2, '0')
  return color + a
}

function setThemeVars(color: string) {
  if (typeof document === 'undefined')
    return
  const root = document.documentElement
  root.style.setProperty('--eno-glow', color)
  root.style.setProperty('--eno-glow-soft', colorWithAlpha(color, 0.2))
  root.style.setProperty('--eno-glow-strong', colorWithAlpha(color, 0.45))
  root.style.setProperty('--eno-accent', color)
  root.style.setProperty('--eno-accent-soft', colorWithAlpha(color, 0.25))
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

  <div v-if="isMiniPlayer" class="h-screen w-screen bg-black">
    <router-view />
  </div>

  <main v-else class="sp-app">
    <GlobalGlow />
    <div class="sp-body" :class="{ 'playlist-open': showPlaylist }">
      <Sider />

      <div class="sp-main">
        <Header />
        <div class="sp-content scrollbar-styled">
          <router-view v-slot="{ Component }">
            <transition name="fade">
              <keep-alive include="search, playlist, singerList, setting">
                <component :is="Component" />
              </keep-alive>
            </transition>
          </router-view>
        </div>
      </div>

      <div
        class="sp-queue"
        :style="{
          width: showPlaylist ? '320px' : '0',
          marginLeft: showPlaylist ? '8px' : '0',
          pointerEvents: showPlaylist ? 'auto' : 'none',
          opacity: showPlaylist ? '1' : '0',
        }"
      >
        <div class="sp-queue-panel" :class="{ 'sp-queue-panel--open': showPlaylist }">
          <div class="sp-queue-head">
            <div>
              <div class="sp-queue-title">
                播放列表
              </div>
              <div class="sp-queue-count">
                共 {{ (store.playList as any[]).length }} 首
              </div>
            </div>
            <button type="button" class="eno-btn eno-btn-ghost" @click="showPlaylist = false">
              <div class="i-mingcute:close-line" />
              关闭
            </button>
          </div>
          <div class="sp-queue-list scrollbar-styled">
            <SongItem
              v-for="(song, index) in (store.playList as any[])"
              :key="(song as any).id"
              show-active
              del
              :song="song"
              size="mini"
              @delete-song="deleteSong(index)"
            />
          </div>
        </div>
      </div>
    </div>

    <div class="sp-player">
      <Play />
    </div>

    <WallpaperGen />
    <AddSong />
    <!-- <UpdateCheck /> -->
  </main>
</template>

<style>
html,
body,
#app {
  background: #000;
  font-family: var(--app-font-sans);
}

.sp-app {
  display: flex;
  height: 100vh;
  width: 100vw;
  flex-direction: column;
  gap: 8px;
  overflow: hidden;
  padding: 8px 8px 0;
  color: #b3b3b3;
  background: #000;
}

.sp-body {
  display: flex;
  min-height: 0;
  flex: 1;
  gap: 8px;
  width: 100%;
}

.sp-main {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  overflow: hidden;
  border-radius: 8px;
  background: #121212;
}

.sp-content {
  position: relative;
  flex: 1;
  overflow: auto;
}

.sp-queue {
  position: relative;
  display: flex;
  flex-shrink: 0;
  overflow: hidden;
  transition: width 0.28s var(--eno-ease), opacity 0.28s var(--eno-ease), margin 0.28s var(--eno-ease);
}

.sp-queue-panel {
  position: absolute;
  top: 0;
  left: 0;
  display: flex;
  width: 320px;
  height: 100%;
  flex-direction: column;
  overflow: hidden;
  border-radius: 8px;
  background: #121212;
  opacity: 0;
  transform: translateX(12px);
  transition: opacity 0.28s var(--eno-ease), transform 0.28s var(--eno-ease);
}

.sp-queue-panel--open {
  opacity: 1;
  transform: translateX(0);
}

.sp-queue-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid rgb(255 255 255 / 8%);
}

.sp-queue-title {
  font-size: 18px;
  font-weight: 700;
  color: #fff;
}

.sp-queue-count {
  margin-top: 2px;
  font-size: 12px;
  color: #7c7c7c;
}

.sp-queue-list {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 8px;
}

.sp-player {
  z-index: 50;
  height: 80px;
  flex-shrink: 0;
}

*::-webkit-scrollbar {
  width: 12px;
  height: 12px;
}

*::-webkit-scrollbar-track {
  background: transparent;
}

*::-webkit-scrollbar-thumb {
  border: 3px solid transparent;
  border-radius: 8px;
  background-clip: padding-box;
  background-color: rgb(255 255 255 / 30%);
}

*::-webkit-scrollbar-thumb:hover {
  background-color: rgb(255 255 255 / 50%);
}

.fade-enter-active {
  animation: fadeIn 0.22s var(--eno-ease);
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
