<script setup>
import { ref, computed } from 'vue'

defineOptions({
  name: 'search'
})

import SongItem from '~/components/SongItem.vue'
import Loading from '~/components/loading/index.vue'
import { invokeBiliApi, BLBL } from '~/api/bili'
import Message from '~/components/message'

const PAGE_SIZE = 10

const keyword = ref('')
const result = ref([])
const isLoading = ref(false)
const errorMessage = ref('')
const hasSearched = ref(false)
const currentPage = ref(1)
const totalPages = ref(1)
const totalCount = ref(0)

const paginationItems = computed(() => {
  const total = totalPages.value
  const current = currentPage.value

  if (total <= 7)
    return Array.from({ length: total }, (_, i) => i + 1)

  const items = [1]
  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)

  if (start > 2)
    items.push('ellipsis-left')

  for (let page = start; page <= end; page++)
    items.push(page)

  if (end < total - 1)
    items.push('ellipsis-right')

  items.push(total)
  return items
})

function isUrl(url) {
  if (typeof url !== 'string')
    return false

  return /bilibili\.com/i.test(url)
}

// 检查响应是否为HTML（表示被风控）
function isHtmlResponse(data) {
  if (typeof data === 'string')
    return /<html|<head|<body/i.test(data)

  return false
}

function mapSearchItem(item) {
  let cover = item?.pic || ''
  if (typeof cover === 'string' && cover.startsWith('//'))
    cover = `http:${cover}`
  else if (typeof cover !== 'string')
    cover = ''

  return {
    id: item?.id || item?.bvid,
    eno_song_type: 'bvid',
    cover,
    title: typeof item?.title === 'string' ? item.title.replace(/<[^>]+>/g, '') : '',
    description: item?.description || item?.desc || '',
    author: item?.author || item?.owner?.name || '未知',
    duration: item?.duration,
    bvid: item?.bvid,
    pages: item?.pages,
    mid: item?.mid,
  }
}

async function fetchSearchPage(page) {
  const res = await invokeBiliApi(BLBL.SEARCH, {
    keyword: keyword.value,
    page,
    page_size: PAGE_SIZE,
  })

  if (isHtmlResponse(res)) {
    errorMessage.value = '请求被风控，请稍后重试'
    return
  }

  const data = (res && typeof res === 'object' && res.data && typeof res.data === 'object')
    ? res.data
    : {}
  const list = Array.isArray(data.result) ? data.result : []
  result.value = list.map(mapSearchItem)

  const apiTotalPages = Number(data.numPages || data.num_pages || 0)
  const apiTotalCount = Number(data.numResults || data.num_results || 0)

  totalCount.value = apiTotalCount > 0
    ? apiTotalCount
    : ((page - 1) * PAGE_SIZE + list.length)

  totalPages.value = Math.max(
    1,
    apiTotalPages || (apiTotalCount > 0 ? Math.ceil(apiTotalCount / PAGE_SIZE) : page),
  )
}

function resetSearchState() {
  result.value = []
  currentPage.value = 1
  totalPages.value = 1
  totalCount.value = 0
}

// 搜索
async function handleSearch() {
  const input = keyword.value.trim()
  if (!input)
    return

  keyword.value = input
  isLoading.value = true
  hasSearched.value = true
  errorMessage.value = ''
  resetSearchState()

  try {
    if (isUrl(keyword.value)) {
      const match = keyword.value.match(/BV([a-zA-Z0-9]+)/i)
      if (match) {
        const bvid = match[0]
        const res = await invokeBiliApi(BLBL.GET_VIDEO_INFO, { bvid })

        if (isHtmlResponse(res)) {
          errorMessage.value = '请求被风控，请稍后重试'
          return
        }

        const item = res.data
        if (item) {
          result.value = [{
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
          }]
          totalPages.value = 1
          totalCount.value = 1
        }
      }
      else {
        Message.show({
          message: '链接里没有识别到 BV 号',
          type: 'warning',
          duration: 1200,
        })
      }
      return
    }

    await fetchSearchPage(1)
  } catch (error) {
    console.error('Search failed:', error)
    errorMessage.value = '搜索失败，请稍后重试'
  } finally {
    isLoading.value = false
  }
}

async function handlePageChange(page) {
  if (isLoading.value)
    return

  if (page < 1 || page > totalPages.value || page === currentPage.value)
    return

  isLoading.value = true
  errorMessage.value = ''

  try {
    await fetchSearchPage(page)
    currentPage.value = page
  } catch (error) {
    console.error('Page change failed:', error)
    Message.show({
      message: '翻页失败，请稍后重试',
      type: 'error',
      duration: 1200,
    })
  } finally {
    isLoading.value = false
  }
}
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
    <div v-if="result.length && !isLoading && !errorMessage" class="flex-1 w-full overflow-y-auto scrollbar-styled pb-8 min-h-0">
      <div
        class="grid grid-cols-[3rem_3.5rem_1fr_4rem_3rem] gap-4 text-[#b3b3b3] text-sm border-b border-[#ffffff1a] pb-2 mb-4 px-4 sticky top-0 bg-[#121212] z-10">
        <div class="text-center">#</div>
        <div></div>
        <div>标题</div>
        <div class="i-mingcute:time-line text-lg justify-self-end mr-4"></div>
        <div></div>
      </div>

      <SongItem v-for="(item, index) in result" :key="item.bvid" :song="item"
        :index="(currentPage - 1) * PAGE_SIZE + index + 1" check-pages class="hover:bg-[#ffffff1a] rounded-md px-2" />

      <div class="mt-6 px-4 flex items-center justify-between gap-3 text-[#b3b3b3]">
        <div class="text-sm">共 {{ totalCount }} 项</div>

        <div class="flex items-center gap-2">
          <button
            class="h-8 px-3 rounded bg-[#242424] hover:bg-[#2a2a2a] disabled:opacity-40 disabled:cursor-not-allowed"
            :disabled="currentPage <= 1" @click="handlePageChange(currentPage - 1)">
            上一页
          </button>

          <button v-for="item in paginationItems" :key="item"
            class="h-8 min-w-8 px-2 rounded text-sm disabled:cursor-default"
            :class="typeof item === 'number'
              ? (item === currentPage ? 'bg-white text-black' : 'bg-[#242424] hover:bg-[#2a2a2a] text-white')
              : 'bg-transparent text-[#7a7a7a]'"
            :disabled="typeof item !== 'number'"
            @click="typeof item === 'number' ? handlePageChange(item) : undefined">
            {{ item === 'ellipsis-left' || item === 'ellipsis-right' ? '...' : item }}
          </button>

          <button
            class="h-8 px-3 rounded bg-[#242424] hover:bg-[#2a2a2a] disabled:opacity-40 disabled:cursor-not-allowed"
            :disabled="currentPage >= totalPages" @click="handlePageChange(currentPage + 1)">
            下一页
          </button>
        </div>
      </div>
    </div>

    <!-- 初始状态/空状态 -->
    <div v-if="!result.length && !isLoading && !errorMessage"
      class="flex-1 flex flex-col items-center justify-center text-[#b3b3b3] gap-4">
      <div class="i-mingcute:music-2-fill text-6xl opacity-50"></div>
      <div class="text-center">
        <h3 class="font-bold text-white mb-2">{{ hasSearched ? '未找到相关内容' : '搜索 Bilibili 视频或音频' }}</h3>
        <p class="text-sm">{{ hasSearched ? '换个关键词试试' : '输入关键字、BV号或视频链接即可开始' }}</p>
      </div>
    </div>
  </section>
</template>

<style scoped>
:deep(.song-item) {
  grid-template-columns: 3rem 3.5rem 1fr 4rem 3rem !important;
}
</style>
