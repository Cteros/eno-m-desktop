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
console.log('App version: 3.2.25')

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

  <main v-else class="h-screen w-screen overflow-hidden text-[#b3b3b3] font-sans flex flex-col gap-2 p-2">
    <GlobalGlow />
    <div class="flex-1 flex gap-0 min-h-0 w-full" :class="{ 'playlist-open': showPlaylist }">
      <!-- 左侧侧边栏 -->
      <div class="flex-shrink-0 mr-2">
        <Sider />
      </div>

      <!-- 主内容区 -->
      <div class="flex-1 min-w-0 bg-[#121212] rounded-lg overflow-hidden flex flex-col transition-all duration-300"
        :style="showPlaylist ? 'transform: scale(0.992); filter: saturate(0.98) brightness(0.98);' : ''">
        <Header />
        <div class="flex-1 overflow-y-auto relative scrollbar-styled">
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
      <div
        class="flex-shrink-0 w-0 min-w-0 overflow-hidden pointer-events-none flex h-full transition-all duration-[340ms] relative"
        :style="{ width: showPlaylist ? '320px' : '0', marginLeft: showPlaylist ? '8px' : '0', pointerEvents: showPlaylist ? 'auto' : 'none', opacity: showPlaylist ? '1' : '0' }">
        <div
          class="absolute top-0 left-0 w-[320px] h-full bg-[rgb(18_18_18_/_0.94)] border-[1px] border-[rgb(255_255_255_/_0.06)] rounded-lg overflow-hidden flex flex-col flex-1 shadow-[0_24px_60px_rgb(0_0_0_/_0.35)] transition-all duration-[280ms]"
          :style="showPlaylist ? 'opacity: 1; transform: translateX(0) scale(1);' : 'opacity: 0; transform: translateX(12px) scale(0.985);'">
          <div
            class="flex items-center justify-between gap-3 px-4 py-3.5 border-b border-[rgb(255_255_255_/_0.06)] bg-gradient-to-b from-[rgb(32_32_32_/_0.95)] to-[rgb(18_18_18_/_0.95)]">
            <div class="flex flex-col gap-1">
              <span class="text-lg font-bold text-white">播放列表</span>
              <span class="text-xs text-gray-500">共 {{ (store.playList as any[]).length }} 首</span>
            </div>
            <button class="eno-btn eno-btn-ghost" @click="showPlaylist = false">
              <div class="i-mingcute:close-line" />
              关闭
            </button>
          </div>
          <div class="flex-1 overflow-y-auto p-2.5 min-h-0 scrollbar-styled">
            <SongItem v-for="(song, index) in (store.playList as any[])" :key="(song as any).id" show-active del
              :song="song" size="mini" @delete-song="deleteSong(index)"
              class="rounded-lg transition-all duration-200 hover:bg-[rgb(255_255_255_/_0.06)]"
              :style="{ transitionDelay: `${Math.min(index, 12) * 12}ms` }" />
          </div>
        </div>
      </div>
    </div>

    <!-- 底部播放栏 -->
    <div class="h-[72px] z-50">
      <Play />
    </div>

    <WallpaperGen />
    <AddSong />
    <!-- <UpdateCheck /> -->
  </main>
</template>

<style>
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
  background: rgb(255 255 255 / 0.3);
  border-radius: 4px;
}

*::-webkit-scrollbar-thumb:hover {
  background: rgb(255 255 255 / 0.5);
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
