import { defineStore } from 'pinia'
import { useLocalStorage } from '@vueuse/core'

export interface DownloadConfig {
  downloadPath: string
  createAuthorFolder: boolean
  ffmpegInstalled: boolean
  ffmpegVersion: string
  ffmpegPath: string
}

export const useDownloadStore = defineStore('download', {
  state: () => ({
    config: useLocalStorage('download-config', {
      downloadPath: '',
      createAuthorFolder: true,
      ffmpegInstalled: false,
      ffmpegVersion: '',
      ffmpegPath: '',
    } as DownloadConfig),
  }),

  getters: {
    getDownloadPath(): string {
      return this.config.downloadPath
    },
    getCreateAuthorFolder(): boolean {
      return this.config.createAuthorFolder
    },
    getFFmpegInfo(): { installed: boolean; version: string; path: string } {
      return {
        installed: this.config.ffmpegInstalled,
        version: this.config.ffmpegVersion,
        path: this.config.ffmpegPath,
      }
    },
  },

  actions: {
    setDownloadPath(path: string) {
      this.config.downloadPath = path
    },
    setCreateAuthorFolder(value: boolean) {
      this.config.createAuthorFolder = value
    },
    setFFmpegInfo(info: { installed: boolean; version: string; path: string }) {
      this.config.ffmpegInstalled = info.installed
      this.config.ffmpegVersion = info.version
      this.config.ffmpegPath = info.path
    },
    resetConfig() {
      this.config.downloadPath = ''
      this.config.createAuthorFolder = true
      this.config.ffmpegInstalled = false
      this.config.ffmpegVersion = ''
      this.config.ffmpegPath = ''
    },
  },
})
