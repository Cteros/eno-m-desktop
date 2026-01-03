/**
 * PlayCore Store (Legacy)
 * 
 * 该文件为了向后兼容而存在
 * 所有功能已迁移到 stores 文件夹下的子 store
 * 
 * 新代码应该直接导入相应的子 store：
 * - useSingerStore: 关注分组和up主数据
 * - usePlaylistStore: 播放列表和播放状态
 * - useCollectionsStore: 收藏夹和歌手信息
 * - useUIStore: UI状态
 * - useDownloadStore: 下载配置
 */

import { useSingerStore } from './stores/singer';
import { usePlaylistStore } from './stores/playlist';
import { useCollectionsStore } from './stores/collections';
import { useUIStore } from './stores/ui';
import { useDownloadStore } from './stores/download';

/**
 * 兼容层：提供旧的 playCoreStore() 函数式 API
 * 用于兼容已有的代码，新代码应直接使用相应的 store
 */
export function playCoreStore() {
  const singerStore = useSingerStore();
  const playlistStore = usePlaylistStore();
  const collectionsStore = useCollectionsStore();
  const uiStore = useUIStore();
  const downloadStore = useDownloadStore();

  return {
    // --- Singer Store 的 state ---
    pinnedSingerTags: singerStore.pinnedSingerTags,
    singerTagsCache: singerStore.singerTagsCache,
    followersByTagCache: singerStore.followersByTagCache,
    allFollowersCache: singerStore.allFollowersCache,
    currentTagId: singerStore.currentTagId,
    isLoadingTags: singerStore.isLoadingTags,
    isLoadingFollowers: singerStore.isLoadingFollowers,
    lastUpdateTime: singerStore.lastUpdateTime,

    // --- Playlist Store 的 state ---
    play: playlistStore.play,
    playList: playlistStore.playList,
    loopMode: playlistStore.loopMode,
    videoMode: playlistStore.videoMode,

    // --- Collections Store 的 state ---
    singers: collectionsStore.singers,

    // --- Singer Store 的 getters ---
    get getAllTags() {
      return singerStore.getAllTags;
    },
    get getPinnedTags() {
      return singerStore.getPinnedTags;
    },
    getFollowersByTag: singerStore.getFollowersByTag,
    getTagFollowerCount: singerStore.getTagFollowerCount,
    isTagPinned: singerStore.isTagPinned,

    // --- Singer Store 的 actions ---
    fetchFollowingTags: singerStore.fetchFollowingTags,
    fetchAllFollowers: singerStore.fetchAllFollowers,
    getFollowersForTag: singerStore.getFollowersForTag,
    fetchFollowersByTag: singerStore.fetchFollowersByTag,
    setCurrentTag: singerStore.setCurrentTag,
    pinTag: singerStore.pinTag,
    unpinTag: singerStore.unpinTag,
    createTag: singerStore.createTag,
    deleteTag: singerStore.deleteTag,
    addUserToTags: singerStore.addUserToTags,
    followUser: singerStore.followUser,
    unfollowUser: singerStore.unfollowUser,

    // --- Playlist Store 的 actions ---
    addToPlaylist: playlistStore.addToPlaylist,
    removeFromPlaylist: playlistStore.removeFromPlaylist,
    clearPlaylist: playlistStore.clearPlaylist,
    setLoopMode: playlistStore.setLoopMode,
    setVideoMode: playlistStore.setVideoMode,
    setCurrentPlay: playlistStore.setCurrentPlay,
    playNext: playlistStore.playNext,
    playPrevious: playlistStore.playPrevious,

    // --- Collections Store 的 actions ---
    fetchSingerInfo: collectionsStore.fetchSingerInfo,

    // --- UI Store 的 actions ---
    setGlowColor: uiStore.setGlowColor,
    resetGlowColor: uiStore.resetGlowColor,
  };
}

// 导出所有子 store 和类型供新代码使用
export { useSingerStore, type SingerTag, type Singer, type FollowingSinger } from './stores/singer';
export { usePlaylistStore, VIDEO_MODE } from './stores/playlist';
export { useCollectionsStore, defaultSingers, type Song, type CollectionItem, type Singer as SingerCardInfo } from './stores/collections';
export { useUIStore } from './stores/ui';
export { useDownloadStore, type DownloadConfig } from './stores/download';
