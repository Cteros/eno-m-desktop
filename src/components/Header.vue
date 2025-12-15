<script setup lang="ts">
import { useRouter } from 'vue-router'
import { inject, ref } from 'vue'
import LoginDialog from './LoginDialog.vue'

const router = useRouter()
const userInfo = inject('userInfo', null) as any
const showLoginDialog = ref(false)

function goBack() {
  router.back()
}

function goForward() {
  router.forward()
}
</script>

<template>
  <div class="flex items-center gap-4 h-16 px-6 sticky top-0 z-10 bg-transparent">
    <div class="flex gap-2">
      <button
        class="w-8 h-8 rounded-full bg-black/50 flex items-center justify-center cursor-pointer hover:bg-black/70 text-white transition-colors"
        @click="goBack">
        <div class="i-mingcute:left-line text-xl" />
      </button>
      <button
        class="w-8 h-8 rounded-full bg-black/50 flex items-center justify-center cursor-pointer hover:bg-black/70 text-white transition-colors"
        @click="goForward">
        <div class="i-mingcute:right-line text-xl" />
      </button>
    </div>
    <!-- 这里可以预留搜索框或者用户信息的位置 -->
    <div class="flex-1" />

    <!-- 用户信息/登录按钮 -->
    <div class="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
      @click="showLoginDialog = true">
      <template v-if="userInfo?.isLogin">
        <img :src="userInfo?.face" alt="avatar" class="w-8 h-8 rounded-full border border-[#333]" />
        <span class="text-white text-sm">{{ userInfo?.uname }}</span>
      </template>
      <template v-else>
        <div class="w-8 h-8 rounded-full bg-[#282828] flex items-center justify-center border border-[#333]">
          <div class="i-mingcute:user-3-line text-gray-400" />
        </div>
        <span class="text-gray-400 text-sm">未登录</span>
      </template>
    </div>

    <!-- 登录弹窗 -->
    <LoginDialog v-model="showLoginDialog" />
  </div>
</template>
