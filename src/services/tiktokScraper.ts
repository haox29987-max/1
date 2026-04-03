import axios from 'axios';
import * as cheerio from 'cheerio';

interface TikTokAccountStats {
  followerCount: number;
  followingCount: number;
  heartCount: number;
  videoCount: number;
  nickname: string;
  avatarUrl: string;
  userId: string;
}

interface TikTokVideo {
  id: string;
  desc: string;
  createTime: number;
  duration: number;
  category: string;
  stats: {
    diggCount: number;
    shareCount: number;
    commentCount: number;
    playCount: number;
  };
  coverUrl: string;
}

export async function fetchTikTokProfile(username: string): Promise<{ stats: TikTokAccountStats; videos: TikTokVideo[] }> {
  try {
    const url = `https://www.tiktok.com/@${username}`;
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
    };

    const response = await axios.get(url, { headers });
    const html = response.data;
    const $ = cheerio.load(html);

    let jsonData: any = null;

    // Try to find SIGI_STATE
    const sigiState = $('#SIGI_STATE').html();
    if (sigiState) {
      try {
        jsonData = JSON.parse(sigiState);
      } catch (e) {
        console.error('Failed to parse SIGI_STATE', e);
      }
    }

    // Try to find __UNIVERSAL_DATA_FOR_REHYDRATION__
    if (!jsonData) {
      const universalData = $('#__UNIVERSAL_DATA_FOR_REHYDRATION__').html();
      if (universalData) {
        try {
          jsonData = JSON.parse(universalData);
        } catch (e) {
          console.error('Failed to parse __UNIVERSAL_DATA_FOR_REHYDRATION__', e);
        }
      }
    }

    // Try to find regex match for SIGI_STATE assignment
    if (!jsonData) {
      const match = html.match(/SIGI_STATE\s*=\s*({.*?})\s*;/s);
      if (match && match[1]) {
        try {
          jsonData = JSON.parse(match[1]);
        } catch (e) {
          console.error('Failed to parse regex SIGI_STATE', e);
        }
      }
    }

    if (!jsonData) {
      throw new Error('Could not find TikTok data in page source.');
    }

    // Extract User Stats
    // Structure varies, need to be robust.
    // Usually in UserModule.users[username] or similar.
    let userModule = jsonData.UserModule?.users?.[username] || jsonData.UserModule?.users?.[Object.keys(jsonData.UserModule?.users || {})[0]];
    
    // Fallback for Universal Data structure
    if (!userModule && jsonData.__DEFAULT_SCOPE__?.['webapp.user-detail']?.userInfo?.user) {
        userModule = jsonData.__DEFAULT_SCOPE__['webapp.user-detail'].userInfo.user;
    }
    
    // Fallback for other structures
    if (!userModule) {
        // Try to find any object that looks like a user profile
        // This is a heuristic search if the structure changes
    }

    if (!userModule) {
       // If we can't find user module, maybe we can find stats directly
       const stats = jsonData.__DEFAULT_SCOPE__?.['webapp.user-detail']?.userInfo?.stats;
       if (stats) {
           userModule = { ...jsonData.__DEFAULT_SCOPE__['webapp.user-detail'].userInfo.user, ...stats };
       }
    }

    if (!userModule) {
        throw new Error('User module not found in JSON data.');
    }

    const stats: TikTokAccountStats = {
      followerCount: userModule.followerCount || userModule.stats?.followerCount || 0,
      followingCount: userModule.followingCount || userModule.stats?.followingCount || 0,
      heartCount: userModule.heartCount || userModule.stats?.heartCount || 0,
      videoCount: userModule.videoCount || userModule.stats?.videoCount || 0,
      nickname: userModule.nickname || userModule.uniqueId || username,
      avatarUrl: userModule.avatarLarger || userModule.avatarMedium || userModule.avatarThumb || '',
      userId: userModule.id || userModule.uid || '',
    };

    // Extract Videos
    const videos: TikTokVideo[] = [];
    const itemModule = jsonData.ItemModule || jsonData.itemModule;
    
    const extractCategory = (desc: string) => {
      const match = desc.match(/#(\w+)/);
      return match ? match[1] : '其他';
    };

    if (itemModule) {
      Object.values(itemModule).forEach((item: any) => {
        videos.push({
          id: item.id,
          desc: item.desc,
          createTime: item.createTime,
          duration: item.video?.duration || 0,
          category: extractCategory(item.desc),
          stats: {
            diggCount: item.stats?.diggCount || 0,
            shareCount: item.stats?.shareCount || 0,
            commentCount: item.stats?.commentCount || 0,
            playCount: item.stats?.playCount || 0,
          },
          coverUrl: item.video?.cover || item.video?.originCover || '',
        });
      });
    } else if (jsonData.__DEFAULT_SCOPE__?.['webapp.user-detail']?.itemList) {
         // Universal Data structure often has itemList
         jsonData.__DEFAULT_SCOPE__['webapp.user-detail'].itemList.forEach((item: any) => {
             videos.push({
                id: item.id,
                desc: item.desc,
                createTime: item.createTime,
                duration: item.video?.duration || 0,
                category: extractCategory(item.desc),
                stats: {
                    diggCount: item.stats?.diggCount || 0,
                    shareCount: item.stats?.shareCount || 0,
                    commentCount: item.stats?.commentCount || 0,
                    playCount: item.stats?.playCount || 0,
                },
                coverUrl: item.video?.cover || item.video?.originCover || '',
             });
         });
    }

    return { stats, videos };

  } catch (error) {
    console.error(`Error fetching TikTok profile for ${username}:`, error);
    throw error;
  }
}
