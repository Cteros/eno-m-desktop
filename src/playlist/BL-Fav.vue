<script lang="ts" setup>
import { usePlaylistStore } from '~/playlist/store'
import { computed } from 'vue'
import { useRouter } from 'vue-router'

const props = defineProps<{
  fav: fav
  tag?: string
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
  name?: string
  intro?: string
  season_id?: number
  series_id?: number
  type?: string
  [key: string]: any
}

function handleCardClick() {
  if (props.tag === 'collected') {
    const id = props.fav.id
    const mid = props.fav.mid
    if (!id || !mid) return
    router.push({
      name: 'collectionDetail',
      params: { collectionId: String(id) },
      query: { mid: String(mid), type: 'collection' }
    })
  } else {
    router.push({
      name: 'favDetail',
      params: { favId: props.fav.id }
    })
  }
}

const cover = computed(() => {
  const id = String(props.fav.id)
  return PLStore.favInfoCache[id]?.cover || ''
})

const coverStyle = computed(() => ({
  backgroundImage: cover.value ? `url("${cover.value}")` : 'none'
}))
</script>

<template>
  <article class="fav-card" @click="handleCardClick">
    <div class="fav-card__image" :style="coverStyle">
      <div v-if="!cover" class="fav-card__fallback">
        <div class="i-mingcute:album-fill" />
      </div>
      <button class="fav-card__play" type="button" @click.stop="handleCardClick">
        <div class="i-mingcute:play-fill" />
      </button>
      <div class="fav-card__shade" />
    </div>
    <div class="fav-card__content">
      <h3 v-html="props.fav.title || props.fav.name" />
      <p>{{ props.fav.media_count || 0 }} 个视频</p>
    </div>
  </article>
</template>

<style scoped>
.fav-card {
  position: relative;
  width: 220px;
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

.fav-card:hover {
  transform: translateY(-3px);
  border-color: var(--eno-accent-soft);
  box-shadow: 0 0 0 1px var(--eno-accent-soft), 0 18px 54px var(--eno-glow-strong);
}

.fav-card__image {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
  transition: transform 0.28s ease, filter 0.28s ease;
}

.fav-card:hover .fav-card__image {
  transform: scale(1.035);
  filter: saturate(1.08);
}

.fav-card__fallback {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.24);
  font-size: 64px;
  background:
    radial-gradient(circle at 35% 24%, rgba(255, 255, 255, 0.06), transparent 32%),
    radial-gradient(circle at 70% 70%, rgba(255, 255, 255, 0.04), transparent 34%),
    #111423;
}

.fav-card__shade {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(6, 8, 20, 0) 35%, rgba(7, 9, 20, 0.72) 72%, rgba(8, 10, 23, 0.96) 100%);
}

.fav-card__play {
  position: absolute;
  z-index: 3;
  right: 18px;
  bottom: 76px;
  width: 44px;
  height: 44px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: rgba(255, 255, 255, 0.9);
  background: rgba(19, 20, 38, 0.58);
  backdrop-filter: blur(16px);
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.3);
  transition: transform 0.2s ease, background 0.2s ease, color 0.2s ease, border-color 0.2s ease;
}

.fav-card__play:hover {
  transform: scale(1.06);
  color: #fff;
  background: rgba(255, 255, 255, 0.18);
  border-color: rgba(255, 255, 255, 0.52);
}

.fav-card__content {
  position: absolute;
  z-index: 2;
  left: 18px;
  right: 18px;
  bottom: 18px;
  min-width: 0;
}

.fav-card__content h3 {
  margin: 0 0 4px;
  overflow: hidden;
  color: #fff;
  font-size: 15px;
  font-weight: 700;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-shadow: 0 2px 14px rgba(0, 0, 0, 0.42);
}

.fav-card__content p {
  margin: 0;
  color: rgba(225, 229, 255, 0.64);
  font-size: 12px;
  font-weight: 500;
  text-shadow: 0 1px 8px rgba(0, 0, 0, 0.3);
}
</style>
