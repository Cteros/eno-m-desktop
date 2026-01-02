<script setup>
import { onMounted, ref, computed } from 'vue'
import { useCollectionsStore } from '../../playcore/stores/collections'
import { getUserArc } from '../../api'
import { useBlblStore } from '../../blbl/store'
import ScrollButton from './scroll-button.vue'

const props = defineProps({
  mid: {
    type: String,
    required: true,
  },
})

const collectionsStore = useCollectionsStore()
const store = useBlblStore()

const singer = ref(null)

const loading = ref(false)
const songList = ref([])
const scrollRef = ref(null)
onMounted(() => {
  // 加载歌手信息
  collectionsStore.fetchSingerInfo(props.mid).then(result => {
    singer.value = result
  })

  loading.value = true
  getUserArc({ mid: props.mid }).then((res) => {
    const content = res.data
    const { list } = content
    const videoList = list.vlist.map(item => ({
      id: item.bvid,
      eno_song_type: 'bvid',
      cover: `${item.pic}`,
      title: item.title,
      description: item.description,
      author: item.author,
      duration: item.duration || 0, // 暂无
      bvid: item.bvid,
    }))
    songList.value = videoList
  })
})
function handleClick(song) {
  store.startPlay(song)
}

function handleScroll(offset) {
  scrollRef.value.scrollTo({
    left: scrollRef.value.scrollLeft + offset,
    behavior: 'smooth',
  })
}
</script>

<template>
  <div v-if="songList.length" class="mt-6 mb-8">
    <div class="flex items-end justify-between mb-6 px-6">
      <h3 class="text-2xl font-bold text-white hover:text-[#1db954] transition-colors cursor-pointer">
        {{ singer.uname || '加载中...' }}
      </h3>
      <ScrollButton :step="600" :handle-scroll="handleScroll" />
    </div>
    <div :id="`singer-preview-${mid}`" ref="scrollRef" class="overflow-x-auto scrollbar-hide relative">
      <div class="flex gap-4 px-6 pb-2">
        <div v-for="song in songList" :key="song.id"
          class="group relative flex-shrink-0 w-40 h-48 rounded-lg overflow-hidden cursor-pointer transition-all duration-300 bg-[#181818] hover:bg-[#242424] shadow-lg hover:shadow-xl"
          @click="handleClick(song)">
          <!-- 背景光晕 -->
          <div
            class="absolute -top-1/2 -right-1/2 w-48 h-48 bg-[#1db954] rounded-full blur-3xl opacity-0 group-hover:opacity-10 transition-opacity duration-500 z-0" />

          <!-- 图片 -->
          <img :src="song.cover"
            class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
            :alt="song.title">

          <!-- 播放按钮和遮罩 -->
          <div
            class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center z-10">
            <div
              class="w-14 h-14 rounded-full bg-[#1db954] flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform duration-300 hover:bg-[#1ed760]">
              <div class="i-mingcute:play-fill text-black text-2xl pl-1" />
            </div>
          </div>

          <!-- 标题 -->
          <div
            class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/50 to-transparent p-3 z-20">
            <p
              class="text-white font-medium text-sm line-clamp-2 group-hover:text-[#1db954] transition-colors duration-300">
              {{ song.title }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}

.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
