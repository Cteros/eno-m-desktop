<script setup>
import cn from 'classnames'
import { useCollectionsStore } from '../playcore/stores/collections'
import { useBlblStore } from '../blbl/store'

import { useRouter } from 'vue-router'
import { computed, onMounted, watch } from 'vue'

const props = defineProps({
  singerMid: String,
  singerInfo: {
    type: Object,
    default: null
  },
  canDel: {
    type: Boolean,
    default: false,
  },
  // 'card' | 'card-modern' | 'list' | 'simple'
  type: {
    type: String,
    default: 'card'
  },
  class: {
    type: String,
    default: ''
  }
})
const router = useRouter()
const store = useBlblStore()
const collectionsStore = useCollectionsStore()
const info = ref(props.singerInfo || null)
const avatar = computed(() => info.value?.face || '')
const name = computed(() => info.value?.uname || '')
const desc = computed(() => {
  const { name } = info.value?.nameplate || {}
  return `${name || 'Artist'}`
})

onMounted(() => {
  if (info.value) return

  if (props.singerMid) {
    collectionsStore.fetchSingerInfo(props.singerMid).then(result => {
      info.value = result
    })
  }
})

watch(() => props.singerInfo, (newInfo) => {
  if (newInfo) {
    info.value = newInfo
  }
})

watch(() => props.singerMid, (newMid) => {
  if (props.singerInfo) return // 如果有完整信息，忽略mid变化带来的请求

  if (newMid && newMid !== props.singerMid) {
    collectionsStore.fetchSingerInfo(newMid).then(result => {
      info.value = result
    })
  }
})

function handleSingerDetail(singerMid) {
  if (!info.value) return
  router.push(`/singerDetail/${singerMid}`)
}
</script>

<template>
  <!-- Card Style (轻质感卡片) -->
  <div v-if="type === 'card'" :class="cn(
    'eno-singer-card group cursor-pointer w-44 flex-shrink-0 animate-slide-in-up',
    props.class
  )" @click.stop="handleSingerDetail(singerMid)">
    <template>
      <div class="eno-singer-card__media">
        <img :src="avatar" alt="singerAvatar" class="eno-singer-card__img">
      </div>
      <div class="eno-singer-card__content">
        <div class="eno-singer-card__name">{{ name }}</div>
        <div class="eno-singer-card__desc">{{ desc }}</div>
      </div>
    </template>
  </div>

  <!-- Simple List Style (侧边栏简单列表) -->
  <div v-else-if="type === 'simple'" :class="cn(
    'flex items-center gap-3 p-2 rounded hover:bg-[#1a1a1a] cursor-pointer transition-all duration-300 group animate-slide-in-left hover:scale-102',
    props.class
  )" @click.stop="handleSingerDetail(singerMid)">
    <template v-if="info">
      <img :src="avatar" class="w-12 h-12 rounded-md object-cover">
      <div class="flex flex-col overflow-hidden">
        <span class="text-white font-medium truncate text-sm">{{ name }}</span>
        <span class="text-xs text-[#a7a7a7] truncate">{{ desc }}</span>
      </div>
    </template>
    <template v-else>
      <div class="w-12 h-12 rounded-md bg-white/5 animate-pulse flex-shrink-0" />
      <div class="flex flex-col gap-1 flex-1">
        <div class="h-3 w-20 bg-white/5 rounded animate-pulse" />
        <div class="h-2 w-12 bg-white/5 rounded animate-pulse" />
      </div>
    </template>
  </div>

  <!-- Modern Card Style (轻质感卡片) -->
  <div v-else-if="type === 'card-modern'" :class="cn(
    'eno-singer-card-modern group cursor-pointer',
    props.class
  )" @click.stop="handleSingerDetail(singerMid)">
    <template v-if="info">
      <div class="eno-singer-card-modern__content">
        <div class="eno-singer-card-modern__avatar">
          <img :src="avatar" alt="singerAvatar" class="eno-singer-card-modern__img">
        </div>
        <div class="eno-singer-card-modern__name">{{ name }}</div>
        <div class="eno-singer-card-modern__desc">{{ desc }}</div>
      </div>
    </template>
    <template v-else>
      <div class="eno-singer-card-modern__skeleton" />
      <div class="flex flex-col items-center gap-2 w-full">
        <div class="h-4 w-24 bg-white/5 rounded animate-pulse" />
        <div class="h-3 w-16 bg-white/5 rounded animate-pulse" />
      </div>
    </template>
  </div>

  <!-- Old List Style (兼容旧的列表样式，如果需要) -->
  <div v-else :class="cn(
    'flex flex-shrink-0 items-center justify-between w-80 h-20 rounded-lg px-4 bg-[#181818] hover:bg-[#282828] transition-all duration-300 cursor-pointer group animate-slide-in-left hover:scale-102',
    props.class
  )" @click.stop="handleSingerDetail(singerMid)">
    <template v-if="info">
      <div class="flex items-center space-x-4">
        <img :src="avatar" alt="singerAvatar" class="w-13 h-13 rounded-full object-cover shadow-sm">
        <div class="flex flex-col">
          <div class="text-[16px] font-medium tracking-wide text-white">
            {{ name }}
          </div>
          <div class="text-[11px] text-gray-400/80 mt-0.5">
            {{ desc }}
          </div>
        </div>
      </div>

      <div class="flex items-center gap-3 transition-opacity duration-200 opacity-0 group-hover:opacity-100">
        <div v-if="canDel"
          class="i-mingcute:delete-line w-[18px] h-[18px] text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
          @click.stop="collectionsStore.removeSinger(singerMid)" />
      </div>
    </template>
    <template v-else>
      <div class="flex items-center space-x-4 w-full">
        <div class="w-13 h-13 rounded-full bg-white/5 animate-pulse flex-shrink-0" />
        <div class="flex flex-col gap-2 flex-1">
          <div class="h-4 w-24 bg-white/5 rounded animate-pulse" />
          <div class="h-3 w-16 bg-white/5 rounded animate-pulse" />
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slideInLeft {
  from {
    opacity: 0;
    transform: translateX(-10px);
  }

  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.animate-slide-in-up {
  animation: slideInUp 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
}

.animate-slide-in-left {
  animation: slideInLeft 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
}

.eno-singer-card {
  padding: 12px;
  border-radius: 16px;
  background: rgba(24, 24, 24, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.06);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.3);
  transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
}

.eno-singer-card:hover {
  transform: translateY(-2px);
  border-color: rgba(255, 255, 255, 0.12);
  box-shadow: 0 16px 32px rgba(0, 0, 0, 0.4);
}

.eno-singer-card__media {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.04);
}

.eno-singer-card__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.6s ease;
}

.eno-singer-card:hover .eno-singer-card__img {
  transform: scale(1.06);
}

.eno-singer-card__content {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-top: 10px;
}

.eno-singer-card__name {
  font-size: 14px;
  font-weight: 700;
  color: #fff;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.eno-singer-card__desc {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.eno-singer-card-modern {
  position: relative;
  height: 220px;
  width: 100%;
  padding: 16px;
  border-radius: 18px;
  background: rgba(24, 24, 24, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.06);
  overflow: hidden;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.35);
  transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
}

.eno-singer-card-modern:hover {
  transform: translateY(-2px);
  border-color: rgba(255, 255, 255, 0.12);
  box-shadow: 0 18px 36px rgba(0, 0, 0, 0.45);
}

.eno-singer-card-modern__content {
  position: relative;
  z-index: 1;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.eno-singer-card-modern__avatar {
  position: relative;
  width: 92px;
  height: 92px;
  border-radius: 999px;
  overflow: hidden;
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.35);
}

.eno-singer-card-modern__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s ease;
}

.eno-singer-card-modern:hover .eno-singer-card-modern__img {
  transform: scale(1.08);
}

.eno-singer-card-modern__name {
  font-size: 15px;
  font-weight: 700;
  color: #fff;
  text-align: center;
  line-height: 1.2;
}

.eno-singer-card-modern__desc {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.55);
  text-align: center;
  line-height: 1.2;
}

.eno-singer-card-modern__skeleton {
  width: 96px;
  height: 96px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
  animation: pulse 1.4s ease-in-out infinite;
  margin: 10px auto 14px;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 0.6;
  }
  50% {
    opacity: 1;
  }
}
</style>
