<script setup lang="ts">
import { useCollectionsStore } from '../playcore/stores/collections'
import { useRouter } from 'vue-router'
import { computed, onMounted, ref, watch } from 'vue'

const props = defineProps({
  singerMid: String,
  singerInfo: {
    type: Object,
    default: null,
  },
  canDel: {
    type: Boolean,
    default: false,
  },
  type: {
    type: String,
    default: 'card',
  },
  class: {
    type: String,
    default: '',
  },
})

const router = useRouter()
const collectionsStore = useCollectionsStore()
const info = ref<Record<string, any> | null>(props.singerInfo || null)
const avatar = computed(() => info.value?.face || '')
const name = computed(() => info.value?.uname || info.value?.name || '')

onMounted(() => {
  if (info.value)
    return

  if (props.singerMid) {
    collectionsStore.fetchSingerInfo(props.singerMid).then((result) => {
      info.value = result
    })
  }
})

watch(() => props.singerInfo, (newInfo) => {
  if (newInfo)
    info.value = newInfo
})

watch(() => props.singerMid, (newMid) => {
  if (props.singerInfo)
    return

  if (newMid) {
    collectionsStore.fetchSingerInfo(newMid).then((result) => {
      info.value = result
    })
  }
})

function handleSingerDetail(singerMid?: string) {
  if (!info.value || !singerMid)
    return
  router.push(`/singerDetail/${singerMid}`)
}
</script>

<template>
  <div
    :class="['singer-card', props.class]"
    @click.stop="handleSingerDetail(singerMid)"
  >
    <div class="avatar-wrap">
      <img
        v-if="avatar"
        :src="avatar"
        alt="singerAvatar"
        class="singer-avatar"
      >
      <div v-else class="singer-avatar singer-avatar--empty">
        <div class="i-mingcute:user-star-fill" />
      </div>
      <button
        type="button"
        class="play-btn"
        @click.stop="handleSingerDetail(singerMid)"
      >
        <div class="i-mingcute:play-fill" />
      </button>
    </div>
    <div class="singer-name">
      {{ name || '未知音乐人' }}
    </div>
    <div class="singer-desc">
      艺人
    </div>
  </div>
</template>

<style scoped>
.singer-card {
  width: 180px;
  max-width: 100%;
  padding: 16px;
  border-radius: 8px;
  background: #181818;
  cursor: pointer;
  transition: background-color 0.16s var(--eno-ease);
}

.singer-card:hover {
  background: #282828;
}

.avatar-wrap {
  position: relative;
  margin-bottom: 16px;
}

.singer-avatar {
  width: 100%;
  aspect-ratio: 1;
  border-radius: 50%;
  object-fit: cover;
  box-shadow: 0 8px 24px rgb(0 0 0 / 50%);
}

.singer-avatar--empty {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #7c7c7c;
  font-size: 48px;
  background: #282828;
}

.play-btn {
  position: absolute;
  right: 8px;
  bottom: 8px;
  display: none;
  width: 48px;
  height: 48px;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 50%;
  color: #000;
  background: #1ed760;
  font-size: 22px;
  box-shadow: 0 8px 16px rgb(0 0 0 / 40%);
  cursor: pointer;
}

.singer-card:hover .play-btn {
  display: inline-flex;
}

.play-btn:hover {
  transform: scale(1.05);
  background: #3be477;
}

.singer-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 16px;
  font-weight: 700;
  color: #fff;
}

.singer-desc {
  margin-top: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 14px;
  color: #b3b3b3;
}
</style>
