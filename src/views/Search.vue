<script setup>
import { ref, computed } from 'vue'

defineOptions({
  name: 'search'
})

import SongItem from '~/components/SongItem.vue'
import { Loading, MessageAPI } from '@cloudfly/eno-ui'
import { searchVideos, getVideoInfo } from '~/otter-api'

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
  const res = await searchVideos({
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

function resetSearch() {
  keyword.value = ''
  hasSearched.value = false
  errorMessage.value = ''
  resetSearchState()
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
        const res = await getVideoInfo({ bvid })

        const item = res.detail
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
        MessageAPI.show({
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
    MessageAPI.show({
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
  <section class="search-page">
    <header class="search-hero">
      <h1 class="search-title">
        搜索
      </h1>
    </header>

    <!-- 搜索栏 + 分页 -->
    <div
      class="search-toolbar"
      :class="hasSearched ? 'search-toolbar--compact' : ''"
    >
      <!-- 搜索框 -->
      <div class="relative group search-input-wrap" :class="hasSearched ? 'search-input-wrap--compact' : ''">
        <div class="absolute left-3 top-1/2 -translate-y-1/2 z-10 pointer-events-none ml-1">
          <div class="i-mingcute:search-line text-xl text-black" />
        </div>
        <input
          id="search"
          v-model="keyword"
          type="text"
          class="search-input"
          placeholder="想听什么？"
          autocomplete="off"
          @keyup.enter="handleSearch"
        >
        <div
          v-if="keyword"
          class="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-[#757575] hover:text-black"
          @click="resetSearch"
        >
          <div class="i-mingcute:close-line text-lg mr-2" />
        </div>
      </div>

      <!-- 分页组件（搜索后悬浮在搜索框右侧） -->
      <Transition name="pagination">
        <div v-if="hasSearched" class="flex items-center gap-2 text-[#b3b3b3] shrink-0">
          <span class="text-sm mr-2 whitespace-nowrap">共 {{ totalCount }} 项</span>
          <button
            class="h-8 px-3 rounded bg-[#242424] hover:bg-[#2a2a2a] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            :disabled="currentPage <= 1" @click="handlePageChange(currentPage - 1)">
            上一页
          </button>
          <div class="flex items-center gap-1 overflow-x-auto">
            <button v-for="item in paginationItems" :key="item"
              class="h-8 min-w-8 px-2 rounded text-sm disabled:cursor-default transition-all flex-shrink-0"
              :class="typeof item === 'number'
                ? (item === currentPage ? 'bg-white text-black' : 'bg-[#242424] hover:bg-[#2a2a2a] text-white')
                : 'bg-transparent text-[#7a7a7a]'"
              :disabled="typeof item !== 'number'"
              @click="typeof item === 'number' ? handlePageChange(item) : undefined">
              {{ item === 'ellipsis-left' || item === 'ellipsis-right' ? '...' : item }}
            </button>
          </div>
          <button
            class="h-8 px-3 rounded bg-[#242424] hover:bg-[#2a2a2a] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            :disabled="currentPage >= totalPages" @click="handlePageChange(currentPage + 1)">
            下一页
          </button>
        </div>
      </Transition>
    </div>

    <!-- 内容区（仅此区域滚动） -->
    <div class="flex-1 min-h-0 overflow-y-auto scrollbar-styled px-2">
      <Transition name="content" mode="out-in">
        <!-- Loading -->
        <div v-if="isLoading" key="loading" class="flex items-center justify-center h-full">
          <Loading />
        </div>

        <!-- 错误 -->
        <div v-else-if="errorMessage" key="error" class="flex flex-col items-center justify-center h-full text-red-500">
          <div class="i-mingcute:alert-circle-fill text-4xl mb-2" />
          <p class="text-lg">
            {{ errorMessage }}
          </p>
        </div>

        <!-- 搜索结果 -->
        <div v-else-if="result.length" key="results" class="pb-8">
          <h2 class="result-title">
            歌曲
          </h2>
          <div
            class="grid grid-cols-[3rem_3.5rem_1fr_4rem_3rem] gap-4 text-[#b3b3b3] text-sm border-b border-[#ffffff1a] pb-2 mb-4 px-4"
          >
            <div class="text-center">
              #
            </div>
            <div />
            <div>标题</div>
            <div class="i-mingcute:time-line text-lg justify-self-end mr-4" />
            <div />
          </div>

          <SongItem
            v-for="(item, index) in result"
            :key="item.bvid"
            :song="item"
            :index="(currentPage - 1) * PAGE_SIZE + index + 1"
            check-pages
            class="hover:bg-[#ffffff1a] rounded-md px-2"
          />
        </div>

        <!-- 初始状态/空状态 -->
        <div v-else key="empty" class="empty-panel">
          <h3>{{ hasSearched ? '未找到相关内容' : '开始搜索' }}</h3>
          <p>{{ hasSearched ? '换个关键词试试' : '输入关键词或 Bilibili 视频链接。' }}</p>
        </div>
      </Transition>
    </div>
  </section>
</template>

<style scoped>
.search-page {
  display: flex;
  height: 100%;
  min-height: 0;
  flex-direction: column;
  background: linear-gradient(180deg, #1e1e1e 0%, #121212 220px);
}

.search-hero {
  padding: 8px 24px 0;
}

.search-title {
  margin: 0;
  font-size: 32px;
  font-weight: 800;
  letter-spacing: -0.03em;
  color: #fff;
}

.search-toolbar {
  display: flex;
  justify-content: center;
  margin: 20px 24px 16px;
}

.search-toolbar--compact {
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.search-input-wrap {
  width: min(50vw, 420px);
}

.search-input-wrap--compact {
  width: min(35vw, 360px);
}

.search-input {
  width: 100%;
  height: 48px;
  border: 0;
  border-radius: 24px;
  padding: 0 40px 0 44px;
  font-size: 14px;
  font-weight: 600;
  color: #000;
  background: #fff;
  outline: none;
}

.search-input::placeholder {
  color: #757575;
}

.search-input:focus {
  outline: 2px solid #fff;
  outline-offset: 2px;
}

.result-title {
  margin: 8px 16px 12px;
  font-size: 24px;
  font-weight: 700;
  color: #fff;
}

.empty-panel {
  display: flex;
  height: 100%;
  flex-direction: column;
  justify-content: center;
  padding: 48px 32px;
  color: #b3b3b3;
}

.empty-panel h3 {
  margin: 0 0 8px;
  font-size: 24px;
  font-weight: 700;
  color: #fff;
}

.empty-panel p {
  margin: 0;
  font-size: 14px;
}

:deep(.song-item) {
  grid-template-columns: 3rem 3.5rem 1fr 4rem 3rem !important;
}

.pagination-enter-active,
.pagination-leave-active {
  transition: all 0.4s ease-in-out;
}
.pagination-enter-from,
.pagination-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

.content-enter-active,
.content-leave-active {
  transition: all 0.35s ease-in-out;
}
.content-enter-from {
  opacity: 0;
  transform: translateY(12px);
}
.content-leave-to {
  opacity: 0;
  transform: translateY(-12px);
}
</style>
