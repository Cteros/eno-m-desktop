import { defineStore } from "pinia";
import { useLocalStorage } from "@vueuse/core";
import type { RemovableRef } from "@vueuse/core";
// @ts-ignore
import { invokeBiliApi, BLBL } from "~/api/bili";

/**
 * 关注分组
 */
export interface SingerTag {
  tagid: number; // 分组 ID
  name: string; // 分组名称
  count?: number; // 该分组下的关注人数
  tip?: string; // 分组提示信息
}

/**
 * 歌手/up主基本信息
 */
export interface Singer {
  mid: string | number; // 用户ID
  uname: string; // 用户名
  face?: string; // 头像URL
  sign?: string; // 个签/描述
  tagids?: number[]; // 所属分组ID列表
}

// 兼容旧的命名
export type FollowingSinger = Singer

/**
 * Singer Store
 * 管理关注分组和up主相关的数据
 * 数据从 B站 API 获取，此处只做缓存
 */
export const useSingerStore = defineStore("playcore:singer", {
  state: () => ({
    // 固定到 Tab 栏的分组
    pinnedSingerTags: useLocalStorage<number[]>("playcore:pinned-singer-tags", []),

    // 关注分组缓存 { tagid: SingerTag }
    singerTagsCache: useLocalStorage<Record<number, SingerTag>>("playcore:singer-tags-cache", {}),

    // 按分组缓存的关注up主列表 { tagid: [Singer] }
    followersByTagCache: useLocalStorage<Record<number, Singer[]>>("playcore:followers-by-tag-cache", {}),

    // 所有关注的up主缓存（不分组）
    allFollowersCache: useLocalStorage<Singer[]>("playcore:all-followers-cache", []),

    // 当前选中的分组ID
    currentTagId: useLocalStorage<number | null>("playcore:current-singer-tag-id", null),

    // 加载状态
    isLoadingTags: false,
    isLoadingFollowers: false,

    // 最后更新时间
    lastUpdateTime: 0,
  }),

  getters: {
    // 获取所有分组标签
    getAllTags(): SingerTag[] {
      return Object.values(this.singerTagsCache);
    },

    // 获取 pinned 的分组
    getPinnedTags(): SingerTag[] {
      return this.pinnedSingerTags
        .map(tagid => this.singerTagsCache[tagid])
        .filter(tag => tag !== undefined);
    },

    // 获取特定分组的关注人
    getFollowersByTag: (state) => (tagid: number) => {
      return state.followersByTagCache[tagid] || [];
    },

    // 获取分组的关注人数
    getTagFollowerCount: (state) => (tagid: number) => {
      return state.followersByTagCache[tagid]?.length || state.singerTagsCache[tagid]?.count || 0;
    },

    // 检查是否已pinned
    isTagPinned: (state) => (tagid: number) => {
      return state.pinnedSingerTags.includes(tagid);
    },
  },

  actions: {
    /**
     * 获取所有关注分组
     */
    async fetchFollowingTags() {
      this.isLoadingTags = true;
      try {
        const res = await invokeBiliApi(BLBL.GET_FOLLOWING_TAGS, {
          only_master: 0,
          web_location: '333.1387',
        });

        if (res.data && Array.isArray(res.data)) {
          const tagsMap: Record<number, SingerTag> = {};
          res.data.forEach((tag: any) => {
            tagsMap[tag.tagid] = {
              tagid: tag.tagid,
              name: tag.name,
              count: tag.count,
              tip: tag.tip,
            };
          });
          this.singerTagsCache = tagsMap;
          this.lastUpdateTime = Date.now();
        }
      } catch (error) {
        console.error("Failed to fetch following tags:", error);
      } finally {
        this.isLoadingTags = false;
      }
    },

    /**
     * 获取所有关注的人（通过遍历所有分组）
     */
    async fetchAllFollowers() {
      this.isLoadingFollowers = true;
      try {
        // 先确保分组列表已加载
        if (Object.keys(this.singerTagsCache).length === 0) {
          await this.fetchFollowingTags();
        }

        const allFollowers = new Map<string, FollowingSinger>();

        // 遍历所有分组，获取每个分组的用户
        for (const tagid of Object.keys(this.singerTagsCache)) {
          const followers = await this.getFollowersForTag(Number(tagid));
          followers.forEach((follower) => {
            // 使用mid作为key，避免重复，并记录该用户所在的所有分组
            const midKey = String(follower.mid);
            const existingFollower = allFollowers.get(midKey);
            if (existingFollower) {
              // 合并分组ID
              existingFollower.tagids = [...new Set([...(existingFollower.tagids || []), Number(tagid)])];
            } else {
              allFollowers.set(midKey, { ...follower, tagids: [Number(tagid)] });
            }
          });

          // 每个请求之间延迟，避免频繁请求
          await new Promise((resolve) => setTimeout(resolve, 200));
        }

        // 转换为数组
        this.allFollowersCache = Array.from(allFollowers.values());
        this.lastUpdateTime = Date.now();
      } catch (error) {
        console.error("Failed to fetch all followers:", error);
      } finally {
        this.isLoadingFollowers = false;
      }
    },

    /**
     * 获取指定分组的关注人（内部方法，从缓存或API）
     */
    async getFollowersForTag(tagid: number): Promise<FollowingSinger[]> {
      // 检查缓存
      if (this.followersByTagCache[tagid]) {
        return this.followersByTagCache[tagid];
      }

      // 从API获取
      const followers: FollowingSinger[] = [];
      let pn = 1;
      let hasMore = true;

      while (hasMore) {
        try {
          const res = await invokeBiliApi(BLBL.GET_FOLLOWING_TAG_USERS, {
            tagid,
            pn,
            ps: 24,
            web_location: '333.1387',
          });

          if (res.data && Array.isArray(res.data) && res.data.length > 0) {
            res.data.forEach((user: any) => {
              followers.push({
                mid: String(user.mid),
                uname: user.uname,
                face: user.face,
                sign: user.sign,
                tagids: [tagid],
              });
            });

            hasMore = res.data.length === 24;
            pn++;
          } else {
            hasMore = false;
          }

          await new Promise((resolve) => setTimeout(resolve, 100));
        } catch (error) {
          console.error(`Error fetching followers for tag ${tagid} page ${pn}:`, error);
          hasMore = false;
        }
      }

      // 缓存结果
      this.followersByTagCache[tagid] = followers;
      return followers;
    },

    /**
     * 获取指定分组的关注人（分页）
     */
    async fetchFollowersByTag(tagid: number, pageSize = 24) {
      this.isLoadingFollowers = true;
      try {
        const followers: FollowingSinger[] = [];
        let pn = 1;
        let hasMore = true;

        while (hasMore) {
          const res = await invokeBiliApi(BLBL.GET_FOLLOWING_TAG_USERS, {
            tagid, // 分组ID
            pn,
            ps: pageSize,
            web_location: '333.1387',
          });

          if (res.data && Array.isArray(res.data) && res.data.length > 0) {
            res.data.forEach((user: any) => {
              followers.push({
                mid: String(user.mid),
                uname: user.uname,
                face: user.face,
                sign: user.sign,
                tagids: [tagid],
              });
            });
            hasMore = res.data.length === pageSize;
            pn++;
          } else {
            hasMore = false;
          }
          await new Promise((resolve) => setTimeout(resolve, 200));
        }

        this.followersByTagCache[tagid] = followers;
        this.lastUpdateTime = Date.now();
      } catch (error) {
        console.error(`Failed to fetch followers for tag ${tagid}:`, error);
      } finally {
        this.isLoadingFollowers = false;
      }
    },

    /**
     * 设置当前选中的分组
     */
    setCurrentTag(tagid: number | null) {
      this.currentTagId = tagid;
    },

    /**
     * Pin 一个分组到 Tab 栏（最多 5 个）
     */
    pinTag(tagid: number): boolean {
      if (this.pinnedSingerTags.includes(tagid)) {
        return true; // 已经pinned
      }
      if (this.pinnedSingerTags.length >= 5) {
        return false; // 超过上限
      }
      this.pinnedSingerTags.push(tagid);
      return true;
    },

    /**
     * 取消pin一个分组
     */
    unpinTag(tagid: number) {
      const index = this.pinnedSingerTags.indexOf(tagid);
      if (index > -1) {
        this.pinnedSingerTags.splice(index, 1);
      }
    },

    /**
     * 创建新的关注分组
     */
    async createTag(tagName: string): Promise<SingerTag | null> {
      if (!tagName || tagName.trim().length === 0) {
        throw new Error('分组名称不能为空');
      }

      try {
        const res = await invokeBiliApi(BLBL.CREATE_FOLLOWING_TAG, {
          tag: tagName.trim(),
        });

        if (res.code === 0 && res.data?.tagid) {
          const newTag: SingerTag = {
            tagid: res.data.tagid,
            name: tagName.trim(),
            count: 0,
            tip: '',
          };

          // 添加到缓存
          this.singerTagsCache[newTag.tagid] = newTag;
          return newTag;
        } else {
          throw new Error(res.message || '创建分组失败');
        }
      } catch (error) {
        console.error('Failed to create tag:', error);
        throw error;
      }
    },

    /**
     * 删除关注分组
     */
    async deleteTag(tagid: number): Promise<boolean> {
      if (!tagid) {
        throw new Error('分组ID不能为空');
      }

      try {
        const res = await invokeBiliApi(BLBL.DELETE_FOLLOWING_TAG, {
          tagid,
        });

        if (res.code === 0) {
          // 从缓存中删除
          delete this.singerTagsCache[tagid];
          // 如果该分组有追随者信息，也删除
          delete this.followersByTagCache[tagid];
          // 如果已 pin，也取消 pin
          this.unpinTag(tagid);
          return true;
        } else {
          throw new Error(res.message || '删除分组失败');
        }
      } catch (error) {
        console.error('Failed to delete tag:', error);
        throw error;
      }
    },

    /**
     * 清除缓存
     */
    clearCache() {
      this.singerTagsCache = {};
      this.followersByTagCache = {};
      this.allFollowersCache = [];
      this.currentTagId = null;
      this.lastUpdateTime = 0;
    },
  },
});
