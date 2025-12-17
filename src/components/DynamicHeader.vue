<script setup lang="ts">
defineProps<{
  imgSrc: string
  title: string
  color: string
  isScrolled: boolean
}>()

const keyword = defineModel('keyword', { type: String, default: '' })

const emit = defineEmits(['play', 'search', 'open-external'])
</script>

<template>
  <div class="shrink-0 top-0 absolute z-20 w-full need-ease overflow-hidden" :class="isScrolled
    ? 'h-[72px] bg-[#121212]/95 backdrop-blur-xl'
    : 'h-[320px] bg-transparent'">

    <!-- 头像 -->
    <div class="absolute z-20 overflow-hidden need-ease" :class="isScrolled
      ? 'left-4 top-3 w-12 h-12 rounded-md'
      : 'left-8 top-10 w-44 h-44 rounded-2xl'">
      <img :src="imgSrc" class="relative w-full h-full object-cover shadow-2xl z-10 need-ease">
    </div>

    <!-- 标题区域 -->
    <div class="absolute right-8 flex flex-col gap-4 origin-left need-ease"
      :class="isScrolled ? ' pointer-events-none scale-40 top-3 left-20' : 'text-lg top-32 left-55'">
      <h1 class="text-5xl font-black text-white tracking-tight flex items-center gap-4 group cursor-pointer">
        {{ title }}
        <button @click="emit('open-external')" title="在新窗口打开"
          class="text-gray-400 hover:text-white transition-colors opacity-0 group-hover:opacity-100">
          <div class="i-mingcute:external-link-line text-2xl" />
        </button>
      </h1>
    </div>

    <!-- 自定义操作区域 (统计 & 关注) -->
    <div class="flex items-center gap-6 text-sm text-gray-300 font-medium mt-2 absolute left-57 bottom-25 need-ease"
      :class="isScrolled ? 'translate-y-100 pointer-events-none scale-95' : 'translate-y-0 scale-100'">
      <slot name="actions" />
    </div>

    <!-- 播放按钮 -->
    <div class="absolute need-ease z-1" :class="isScrolled
      ? 'right-4 top-1/2 -translate-y-1/2 scale-75'
      : 'right-8 top-24 scale-100'">
      <button
        class="w-14 h-14 rounded-full flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform"
        :style="{ backgroundColor: color }" @click="emit('play')" title="播放全部">
        <div class="i-mingcute:play-fill text-3xl text-black ml-1" />
      </button>
    </div>

    <!-- 搜索栏 -->
    <div class="absolute bottom-6 left-8 right-8 max-w-md need-ease"
      :class="isScrolled ? 'opacity-0 translate-y-10 pointer-events-none' : 'opacity-100 translate-y-0'">
      <div class="relative group">
        <div
          class="i-mingcute:search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-white transition-colors" />
        <input v-model="keyword" placeholder="搜索歌曲..."
          class="w-full h-10 bg-[#ffffff1a] hover:bg-[#ffffff2a] focus:bg-[#333] rounded-lg pl-10 pr-4 text-sm text-white outline-none  border border-transparent focus:border-[#1db954]"
          @keyup.enter="emit('search', keyword)" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.need-ease {
  transition: all 0.5s;
  transition-timing-function: cubic-bezier(0.25, 0.8, 0.25, 1);
}
</style>
