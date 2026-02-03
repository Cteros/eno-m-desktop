<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { useInfiniteScroll, useScroll } from '@vueuse/core'
import cn from 'classnames'

defineOptions({
  name: 'search'
})

import SongItem from '~/components/SongItem.vue'
import Loading from '~/components/loading/index.vue'
import { invokeBiliApi, BLBL } from '~/api/bili'

const scrollRef = ref(null)
const pageNum = ref(1)
const containerHeight = ref(0)
const rowHeight = 64
const bufferRows = 4

const keyword = ref('')
const result = ref([])
const isLoading = ref(false)
const errorMessage = ref('')
// 单个搜索结果过少时不触发滚动加载
const enableScrollGetMore = ref(true)

const { y: scrollY } = useScroll(scrollRef)

function updateContainerHeight() {
  const el = scrollRef.value
  if (el)
    containerHeight.value = el.clientHeight
}

const totalRows = computed(() => result.value.length)

const visibleRange = computed(() => {
  if (!result.value.length)
    return { start: 0, end: 0, top: 0, bottom: 0 }
  const startRow = Math.max(0, Math.floor(scrollY.value / rowHeight) - bufferRows)
  const endRow = Math.min(
    totalRows.value - 1,
    Math.ceil((scrollY.value + containerHeight.value) / rowHeight) + bufferRows
  )
  const start = startRow
  const end = Math.min(result.value.length, endRow + 1)
  const top = startRow * rowHeight
  const bottom = Math.max(0, (totalRows.value - endRow - 1) * rowHeight)
  return { start, end, top, bottom }
})

const visibleResults = computed(() => {
  return result.value.slice(visibleRange.value.start, visibleRange.value.end)
})

function isUrl(url) {
  return /bilibili.com/.test(url)
}

// 检查响应是否为HTML（表示被风控）
function isHtmlResponse(data) {
  if (typeof data === 'string') {
    return /<html|<head|<body/i.test(data)
  }
  return false
}

// 滚动加载
useInfiniteScroll(
  scrollRef,
  async () => {
    if (!enableScrollGetMore.value)
      return
    const moreData = await getMoreData()
    if (moreData && moreData.length) {
      result.value = result.value.concat(moreData)
    }
  },
  { distance: 10 },
)

// 加载函数
async function getMoreData() {
  pageNum.value++

  try {
    const res = await invokeBiliApi(BLBL.SEARCH, {
      keyword: keyword.value,
      page: pageNum.value,
    })

    // 检查是否被风控
    if (isHtmlResponse(res)) {
      errorMessage.value = '请求被风控，请稍后重试'
      return []
    }

    const list = res.data?.result || []

    return list.map((item) => {
      let cover = item.pic
      if (cover && cover.startsWith('//')) {
        cover = 'http:' + cover
      }

      return {
        id: item.id || item.bvid,
        eno_song_type: 'bvid',
        cover,
        title: item.title ? item.title.replace(/<[^>]+>/g, '') : '',
        description: item.description || item.desc,
        author: item.author || item.owner?.name || '未知',
        duration: item.duration,
        bvid: item.bvid,
        pages: item.pages,
        mid: item.mid,
      }
    })
  } catch (error) {
    console.error('Search error:', error)
    errorMessage.value = '搜索失败，请稍后重试'
    return []
  } finally {
    isLoading.value = false
  }
}

// 搜索
async function handleSearch() {
  if (!keyword.value) return

  isLoading.value = true
  errorMessage.value = ''
  enableScrollGetMore.value = true
  pageNum.value = 0
  result.value = []

  try {
    if (isUrl(keyword.value)) {
      const match = keyword.value.match(/BV([a-zA-Z0-9]+)/)
      if (match) {
        const bvid = match[0]
        // 获取对应的歌曲
        const res = await invokeBiliApi(BLBL.GET_VIDEO_INFO, { bvid })

        // 检查是否被风控
        if (isHtmlResponse(res)) {
          errorMessage.value = '请求被风控，请稍后重试'
          return
        }

        const item = res.data
        if (item) {
          const searchSong = {
            id: item.id || item.bvid,
            eno_song_type: 'bvid',
            cover: item.pic,
            title: item.title,
            description: item.description || item.desc,
            author: item.author || item.owner?.name || '未知',
            duration: item.duration,
            bvid: item.bvid,
            pages: item.pages,
            mid: item.owner?.mid || item.mid,
          }

          result.value = [searchSong]
          enableScrollGetMore.value = false
        }
      }
    }
    else {
      const newList = await getMoreData()
      result.value = newList
    }
  } catch (error) {
    console.error('Search failed:', error)
    errorMessage.value = '搜索失败，请稍后重试'
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  updateContainerHeight()
  window.addEventListener('resize', updateContainerHeight)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateContainerHeight)
})

watch(
  () => result.value.length,
  async () => {
    await nextTick()
    updateContainerHeight()
  }
)
</script>

<template>
  <section class="w-full flex flex-col pt-6 px-2 bg-[#121212] h-full min-h-0">
    <!-- 搜索输入框 -->
    <div class="w-[50vw] relative group mb-8 mx-auto">
      <div class="absolute left-3 top-1/2 -translate-y-1/2 z-10 pointer-events-none ml-1">
        <div class="i-mingcute:search-line text-xl text-[#b3b3b3] group-focus-within:text-white transition-colors" />
      </div>
      <input id="search" v-model="keyword" type="text"
        class="w-full h-12 pl-10 pr-10 rounded-full bg-[#242424] hover:bg-[#2a2a2a] hover:ring-1 hover:ring-[#ffffff33] focus:bg-[#2a2a2a] focus:ring-2 focus:ring-white outline-none text-white text-sm transition-all placeholder:text-[#757575]"
        placeholder="想听什么？" @keyup.enter="handleSearch" autocomplete="off">
      <div v-if="keyword"
        class="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-[#b3b3b3] hover:text-white"
        @click="keyword = ''">
        <div class="i-mingcute:close-line text-lg mr-2" />
      </div>
    </div>

    <!-- Loading 指示器 -->
    <div v-if="isLoading" class="flex justify-center items-center py-8">
      <Loading />
    </div>

    <!-- 错误提示 -->
    <div v-if="errorMessage" class="flex justify-center items-center py-8 text-red-500">
      <div class="text-center">
        <div class="i-mingcute:alert-circle-fill text-4xl mb-2"></div>
        <p class="text-lg">{{ errorMessage }}</p>
      </div>
    </div>

    <!-- 搜索结果 -->
    <div v-if="result.length && !isLoading && !errorMessage" ref="scrollRef"
      class="flex-1 w-full overflow-y-auto scrollbar-styled pb-8 min-h-0">
      <div
        class="grid grid-cols-[3rem_3.5rem_1fr_4rem_3rem] gap-4 text-[#b3b3b3] text-sm border-b border-[#ffffff1a] pb-2 mb-4 px-4 sticky top-0 bg-[#121212] z-10">
        <div class="text-center">#</div>
        <div></div>
        <div>标题</div>
        <div class="i-mingcute:time-line text-lg justify-self-end mr-4"></div>
        <div></div>
      </div>

      <div :style="{ paddingTop: `${visibleRange.top}px`, paddingBottom: `${visibleRange.bottom}px` }">
        <SongItem v-for="(item, index) in visibleResults" :key="item.bvid" :song="item"
          :index="visibleRange.start + index + 1" check-pages class="hover:bg-[#ffffff1a] rounded-md px-2" />
      </div>
    </div>

    <!-- 初始状态/空状态 -->
    <div v-if="!result.length && !isLoading && !errorMessage"
      class="flex-1 flex flex-col items-center justify-center text-[#b3b3b3] gap-4">
      <div class="i-mingcute:music-2-fill text-6xl opacity-50"></div>
      <div class="text-center">
        <h3 class="font-bold text-white mb-2">搜索 Bilibili 视频或音频</h3>
        <p class="text-sm">输入关键字、BV号或视频链接即可开始</p>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* 自定义 SongItem 在列表中的样式适配 */
/* SongItem now handles its own layout */
:deep(.song-item) {
  /* Override the grid layout to match header if needed, but SongItem has its own defaults */
  /* We force specific columns to align with header */
  grid-template-columns: 3rem 3.5rem 1fr 4rem 3rem !important;
}
</style>
