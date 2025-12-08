<script lang="ts" setup>
import { useInfiniteScroll } from '@vueuse/core'
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { average } from 'color.js'

import SongItem from '~/components/SongItem.vue'
// @ts-ignore
import { invokeBiliApi, BLBL } from '~/api/bili'

import { useBlblStore } from '~/blbl/store'
import { usePlaylistStore, type song } from '~/playlist/store'
import Loading from '~/components/loading/index.vue'
// @ts-ignore
import Message from '~/components/message'

const route = useRoute()
const PLstore = usePlaylistStore()
const store = useBlblStore()

const currentFavId = computed(() => route.params.favId || '')

const favInfo = ref<any>(null)

const dominantColor = ref('#1db954') // 默认绿色

// 提取封面主色调
watch(favInfo, async (newInfo) => {
  if (newInfo?.cover) {
    try {
      const color = await average(newInfo.cover, { amount: 1, format: 'hex' })
      if (typeof color === 'string') {
        dominantColor.value = color
      }
    } catch (e) {
      console.warn('Failed to extract color:', e)
      dominantColor.value = '#1db954'
    }
  }
}, { immediate: true })
const songListByPage = ref<Record<number, song[]>>({})
const renderList = computed(() => {
  return Object.values(songListByPage.value).flat() as song[]
})

const loading = ref(false)
const keyword = ref('')
const page = ref({
  pn: 1,
  ps: 25,
  count: 0,
})
const listRef = ref(null)

// 滚动加载 - 绑定到具体的列表容器
useInfiniteScroll(
  listRef,
  async () => {
    // 如果正在加载中，或者已经没有更多数据
    if (loading.value || (page.value.count > 0 && page.value.pn * page.value.ps >= page.value.count))
      return
    
    // 避免初始为空时触发（由 watch 负责）
    if (Object.keys(songListByPage.value).length === 0) return

    await getSongs({ media_id: currentFavId.value, pn: page.value.pn + 1 })
  },
  { distance: 50 }
)

async function getSongs(params: Record<string, any>) {
  if (loading.value) return
  loading.value = true
  try {
    const res = await invokeBiliApi(BLBL.GET_FAV_INFO, params)
    const { info, medias } = res.data
    
    const videoList: song[] = (medias || []).map((item: any) => ({
      id: item.bvid || item.bv_id,
      eno_song_type: 'bvid',
      cover: item.cover,
      title: item.title,
      description: item.intro,
      author: item.upper.name,
      duration: item.duration || 0,
      bvid: item.bvid || item.bv_id,
      aid: item.id,
    }))
    
    page.value = {
      pn: info.pn,
      ps: info.ps,
      count: info.media_count
    }
    
    favInfo.value = info
    
    songListByPage.value = {
      ...songListByPage.value,
      [info.pn]: videoList
    }
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

watch(() => currentFavId.value, (favId) => {
  if (!favId) return
  songListByPage.value = {}
  page.value.pn = 1
  loading.value = false 
  getSongs({ media_id: favId })
}, { immediate: true })

function handlePlayPlaylist() {
  store.playList = renderList.value as any
  store.play = renderList.value[0] as any
}

function handleRemoveSong(song: song) {
  const favId = currentFavId.value as string | number
  PLstore.removeSongFromFav(favId, song).then(() => {
    // 本地移除
    const idx = renderList.value.findIndex((s: song) => s.id === song.id)
    if (idx > -1) {
      Object.values(songListByPage.value).forEach((songs: song[]) => {
        const songIdx = songs.findIndex((s: song) => s.id === song.id)
        if (songIdx > -1) songs.splice(songIdx, 1)
      })
    }
  })
}
</script>

<template>
  <!-- 页面主容器：占据 100% 高度，Flex 布局 -->
  <div class="w-full h-[calc(80vh)] flex flex-col bg-[#121212] relative overflow-hidden">
    
    <!-- 顶部背景 - 使用封面主色调 -->
    <div 
      class="absolute top-0 left-0 w-full h-[300px] z-0 pointer-events-none transition-all duration-500"
      :style="{ background: `linear-gradient(to bottom, ${dominantColor}, #121212)` }"
    ></div>

    <!-- 固定头部区域 (不滚动) -->
    <div class="shrink-0 relative z-10">
      <!-- 信息头 -->
      <div class="px-8 pt-6 flex items-end gap-6 pb-6">
        <div class="relative h-52 w-52 rounded-lg flex items-center justify-center shadow-2xl of-hidden" :style="{ background: `linear-gradient(135deg, ${dominantColor}, #1a1a1a)` }">
          <div class="i-mingcute:folder-fill text-white text-8xl opacity-50" />
          <div v-if="favInfo?.cover" :style="{backgroundImage: `url(${favInfo.cover})`}" class="absolute top-0 left-0 w-full h-full bg-cover bg-center" />
        </div>
        <div class="flex flex-col gap-2 mb-2 text-white">
          <div class="text-sm font-bold uppercase text-[#1db954]">收藏夹</div>
          <h1 class="text-7xl font-black tracking-tighter">
            {{ favInfo?.title }}
          </h1>
          <div class="flex items-center gap-4 text-sm font-medium mt-4">
             <span>{{ page.count }} 首音频</span>
          </div>
        </div>
      </div>

      <!-- 操作栏 -->
      <div class="bg-[#121212] px-8 py-4 flex items-center justify-between">
        <div class="flex items-center gap-6">
           <div 
             class="w-14 h-14 rounded-full bg-[#1db954] flex items-center justify-center shadow-lg cursor-pointer hover:scale-105 hover:bg-[#1ed760] transition-all"
             @click="handlePlayPlaylist"
           >
              <div class="i-mingcute:play-fill text-black text-3xl pl-1"></div>
           </div>
        </div>

        <!-- 搜索 -->
        <div class="relative group">
          <div class="i-mingcute:search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-hover:text-white z-10" />
          <input
            v-model="keyword"
            placeholder="搜索音频"
            type="text"
            class="w-48 h-9 pl-9 pr-4 rounded-full bg-[#282828] hover:bg-[#2a2a2a] focus:bg-[#333] text-sm text-white outline-none transition-all placeholder:text-gray-500"
            @keyup.enter="getSongs({ media_id: currentFavId, keyword })"
          >
        </div>
      </div>
    </div>
    <div class="grid grid-cols-[3rem_3.5rem_1fr_4rem_3rem] gap-4 text-[#b3b3b3] text-sm border-b border-[#ffffff1a] pb-2 px-12">
      <div class="text-center">#</div>
      <div></div>
      <div>标题</div>
      <div class="i-mingcute:time-line text-lg justify-self-end mr-4"></div>
      <div></div>
    </div>
    <!-- 歌曲列表 (滚动区域) -->
    <div 
      class="flex-1 overflow-y-auto scrollbar-styled px-8 py-4 pb-10 z-10 min-h-0" 
      ref="listRef"
    >
      <div class="flex flex-col">
         <SongItem 
           v-for="(song, index) in renderList" 
           :key="song.id" 
           :song="song" 
           :index="index + 1"
           :del="true"
           class="hover:bg-[#ffffff1a] rounded-md px-2"
           @delete-song="handleRemoveSong"
         >
         </SongItem>
      </div>
      <Loading v-if="loading && !renderList.length" class="mt-10" />
      <!-- 底部占位，防止最后的内容被遮挡 -->
      <div class="h-10"></div>
    </div>
  </div>
</template>

<style scoped>
/* 自定义 SongItem 样式覆盖 */
:deep(.song-item) {
  /* 强制对齐 header */
  grid-template-columns: 3rem 3.5rem 1fr 4rem 3rem !important;
  padding: 0.5rem 1rem;
}
</style>
