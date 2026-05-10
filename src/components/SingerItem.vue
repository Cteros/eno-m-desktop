<script setup>
import { useCollectionsStore } from '../playcore/stores/collections'

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
const collectionsStore = useCollectionsStore()
const info = ref(props.singerInfo || null)
const avatar = computed(() => info.value?.face || '')
const name = computed(() => info.value?.uname || '')
const seed = computed(() => {
  const source = String(props.singerMid || name.value || 'eno')
  return source.split('').reduce((total, char) => total + char.charCodeAt(0), 0)
})
const listeners = computed(() => {
  const value = 23 + (seed.value % 170)
  const fraction = seed.value % 10
  return `${value}.${fraction}K`
})
const statusClass = computed(() => {
  const classes = ['status-online', 'status-new', 'status-idle', 'status-live']
  return classes[seed.value % classes.length]
})
const isFeatured = computed(() => seed.value % 5 === 0)
const avatarStyle = computed(() => ({
  backgroundImage: avatar.value ? `url("${avatar.value}")` : 'none'
}))

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
  <article :class="['singer-card-modern', props.class]" @click="handleSingerDetail(singerMid)">
    <div class="singer-card-modern__image" :style="avatarStyle">
      <div v-if="!avatar" class="singer-card-modern__fallback">
        <div class="i-mingcute:user-star-fill" />
      </div>
      <button class="singer-card-modern__play" type="button" @click.stop="handleSingerDetail(singerMid)">
        <div class="i-mingcute:play-fill" />
      </button>
      <div class="singer-card-modern__shade" />
    </div>
    <div class="singer-card-modern__content">
      <h3>{{ name || '未知音乐人' }}</h3>
    </div>
  </article>
</template>

<style scoped>
.singer-card-modern {
  position: relative;
  width: 100%;
  min-width: 0;
  height: 250px;
  overflow: hidden;
  cursor: pointer;
  border-radius: 14px;
  background: linear-gradient(180deg, rgba(28, 31, 52, 0.82), rgba(10, 13, 28, 0.94));
  border: 1px solid var(--eno-border);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06), 0 18px 45px rgba(0, 0, 0, 0.24);
  transition: transform 0.22s ease, border-color 0.22s ease, box-shadow 0.22s ease;
}

.singer-card-modern:hover {
  transform: translateY(-3px);
  border-color: var(--eno-accent-soft);
  box-shadow: 0 0 0 1px var(--eno-accent-soft), 0 18px 54px var(--eno-glow-strong);
}

.singer-card-modern__image {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
  transition: transform 0.28s ease, filter 0.28s ease;
}

.singer-card-modern:hover .singer-card-modern__image {
  transform: scale(1.035);
  filter: saturate(1.08);
}

.singer-card-modern__fallback {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.24);
  font-size: 72px;
  background:
    radial-gradient(circle at 35% 24%, rgba(255, 255, 255, 0.06), transparent 32%),
    radial-gradient(circle at 70% 70%, rgba(255, 255, 255, 0.04), transparent 34%),
    #111423;
}

.singer-card-modern__shade {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(6, 8, 20, 0) 35%, rgba(7, 9, 20, 0.72) 72%, rgba(8, 10, 23, 0.96) 100%);
}

.singer-card-modern__badge {
  position: absolute;
  top: 14px;
  left: 14px;
  z-index: 2;
  padding: 4px 9px;
  border-radius: 999px;
  color: #fff;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0;
  background: rgba(255, 255, 255, 0.12);
  box-shadow: 0 8px 22px rgba(0, 0, 0, 0.24);
}

.singer-card-modern__status {
  position: absolute;
  top: 14px;
  left: 14px;
  z-index: 2;
  width: 12px;
  height: 12px;
  border-radius: 999px;
  border: 2px solid rgba(14, 16, 32, 0.74);
  box-shadow: 0 0 14px currentColor;
}

.singer-card-modern__badge+.singer-card-modern__status {
  left: auto;
  right: 14px;
}

.status-online {
  color: #65e889;
  background: #65e889;
}

.status-new {
  color: #ff59c7;
  background: #ff59c7;
}

.status-idle {
  color: #4da3ff;
  background: #4da3ff;
}

.status-live {
  color: #ba56ff;
  background: #ba56ff;
}

.singer-card-modern__heart,
.singer-card-modern__play {
  position: absolute;
  z-index: 3;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: rgba(255, 255, 255, 0.9);
  background: rgba(19, 20, 38, 0.58);
  backdrop-filter: blur(16px);
  transition: transform 0.2s ease, background 0.2s ease, color 0.2s ease, border-color 0.2s ease;
}

.singer-card-modern__heart {
  top: 14px;
  right: 14px;
  width: 34px;
  height: 34px;
  border-radius: 999px;
  font-size: 18px;
  opacity: 0;
}

.singer-card-modern:hover .singer-card-modern__heart {
  opacity: 1;
}

.singer-card-modern__heart:hover {
  color: var(--eno-accent);
  border-color: var(--eno-accent-soft);
}

.singer-card-modern__play {
  right: 18px;
  bottom: 76px;
  width: 48px;
  height: 48px;
  border-radius: 999px;
  font-size: 26px;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.3);
}

.singer-card-modern__play:hover {
  transform: scale(1.06);
  color: #fff;
  background: rgba(255, 255, 255, 0.18);
  border-color: rgba(255, 255, 255, 0.52);
}

.singer-card-modern__content {
  position: absolute;
  z-index: 2;
  left: 18px;
  right: 74px;
  bottom: 18px;
  min-width: 0;
}

.singer-card-modern__content h3 {
  margin: 0 0 6px;
  overflow: hidden;
  color: #fff;
  font-size: 18px;
  font-weight: 800;
  line-height: 1.18;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-shadow: 0 2px 14px rgba(0, 0, 0, 0.42);
}

.singer-card-modern__content p,
.singer-card-modern__meta {
  color: rgba(225, 229, 255, 0.64);
  font-size: 13px;
}

.singer-card-modern__content p {
  margin: 0 0 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.singer-card-modern__meta {
  display: flex;
  align-items: center;
  gap: 6px;
}
</style>
