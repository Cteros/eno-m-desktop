<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

type MiniState = {
  playing: boolean
  play: Record<string, any>
}

const state = ref<MiniState>({
  playing: false,
  play: {},
})

const cover = computed(() => state.value.play?.cover || '')
const title = computed(() => state.value.play?.title || '暂无播放')
const author = computed(() => state.value.play?.author || '')

const handleState = (_event: any, payload: MiniState) => {
  if (payload)
    state.value = payload
}

function sendCommand(cmd: 'toggle' | 'next' | 'prev') {
  window.ipcRenderer?.send('mini-player-command', cmd)
}

function openMainWindow() {
  window.ipcRenderer?.invoke('show-main-window')
}

onMounted(() => {
  window.ipcRenderer?.on('mini-player-state', handleState)
  window.ipcRenderer?.send('mini-player-request-state')
})

onBeforeUnmount(() => {
  window.ipcRenderer?.off('mini-player-state', handleState)
})
</script>

<template>
  <div class="miniplayer-root" style="-webkit-app-region: drag;">
    <div class="miniplayer-card">
      <div class="miniplayer-cover">
        <img v-if="cover" :src="cover" alt="cover">
        <div v-else class="miniplayer-cover-fallback">
          <div class="i-mingcute:music-2-fill text-xl" />
        </div>
      </div>

      <div class="miniplayer-meta">
        <div class="miniplayer-title" v-html="title" />
        <div class="miniplayer-author">{{ author }}</div>
      </div>

      <div class="miniplayer-actions" style="-webkit-app-region: no-drag;">
        <button class="mini-btn" type="button" title="上一首" @click="sendCommand('prev')">
          <div class="i-mingcute:skip-previous-fill" />
        </button>
        <button class="mini-btn primary" type="button" title="播放/暂停" @click="sendCommand('toggle')">
          <div v-if="state.playing" class="i-mingcute:pause-fill" />
          <div v-else class="i-mingcute:play-fill" />
        </button>
        <button class="mini-btn" type="button" title="下一首" @click="sendCommand('next')">
          <div class="i-mingcute:skip-forward-fill hover:text-white cursor-pointer" />
        </button>
        <button class="mini-btn" type="button" title="打开主窗口" @click="openMainWindow">
          <div class="i-mingcute:arrow-up-circle-line" />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.miniplayer-root {
  width: 100vw;
  height: 100vh;
  background: #0c0c0c;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px;
  color: #e5e7eb;
  font-family: "Manrope", "SF Pro Text", "Helvetica Neue", Arial, sans-serif;
}

.miniplayer-card {
  width: 100%;
  height: 100%;
  border-radius: 12px;
  background: linear-gradient(135deg, #111 0%, #0a0a0a 100%);
  border: 1px solid rgba(255, 255, 255, 0.06);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
  display: grid;
  grid-template-columns: 64px 1fr auto;
  gap: 12px;
  align-items: center;
  padding: 10px 12px;
}

.miniplayer-cover {
  width: 64px;
  height: 64px;
  border-radius: 10px;
  overflow: hidden;
  background: #1b1b1b;
  display: flex;
  align-items: center;
  justify-content: center;
}

.miniplayer-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.miniplayer-cover-fallback {
  color: #6b7280;
}

.miniplayer-meta {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.miniplayer-title {
  font-size: 14px;
  font-weight: 600;
  color: #f3f4f6;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.miniplayer-author {
  font-size: 12px;
  color: #9ca3af;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.miniplayer-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.mini-btn {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #e5e7eb;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.15s ease, background 0.15s ease, color 0.15s ease;
}

.mini-btn:hover {
  background: rgba(255, 255, 255, 0.12);
  transform: translateY(-1px);
}

.mini-btn.primary {
  background: #ffffff;
  color: #0a0a0a;
}

.mini-btn.primary:hover {
  background: #f3f4f6;
}
</style>
