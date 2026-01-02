import { defineStore } from "pinia";
import { useLocalStorage } from "@vueuse/core";

/**
 * UI Store
 * 管理UI相关的状态
 */
export const useUIStore = defineStore("playcore:ui", {
  state: () => ({
    // 主题颜色 (Glow 特效色)
    glowColor: useLocalStorage("playcore:glowColor", "#404040"),

    // 侧边栏是否展开
    sidebarOpen: useLocalStorage("playcore:sidebarOpen", true),

    // 播放列表是否展开
    playlistOpen: useLocalStorage("playcore:playlistOpen", false),

    // 当前主题
    theme: useLocalStorage("playcore:theme", "dark"),
  }),

  actions: {
    /**
     * 设置 Glow 色
     */
    setGlowColor(color: string) {
      this.glowColor = color;
    },

    /**
     * 重置 Glow 色为默认值
     */
    resetGlowColor() {
      this.glowColor = "#404040";
    },

    /**
     * 切换侧边栏
     */
    toggleSidebar() {
      this.sidebarOpen = !this.sidebarOpen;
    },

    /**
     * 切换播放列表
     */
    togglePlaylist() {
      this.playlistOpen = !this.playlistOpen;
    },

    /**
     * 设置主题
     */
    setTheme(theme: string) {
      this.theme = theme;
    },
  },
});
