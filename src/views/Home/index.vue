<script setup>
import { onMounted, onUnmounted, ref, computed } from 'vue'
import { usePlaylistStore } from '../../playlist/store'
import { useBlblStore } from '../../blbl/store'
import { useRouter } from 'vue-router'

const store = useBlblStore()
const PLstore = usePlaylistStore()
const router = useRouter()

// 当前时间（用于计算问候语），每分钟更新一次以保持问候语准确
const now = ref(Date.now())
let _timer = null

onMounted(() => {
  store.initHomePage()
  _timer = setInterval(() => {
    now.value = Date.now()
  }, 60 * 1000)
})

onUnmounted(() => {
  if (_timer) clearInterval(_timer)
})

const greeting = computed(() => {
  const h = new Date(now.value).getHours()
  if (h >= 5 && h < 12) return 'Good morning'
  if (h >= 12 && h < 18) return 'Good afternoon'
  if (h >= 18 && h < 22) return 'Good evening'
  return 'Good night'
})

function goToRank() {
  router.push('/rank')
}

</script>

<template>
  <section class="w-full h-full overflow-auto pb-30 scrollbar-hide px-6 pt-6 bg-[#0f0f0f]">
    <!-- 顶部欢迎语 -->
    <h2 class="text-4xl font-bold text-white mb-8">{{ greeting }}</h2>

    <!-- 推荐板块 (Bilibili Music Rank 入口) -->
    <div class="mb-12">
      <div
        class="group relative rounded-xl overflow-hidden cursor-pointer transition-all duration-300 bg-gradient-to-b from-[#282828] to-[#1a1a1a] hover:bg-gradient-to-b hover:from-[#333333] hover:to-[#1f1f1f] shadow-lg hover:shadow-2xl h-32"
        @click="goToRank">
        <!-- 背景光晕效果 -->
        <div
          class="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/40 z-10 group-hover:to-black/20 transition-all duration-300" />

        <!-- 装饰背景 -->
        <div
          class="absolute -top-1/4 -right-1/4 w-64 h-64 bg-gradient-to-br from-pink-500 to-orange-400 rounded-full blur-3xl opacity-0 group-hover:opacity-15 transition-opacity duration-500 z-0" />

        <!-- 卡片内容 -->
        <div class="relative h-full flex items-center justify-between px-6 z-20">
          <div class="flex items-center gap-6">
            <div
              class="w-24 h-24 bg-gradient-to-br from-pink-500 to-orange-400 rounded-lg flex items-center justify-center shadow-lg flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
              <div class="i-mingcute:music-2-fill text-4xl text-white" />
            </div>
            <div>
              <h3 class="text-xl font-bold text-white mb-1">Bilibili Music Rank</h3>
              <p class="text-sm text-gray-400">发现最受欢迎的音乐</p>
            </div>
          </div>

          <div
            class="w-14 h-14 rounded-full bg-[#1db954] flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-[#1ed760] hover:scale-110 flex-shrink-0">
            <div class="i-mingcute:play-fill text-black text-2xl pl-1" />
          </div>
        </div>

        <!-- 边框光晕效果 -->
        <div
          class="absolute inset-0 rounded-xl border border-gradient-to-r from-pink-500/30 to-orange-400/30 opacity-0 group-hover:opacity-40 transition-opacity duration-300 z-30" />
      </div>
    </div>

  </section>
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
