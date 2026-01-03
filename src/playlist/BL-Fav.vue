<script lang="ts" setup>
import { usePlaylistStore } from '~/playlist/store'
import { computed } from 'vue'
import { useRouter } from 'vue-router'

const props = defineProps<{
  fav: fav
  tag?: string // 'collected' 表示收藏的其他人的内容（合集/列表）
}>()

const router = useRouter()
const PLStore = usePlaylistStore()

interface fav {
  attr?: number
  fav_state?: number
  fid?: number
  id: string | number
  mid: string | number
  title: string
  media_count?: number
  // 合集/列表字段
  name?: string
  intro?: string
  season_id?: number
  series_id?: number
  type?: string
  [key: string]: any
}

function handleCardClick() {
  // 如果是收藏的其他人的合集/列表
  if (props.tag === 'collected') {
    // 对于 collectedFavList，id 字段就是合集/列表的 ID
    const id = props.fav.id
    const mid = props.fav.mid

    if (!id || !mid) {
      console.error('Missing id or mid:', { id, mid })
      return
    }

    // 默认作为合集处理
    router.push({
      name: 'collectionDetail',
      params: {
        collectionId: String(id)
      },
      query: {
        mid: String(mid),
        type: 'collection'
      }
    })
  } else {
    // 自己创建的收藏夹
    router.push({
      name: 'favDetail',
      params: { favId: props.fav.id }
    })
  }
}

// 获取封面
const cover = computed(() => {
  const id = String(props.fav.id)
  return PLStore.favInfoCache[id]?.cover || ''
})
</script>

<template>
  <div class="h-48 w-64 flex items-stretch">
    <div
      class="flex-1 group relative rounded-xl overflow-hidden cursor-pointer transition-all duration-300 shadow-lg hover:shadow-2xl flex flex-col"
      @click="handleCardClick">
      <!-- 图片区域 -->
      <div class="flex-1 relative bg-gray-600 flex items-center justify-center overflow-hidden">
        <img v-if="cover" :src="cover"
          class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />

        <!-- 悬停遮罩 -->
        <div class="absolute inset-0 bg-black opacity-0 group-hover:opacity-20 transition-opacity duration-300" />
      </div>

      <!-- 信息区域 -->
      <div class="bg-gradient-to-b from-[#282828] to-[#1a1a1a] px-3 py-2 flex flex-col justify-between h-12">
        <h3 class="text-white font-bold text-xs line-clamp-1 group-hover:text-[#1db954] transition-colors duration-300"
          v-html="props.fav.title || props.fav.name" />
        <p class="text-gray-400 text-xs">
          {{ props.fav.media_count || 0 }} 个视频
        </p>
      </div>
    </div>
  </div>
</template>
