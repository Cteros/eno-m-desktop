// 这个文件不要引用其他文件，我怕打包时候会把引用的部分也打包成两分
// en: This file should not reference other files, I am afraid that the referenced part will also be packaged into two parts when packaging

enum BLBL {
  GET_COOKIE = 'getCookie',
  GET_RANK = 'getRank',
  GET_RANK_DETAIL = 'getRankDetail',
  GET_RANK_DETAIL_LIST = 'getRankDetailList',
  GET_SONG_DETAIL = 'getSongDetail',
  GET_HIT_SONG = 'getHitSong',
  GET_HIT_SONG_LIST = 'getHitSongList',
  GET_SONG = 'getSong',
  GET_MENU_RANK = 'getMenuRank',
  GET_SONG_INFO = 'getSongInfo',
  SEARCH = 'search',
  GET_AUDIO_OF_VIDEO = 'getAudioOfVideo',
  GET_VIDEO_INFO = 'getVideoInfo',
  GET_USER_INFO = 'getUserInfo',
  GET_RANKING = 'getRanking',
  GET_MUSIC_RANK_LIST = 'getMusicRankList',
  GET_MUSIC_RANK = 'getMusicRank',
  GET_FAV_INFO = 'getFavInfo',
  GET_FAV_LIST = 'getFavList', // 获取用户收藏夹列表
  GET_FAV_RESOURCE_LIST = 'getFavResourceList', // 获取收藏夹内资源
  GET_COLLECTED_FAV_LIST = 'getCollectedFavList', // 获取收集的收藏夹/合集
  ADD_SONG_TO_FAV = 'addSongToFav', // 添加资源到收藏夹
  DEL_SONG_FROM_FAV = 'delSongFromFav', // 从收藏夹移除资源
  CREATE_FAV_FOLDER = 'createFavFolder', // 创建收藏夹
  GET_USER_ARC = 'getUserArc', // 获取用户投稿视频
  GET_NAV = 'getNav', // 获取当前登录用户信息
  RELATION_MODIFY = 'relationModify', // 关注/取消关注
  GET_COLLECTION_INFO = 'getCollectionInfo', // 获取视频合集信息
  GET_SERIES_INFO = 'getSeriesInfo', // 获取指定系列信息
  GET_SEASONS_SERIES_LIST = 'getSeasonsSeriesList', // 获取系列和合集列表
  GET_FOLLOWING_LIST = 'getFollowingList', // 获取关注列表
  GET_FOLLOWING_TAGS = 'getFollowingTags', // 获取关注分组列表
  GET_FOLLOWING_TAG_USERS = 'getFollowingTagUsers', // 获取分组下的用户列表
  CREATE_FOLLOWING_TAG = 'createFollowingTag', // 创建关注分组
  DELETE_FOLLOWING_TAG = 'deleteFollowingTag', // 删除关注分组
  ADD_USER_TO_TAGS = 'addUserToTags', // 添加用户到分组
}

const API = {
  BLBL,
}

export {
  API,
  BLBL,
}

export default API
