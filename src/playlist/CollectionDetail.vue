<script lang="ts" setup>
import { useInfiniteScroll, useScroll } from '@vueuse/core'
import { computed, ref, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { average } from 'color.js'

import SongItem from '~/components/SongItem.vue'
import DynamicHeader from '~/components/DynamicHeader.vue'
// @ts-ignore
import { invokeBiliApi, BLBL } from '~/api/bili'

import { useBlblStore } from '~/blbl/store'
import { usePlaylistStore, type song } from '~/playlist/store'
import { Loading, MessageAPI } from '@cloudfly/eno-ui'

const route = useRoute()
const PLstore = usePlaylistStore()
const store = useBlblStore()

const currentCollectionId = computed(() => {
  const id = route.params.collectionId
  console.log('collectionId from route:', id)
  return id ? String(id) : ''
})
const currentMid = computed(() => {
  const mid = route.query.mid
  console.log('mid from query:', mid)
  return mid ? String(mid) : ''
})
const collectionType = computed(() => {
  const type = route.query.type
  console.log('type from query:', type)
  return (type === 'series' ? 'series' : 'collection') as 'series' | 'collection'
})

const collectionInfo = ref<any>(null)
const dominantColor = ref('#1db954') // 默认绿色

// 提取封面主色调
watch(collectionInfo, async (newInfo) => {
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
  ps: 30,
  count: 0,
})
const contentRef = ref<HTMLElement | null>(null)
const { y: scrollY } = useScroll(contentRef)
const isScrolled = computed(() => scrollY.value > 100)

// 滚动加载
useInfiniteScroll(
  contentRef,
  async () => {
    // 如果数据都已加载或总数小于单页大小，无需加载更多
    if (loading.value || renderList.value.length >= page.value.count)
      return

    if (Object.keys(songListByPage.value).length === 0) return

    await getVideos({ page_num: page.value.pn + 1 })
  },
  { distance: 50 }
)

async function getVideos(params: Record<string, any>) {
  if (loading.value) return
  loading.value = true
  try {
    let res: any
    let videoList: song[] = []
    let totalCount = 0
    let currentPage = params.page_num || 1

    if (collectionType.value === 'series') {
      // 获取系列详情
      res = await invokeBiliApi(BLBL.GET_SERIES_INFO, {
        mid: currentMid.value,
        series_id: currentCollectionId.value,
        pn: currentPage,
        ps: 30,
        sort: 'desc'
      })

      const archives = res.data?.archives || []
      videoList = archives.map((item: any) => ({
        id: item.bvid || item.bv_id,
        eno_song_type: 'bvid',
        cover: item.pic,
        title: item.title,
        description: item.intro || '',
        author: item.upper?.name || '未知创作者',
        duration: item.duration || 0,
        bvid: item.bvid || item.bv_id,
        aid: item.aid,
      }))

      totalCount = res.data?.page?.total || 0

      // 系列接口可能不返回 meta 信息，如果 collectionInfo 为空，尝试从 GET_SEASONS_SERIES_LIST 获取
      if (!collectionInfo.value?.name) {
        // 尝试获取元数据 (仅第一页尝试)
        try {
          const listRes = await invokeBiliApi(BLBL.GET_SEASONS_SERIES_LIST, {
            mid: currentMid.value,
            page_num: 1,
            page_size: 20,
          })
          const seriesList = listRes.data?.items_lists?.series_list || []
          const target = seriesList.find((s: any) => String(s.meta?.series_id) === String(currentCollectionId.value))
          if (target) {
            collectionInfo.value = target.meta
          }
        } catch (e) {
          console.warn('Failed to fetch series meta', e)
        }
      }

    } else {
      // 获取合集详情
      res = await invokeBiliApi(BLBL.GET_COLLECTION_INFO, {
        mid: currentMid.value,
        season_id: currentCollectionId.value,
        page_num: currentPage,
        page_size: 30,
      })

      const archives = res.data?.archives || []
      videoList = archives.map((item: any) => ({
        id: item.bvid || item.bv_id,
        eno_song_type: 'bvid',
        cover: item.pic,
        title: item.title,
        description: item.intro || '',
        author: item.upper?.name || '未知创作者',
        duration: item.duration || 0,
        bvid: item.bvid || item.bv_id,
        aid: item.aid,
      }))

      totalCount = res.data?.page?.total || 0
      // 合集接口通常返回 meta
      if (res.data?.meta) {
        collectionInfo.value = res.data.meta
      }
    }

    page.value = {
      pn: currentPage,
      ps: 30,
      count: totalCount,
    }

    songListByPage.value = {
      ...songListByPage.value,
      [currentPage]: videoList
    }
  } catch (e) {
    console.error('Failed to fetch collection videos:', e)
    MessageAPI.show({
      type: 'error',
      message: '加载视频失败'
    })
  } finally {
    loading.value = false
  }
}

watch(() => [currentCollectionId.value, currentMid.value, collectionType.value], ([collectionId, mid, type]) => {
  if (!collectionId || !mid) {
    console.log('Missing params:', { collectionId, mid, type })
    return
  }
  console.log('Watch triggered with:', { collectionId, mid, type })
  songListByPage.value = {}
  page.value.pn = 1
  loading.value = false
  getVideos({ page_num: 1 })
}, { immediate: true })

function handlePlayPlaylist() {
  store.playList = renderList.value as any
  store.play = renderList.value[0] as any
}

function handleRemoveSong(song: song) {
  // 合集和列表通常不支持移除操作，这里可选实现
  console.log('Remove song:', song)
}
</script>

<template>
  <!-- 页面主容器 -->
  <section ref="contentRef" class="h-[calc(100vh-170px)] overflow-auto bg-[#121212] relative">
    <DynamicHeader :img-src="collectionInfo?.cover || ''" :title="collectionInfo?.name || ''" :color="dominantColor"
      :is-scrolled="isScrolled" v-model:keyword="keyword" @play="handlePlayPlaylist"
      @search="getVideos({ page_num: 1 })" @open-external="() => { }">
      <template #actions>
        <div class="flex items-center gap-4 text-sm font-medium text-gray-300">
          <span>{{ page.count }} 个视频</span>
          <span v-if="collectionInfo?.description" class="text-gray-400 truncate max-w-[300px]">
            {{ collectionInfo.description }}
          </span>
        </div>
      </template>
    </DynamicHeader>

    <div class="w-full min-h-[calc(100%+200px)] flex flex-col relative ease-in-out"
      :class="isScrolled ? 'pt-[72px]' : 'pt-[320px]'">
      <!-- 表头 -->
      <div
        class="grid grid-cols-[3rem_3.5rem_1fr_4rem_3rem] gap-4 text-[#b3b3b3] text-sm border-b border-[#ffffff1a] pb-2 px-12 sticky top-0 bg-[#121212] z-10 pt-2">
        <div class="text-center">#</div>
        <div></div>
        <div>标题</div>
        <div class="i-mingcute:time-line text-lg justify-self-end mr-4"></div>
        <div></div>
      </div>

      <!-- 视频列表 -->
      <div class="flex-1 px-8 pb-10">
        <div class="flex flex-col space-y-1 pt-2">
          <SongItem v-for="(song, index) in renderList" :key="song.id" :song="song" :index="index + 1" :del="false"
            class="hover:bg-[#ffffff1a] rounded-md px-2" @delete-song="handleRemoveSong">
          </SongItem>
        </div>
        <Loading v-if="loading && !renderList.length" class="mt-10" />
        <div class="h-10"></div>
      </div>
    </div>
  </section>
</template>

<style scoped>
:deep(.song-item) {
  grid-template-columns: 3rem 3.5rem 1fr 4rem 3rem !important;
  padding: 0.5rem 1rem;
}
</style>
