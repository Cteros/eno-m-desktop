import { watch, toRaw } from 'vue'
import { setActivePinia, type Pinia } from 'pinia'
import { useBlblStore } from '~/blbl/store'

export function initMiniPlayerBridge(pinia: Pinia) {
  const isMiniPlayer = window.location.hash.startsWith('#/miniplayer')
  if (isMiniPlayer) return

  setActivePinia(pinia)
  const store = useBlblStore()

  const pickSafePlay = () => {
    const raw = toRaw(store.play || {})
    return {
      id: raw.id,
      title: raw.title,
      author: raw.author,
      album: raw.album,
      cover: raw.cover,
      url: raw.url,
    }
  }

  const emitMiniState = () => {
    window.ipcRenderer?.send('mini-player-state', {
      playing: !!store.howl?.playing?.(),
      play: pickSafePlay(),
    })
  }

  const bindHowl = (howl: any) => {
    if (!howl?.on) return
    howl.on('play', emitMiniState)
    howl.on('pause', emitMiniState)
    howl.on('end', emitMiniState)
  }

  const unbindHowl = (howl: any) => {
    if (!howl?.off) return
    howl.off('play', emitMiniState)
    howl.off('pause', emitMiniState)
    howl.off('end', emitMiniState)
  }

  watch(() => store.play, () => emitMiniState(), { deep: true })

  watch(() => store.howl, (howl, prev) => {
    if (prev) unbindHowl(prev)
    if (howl) bindHowl(howl)
    emitMiniState()
  })

  window.ipcRenderer?.on('mini-player-command', (_event, cmd) => {
    if (!cmd) return
    if (cmd === 'toggle') {
      if (!store.howl) return
      if (store.howl.playing())
        store.howl.pause()
      else
        store.howl.play()
    } else if (cmd === 'next') {
      store.playNext()
    } else if (cmd === 'prev') {
      store.playPrevious()
    }
  })

  window.ipcRenderer?.on('mini-player-request-state', () => {
    emitMiniState()
  })
}
