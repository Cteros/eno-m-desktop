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

/**
 * Download Store
 * 管理下载配置和下载任务
 */
export const useDownloadStore = defineStore('playcore:download', {
  state: () => ({
    // 下载配置
    config: useLocalStorage('playcore:download-config', {
      downloadPath: '',
      createAuthorFolder: true,
      ffmpegInstalled: false,
      ffmpegVersion: '',
      ffmpegPath: '',
      fileNameFormat: '{singer} - {song}',
      imageNameFormat: 'cover.jpg',
      lyricNameFormat: '{singer} - {song}.lrc',
    } as DownloadConfig),

    // 下载队列
    downloadQueue: useLocalStorage('playcore:download-queue', [] as any[]),

    // 当前下载任务
    currentDownload: null as any,

    // 下载历史
    downloadHistory: useLocalStorage('playcore:download-history', [] as any[]),
  }),

  getters: {
    // 获取下载路径
    getDownloadPath(): string {
      return this.config.downloadPath;
    },

    // 获取FFmpeg是否已安装
    isFFmpegInstalled(): boolean {
      return this.config.ffmpegInstalled;
    },

    // 获取下载队列长度
    getQueueLength(): number {
      return this.downloadQueue.length;
    },

    // 获取下载历史
    getDownloadHistory(): any[] {
      return this.downloadHistory;
    },
  },

  actions: {
    /**
     * 更新下载配置
     */
    updateConfig(config: Partial<DownloadConfig>) {
      this.config = { ...this.config, ...config };
    },

    /**
     * 设置下载路径
     */
    setDownloadPath(path: string) {
      this.config.downloadPath = path;
    },

    /**
     * 设置FFmpeg信息
     */
    setFFmpegInfo(installed: boolean, version: string, path: string) {
      this.config.ffmpegInstalled = installed;
      this.config.ffmpegVersion = version;
      this.config.ffmpegPath = path;
    },

    /**
     * 设置文件名格式
     */
    setFileNameFormat(format: string) {
      this.config.fileNameFormat = format;
    },

    /**
     * 添加到下载队列
     */
    addToQueue(task: any) {
      this.downloadQueue.push(task);
    },

    /**
     * 从下载队列移除
     */
    removeFromQueue(taskId: string) {
      const index = this.downloadQueue.findIndex(t => t.id === taskId);
      if (index > -1) {
        this.downloadQueue.splice(index, 1);
      }
    },

    /**
     * 清空下载队列
     */
    clearQueue() {
      this.downloadQueue = [];
    },

    /**
     * 设置当前下载任务
     */
    setCurrentDownload(task: any) {
      this.currentDownload = task;
    },

    /**
     * 添加到下载历史
     */
    addToHistory(task: any) {
      this.downloadHistory.unshift(task);
      // 最多保留100条历史记录
      if (this.downloadHistory.length > 100) {
        this.downloadHistory.pop();
      }
    },

    /**
     * 清空下载历史
     */
    clearHistory() {
      this.downloadHistory = [];
    },
  },
});
