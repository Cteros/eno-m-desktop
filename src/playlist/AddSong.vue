<script setup>
import { usePlaylistStore } from './store'
import { Dialog } from '@cloudfly/eno-ui'

const PLStore = usePlaylistStore()

function handleAddSongToFav(fav) {
  PLStore.addSongToFav(fav.id)
}
</script>

<template>
  <Dialog :open="PLStore.addSongDialog" title="添加到" @visible-change="vis => PLStore.addSongDialog = vis">
    <div class="flex flex-col text-left gap-1 max-h-[400px] overflow-y-auto scrollbar-styled pr-2">
      <!-- 稍后播放 -->
      <section
        class="w-full cursor-pointer flex justify-between items-center
          opacity-75 hover:opacity-100 px-3 py-2 rounded hover:bg-[#ffffff1a] transition-colors
        " @click.stop="PLStore.addSongToListenLater"
      >
        <h2 class="w-full text-base truncate flex items-center gap-3 text-white">
          <div class="i-mingcute:time-fill w-5 h-5 text-[#1db954]" />
          稍后播放
        </h2>
      </section>

      <div class="h-px bg-[#333] my-2 mx-3"></div>

      <!-- Bilibili 收藏夹 -->
      <div v-if="PLStore.favList.length" class="px-3 text-xs text-gray-500 mb-1">我的收藏夹</div>
      <section
        v-for="fav in PLStore.favList" :key="fav.id" 
        class="w-full cursor-pointer flex justify-between items-center
          opacity-75 hover:opacity-100 px-3 py-2 rounded hover:bg-[#ffffff1a] transition-colors
        " @click.stop="handleAddSongToFav(fav)"
      >
        <h2 class="w-full text-base truncate flex items-center gap-3 text-white">
          <div class="i-mingcute:folder-fill w-5 h-5 text-gray-400" />
          <span class="truncate">{{ fav.title }}</span>
          <span class="text-xs text-gray-500 ml-auto">{{ fav.media_count }}</span>
        </h2>
      </section>
      
      <div v-if="!PLStore.favList.length" class="px-3 py-4 text-center text-gray-500 text-sm">
        暂无创建的收藏夹
      </div>
    </div>
  </Dialog>
</template>
