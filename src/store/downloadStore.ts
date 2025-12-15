import { defineStore } from 'pinia'
import { useLocalStorage } from '@vueuse/core'

export interface DownloadConfig {
  downloadPath: string
  createAuthorFolder: boolean
  ffmpegInstalled: boolean
  ffmpegVersion: string
  ffmpegPath: string
  fileNameFormat: string
  imageNameFormat: string
  lyricNameFormat: string
}

export const useDownloadStore = defineStore('download', {
  state: () => ({
    config: useLocalStorage('download-config', {
      downloadPath: '',
      createAuthorFolder: true,
      ffmpegInstalled: false,
      ffmpegVersion: '',
      ffmpegPath: '',
      fileNameFormat: '{singer} - {song}',
      imageNameFormat: 'cover.jpg',
      lyricNameFormat: '{singer} - {song}.lrc',
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
    getFileNameFormat(): string {
      return this.config.fileNameFormat || '{singer} - {song}'
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
    setFileNameFormat(format: string) {
      this.config.fileNameFormat = format
    },
    setImageNameFormat(format: string) {
      this.config.imageNameFormat = format
    },
    setLyricNameFormat(format: string) {
      this.config.lyricNameFormat = format
    },
    resetConfig() {
      this.config.downloadPath = ''
      this.config.createAuthorFolder = true
      this.config.ffmpegInstalled = false
      this.config.ffmpegVersion = ''
      this.config.ffmpegPath = ''
      this.config.fileNameFormat = '{singer} - {song}'
      this.config.imageNameFormat = 'cover.jpg'
      this.config.lyricNameFormat = '{singer} - {song}.lrc'
    },
  },
})
