/**
 * PlayCore Stores
 * 统一导出所有子 store
 */

export { useSingerStore, type SingerTag, type FollowingSinger } from './singer';
export { usePlaylistStore, VIDEO_MODE } from './playlist';
export { useCollectionsStore, defaultSingers, type Song, type CollectionItem, type SingerCardInfo } from './collections';
export { useUIStore } from './ui';
export { useDownloadStore, type DownloadConfig } from './download';
