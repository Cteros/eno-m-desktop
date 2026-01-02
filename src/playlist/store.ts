import { defineStore } from "pinia";
import { useLocalStorage } from "@vueuse/core";
// @ts-ignore
import { invokeBiliApi, BLBL } from "~/api/bili";
// @ts-ignore
import Message from '~/components/message';

export interface song {
    id: string | number;
    [key: string]: any;
}

interface CollectionItem {
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

export const usePlaylistStore = defineStore("playlist", {
    state: () => ({
        listenLater: useLocalStorage("listenLater", [] as song[]),
        // 待添加的song
        songToAdd: null as song | null,
        // 添加窗口是否打开
        addSongDialog: false,
        // 打开合集
        openCollection: false,
        collectionInfo: {} as object,
        collectionSongs: [] as song[],
        // 歌单海报
        isShowPoster: false,
        posters: [] as string[],
        // 用户权限,取决于是否关注了开发者
        userPermission: false,
        userInfo: {} as any,
        // BLBL 收藏夹列表缓存
        favList: [] as CollectionItem[],
        collectedFavList: [] as CollectionItem[],
        // 收藏夹详情缓存 (用于封面等)
        favInfoCache: useLocalStorage("favInfoCache", {} as Record<string, any>),
    }),
    actions: {
        startAddSong(song: song) {
            this.songToAdd = song;
            this.addSongDialog = true;
            // 触发刷新收藏夹列表
            this.fetchFavLists();
        },
        // 添加到稍后再听
        addToListenLater(song: song) {
            this.listenLater.push(song);
        },
        addSongToListenLater() {
            this.listenLater.push(this.songToAdd!);
            this.addSongDialog = false;
        },
        // 获取用户创建的收藏夹
        async fetchFavLists(mid?: string) {
            if (!mid) {
                if (this.userInfo?.mid) {
                    mid = this.userInfo.mid;
                } else {
                    try {
                        const res = await invokeBiliApi(BLBL.GET_NAV);
                        if (res.data && res.data.isLogin) {
                            this.userInfo = res.data;
                            mid = res.data.mid;
                        }
                    } catch (e) {
                        console.error('Failed to fetch user info:', e);
                    }
                }
            }

            if (!mid) return;

            try {
                const createdRes = await invokeBiliApi(BLBL.GET_FAV_LIST, { up_mid: mid });
                this.favList = createdRes.data.list || [];

                const collectedRes = await invokeBiliApi(BLBL.GET_COLLECTED_FAV_LIST, { up_mid: mid });
                this.collectedFavList = collectedRes.data.list || [];

                // 获取列表后，开始后台获取封面
                this.fetchFavCovers();
            } catch (error) {
                console.error('Failed to fetch fav lists:', error);
            }
        },
        // 获取单个收藏夹详情
        async fetchFavInfo(mediaId: string | number) {
            const id = String(mediaId);
            // 如果已有缓存且有封面，跳过
            if (this.favInfoCache[id]?.cover) return;

            try {
                const res = await invokeBiliApi(BLBL.GET_FAV_INFO, { media_id: id });
                if (res.data?.info) {
                    this.favInfoCache[id] = res.data.info;
                    if (!this.favInfoCache[id].cover) {
                        this.favInfoCache[id].cover = this.favInfoCache[id].upper.face
                    }
                }
            } catch (error) {
                console.warn(`Failed to fetch fav info for ${id}:`, error);
            }
        },
        // 批量获取封面 (低并发)
        async fetchFavCovers() {
            const allFavs = [...this.favList, ...this.collectedFavList];
            console.log('Fetching fav covers for', this.collectedFavList, 'folders', this.favInfoCache);
            const pendingFavs = allFavs.filter(fav => !this.favInfoCache[String(fav.id)]?.cover);
            console.log('Favs needing cover fetch:', pendingFavs);
            if (pendingFavs.length === 0) return;

            // 并发控制
            const concurrency = 2;
            const queue = [...pendingFavs];

            const worker = async () => {
                while (queue.length > 0) {
                    console.log('Remaining favs to fetch:', queue.length);
                    const fav = queue.shift();
                    if (!fav) break;

                    await this.fetchFavInfo(fav.id);
                    // 随机延迟 500-1500ms 防止风控
                    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
                }
            };

            const workers = Array(Math.min(concurrency, queue.length)).fill(null).map(() => worker());
            await Promise.all(workers);
        },
        // 添加歌曲到 BLBL 收藏夹
        async addSongToFav(mediaId: string | number) {
            if (!this.songToAdd) return;
            try {
                // 注意：B站 API 需要 avid (rid)，如果是 bvid 需要转换，或者 song 对象里有 aid
                // 假设 song 对象里有 bvid，后端 API deal 接口通常需要 aid。
                // 我们的 invokeBiliApi 封装了 params，但这里需要确认 songToAdd 里有 aid
                // 如果没有，可能需要先查一次。
                // 暂时假设 songToAdd.id 或者 songToAdd.aid 可用。
                // 现在的 SongItem 构造里通常 id 是 bvid 或 cid。我们需要 aid。
                // 调用 getVideoInfo 可以获取 aid。

                let rid = this.songToAdd.aid;
                if (!rid && this.songToAdd.bvid) {
                    const info = await invokeBiliApi(BLBL.GET_VIDEO_INFO, { bvid: this.songToAdd.bvid });
                    rid = info.data.aid;
                }

                if (!rid) {
                    console.error('Cannot find avid for song:', this.songToAdd);
                    return;
                }

                await invokeBiliApi(BLBL.ADD_SONG_TO_FAV, {
                    rid,
                    add_media_ids: mediaId.toString(),
                });
                this.addSongDialog = false;
                Message.show({
                    type: 'success',
                    message: '添加成功'
                });
            } catch (error) {
                console.error('Failed to add song to fav:', error);
                Message.show({
                    type: 'error',
                    message: '添加失败'
                });
            }
        },
        // 从 BLBL 收藏夹移除歌曲
        async removeSongFromFav(mediaId: string | number, song: song) {
            try {
                let rid = song.aid;
                if (!rid && song.bvid) {
                    const info = await invokeBiliApi(BLBL.GET_VIDEO_INFO, { bvid: song.bvid });
                    rid = info.data.aid;
                }
                if (!rid) return;

                await invokeBiliApi(BLBL.DEL_SONG_FROM_FAV, {
                    rid,
                    del_media_ids: mediaId.toString(),
                });
                Message.show({
                    type: 'success',
                    message: '移除成功'
                });
                // 刷新当前列表逻辑在组件里处理，或者这里触发一个事件
            } catch (error) {
                console.error('Failed to remove song from fav:', error);
                Message.show({
                    type: 'error',
                    message: '移除失败'
                });
            }
        },
        // 创建 BLBL 收藏夹
        async createBiliFav(title: string, intro: string = '', privacy: boolean = false) {
            try {
                await invokeBiliApi(BLBL.CREATE_FAV_FOLDER, {
                    title,
                    intro,
                    privacy: privacy ? 1 : 0
                });
                // 刷新列表
                // 需要 mid，这里暂时没法直接拿，组件调用 fetchFavLists 时传入
            } catch (error) {
                console.error('Failed to create fav folder:', error);
            }
        },
        initUserPermission() {
            invokeBiliApi(BLBL.GET_USER_INFO, { mid: "184327681" }).then((res: any) => {
                this.userPermission =
                    res.data.mid === "184327681" || res.data.following;
            });
        },
    },
});
