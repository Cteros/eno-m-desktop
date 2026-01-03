<script setup>
import { useInfiniteScroll, useScroll } from '@vueuse/core'
import { computed, ref, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'

import SongItem from '~/components/SongItem.vue'
import { invokeBiliApi, BLBL } from '~/api/bili'

import { useBlblStore } from '~/blbl/store.ts'
import { playCoreStore, useCollectionsStore, useSingerStore } from '~/playcore/store'
import Loading from '~/components/loading/index.vue'
import Message from '~/components/message'
import Dialog from '~/components/dialog/index.vue'
import { useDownloadStore } from '~/store/downloadStore'
import { formatFileName } from '~/utils/filename'
import { average } from 'color.js'
import BulkDownloadDialog from '~/components/BulkDownloadDialog.vue'
import { useUIStore } from '@/store/uiStore'
import DynamicHeader from '~/components/DynamicHeader.vue'

const route = useRoute()
const pcStore = playCoreStore()
const singerStore = useSingerStore()
const store = useBlblStore()
const uiStore = useUIStore()
const collectionsStore = useCollectionsStore()

const currentMid = computed(() => route.params.mid || '')

// 歌手信息，响应式加载
const info = ref(null)
const isLoadingSingerInfo = ref(false)

// 添加到分组的对话框状态
const showAddToTagDialog = ref(false)
const isAddingToTag = ref(false)
const selectedTagsForAdd = ref([])

// 关注/取消关注状态
const isFollowing = ref(false)
const isFollowLoading = ref(false)

// 检查用户是否已关注
const checkIsFollowing = () => {
  if (!currentMid.value) return false
  const follower = pcStore.allFollowersCache.find(
    f => f.mid === currentMid.value || f.mid.toString() === currentMid.value.toString()
  )
  isFollowing.value = !!follower
}

// 处理关注/取消关注
const handleFollowToggle = async () => {
  if (!currentMid.value) return

  isFollowLoading.value = true
  try {
    if (isFollowing.value) {
      // 取消关注
      await singerStore.unfollowUser(currentMid.value)
      Message.show({ type: 'success', message: '已取消关注' })
      isFollowing.value = false
    } else {
      // 关注
      await singerStore.followUser(currentMid.value)
      Message.show({ type: 'success', message: '已关注' })
      isFollowing.value = true
      // 刷新关注列表
      await pcStore.fetchAllFollowers()
    }
  } catch (error) {
    console.error(error)
    Message.show({ type: 'error', message: error.message || '操作失败' })
  } finally {
    isFollowLoading.value = false
  }
}

// 加载歌手信息
const loadSingerInfo = async (mid) => {
  if (!mid) {
    info.value = null
    return
  }

  // 首先检查关注列表中是否有此歌手
  const follower = pcStore.allFollowersCache.find(f => f.mid === mid || f.mid.toString() === mid.toString())
  if (follower) {
    console.log(follower)
    info.value = follower
    return
  }

  // 否则从 API 获取歌手信息
  isLoadingSingerInfo.value = true
  try {
    const singerInfo = await collectionsStore.fetchSingerInfo(mid)
    console.log(singerInfo)
    info.value = singerInfo
  } catch (error) {
    console.error(`Failed to load singer info for ${mid}:`, error)
    info.value = null
  } finally {
    isLoadingSingerInfo.value = false
  }
}

// 监听路由 mid 参数变化
watch(() => currentMid.value, (newMid) => {
  loadSingerInfo(newMid)
  checkIsFollowing()
}, { immediate: true })

// 初始化时确保关注列表有数据
onMounted(async () => {
  // 如果关注列表为空，先加载一次
  if (pcStore.allFollowersCache.length === 0) {
    await pcStore.fetchAllFollowers().catch(e => console.error('Failed to fetch followers:', e))
  }
})

const headerColor = ref('#535353') // 默认颜色
watch(() => headerColor.value, (newColor) => {
  uiStore.setGlowColor(newColor)
})

// 提取主题色
watch(info, async (newInfo) => {
  if (newInfo?.face) {
    try {
      // 使用 crossOrigin 防止跨域问题 (虽然B站图片有防盗链，但electron环境可能好些，或者需要代理)
      // 这里我们直接传 url，color.js 会尝试加载
      const color = await average(newInfo.face, { amount: 1, format: 'hex' })
      // color.js 返回的是 hex 字符串，或者是数组
      if (typeof color === 'string') {
        headerColor.value = color
      } else if (Array.isArray(color)) {
        // 如果是 rgb 数组
        // headerColor.value = `rgb(${color[0]}, ${color[1]}, ${color[2]})`
      }

    } catch (e) {
      console.warn('Failed to extract color:', e)
      headerColor.value = '#535353'
    }
  }
}, { immediate: true })

const songListByPage = ref({})
const renderList = computed(() => {
  return Object.values(songListByPage.value).flat()
})

const loading = ref(false)
const keyword = ref('')
const page = ref({
  pn: 1,
  ps: 25,
  count: 0,
})
const contentRef = ref(null)
const { y: scrollY } = useScroll(contentRef)
const isScrolled = computed(() => scrollY.value > 100)

// bulk download state
const downloadStore = useDownloadStore()
const showBulkDialog = ref(false)
const isPreparingBulk = ref(false)
const bulkSongList = ref([])
const bulkDownloadIndex = ref(0)
const bulkDownloading = ref(false)
const bulkCancel = ref(false)
const bulkSelectAll = ref(true)
const bulkConcurrency = ref(3)  // ✅ 并发下载数：3 个

// 滚动加载 - 绑定到具体的列表容器
useInfiniteScroll(
  contentRef,
  async () => {
    // 如果正在加载中，或者已经没有更多数据
    if (loading.value || (page.value.count > 0 && page.value.pn * page.value.ps >= page.value.count))
      return

    // 避免初始为空时触发（由 watch 负责）
    if (Object.keys(songListByPage.value).length === 0) return

    await getSongs({ mid: currentMid.value, pn: page.value.pn + 1 })
  },
  { distance: 50 }
)

async function getSongs(params) {
  if (loading.value) return
  loading.value = true
  try {
    const res = await invokeBiliApi(BLBL.GET_USER_ARC, params)
    const content = res.data
    const { page: c_page, list } = content
    const videoList = list.vlist.map(item => ({
      id: item.bvid,
      eno_song_type: 'bvid',
      cover: `${item.pic}`,
      title: item.title,
      description: item.description,
      author: item.author,
      duration: item.length || 0,
      bvid: item.bvid,
    }))

    page.value = {
      pn: c_page.pn,
      ps: c_page.ps,
      count: c_page.count
    }

    songListByPage.value = {
      ...songListByPage.value,
      [c_page.pn]: videoList
    }
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

watch(() => currentMid.value, (mid) => {
  if (!mid) return
  page.value.pn = 1
  loading.value = false
  getSongs({ mid })
}, { immediate: true })

function handlePlayUser() {
  store.playList = renderList.value
  store.play = renderList.value[0]
}

// 打开添加到分组的对话框
function openAddToTagDialog() {
  selectedTagsForAdd.value = []
  showAddToTagDialog.value = true
}

// 添加用户到选中的分组
async function handleAddUserToTags() {
  if (!currentMid.value || selectedTagsForAdd.value.length === 0) {
    Message.show({ type: 'warning', message: '请选择至少一个分组' })
    return
  }

  isAddingToTag.value = true
  try {
    await pcStore.addUserToTags(currentMid.value, selectedTagsForAdd.value)
    Message.show({ type: 'success', message: '已添加到分组' })
    showAddToTagDialog.value = false
    selectedTagsForAdd.value = []

    // 添加成功后，自动刷新相关分组的列表
    const currentTagId = pcStore.currentTag
    if (currentTagId !== null && selectedTagsForAdd.value.includes(currentTagId)) {
      // 如果当前选中的分组在刚添加的分组列表中，则刷新该分组
      await pcStore.fetchFollowersByTag(currentTagId)
    } else if (currentTagId === null) {
      // 如果在"所有分组"视图，则刷新所有分组
      await pcStore.fetchAllFollowers()
    }
  } catch (error) {
    console.error(error)
    Message.show({ type: 'error', message: error.message || '添加分组失败' })
  } finally {
    isAddingToTag.value = false
  }
}

// 获取所有分组列表
const allTags = computed(() => {
  return Object.values(pcStore.singerTagsCache).filter(tag => tag.tagid !== 0)
})

// 通过主进程打开新窗口查看歌手主页（优先使用 Electron 窗口，失败回退到浏览器）
async function openSingerPage() {
  const url = `https://space.bilibili.com/${currentMid.value}`
  try {
    await window.ipcRenderer.invoke('open-external-window', url)
  } catch (e) {
    console.warn('open-external-window failed, fallback to browser open', e)
    try {
      window.open(url, '_blank')
    } catch (err) {
      console.error('Fallback window.open failed', err)
    }
  }
}

function sleep(ms = 500) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ✅ 并发控制函数 - 限制同时进行的下载任务数
async function runWithConcurrency(tasks, concurrency = 3) {
  const results = []
  const executing = []
  let index = 0

  for (const [i, task] of tasks.entries()) {
    const promise = Promise.resolve().then(() => task()).then(result => {
      executing.splice(executing.indexOf(promise), 1)
      return result
    })

    results.push(promise)
    executing.push(promise)

    if (executing.length >= concurrency) {
      await Promise.race(executing)
    }
  }

  return Promise.all(results)
}

// 获取单首歌曲可下载的音频 URL（复用 Play.vue 的逻辑）
async function getSongPlayUrl(item) {
  try {
    if (item.eno_song_type === 'bvid') {
      const res = await invokeBiliApi(BLBL.GET_VIDEO_INFO, { bvid: item.bvid })
      const { cid } = res.data
      const dashRes = await invokeBiliApi(BLBL.GET_AUDIO_OF_VIDEO, { cid, bvid: item.bvid })
      const dash = dashRes.data.dash
      const url = dash.audio?.[0]?.baseUrl || dash.audio?.[0]?.backup_url?.[0] || ''
      return { ...item, url, dash }
    }

    // fallback: try GET_AUDIO_OF_VIDEO if cid exists
    if (item.cid) {
      const dashRes = await invokeBiliApi(BLBL.GET_AUDIO_OF_VIDEO, { cid: item.cid, bvid: item.bvid })
      const dash = dashRes.data.dash
      const url = dash.audio?.[0]?.baseUrl || dash.audio?.[0]?.backup_url?.[0] || ''
      return { ...item, url, dash }
    }

    // 如果类型是 sid 或其他，尽量调用 GET_SONG
    const sidRes = await invokeBiliApi(BLBL.GET_SONG, { sid: item.id })
    const url = sidRes.data?.cdns?.[0] || ''
    return { ...item, url }
  } catch (e) {
    console.error('getSongPlayUrl error', e)
    return item
  }
}

// 分页抓取歌手所有作品（带速率限制），返回扁平化列表
async function fetchAllSongsForMid(mid) {
  const all = []
  let pn = 1
  const ps = 25
  let total = Infinity

  while ((pn - 1) * ps < total) {
    try {
      const res = await invokeBiliApi(BLBL.GET_USER_ARC, { mid, pn, ps })
      const content = res.data
      const { page: c_page, list } = content
      total = c_page.count || total
      const videoList = list.vlist.map(item => ({
        id: item.bvid,
        eno_song_type: 'bvid',
        cover: `${item.pic}`,
        title: item.title,
        description: item.description,
        author: item.author,
        duration: item.length || 0,
        bvid: item.bvid,
      }))
      all.push(...videoList)
      pn += 1
      // 不要请求得太快
      await sleep(400)
    } catch (e) {
      console.error('fetchAllSongsForMid error', e)
      break
    }
  }

  return all
}

// 打开准备批量下载（先获取所有歌曲并在对话框中展示）
async function prepareBulkDownload() {
  if (!currentMid.value) {
    Message.show({ type: 'error', message: '无效的歌手 ID' })
    return
  }

  // 先打开对话框，再在对话框中加载列表
  showBulkDialog.value = true
  isPreparingBulk.value = true
  bulkSongList.value = []
  try {
    const all = await fetchAllSongsForMid(currentMid.value)
    // 包装为带状态和勾选的对象
    bulkSongList.value = all.map(s => ({ ...s, selected: true, status: 'pending' }))

    // ✅ 预检查哪些文件已存在
    try {
      const fileNames = bulkSongList.value.map(s => ({
        fileName: formatFileName(downloadStore.config.fileNameFormat || '{singer} - {song}', {
          singer: s.author,
          song: s.title,
          aid: s.id
        }),
        author: s.author
      }))
      const existsMap = await window.ipcRenderer.invoke('check-files-exist',
        fileNames,
        downloadStore.config.downloadPath,
        downloadStore.config.createAuthorFolder
      )

      // 标记已存在的文件
      bulkSongList.value.forEach((song, index) => {
        // 注意：这里需要用同样的方式生成文件名来匹配
        const fname = formatFileName(downloadStore.config.fileNameFormat || '{singer} - {song}', {
          singer: song.author,
          song: song.title,
          aid: song.id
        })
        if (existsMap[fname]) {
          song.status = 'existed'  // 标记为已存在
        }
      })
    } catch (err) {
      console.warn('Failed to check file existence:', err)
      // 继续执行，忽略预检查错误
    }
  } catch (e) {
    console.error(e)
    Message.show({ type: 'error', message: '获取歌曲列表失败' })
  } finally {
    isPreparingBulk.value = false
  }
}

// 按序下载所有歌曲（每首下载后稍作等待）
async function confirmBulkDownload() {
  if (!bulkSongList.value.length) return
  bulkDownloading.value = true
  bulkCancel.value = false
  bulkDownloadIndex.value = 0

  const toDownload = bulkSongList.value.filter(s => s.selected)

  // ✅ 并发下载：创建下载任务列表
  const downloadTasks = toDownload.map((item, i) => async () => {
    if (bulkCancel.value) {
      return { success: false, item, skipped: false }
    }

    const idx = bulkSongList.value.findIndex(s => s.id === item.id)

    // ✅ 如果文件已存在，跳过下载
    if (item.status === 'existed') {
      if (idx >= 0) bulkSongList.value[idx].status = 'success'
      bulkDownloadIndex.value = i + 1
      Message.show({ type: 'info', message: `已存在（跳过）：${item.title}`, duration: 2000 })
      return { success: true, item, skipped: true }
    }

    if (idx >= 0) bulkSongList.value[idx].status = 'downloading'
    bulkDownloadIndex.value = i + 1

    try {
      // 获取可下载 URL
      const playItem = await getSongPlayUrl(item)
      const url = playItem.url
      if (!url) {
        Message.show({ type: 'error', message: `无法获取 ${item.title} 的下载地址` })
        if (idx >= 0) bulkSongList.value[idx].status = 'failed'
        return { success: false, item, skipped: false }
      }

      const fileName = formatFileName(downloadStore.config.fileNameFormat || '{singer} - {song}', {
        singer: item.author,
        song: item.title,
        aid: item.id
      })

      const result = await window.ipcRenderer.invoke('download-song', {
        url,
        fileName: fileName,
        author: item.author,
        basePath: downloadStore.config.downloadPath,
        createAuthorFolder: downloadStore.config.createAuthorFolder,
      })

      if (result?.success) {
        if (idx >= 0) bulkSongList.value[idx].status = 'success'
        const message = result.skipped ? `已存在（跳过）：${item.title}` : `已下载：${item.title}`
        Message.show({ type: 'success', message, duration: 3000 })
        return { success: true, item, skipped: result.skipped }
      } else {
        if (idx >= 0) bulkSongList.value[idx].status = 'failed'
        Message.show({ type: 'error', message: `下载失败：${item.title}` })
        return { success: false, item, skipped: false }
      }
    } catch (e) {
      console.error('bulk download error', e)
      Message.show({ type: 'error', message: `下载异常：${item.title}` })
      if (idx >= 0) bulkSongList.value[idx].status = 'failed'
      return { success: false, item, skipped: false }
    }
  })

  // ✅ 使用并发控制执行下载（3 个并发）
  try {
    await runWithConcurrency(downloadTasks, bulkConcurrency.value)
    Message.show({ type: 'success', message: '批量下载任务已完成' })
  } catch (error) {
    console.error('Concurrent download error:', error)
    Message.show({ type: 'error', message: '批量下载发生错误' })
  }

  bulkDownloading.value = false
  showBulkDialog.value = false
}

function closeBulkDialog() {
  showBulkDialog.value = false
}

function toggleSelectAll() {
  bulkSelectAll.value = !bulkSelectAll.value
  bulkSongList.value.forEach(s => (s.selected = bulkSelectAll.value))
}

function toggleSelect(idx) {
  if (bulkSongList.value[idx]) {
    bulkSongList.value[idx].selected = !bulkSongList.value[idx].selected
  }
  bulkSelectAll.value = bulkSongList.value.every(s => s.selected)
}

function onBulkItemChange(idx, e) {
  // 从事件对象获取 checked 值
  const checked = e.target.checked
  if (bulkSongList.value[idx]) {
    bulkSongList.value[idx].selected = checked
  }
  // 更新全选状态
  bulkSelectAll.value = bulkSongList.value.every(s => s.selected)
}

function stopBulkDownload() {
  if (!bulkDownloading.value) {
    showBulkDialog.value = false
    return
  }
  bulkCancel.value = true
  Message.show({ type: 'info', message: '正在停止批量下载，当前下载会在完成后停止' })
}
</script>

<template>
  <!-- 页面主容器 -->
  <section ref="contentRef" class="h-[calc(100vh-170px)] overflow-auto bg-[#121212]">
    <!-- 动态头部区域 -->
    <DynamicHeader :img-src="info?.face || ''" :title="info?.uname || '加载中...'" :color="headerColor"
      :is-scrolled="isScrolled" v-model:keyword="keyword" @play="handlePlayUser"
      @search="getSongs({ mid: currentMid, keyword })" @open-external="openSingerPage">
      <template #actions>
        <!-- 歌曲数量 -->
        <div class="flex items-center gap-2 cursor-pointer hover:text-white transition-colors"
          @click="prepareBulkDownload">
          <span class="text-white font-bold text-md">{{ page.count }}</span>
          <span>首音乐作品</span>
          <div class="i-mingcute:download-2-fill text-md" />
        </div>
        <!-- 关注按钮 -->
        <button :disabled="isFollowLoading" @click="handleFollowToggle" :class="[
          'px-4 py-2 rounded-full font-bold text-sm transition-colors duration-300 flex items-center gap-2',
          isFollowing
            ? 'bg-[#1db954] hover:bg-[#1ed760] text-black'
            : 'border border-white text-white hover:border-[#1db954] hover:text-[#1db954]'
        ]">
          <div
            :class="isFollowLoading ? 'animate-spin i-mingcute:loading-3-line' : (isFollowing ? 'i-mingcute:check-line' : 'i-mingcute:add-line')" />
          <span>{{ isFollowLoading ? '处理中...' : (isFollowing ? '已关注' : '关注') }}</span>
        </button>
        <!-- 添加到分组按钮 -->
        <button
          class="p-1 rounded-full border duration-300 flex items-center gap-2 uppercase text-xs font-bold tracking-wider hover:scale-105 active:scale-95 border-none text-white"
          @click="openAddToTagDialog">
          <div class="i-mingcute:folder-add-line" />
          <span>添加到分组</span>
        </button>
      </template>
    </DynamicHeader>

    <div class="w-full h-full flex flex-col relative ease-in-out" :class="isScrolled ? 'pt-[72px]' : 'pt-[320px]'">
      <!-- 歌曲列表标题 -->
      <div
        class="pl-12 pr-6 py-3 text-body-small text-gray-500 border-b border-[#ffffff1a] z-10 sticky top-0 bg-[#121212]">
        <div class="grid grid-cols-[3rem_3.5rem_1fr_4rem_3rem] gap-4">
          <div class="text-center">#</div>
          <div />
          <div>标题</div>
          <div class="flex-center mr-4">
            <div class="i-mingcute:time-line text-lg" />
          </div>
          <div />
        </div>
      </div>
      <div :class="isScrolled ? 'h-[72px]' : 'h-[320px]'"></div>

      <!-- 歌曲列表 -->
      <div class="flex-1 px-8 pb-10" ref="listRef">
        <div class="flex flex-col space-y-1 pt-2">
          <SongItem v-for="(song, index) in renderList" :key="song.id" :song="song" :index="index + 1"
            class="hover:bg-[#1a1a1a] rounded-lg px-2 transition-colors" />
        </div>

        <Loading v-if="loading && !renderList.length" class="mt-10" />

        <!-- 空状态 -->
        <div v-if="!loading && !renderList.length" class="flex flex-col items-center justify-center py-16">
          <div class="i-mingcute:music-2-fill text-5xl mb-4 opacity-20" />
          <p class="text-body-small">暂无音乐作品</p>
        </div>

        <!-- 底部占位 -->
        <div class="h-10" />
      </div>

      <!-- 批量下载对话框组件 -->
      <BulkDownloadDialog :show="showBulkDialog" :song-list="bulkSongList" :is-loading="isPreparingBulk"
        :is-downloading="bulkDownloading" :download-index="bulkDownloadIndex" :select-all="bulkSelectAll"
        @close="closeBulkDialog" @toggle-select-all="toggleSelectAll" @toggle-select="toggleSelect"
        @item-change="onBulkItemChange" @start-download="confirmBulkDownload" @stop-download="stopBulkDownload" />

      <!-- 添加到分组对话框 -->
      <Dialog :open="showAddToTagDialog" @visibleChange="showAddToTagDialog = $event" title="添加到分组">
        <div class="space-y-4 min-w-[320px]">
          <div v-if="allTags.length > 0">
            <label class="text-sm font-medium text-gray-300 mb-3 block">选择要添加到的分组</label>
            <div class="space-y-2 max-h-[300px] overflow-y-auto">
              <label v-for="tag in allTags" :key="tag.tagid"
                class="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-[#282828] transition-colors">
                <input type="checkbox" :value="tag.tagid" v-model="selectedTagsForAdd"
                  class="w-4 h-4 rounded cursor-pointer" />
                <span class="text-sm text-gray-300">{{ tag.name }}</span>
              </label>
            </div>
          </div>
          <div v-else class="text-center py-8">
            <p class="text-gray-400">暂无分组，请先<router-link to="/singer"
                class="text-[#1db954] hover:underline">创建分组</router-link></p>
          </div>
        </div>

        <template #footer>
          <button @click="showAddToTagDialog = false"
            class="px-4 py-2 rounded bg-[#282828] hover:bg-[#333333] text-white transition-colors">
            取消
          </button>
          <button @click="handleAddUserToTags" :disabled="isAddingToTag || selectedTagsForAdd.length === 0"
            class="px-4 py-2 rounded bg-[#1db954] hover:bg-[#1ed760] text-black font-medium transition-colors disabled:opacity-50">
            {{ isAddingToTag ? '添加中...' : '添加' }}
          </button>
        </template>
      </Dialog>
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

.need-ease {
  transition: all 0.5s;
  transition-timing-function: cubic-bezier(0.25, 0.8, 0.25, 1);
}
</style>
