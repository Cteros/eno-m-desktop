<script lang="ts" setup>
import type { song } from '~/playlist/store'
// @ts-ignore
import { invokeBiliApi, BLBL } from '~/api/bili'

import { useBlblStore } from '~/blbl/store'
import { usePlaylistStore } from '~/playlist/store'
import { inject, computed } from 'vue'
import { useRouter } from 'vue-router'

const props = defineProps<{
  fav: fav
  tag?: string // 'collected' 表示收藏的其他人的内容（合集/列表）
}>()

const router = useRouter()
const store = useBlblStore()
const PLStore = usePlaylistStore()
const userInfo = inject('userInfo') as any

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

async function handlePlayClick(e: Event) {
  e.stopPropagation()

  // 合集/列表不支持直接播放，需要进入详情页
  if (props.tag === 'collected') {
    handleCardClick()
    return
  }

  // 收藏夹：快速加载前10条歌曲进行播放
  try {
    const res = await invokeBiliApi(BLBL.GET_FAV_INFO, {
      media_id: props.fav.id,
      pn: 1,
    })

    const { medias } = res.data
    const songs: song[] = []

    if (Array.isArray(medias)) {
      medias.forEach((element: any) => {
        songs.push({
          title: element.title,
          description: element.intro,
          eno_song_type: 'bvid',
          cover: element.cover,
          author: element.upper.name,
          duration: element.duration,
          id: element.bvid || element.bv_id,
          bvid: element.bvid || element.bv_id,
          aid: element.id,
        })
      })
    }

    if (songs.length > 0) {
      store.play = songs[0]
      store.playList = songs
    }
  } catch (error) {
    console.error('Failed to load fav list:', error)
  }
}

// 判断是否是当前用户的收藏夹
const isOwner = computed(() => {
  return userInfo.value && userInfo.value.mid && String(userInfo.value.mid) === String(props.fav.mid)
})
</script>

<template>
  <div class="h-64 flex items-stretch">
    <div
      class="flex-1 group relative rounded-xl overflow-hidden cursor-pointer transition-all duration-300 bg-gradient-to-b from-[#282828] to-[#1a1a1a] hover:bg-gradient-to-b hover:from-[#333333] hover:to-[#1f1f1f] shadow-lg hover:shadow-2xl"
      @click="handleCardClick">
      <!-- 背景光晕效果 -->
      <div
        class="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/40  group-hover:to-black/20 transition-all duration-300" />

      <!-- 装饰背景 -->
      <div
        class="absolute -top-1/2 -right-1/2 w-96 h-96 bg-[#1db954] rounded-full blur-3xl opacity-0 group-hover:opacity-10 transition-opacity duration-500 z-0" />

      <!-- 卡片内容 -->
      <div class="relative h-full flex flex-col justify-between p-5 ">
        <!-- 顶部装饰 -->
        <div class="flex items-start justify-between mb-auto">
          <div
            class="w-12 h-12 rounded-full bg-gradient-to-br from-[#1db954] to-[#1aa34a] flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
            <!-- 根据类型显示不同图标 -->
            <div class="i-mingcute:folder-fill text-white text-xl" />
          </div>
          <div class="flex flex-col items-end gap-1 ml-2">
            <div class="text-gray-400 text-xs font-medium">
              {{ tag === 'collected' ? '合集' : '收藏夹' }}
            </div>
            <div class="text-gray-400 text-sm font-bold">{{ props.fav.media_count || 0 }}</div>
          </div>
        </div>

        <!-- 底部内容 -->
        <div class="flex flex-col gap-4">
          <!-- 标题 -->
          <div>
            <h3
              class="text-white font-bold text-base line-clamp-2 mb-2 group-hover:text-[#1db954] transition-colors duration-300"
              v-html="props.fav.title || props.fav.name" />
            <p class="text-gray-400 text-sm">
              {{ props.fav.media_count || 0 }} 个视频
            </p>
          </div>

          <!-- 播放按钮 - 悬停时显示 -->
          <button
            class="w-12 h-12 rounded-full bg-[#1db954] text-black flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-[#1ed760] hover:scale-110 active:scale-95 flex-shrink-0"
            @click="handlePlayClick" title="播放">
            <div class="i-mingcute:play-fill text-xl pl-1" />
          </button>
        </div>
      </div>

      <!-- 边框光晕效果 -->
      <div
        class="absolute inset-0 rounded-xl border border-[#1db954] opacity-0 group-hover:opacity-20 transition-opacity duration-300" />
    </div>
  </div>
</template>
