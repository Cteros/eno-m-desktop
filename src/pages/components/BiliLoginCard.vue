<script setup lang="ts">
import { ref, reactive } from 'vue'
import { MessageAPI } from '@cloudfly/eno-ui'

interface Props {
  user: { isLogin: boolean; uname?: string; face?: string } | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  login: []
  logout: []
}>()

const biliLogin = reactive({
  oauthKey: '',
  qrUrl: '',
  status: 'idle' as 'idle' | 'pending' | 'scanned' | 'confirmed' | 'failed',
  message: '',
})

async function startBiliQrLogin() {
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
    const timer = setInterval(async () => {
      pollCount++
      if (pollCount > maxRetries) {
        biliLogin.status = 'failed'
        biliLogin.message = '扫码超时，请重新生成二维码'
        clearInterval(timer)
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
        biliLogin.message = '登录成功，已获得 Cookie'
        clearInterval(timer)
        emit('login')
        setTimeout(() => {
          biliLogin.status = 'idle'
          biliLogin.message = ''
          biliLogin.qrUrl = ''
          biliLogin.oauthKey = ''
        }, 1000)
      } else if (res.status === 'scanned') {
        biliLogin.message = '已扫码，请在手机上确认...'
      } else if (res.status === 'pending') {
        // pending 状态继续轮询
      } else if (res.status === 'failed') {
        clearInterval(timer)
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
    emit('logout')
    MessageAPI.show({
      type: 'success',
      message: '已退出登录',
    })
  } catch (error) {
    MessageAPI.show({
      type: 'error',
      message: '退出登录失败',
    })
  }
}
</script>

<template>
  <div class="card-base card-hover card-interactive rounded-2xl p-8 mb-8">
    <div class="card-overlay rounded-2xl" />
    <div class="card-glow" />
    <div class="relative z-20">
      <div class="flex items-center gap-3 mb-8">
        <div class="w-2 h-8 bg-gradient-to-b from-[#667eea] to-transparent rounded-full" />
        <h2 class="text-heading-1">B站扫码登录</h2>
      </div>
      <p class="text-text-secondary mb-4">用于获取登录后的 Cookie，以便调用需要登录的接口。</p>
      
      <!-- 已登陆状态 -->
      <div v-if="props.user?.isLogin">
        <div class="p-3 bg-[#1a1a1a] border border-[#404040] rounded flex items-center gap-3">
          <img :src="props.user?.face" alt="avatar" class="w-10 h-10 rounded-full border border-[#333]" />
          <div>
            <p class="text-white text-sm">{{ props.user?.uname }}</p>
            <p class="text-text-tertiary text-xs">已登录</p>
          </div>
          <button class="btn-secondary ml-auto" @click="logoutBili">
            <span>退出登录</span>
          </button>
        </div>
      </div>
      
      <!-- 空闲状态 -->
      <div v-else-if="biliLogin.status === 'idle'">
        <button class="btn-primary" @click="startBiliQrLogin">
          <div class="flex items-center gap-2">
            <span class="i-mingcute:qrcode-2-line" />
            <span>生成二维码并开始登录</span>
          </div>
        </button>
      </div>
      
      <!-- 登陆中状态 -->
      <div v-else>
        <div class="flex items-center justify-between mb-3">
          <span class="text-sm text-text-tertiary">状态：</span>
          <span class="text-sm text-white">{{ biliLogin.status }}</span>
        </div>
        <p v-if="biliLogin.message" class="text-xs text-text-secondary mb-3">{{ biliLogin.message }}</p>
        <div v-if="biliLogin.qrUrl" class="flex justify-center">
          <img :src="biliLogin.qrUrl" alt="Bili QR" class="w-[220px] h-[220px] rounded-lg border border-[#404040]" />
        </div>
      </div>
    </div>
    <div class="card-border-glow rounded-2xl" />
  </div>
</template>
