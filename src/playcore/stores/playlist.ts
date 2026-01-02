import { defineStore } from "pinia";
import { useStorage } from "@vueuse/core";
import type { RemovableRef } from "@vueuse/core";

export const VIDEO_MODE = {
  FLOATING: "floating",
  DRAWER: "drawer",
  HIDDEN: "hidden",
};

type VideoMode = (typeof VIDEO_MODE)[keyof typeof VIDEO_MODE];

interface Song {
  [key: string]: any;
}

/**
 * Playlist Store
 * 管理当前播放列表和播放状态
 */
export const usePlaylistStore = defineStore("playcore:playlist", {
  state: () => ({
    // 当前播放信息
    play: useStorage("playcore:playInfo", {} as Song),

    // 播放列表
    playList: useStorage("playcore:playList", [] as Song[]),

    // 播放循环模式
    loopMode: useStorage("playcore:loopMode", "list"),

    // 视频模式
    videoMode: useStorage("playcore:videoMode", VIDEO_MODE.HIDDEN as VideoMode),

    // 当前播放数
    count: 0,

    // Howl 实例
    howl: null as any,
  }),

  getters: {
    // 获取当前播放位置
    getCurrentPlayIndex(): number {
      return this.playList.findIndex(
        (song: Song) => song.id === this.play?.id
      );
    },

    // 获取下一首歌
    getNextSong(): Song | null {
      const currentIndex = this.getCurrentPlayIndex;
      if (currentIndex === -1) return null;

      if (this.loopMode === "single") {
        return this.play;
      } else if (this.loopMode === "shuffle") {
        const randomIndex = Math.floor(Math.random() * this.playList.length);
        return this.playList[randomIndex];
      } else {
        // list mode
        const nextIndex = (currentIndex + 1) % this.playList.length;
        return this.playList[nextIndex];
      }
    },

    // 获取上一首歌
    getPreviousSong(): Song | null {
      const currentIndex = this.getCurrentPlayIndex;
      if (currentIndex === -1) return null;

      if (this.loopMode === "single") {
        return this.play;
      } else {
        const prevIndex =
          (currentIndex - 1 + this.playList.length) % this.playList.length;
        return this.playList[prevIndex];
      }
    },
  },

  actions: {
    /**
     * 添加歌曲到播放列表
     */
    addToPlaylist(songs: Song | Song[]) {
      if (Array.isArray(songs)) {
        this.playList.push(...songs);
      } else {
        this.playList.push(songs);
      }
    },

    /**
     * 从播放列表中移除歌曲
     */
    removeFromPlaylist(index: number) {
      if (index >= 0 && index < this.playList.length) {
        this.playList.splice(index, 1);
      }
    },

    /**
     * 清空播放列表
     */
    clearPlaylist() {
      this.playList = [];
      this.play = {};
    },

    /**
     * 设置播放模式
     */
    setLoopMode(mode: string) {
      this.loopMode = mode;
    },

    /**
     * 设置视频模式
     */
    setVideoMode(mode: VideoMode) {
      this.videoMode = mode;
    },

    /**
     * 设置当前播放歌曲
     */
    setCurrentPlay(song: Song) {
      this.play = song;
    },

    /**
     * 播放下一首
     */
    playNext() {
      const nextSong = this.getNextSong;
      if (nextSong) {
        this.play = nextSong;
      }
    },

    /**
     * 播放上一首
     */
    playPrevious() {
      const prevSong = this.getPreviousSong;
      if (prevSong) {
        this.play = prevSong;
      }
    },

    /**
     * 设置 Howl 实例
     */
    setHowl(howl: any) {
      this.howl = howl;
    },
  },
});
