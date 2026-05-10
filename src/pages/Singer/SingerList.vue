<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { playCoreStore } from '~/playcore/store'
import SingerItem from '~/components/SingerItem.vue'

const route = useRoute()
const router = useRouter()
const store = playCoreStore()

const selectedTagId = ref(null)
const listKey = ref(0)

const tagidFromRoute = computed(() => {
  return route.query.tagid ? Number(route.query.tagid) : null
})

watch(() => tagidFromRoute.value, (newTagId) => {
  selectedTagId.value = newTagId
  listKey.value++
}, { immediate: true })

const currentFollowers = computed(() => {
  if (selectedTagId.value === null) {
    return store.allFollowersCache
  } else {
    return store.getFollowersByTag(selectedTagId.value)
  }
})

watch(() => selectedTagId.value, (newTagId) => {
  store.setCurrentTag(newTagId)
})

const syncData = async () => {
  if (store.isSyncing) return

  try {
    if (selectedTagId.value === null) {
      await store.fetchFollowingTags()
      await store.fetchAllFollowers()
    } else {
      await store.fetchFollowersByTag(selectedTagId.value)
    }
    listKey.value++
  } catch (error) {
    console.error('Failed to sync:', error)
  }
}

watch(() => selectedTagId.value, () => {
  syncData()
})

onMounted(() => {
  syncData()
})
</script>

<template>
  <div class="singer-page">
    <section class="singer-page__main">
      <div v-if="store.isLoadingFollowers" class="singer-loading">
        <div class="animate-spin i-mingcute:loading-3-line" />
        <p>加载中...</p>
      </div>

      <div v-else-if="currentFollowers.length > 0" class="singer-grid">
        <SingerItem v-for="singer in currentFollowers" :key="`${listKey}-${singer.mid}`"
          :singer-mid="String(singer.mid)" :singer-info="singer" type="card-modern" />
      </div>

      <div v-else class="singer-empty">
        <div class="i-mingcute:user-star-line" />
        <h3>暂无音乐人</h3>
        <p class="text-body-small">该分组下暂无关注的音乐人</p>
      </div>
    </section>
  </div>
</template>

<style scoped>
.singer-page {
  width: 100%;
  height: 100%;
  overflow: hidden;
  color: rgba(236, 241, 255, 0.86);

}

.singer-page__main {
  height: 100%;
  overflow: auto;
  padding: 22px;
}

.singer-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
  gap: 24px;
  padding-bottom: 100px;
}

.discover-card {
  height: 250px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  border: 1px dashed rgba(145, 163, 226, 0.25);
  border-radius: 14px;
  color: rgba(230, 235, 255, 0.7);
  background:
    radial-gradient(circle at 50% 36%, rgba(116, 73, 255, 0.12), transparent 34%),
    rgba(7, 10, 24, 0.58);
  cursor: pointer;
}

.discover-card span {
  width: 54px;
  height: 54px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  color: #fff;
  font-size: 30px;
  background: rgba(255, 255, 255, 0.08);
}

.discover-card strong {
  margin-top: 8px;
  color: rgba(255, 255, 255, 0.86);
}

.discover-card small {
  color: rgba(220, 226, 255, 0.48);
}

.singer-loading,
.singer-empty {
  min-height: 360px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: rgba(220, 226, 255, 0.58);
}

.singer-loading>div,
.singer-empty>div {
  margin-bottom: 14px;
  font-size: 46px;
}

.singer-empty h3 {
  margin: 0 0 8px;
  color: #fff;
  font-size: 20px;
}

@media (max-width: 820px) {
  .singer-page__main {
    padding: 14px;
  }

  .singer-grid {
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  }
}
</style>
