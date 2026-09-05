<script setup>
import { computed } from 'vue'
import cn from 'classnames'
import { useBlblStore } from '../blbl/store.ts'
import { usePlaylistStore } from '../playlist/store.ts'
// @ts-ignore
import { invokeBiliApi, BLBL } from '~/api/bili'
import { useRouter } from 'vue-router'
import { formatTime } from '~/utils'

const props = defineProps({
  song: {
    type: Object,
    default: null,
  },
  index: {
    type: Number,
    default: -1,
  },
  size: {
    // default, mini
    type: String,
    default: 'default',
  },
  star: {
    type: Boolean,
    default: true,
  },
  del: {
    type: Boolean,
    default: false,
  },
  checkPages: {
    type: Boolean,
    default: false,
  },
  later: {
    type: Boolean,
    default: true,
  },
  showActive: {
    type: Boolean,
    default: true,
  },
  class: String
})

const emit = defineEmits(['delete-song'])

const router = useRouter()
const store = useBlblStore()
const PLstore = usePlaylistStore()

const { del, star, checkPages } = props
const { cover, title, author, pages, mid, duration } = props.song || {}

const isPlaying = computed(() => {
  if (!props.showActive)
    return false
  const current = store.play
  const type = current.eno_song_type

  if (type && current[type] === props?.song?.[type]) {
    return true
  }
  return false
})

const styleBySize = computed(() => {
  const hasIndex = props.index !== -1
  // Grid columns definition
  // Index (opt) | Image | Title/Info | Time | Actions
  let cols = ''
  if (hasIndex) cols += '3rem '

  if (props.size === 'mini') {
    cols += '3.5rem 1fr auto auto'
    return {
      wrapper: `grid gap-3 items-center`,
      gridTemplateColumns: cols,
      title: 'text-sm font-medium w-full truncate text-white',
      img: 'h-10 w-10 rounded object-cover',
      author: 'text-xs text-gray-400 truncate'
    }
  }
  else {
    // 最后一列改为 3rem
    cols += '3.5rem 1fr 4rem 3rem'
    return {
      wrapper: `grid gap-4 items-center`,
      gridTemplateColumns: cols,
      title: 'text-base font-medium truncate text-white',
      img: 'h-12 w-12 rounded object-cover',
      author: 'text-sm text-gray-400 truncate'
    }
  }
})

async function handleClick() {
  if (!checkPages) {
    store.startPlay(props.song)
    return
  }
  // 计算分P数据
  try {
    const res = await invokeBiliApi(BLBL.GET_VIDEO_INFO, {
      bvid: props.song.bvid,
    })
    const item = res.data

    if (item.pages && item.pages.length > 1 && props.song) {
      PLstore.openCollection = true
      PLstore.collectionInfo = {
        ...props.song,
        pages: item.pages,
      }
    }
    else {
      store.startPlay(props.song)
    }
  } catch (error) {
    console.error('Failed to check video info:', error)
    store.startPlay(props.song)
  }
}

function handleSingerDetail(singerMid) {
  if (!singerMid) return
  router.push(`/singerDetail/${singerMid}`)
}
</script>

<template>
  <div
    :class="cn('song-item h-16 px-2 rounded-md hover:bg-white/10 cursor-pointer transition-colors group relative', styleBySize.wrapper, props.class)"
    :style="{ gridTemplateColumns: styleBySize.gridTemplateColumns }" @click="handleClick">
    <!-- Index -->
    <div v-if="props.index !== -1" class="text-center text-gray-500 font-medium">
      {{ props.index }}
    </div>

    <div class="relative">
      <img :src="cover" :class="styleBySize.img">
      <div v-if="isPlaying" class="absolute inset-0 bg-black/40 flex items-center justify-center rounded">
        <div class="i-svg-spinners:bars-scale w-4 h-4 text-[#1ed760]" />
      </div>
    </div>

    <div class="flex flex-col overflow-hidden justify-center h-full min-w-0">
      <div
        :class="cn(styleBySize.title, { 'text-[#1ed760]': isPlaying })"
        v-html="title"
      />
      <div class="flex items-center gap-2 mt-0.5">
        <span v-if="pages" class="bg-[#282828] text-[10px] px-1 rounded text-[#1ed760]">合集</span>
        <span
          :class="styleBySize.author"
          class="hover:text-white hover:underline"
          @click.stop="handleSingerDetail(mid)"
        >
          {{ author }}
        </span>
      </div>
    </div>
    <div>
      <!-- Time -->
      <div
        class="text-sm text-gray-500 tabular-nums text-right block group-hover:hidden transition-opacity duration-200">
        {{ (duration || 0) }}
      </div>

      <!-- 操作 -->
      <div
        class="items-center justify-end gap-3 text-lg text-gray-400 pr-2 h-full px-3 hidden group-hover:flex transition-opacity duration-200">
        <div v-if="star" class="i-mingcute:heart-line hover:text-white" title="收藏"
          @click.stop="PLstore.startAddSong(props.song)" />
        <div v-if="del" class="i-mingcute:delete-2-line hover:text-red-500" title="删除"
          @click.stop="emit('delete-song', props.song)" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.song-item {
  /* display: grid; moved to style bindings */
  align-items: center;
}
</style>
