<script lang="ts" setup>
import { useInfiniteScroll, useScroll } from '@vueuse/core'
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { average } from 'color.js'

import SongItem from '~/components/SongItem.vue'
import DynamicHeader from '~/components/DynamicHeader.vue'
// @ts-ignore
import { invokeBiliApi, BLBL } from '~/api/bili'

import { useBlblStore } from '~/blbl/store'
import { usePlaylistStore, type song } from '~/playlist/store'
import Loading from '~/components/loading/index.vue'

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
const contentRef = ref<HTMLElement | null>(null)
const { y: scrollY } = useScroll(contentRef)
const isScrolled = computed(() => scrollY.value > 100)

// 滚动加载 - 绑定到具体的列表容器
useInfiniteScroll(
  contentRef,
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
  <!-- 页面主容器 -->
  <section ref="contentRef" class="h-[calc(100vh-170px)] overflow-auto bg-[#121212]">
    <DynamicHeader :img-src="favInfo?.cover" :title="favInfo?.title" :color="dominantColor" :is-scrolled="isScrolled"
      v-model:keyword="keyword" @play="handlePlayPlaylist" @search="getSongs({ media_id: currentFavId, keyword })"
      @open-external="() => { }">
      <template #actions>
        <div class="flex items-center gap-4 text-sm font-medium text-gray-300">
          <span>{{ page.count }} 首音频</span>
        </div>
      </template>
    </DynamicHeader>

    <div class="w-full min-h-full flex flex-col relative ease-in-out" :class="isScrolled ? 'pt-[72px]' : 'pt-[320px]'">
      <!-- 列表头 -->
      <div
        class="grid grid-cols-[3rem_3.5rem_1fr_4rem_3rem] gap-4 text-[#b3b3b3] text-sm border-b border-[#ffffff1a] pb-2 px-12 sticky top-0 bg-[#121212] z-10 pt-2">
        <div class="text-center">#</div>
        <div></div>
        <div>标题</div>
        <div class="i-mingcute:time-line text-lg justify-self-end mr-4"></div>
        <div></div>
      </div>

      <!-- 歌曲列表 -->
      <div class="flex-1 px-8 pb-10">
        <div class="flex flex-col space-y-1 pt-2">
          <SongItem v-for="(song, index) in renderList" :key="song.id" :song="song" :index="index + 1" :del="true"
            class="hover:bg-[#ffffff1a] rounded-md px-2" @delete-song="handleRemoveSong" />
        </div>
        <Loading v-if="loading && !renderList.length" class="mt-10" />
        <!-- 底部占位 -->
        <div class="h-10"></div>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* 自定义 SongItem 样式覆盖 */
:deep(.song-item) {
  /* 强制对齐 header */
  grid-template-columns: 3rem 3.5rem 1fr 4rem 3rem !important;
  padding: 0.5rem 1rem;
}
</style>
