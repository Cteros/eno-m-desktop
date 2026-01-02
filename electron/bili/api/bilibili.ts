import { AHS } from '../utils'
import { BLBL } from '../msg.define'

const baseUrl = 'https://api.bilibili.com'

const api = {
  [BLBL.GET_COOKIE]: {
    url: 'https://bilibili.com',
    _fetch: {
      method: 'get',
    },
    afterHandle: [],
  },
  [BLBL.GET_RANK]: {
    url: `${baseUrl}/x/copyright-music-publicity/toplist/all_period`,
    _fetch: {
      method: 'get',
    },
    params: {
      list_type: 1, // 1: 热榜, 2: 原创榜
    },
    afterHandle: AHS.J,
  },
  [BLBL.GET_RANK_DETAIL]: {
    url: `${baseUrl}/x/copyright-music-publicity/toplist/detail`,
    _fetch: {
      method: 'get',
    },
    params: {
      list_id: 0, // 榜单id
    },
    afterHandle: AHS.J,
  },
  [BLBL.GET_RANK_DETAIL_LIST]: {
    url: `${baseUrl}/x/copyright-music-publicity/toplist/music_list`,
    _fetch: {
      method: 'get',
    },
    params: {
      list_id: 0, // 榜单id
    },
    afterHandle: AHS.J,
  },
  [BLBL.GET_SONG_DETAIL]: {
    url: `${baseUrl}/audio/music-service-c/web/song/info`,
    _fetch: {
      method: 'get',
    },
    params: {
      sid: 0, // 歌曲id
    },
    afterHandle: AHS.J,
  },
  [BLBL.GET_HIT_SONG]: {
    // https://www.bilibili.com/audio/music-service-c/web/menu/hit?ps=20&pn=1
    url: `${baseUrl}/audio/music-service-c/web/menu/hit`,
    _fetch: {
      method: 'get',
    },
    params: {
      ps: 20, // 每页数量
      pn: 1, // 页数
    },
    afterHandle: AHS.J,
  },
  /// audio/music-service-c/web/song/of-menu
  [BLBL.GET_HIT_SONG_LIST]: {
    url: `${baseUrl}/audio/music-service-c/web/song/of-menu`,
    _fetch: {
      method: 'get',
    },
    params: {
      sid: 0, // 歌单id
      ps: 100, // 每页数量
      pn: 1, // 页数
    },
    afterHandle: AHS.J,
  },
  // https://www.bilibili.com/audio/music-service-c/web/url?sid=276736
  [BLBL.GET_SONG]: {
    url: `${baseUrl}/audio/music-service-c/web/url`,
    _fetch: {
      method: 'get',
    },
    params: {
      sid: 0, // 歌曲id
    },
    afterHandle: AHS.J,
  },
  // https://www.bilibili.com/audio/music-service-c/web/menu/rank
  [BLBL.GET_MENU_RANK]: {
    url: `${baseUrl}/audio/music-service-c/web/menu/rank`,
    _fetch: {
      method: 'get',
    },
    params: {
      ps: 3, // 每页数量
      pn: 1, // 页数
    },
    afterHandle: AHS.J,
  },
  // https://www.bilibili.com/audio/music-service-c/web/song/info
  [BLBL.GET_SONG_INFO]: {
    url: `${baseUrl}/audio/music-service-c/web/song/info`,
    _fetch: {
      method: 'get',
    },
    params: {
      sid: 0,
    },
    afterHandle: AHS.J,
  },
  // https://api.bilibili.com/x/web-interface/search/type?__refresh__=true&_extra=&context=&page=1&page_size=42&platform=pc&highlight=1&single_column=0&keyword=%E9%82%93%E7%B4%AB%E6%A3%8B&category_id=&search_type=video&dynamic_offset=0&preload=true&com2co=true
  [BLBL.SEARCH]: {
    url: `${baseUrl}/x/web-interface/search/type`,
    _fetch: {
      method: 'get',
    },
    params: {
      page: 1,
      page_size: 42,
      platform: 'pc',
      highlight: 1,
      single_column: 0,
      keyword: '',
      category_id: '',
      search_type: 'video',
      dynamic_offset: 0,
      preload: true,
      com2co: true,
    },
    afterHandle: AHS.J,
  },
  // https://api.bilibili.com/x/player/playurl?fnval=16&bvid=BV1jh4y1G7oT&cid=1157282735
  [BLBL.GET_AUDIO_OF_VIDEO]: {
    url: `${baseUrl}/x/player/playurl`,
    _fetch: {
      method: 'get',
    },
    params: {
      fnval: 16,
      bvid: '',
      cid: 0,
    },
    afterHandle: AHS.J,
  },
  // https://api.bilibili.com/x/web-interface/view?bvid=BV1BL411Y7kc
  // 需要这个获取cid
  [BLBL.GET_VIDEO_INFO]: {
    url: `${baseUrl}/x/web-interface/view`,
    _fetch: {
      method: 'get',
    },
    params: {
      bvid: '',
    },
    afterHandle: AHS.J,
  },
  // 获取用户信息 https://api.bilibili.com/x/web-interface/card
  [BLBL.GET_USER_INFO]: {
    url: `${baseUrl}/x/web-interface/card`,
    _fetch: {
      method: 'get',
    },
    params: {
      mid: 0,
    },
    afterHandle: AHS.J,
  },
  // https://api.bilibili.com/x/web-interface/ranking/v2
  [BLBL.GET_RANKING]: {
    url: `${baseUrl}/x/web-interface/ranking/v2`,
    _fetch: {
      method: 'get',
    },
    params: {
      // tid: 3,
    },
    afterHandle: AHS.J,
  },
  // 音乐榜单的列表https://api.bilibili.com/x/copyright-music-publicity/toplist/all_period
  [BLBL.GET_MUSIC_RANK_LIST]: {
    url: `${baseUrl}/x/copyright-music-publicity/toplist/all_period`,
    _fetch: {
      method: 'get',
    },
    params: {
      list_type: 1, // 变化的
    },
    afterHandle: AHS.J,
  },
  // 全站音乐榜单
  [BLBL.GET_MUSIC_RANK]: {
    url: `${baseUrl}/x/copyright-music-publicity/toplist/music_list`,
    _fetch: {
      method: 'get',
    },
    params: {
      list_id: 207, // 变化的
    },
    afterHandle: AHS.J,
  },
  // https://api.bilibili.com/x/v3/fav/resource/list
  // 收藏夹信息
  [BLBL.GET_FAV_INFO]: {
    url: `${baseUrl}/x/v3/fav/resource/list`,
    _fetch: {
      method: 'get',
    },
    params: {
      media_id: 0,
      ps: 20,
      pn: 1,
    },
    afterHandle: AHS.J,
  },
  // 获取用户创建的收藏夹列表
  [BLBL.GET_FAV_LIST]: {
    url: `${baseUrl}/x/v3/fav/folder/created/list-all`,
    _fetch: {
      method: 'get',
    },
    params: {
      up_mid: 0,
      type: 0,
    },
    afterHandle: AHS.J,
  },
  // 获取用户收藏的收藏夹列表
  [BLBL.GET_COLLECTED_FAV_LIST]: {
    url: `${baseUrl}/x/v3/fav/folder/collected/list`,
    _fetch: {
      method: 'get',
    },
    params: {
      up_mid: 0,
      pn: 1,
      ps: 20,
      platform: 'web',
    },
    afterHandle: AHS.J,
  },
  // 获取收藏夹资源详情 (复用 GET_FAV_INFO，但这里显式定义一个别名以防万一)
  [BLBL.GET_FAV_RESOURCE_LIST]: {
    url: `${baseUrl}/x/v3/fav/resource/list`,
    _fetch: {
      method: 'get',
    },
    params: {
      media_id: 0,
      pn: 1,
      ps: 20,
    },
    afterHandle: AHS.J,
  },
  // 添加资源到收藏夹
  [BLBL.ADD_SONG_TO_FAV]: {
    url: `${baseUrl}/x/v3/fav/resource/deal`,
    _fetch: {
      method: 'post',
    },
    params: {
      rid: 0, // 资源ID (avid)
      type: 2, // 视频
      add_media_ids: '', // 逗号分隔的收藏夹ID
      // del_media_ids: '',
      csrf: '', // 需要 csrf token，cookie 中获取
    },
    afterHandle: AHS.J,
  },
  // 从收藏夹移除资源
  [BLBL.DEL_SONG_FROM_FAV]: {
    url: `${baseUrl}/x/v3/fav/resource/deal`,
    _fetch: {
      method: 'post',
    },
    params: {
      rid: 0, // 资源ID (avid)
      type: 2, // 视频
      // add_media_ids: '',
      del_media_ids: '', // 逗号分隔的收藏夹ID
      csrf: '',
    },
    afterHandle: AHS.J,
  },
  // 创建收藏夹
  [BLBL.CREATE_FAV_FOLDER]: {
    url: `${baseUrl}/x/v3/fav/folder/add`,
    _fetch: {
      method: 'post',
    },
    params: {
      title: '',
      intro: '',
      privacy: 0, // 0: 公开, 1: 私密
      csrf: '',
    },
    afterHandle: AHS.J,
  },
  // 获取用户投稿视频
  [BLBL.GET_USER_ARC]: {
    url: `${baseUrl}/x/space/wbi/arc/search`,
    _fetch: {
      method: 'get',
    },
    params: {
      mid: 0,
      pn: 1,
      ps: 25,
      tid: 3, // 音乐分区
      keyword: '',
      order: 'pubdate',
    },
    afterHandle: AHS.J,
  },
  // 获取当前用户信息 (Nav)
  [BLBL.GET_NAV]: {
    url: `${baseUrl}/x/web-interface/nav`,
    _fetch: {
      method: 'get',
    },
    afterHandle: AHS.J,
  },
  // 关注/取消关注
  [BLBL.RELATION_MODIFY]: {
    url: `${baseUrl}/x/relation/modify`,
    _fetch: {
      method: 'post',
    },
    params: {
      fid: 0,
      act: 1, // 1: 关注, 2: 取消关注
      re_src: 11,
      csrf: '',
    },
    afterHandle: AHS.J,
  },
  // 获取视频合集信息
  [BLBL.GET_COLLECTION_INFO]: {
    url: `${baseUrl}/x/polymer/web-space/seasons_archives_list`,
    _fetch: {
      method: 'get',
    },
    params: {
      mid: 0, // 用户 mid
      season_id: 0, // 视频合集 ID
      sort_reverse: false, // 排序方式
      page_num: 1, // 页码索引
      page_size: 30, // 单页内容数量
    },
    afterHandle: AHS.J,
  },
  // 获取系列信息
  [BLBL.GET_SERIES_INFO]: {
    url: `${baseUrl}/x/series/archives`,
    _fetch: {
      method: 'get',
    },
    params: {
      mid: 0, // 用户 mid
      series_id: 0, // 系列ID
      only_normal: true, // 作用尚不明确
      sort: 'desc', // 排序方式
      pn: 1, // 页码
      ps: 20, // 每页数量
    },
    afterHandle: AHS.J,
  },
  // 获取系列和合集视频列表
  [BLBL.GET_SEASONS_SERIES_LIST]: {
    url: `${baseUrl}/x/polymer/web-space/seasons_series_list`,
    _fetch: {
      method: 'get',
    },
    params: {
      mid: 0, // 用户 mid
      page_num: 1, // 页码
      page_size: 20, // 每页数量
    },
    afterHandle: AHS.J,
  },
  // 获取关注列表
  [BLBL.GET_FOLLOWING_LIST]: {
    url: `${baseUrl}/x/relation/followings`,
    _fetch: {
      method: 'get',
    },
    params: {
      vmid: 0, // 用户 mid，0 表示当前用户
      pn: 1, // 页码
      ps: 50, // 每页数量
      tagid: undefined, // 分组 ID，可选（按分组筛选）
      order: 'desc', // 排序方式
      order_type: 'attention', // 排序类型
    },
    afterHandle: AHS.J,
  },
  // 获取关注分组列表
  [BLBL.GET_FOLLOWING_TAGS]: {
    url: `${baseUrl}/x/relation/tags`,
    _fetch: {
      method: 'get',
    },
    params: {
      only_master: false, // 是否只返回主人的分组
      web_location: '333.1387', // web 定位标识
    },
    afterHandle: AHS.J,
  },
  // 获取分组下的用户列表
  [BLBL.GET_FOLLOWING_TAG_USERS]: {
    url: `${baseUrl}/x/relation/tag`,
    _fetch: {
      method: 'get',
    },
    params: {
      tagid: 0, // 分组 ID
      pn: 1, // 页码
      ps: 24, // 每页数量
      web_location: '333.1387', // web 定位标识
    },
    afterHandle: AHS.J,
  },
  // 创建关注分组
  [BLBL.CREATE_FOLLOWING_TAG]: {
    url: `${baseUrl}/x/relation/tag/create`,
    _fetch: {
      method: 'post',
    },
    params: {
      tag: '', // 分组名称
      'x-bili-device-req-json': JSON.stringify({
        platform: 'web',
        device: 'pc',
        spmid: '333.1387',
      }),
    },
    afterHandle: AHS.J,
  },
  // 删除关注分组
  [BLBL.DELETE_FOLLOWING_TAG]: {
    url: `${baseUrl}/x/relation/tag/del`,
    _fetch: {
      method: 'post',
    },
    params: {
      tagid: 0, // 分组ID
      'x-bili-device-req-json': JSON.stringify({
        platform: 'web',
        device: 'pc',
        spmid: '333.1387',
      }),
    },
    afterHandle: AHS.J,
  },
}

export default api
