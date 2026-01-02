import { defineStore } from "pinia";
import { useLocalStorage } from "@vueuse/core";
// @ts-ignore
import { invokeBiliApi, BLBL } from "~/api/bili";
// @ts-ignore
import Message from '~/components/message';

export interface Song {
  id: string | number;
  [key: string]: any;
}

export interface CollectionItem {
  id: string | number;
  mid: string | number;
  title: string;
  media_count?: number;
  name?: string;
  intro?: string;
  attr?: number;
  fav_state?: number;
  fid?: number;
  season_id?: number;
  series_id?: number;
  type?: string;
  [key: string]: any;
}

export interface Singer {
  mid: string | number; // 用户ID
  uname: string; // 用户名
  face?: string; // 头像URL
  sign?: string; // 个签/描述
  tagids?: number[]; // 所属分组ID列表
}

// 兼容旧的命名
export type SingerCardInfo = Singer

export const defaultSingers = [
  "337312411", // 翠花
  "1889545341", // 邓紫棋
  "210752", // 真栗
  "37754047", // 咻咻满
  "20473341", // 一直在吃的周梓琦
  "1839002753", // 鹿火
  "98573631", // 鹿小草
];

/**
 * 内存缓存：存储已获取过的歌手信息
 * 使用 Map 存储，避免 localStorage 导致的数据过时问题
 */
const singerInfoCache = new Map<string | number, Singer>();

/**
 * Collections Store
 * 管理收藏夹和歌手卡片信息
 */
export const useCollectionsStore = defineStore("playcore:collections", {
  state: () => ({
    // 待听列表
    listenLater: useLocalStorage("playcore:listenLater", [] as Song[]),

    // 待添加的song
    songToAdd: null as Song | null,

    // 添加窗口是否打开
    addSongDialog: false,

    // 用户自定义歌手mid
    singers: useLocalStorage("playcore:singers", [...defaultSingers] as string[]),

    // 收藏夹列表
    collections: useLocalStorage("playcore:collections", [] as CollectionItem[]),

    // 我的收藏夹列表
    myCollections: useLocalStorage("playcore:myCollections", [] as CollectionItem[]),

    // 加载状态
    isLoadingCollections: false,
    isLoadingSingerInfo: false,
  }),

  getters: {
    // 获取所有歌手
    getAllSingers(): string[] {
      return this.singers;
    },

    // 检查歌手是否存在
    hasSinger: (state) => (mid: string) => {
      return state.singers.includes(mid);
    },
  },

  actions: {
    /**
     * 获取歌手信息（使用内存缓存，避免重复API调用）
     */
    async fetchSingerInfo(mid: string | number): Promise<Singer | null> {
      // 先检查内存缓存
      if (singerInfoCache.has(mid)) {
        return singerInfoCache.get(mid) || null;
      }

      this.isLoadingSingerInfo = true;
      try {
        const res = await invokeBiliApi(BLBL.GET_USER_INFO, { mid });
        const singer = this.transformToSinger(res, mid);
        if (singer && singer.uname) {
          // 缓存到内存中
          singerInfoCache.set(mid, singer);
          return singer;
        }
      } catch (error) {
        console.error(`Failed to fetch singer info for ${mid}:`, error);
      } finally {
        this.isLoadingSingerInfo = false;
      }
      return null;
    },

    /**
     * 清除单个歌手的缓存
     */
    clearSingerCache(mid: string | number) {
      singerInfoCache.delete(mid);
    },

    /**
     * 清除所有歌手缓存
     */
    clearAllSingerCache() {
      singerInfoCache.clear();
    },

    /**
     * 将 API 返回的数据转换为 Singer 格式
     */
    transformToSinger(apiRes: any, mid: string | number): Singer | null {
      let data = apiRes;

      if (apiRes?.code === 0 || apiRes?.data) {
        data = apiRes.data || apiRes;
      }

      if (data?.card && typeof data.card === 'string') {
        try {
          data = JSON.parse(data.card);
        } catch (e) {
          console.warn('Failed to parse card JSON:', e);
        }
      }

      if (data?.card && typeof data.card === 'object') {
        data = data.card;
      }

      if (!data || typeof data !== 'object') {
        data = apiRes;
      }

      const extractValue = (obj: any, fieldNames: string[]) => {
        for (const name of fieldNames) {
          if (obj?.[name]) {
            return obj[name];
          }
        }
        return '';
      };

      const uname = extractValue(data, ['name', 'uname', 'title']);
      const mid_value = extractValue(data, ['mid']) || mid;
      const face = extractValue(data, ['face', 'avatar', 'cover']);
      const sign = extractValue(data, ['sign', 'bio', 'description']);
      const tagids = data?.tagids || [];

      if (uname) {
        const singer: Singer = {
          mid: mid_value,
          uname,
          face: face || '',
          sign: sign || '',
          tagids: Array.isArray(tagids) ? tagids : []
        };
        return singer;
      }

      return null;
    },

    /**
     * 添加歌手
     */
    addSinger(mid: string) {
      if (!this.singers.includes(mid)) {
        this.singers.push(mid);
      }
    },

    /**
     * 移除歌手
     */
    removeSinger(mid: string) {
      const index = this.singers.indexOf(mid);
      if (index > -1) {
        this.singers.splice(index, 1);
      }
    },

    /**
     * 添加到待听列表
     */
    addToListenLater(song: Song) {
      if (!this.listenLater.some(s => s.id === song.id)) {
        this.listenLater.push(song);
        Message.show({ type: 'success', message: '已添加到待听列表' });
      } else {
        Message.show({ type: 'warning', message: '该歌曲已在待听列表中' });
      }
    },

    /**
     * 从待听列表移除
     */
    removeFromListenLater(songId: string | number) {
      const index = this.listenLater.findIndex(s => s.id === songId);
      if (index > -1) {
        this.listenLater.splice(index, 1);
      }
    },

    /**
     * 清空待听列表
     */
    clearListenLater() {
      this.listenLater = [];
    },

    /**
     * 获取收藏夹列表
     */
    async fetchCollections() {
      this.isLoadingCollections = true;
      try {
        // 暂不实现，需要对应的API
        // const res = await invokeBiliApi(BLBL.GET_COLLECTIONS);
        // if (res.data && Array.isArray(res.data)) {
        //   this.collections = res.data;
        // }
      } catch (error) {
        console.error('Failed to fetch collections:', error);
      } finally {
        this.isLoadingCollections = false;
      }
    },

    /**
     * 获取我的收藏夹
     */
    async fetchMyCollections() {
      this.isLoadingCollections = true;
      try {
        // 暂不实现，需要对应的API
        // const res = await invokeBiliApi(BLBL.GET_MY_COLLECTIONS);
        // if (res.data && Array.isArray(res.data)) {
        //   this.myCollections = res.data;
        // }
      } catch (error) {
        console.error('Failed to fetch my collections:', error);
      } finally {
        this.isLoadingCollections = false;
      }
    },

    /**
     * 设置待添加的歌曲
     */
    setSongToAdd(song: Song | null) {
      this.songToAdd = song;
    },

    /**
     * 切换添加窗口
     */
    toggleAddSongDialog(value: boolean) {
      this.addSongDialog = value;
    },
  },
});
