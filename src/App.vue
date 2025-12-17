<!-- eslint-disable no-console -->
<script setup lang="ts">
import './styles/index.ts'
import { ref, onMounted, provide } from 'vue'
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

const userInfo = ref({})
const store = useBlblStore()

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
</script>

<template>
  <main class="h-screen w-screen overflow-hidden text-[#b3b3b3] font-sans grid-layout p-2 gap-2">
    <GlobalGlow />
    <!-- 左侧侧边栏 -->
    <div class="grid-sider">
      <Sider />
    </div>

    <!-- 主内容区 -->
    <div class="grid-main bg-[#121212] rounded-lg overflow-hidden relative flex flex-col">
      <Header />
      <div class="flex-1 overflow-y-auto scrollbar-styled relative">
        <div class="fadeInWrapper min-h-full">
          <router-view v-slot="{ Component }">
            <keep-alive include="search, playlist, singerList, setting, home">
              <component :is="Component" />
            </keep-alive>
          </router-view>
        </div>
      </div>
    </div>

    <!-- 右侧播放列表 (条件渲染) -->
    <div v-if="showPlaylist" class="grid-right-panel bg-[#121212] rounded-lg overflow-hidden flex flex-col w-[320px]">
      <div class="p-4 font-bold text-lg text-white border-b border-[#282828] flex justify-between items-center">
        播放列表
        <div class="i-mingcute:close-line cursor-pointer hover:text-white text-gray-400"
          @click="showPlaylist = false" />
      </div>
      <div class="flex-1 overflow-y-auto scrollbar-styled p-2">
        <SongItem v-for="(song, index) in (store.playList as any[])" :key="(song as any).id" show-active del
          :song="song" size="mini" @delete-song="deleteSong(index)" class="hover:bg-[#282828] rounded" />
      </div>
    </div>

    <!-- 底部播放栏 -->
    <div class="grid-player h-[72px] z-50">
      <Play />
    </div>

    <WallpaperGen />
    <AddSong />
    <UpdateCheck />
  </main>
</template>

<style>
.grid-layout {
  display: grid;
  grid-template-areas:
    "sider main right player"
    /* 默认状态，right 和 player 在这里有些逻辑冲突，下面会用 JS 动态控制或 CSS 调整 */
    "sider main right player";
  /* 占位 */
}

/* 动态 Grid 布局 */
.grid-layout {
  display: grid;
  grid-template-areas:
    "sider main right"
    "player player player";
  grid-template-columns: auto 1fr auto;
  /* 侧边栏 | 主内容 | 右侧栏(自动宽度) */
  grid-template-rows: 1fr auto;
  /* 主体 | 播放栏 */
}

.grid-sider {
  grid-area: sider;
}

.grid-main {
  grid-area: main;
}

.grid-right-panel {
  grid-area: right;
  display: flex;
}

.grid-player {
  grid-area: player;
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

.fadeInWrapper>* {
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
