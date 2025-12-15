<script setup lang="ts">
import { ref, reactive, inject, watch } from 'vue'
import Message from '~/components/message'
import Dialog from '~/components/dialog/index.vue'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const userInfo = inject('userInfo', ref({})) as any

const biliLogin = reactive({
  oauthKey: '',
  qrUrl: '',
  status: 'idle' as 'idle' | 'pending' | 'scanned' | 'confirmed' | 'failed',
  message: '',
})

let pollTimer: any = null

function close() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
  // 重置状态
  biliLogin.status = 'idle'
  biliLogin.message = ''
  biliLogin.qrUrl = ''
  biliLogin.oauthKey = ''
  emit('update:modelValue', false)
}

async function startBiliQrLogin() {
  if (pollTimer) clearInterval(pollTimer)

  biliLogin.status = 'pending'
  biliLogin.message = '请扫码...'
  try {
    const gen = await (window as any).ipcRenderer?.invoke('bili-qr-generate')
    if (!gen || gen.error) {
      biliLogin.status = 'failed'
      biliLogin.message = gen?.error || '生成二维码失败'
      return
    }
    biliLogin.oauthKey = gen.oauthKey
    biliLogin.qrUrl = gen.qrImage || gen.url
    let pollCount = 0
    const maxRetries = 120

    pollTimer = setInterval(async () => {
      pollCount++
      if (pollCount > maxRetries) {
        biliLogin.status = 'failed'
        biliLogin.message = '扫码超时，请重新生成二维码'
        clearInterval(pollTimer)
        return
      }
      const res = await (window as any).ipcRenderer?.invoke('bili-qr-poll', biliLogin.oauthKey)
      if (!res) {
        biliLogin.message = '网络连接失败，重试中...'
        return
      }
      if (res.message) {
        biliLogin.message = res.message
      }
      biliLogin.status = res.status

      if (res.status === 'confirmed') {
        biliLogin.message = '登录成功'
        clearInterval(pollTimer)
        // 触发全局更新
        await (window as any).ipcRenderer?.invoke('bili-user-info')
        setTimeout(() => {
          close()
        }, 1000)
      } else if (res.status === 'scanned') {
        biliLogin.message = '已扫码，请在手机上确认...'
      } else if (res.status === 'failed') {
        clearInterval(pollTimer)
      }
    }, 1500)
  } catch (error) {
    console.error('QR login error:', error)
    biliLogin.status = 'failed'
    biliLogin.message = '生成二维码出错'
  }
}

async function logoutBili() {
  try {
    await (window as any).ipcRenderer?.invoke('bili-logout')
    Message.show({
      type: 'success',
      message: '已退出登录',
    })
    close()
  } catch (error) {
    Message.show({
      type: 'error',
      message: '退出登录失败',
    })
  }
}

// 监听弹窗打开，如果是未登录状态自动开始扫码
watch(() => props.modelValue, (val) => {
  if (val && !userInfo.value?.isLogin) {
    startBiliQrLogin()
  } else if (!val) {
    if (pollTimer) {
      clearInterval(pollTimer)
      pollTimer = null
    }
  }
})
</script>

<template>
  <Dialog :open="modelValue" :title="userInfo?.isLogin ? '账号信息' : '扫码登录'" class="w-[360px]"
    @visibleChange="(val) => !val && close()">
    <!-- 内容区 -->
    <div class="py-2">
      <!-- 已登录状态 -->
      <div v-if="userInfo?.isLogin" class="flex flex-col items-center">
        <img :src="userInfo.face" class="w-20 h-20 rounded-full border-2 border-[#333] mb-4" />
        <h4 class="text-xl font-bold text-white mb-2">{{ userInfo.uname }}</h4>
        <div class="flex gap-4 text-sm text-gray-400 mb-8">
          <div class="flex flex-col items-center">
            <span class="text-white font-bold">{{ userInfo.level_info?.current_level || '-' }}</span>
            <span>等级</span>
          </div>
          <div class="flex flex-col items-center">
            <span class="text-white font-bold">{{ userInfo.money || 0 }}</span>
            <span>硬币</span>
          </div>
        </div>
        <button
          class="w-full py-2.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 font-medium transition-colors"
          @click="logoutBili">
          退出登录
        </button>
      </div>

      <!-- 未登录状态 -->
      <div v-else class="flex flex-col items-center">
        <div class="w-48 h-48 bg-white rounded-xl p-2 mb-4 flex items-center justify-center relative">
          <img v-if="biliLogin.qrUrl" :src="biliLogin.qrUrl" class="w-full h-full object-contain" />
          <div v-else class="w-8 h-8 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />

          <!-- 遮罩状态 -->
          <div v-if="biliLogin.status === 'scanned'"
            class="absolute inset-0 bg-white/90 flex flex-col items-center justify-center rounded-xl">
            <div class="i-mingcute:check-circle-fill text-4xl text-green-500 mb-2" />
            <span class="text-gray-800 font-medium">扫描成功</span>
            <span class="text-gray-500 text-sm">请在手机上确认</span>
          </div>

          <div v-if="biliLogin.status === 'confirmed'"
            class="absolute inset-0 bg-white/90 flex flex-col items-center justify-center rounded-xl">
            <div class="i-mingcute:check-circle-fill text-4xl text-green-500 mb-2" />
            <span class="text-gray-800 font-medium">登录成功</span>
          </div>

          <div v-if="biliLogin.status === 'failed'"
            class="absolute inset-0 bg-white/90 flex flex-col items-center justify-center rounded-xl cursor-pointer"
            @click="startBiliQrLogin">
            <div class="i-mingcute:refresh-line text-4xl text-red-500 mb-2" />
            <span class="text-gray-800 font-medium">点击刷新</span>
          </div>
        </div>

        <p class="text-gray-400 text-sm mb-6">{{ biliLogin.message }}</p>

        <div class="text-xs text-gray-500 text-center">
          请使用 <span class="text-[#00aeec]">哔哩哔哩客户端</span> 扫码登录
        </div>
      </div>
    </div>
  </Dialog>
</template>
