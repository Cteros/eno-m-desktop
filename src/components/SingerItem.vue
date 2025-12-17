<script setup>
import cn from 'classnames'
import { usePlaylistStore } from '../playlist/store'
import { useBlblStore } from '../blbl/store'

import { useRouter } from 'vue-router'
import { computed, onMounted, watch } from 'vue'

const props = defineProps({
  singerMid: String,
  canDel: {
    type: Boolean,
    default: false,
  },
  // 'card' | 'card-modern' | 'list' | 'simple'
  type: {
    type: String,
    default: 'card'
  },
  class: {
    type: String,
    default: ''
  }
})
const router = useRouter()
const store = useBlblStore()
const PLstore = usePlaylistStore()
const info = computed(() => PLstore.singerCardCache[props.singerMid])
const avatar = computed(() => info.value?.face || '')
const name = computed(() => info.value?.name || '')
const desc = computed(() => {
  const { name } = info.value?.nameplate || {}
  return `${name || 'Artist'}`
})

onMounted(() => {
  if (!info.value && props.singerMid) {
    console.log('111')
    PLstore.fetchSingerInfo(props.singerMid)
  }
})

watch(() => props.singerMid, (newMid) => {
  if (newMid && !PLstore.singerCardCache[newMid]) {
    PLstore.fetchSingerInfo(newMid)
  }
})

function handleSingerDetail(singerMid) {
  if (!info.value) return
  PLstore.currentSinger = singerMid
  router.push(`/singerDetail/${singerMid}`)
}
</script>

<template>
  <!-- Card Style (Spotify 风格卡片) -->
  <div v-if="type === 'card'" :class="cn(
    'flex flex-col items-center p-4 rounded-md bg-[#181818] hover:bg-[#282828] transition-all duration-300 cursor-pointer group w-40 flex-shrink-0 animate-slide-in-up hover:scale-105',
    props.class
  )" @click.stop="handleSingerDetail(singerMid)">
    <template>
      <div class="relative w-full aspect-square mb-4 shadow-lg rounded-md overflow-hidden">
        <img :src="avatar" alt="singerAvatar"
          class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out">
        <!-- 播放按钮悬浮 (可选，如果你想直接播放歌手热门歌曲) -->
        <div
          class="absolute bottom-2 right-2 w-12 h-12 bg-[#1db954] rounded-full flex items-center justify-center shadow-lg opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 hover:scale-105 hover:bg-[#1ed760]">
          <div class="i-mingcute:play-fill text-black text-2xl pl-1" />
        </div>
      </div>

      <div class="flex flex-col w-full">
        <div class="text-sm font-bold text-white truncate mb-1">
          {{ name }}
        </div>
        <div class="text-xs text-[#a7a7a7] truncate">
          {{ desc }}
        </div>
      </div>
    </template>
  </div>

  <!-- Simple List Style (侧边栏简单列表) -->
  <div v-else-if="type === 'simple'" :class="cn(
    'flex items-center gap-3 p-2 rounded hover:bg-[#1a1a1a] cursor-pointer transition-all duration-300 group animate-slide-in-left hover:scale-102',
    props.class
  )" @click.stop="handleSingerDetail(singerMid)">
    <template v-if="info">
      <img :src="avatar" class="w-12 h-12 rounded-md object-cover">
      <div class="flex flex-col overflow-hidden">
        <span class="text-white font-medium truncate text-sm">{{ name }}</span>
        <span class="text-xs text-[#a7a7a7] truncate">{{ desc }}</span>
      </div>
    </template>
    <template v-else>
      <div class="w-12 h-12 rounded-md bg-white/5 animate-pulse flex-shrink-0" />
      <div class="flex flex-col gap-1 flex-1">
        <div class="h-3 w-20 bg-white/5 rounded animate-pulse" />
        <div class="h-2 w-12 bg-white/5 rounded animate-pulse" />
      </div>
    </template>
  </div>

  <!-- Modern Card Style (现代高级卡片，匹配媒体库) -->
  <div v-else-if="type === 'card-modern'" :class="cn(
    'relative h-56 w-full flex flex-col items-center justify-between p-5 rounded-xl bg-gradient-to-b from-[#282828] to-[#1a1a1a] hover:bg-gradient-to-b hover:from-[#333333] hover:to-[#1f1f1f] transition-all duration-300 cursor-pointer group shadow-lg hover:shadow-2xl overflow-hidden animate-slide-in-up hover:scale-103',
    props.class
  )" @click.stop="handleSingerDetail(singerMid)">
    <template v-if="info">
      <!-- 背景光晕效果 -->
      <div
        class="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/40 group-hover:to-black/20 transition-all duration-300 rounded-xl pointer-events-none" />

      <!-- 装饰背景 -->
      <div
        class="absolute -top-1/4 -right-1/4 w-32 h-32 bg-[#1db954] rounded-full blur-3xl opacity-0 group-hover:opacity-10 transition-opacity duration-500 z-0" />

      <!-- 卡片内容 -->
      <div class="relative flex flex-col items-center justify-between w-full h-full">
        <!-- 头像 -->
        <div class="relative w-24 h-24 shadow-lg rounded-full overflow-hidden flex-shrink-0 flex-grow-0">
          <img :src="avatar" alt="singerAvatar"
            class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 ease-out">
          <!-- 播放按钮 -->
          <div
            class="absolute inset-0 w-full h-full flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 transition-opacity duration-300 rounded-full">
            <div class="i-mingcute:play-fill text-white text-2xl pl-1" />
          </div>
        </div>

        <!-- 信息 -->
        <div class="flex flex-col items-center w-full flex-1 justify-center">
          <h4
            class="text-white font-bold text-sm line-clamp-1 group-hover:text-[#1db954] transition-colors duration-300 mt-2">
            {{ name }}
          </h4>
          <p class="text-gray-400 text-xs mt-1 line-clamp-1">
            {{ desc }}
          </p>
        </div>
      </div>

      <!-- 边框光晕效果 -->
      <div
        class="absolute inset-0 rounded-xl border border-[#1db954] opacity-0 group-hover:opacity-20 transition-opacity duration-300 pointer-events-none" />
    </template>
    <template v-else>
      <div class="w-24 h-24 rounded-full bg-white/5 animate-pulse mb-4" />
      <div class="flex flex-col items-center gap-2 w-full">
        <div class="h-4 w-24 bg-white/5 rounded animate-pulse" />
        <div class="h-3 w-16 bg-white/5 rounded animate-pulse" />
      </div>
    </template>
  </div>

  <!-- Old List Style (兼容旧的列表样式，如果需要) -->
  <div v-else :class="cn(
    'flex flex-shrink-0 items-center justify-between w-80 h-20 rounded-lg px-4 bg-[#181818] hover:bg-[#282828] transition-all duration-300 cursor-pointer group animate-slide-in-left hover:scale-102',
    props.class
  )" @click.stop="handleSingerDetail(singerMid)">
    <template v-if="info">
      <div class="flex items-center space-x-4">
        <img :src="avatar" alt="singerAvatar" class="w-13 h-13 rounded-full object-cover shadow-sm">
        <div class="flex flex-col">
          <div class="text-[16px] font-medium tracking-wide text-white">
            {{ name }}
          </div>
          <div class="text-[11px] text-gray-400/80 mt-0.5">
            {{ desc }}
          </div>
        </div>
      </div>

      <div class="flex items-center gap-3 transition-opacity duration-200 opacity-0 group-hover:opacity-100">
        <div v-if="canDel"
          class="i-mingcute:delete-line w-[18px] h-[18px] text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
          @click.stop="PLstore.removeSinger(singerMid)" />
      </div>
    </template>
    <template v-else>
      <div class="flex items-center space-x-4 w-full">
        <div class="w-13 h-13 rounded-full bg-white/5 animate-pulse flex-shrink-0" />
        <div class="flex flex-col gap-2 flex-1">
          <div class="h-4 w-24 bg-white/5 rounded animate-pulse" />
          <div class="h-3 w-16 bg-white/5 rounded animate-pulse" />
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slideInLeft {
  from {
    opacity: 0;
    transform: translateX(-10px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.animate-slide-in-up {
  animation: slideInUp 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
}

.animate-slide-in-left {
  animation: slideInLeft 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
}
</style>
