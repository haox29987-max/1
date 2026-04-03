import { useEffect, useState, useMemo, useRef } from 'react';
import { api, Video, ProductInfo } from '@/api';
import { format } from 'date-fns';

export type SortKey = 'play_count' | 'digg_count' | 'comment_count' | 'share_count' | 'create_time' | 'duration' | 'vq_score' | 'collect_count';
export type SortOrder = 'asc' | 'desc';

export function useAccountDetailLogic(id: string | undefined) {
  const [days, setDays] = useState<number>(30); 
  const [data, setData] = useState<any>(() => {
    try {
      const cache = sessionStorage.getItem(`account_detail_cache_${id}_30`);
      return cache ? JSON.parse(cache) : null;
    } catch(e) { return null; }
  });
  const [loading, setLoading] = useState(() => {
    try {
      const cache = sessionStorage.getItem(`account_detail_cache_${id}_30`);
      return cache ? false : true;
    } catch(e) { return true; }
  });
  
  const [updateLimit, setUpdateLimit] = useState(30);
  const [progress, setProgress] = useState<{total: number, current: number, status: string, done: boolean} | null>(null);

  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [addingVideo, setAddingVideo] = useState(false);
  const [pinnedVideos, setPinnedVideos] = useState<{id: string, type: 'new' | 'updated'}[]>([]);
  const [isManualSort, setIsManualSort] = useState<boolean>(false);
  const [refreshingVideos, setRefreshingVideos] = useState<string[]>([]);
  
  const [retryingFailed, setRetryingFailed] = useState(false);

  const [sortKey, setSortKey] = useState<SortKey>('create_time');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [modalSortKey, setModalSortKey] = useState<SortKey>('create_time');
  const [modalSortOrder, setModalSortOrder] = useState<SortOrder>('desc');

  const [zoomScale, setZoomScale] = useState(1);
  const [enlargedChartType, setEnlargedChartType] = useState<'trend' | 'play' | null>(null);
  const [isEnlargedChartRendering, setIsEnlargedChartRendering] = useState(false);
  const [hiddenLines, setHiddenLines] = useState<string[]>([]);

  const [videoListModal, setVideoListModal] = useState<{ title: string; videos: Video[]; loading?: boolean } | null>(null);
  const [videoTrendModal, setVideoTrendModal] = useState<{videoId: string, title: string, data: any[]} | null>(null);
  const [trendDays, setTrendDays] = useState<number>(30);
  const [isTrendLoading, setIsTrendLoading] = useState(false);
  
  const [followerTrendModal, setFollowerTrendModal] = useState(false);
  const [isFollowerChartRendering, setIsFollowerChartRendering] = useState(false);

  const [activeTrendVids, setActiveTrendVids] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(`trendVids_${id}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
      return [];
    } catch(e) { return []; }
  });
  
  const [top10Trends, setTop10Trends] = useState<any[]>([]);
  const [isTop10Loading, setIsTop10Loading] = useState(false);
  const [trendRefreshTrigger, setTrendRefreshTrigger] = useState(0);

  const [showScrollTop, setShowScrollTop] = useState(false);
  const isWorkingRef = useRef(false);

  const [productModal, setProductModal] = useState<{pid: string, info: ProductInfo | null, loading: boolean} | null>(null);
  const [currentImgIndex, setCurrentImgIndex] = useState(0);

  const latestVideoTime = useMemo(() => {
    if (!data?.videos || data.videos.length === 0) return null;
    return Math.max(...data.videos.map((v:any) => Number(v.create_time) || 0));
  }, [data?.videos]);

  const timeSince = (timestamp: number | string | undefined | null) => {
    if (!timestamp) return '尚未建立记录';
    try {
        const date = new Date(typeof timestamp === 'number' ? timestamp * 1000 : String(timestamp).replace(/-/g, '/').replace('T', ' '));
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        if (isNaN(diffMs) || diffMs < 0) return '未知';
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 60) return `${diffMins} 分钟前`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours} 小时 ${diffMins % 60} 分钟前`;
        const diffDays = Math.floor(diffHours / 24);
        return `${diffDays} 天 ${diffHours % 24} 小时前`;
    } catch(e) { return '未知'; }
  };

  const fetchData = async () => {
    if (!id) return;
    const currentCacheKey = `account_detail_cache_${id}_${days}`;
    let cached = null;
    try { cached = sessionStorage.getItem(currentCacheKey); } catch(e) {}
    if (cached) {
      try {
        setData(JSON.parse(cached));
        setLoading(false);
        fetchSilentData();
        return;
      } catch(e) {}
    }
    setLoading(true);
    try {
      const res = await api.getAccountDetails(parseInt(id), days);
      setData(res);
      try { sessionStorage.setItem(currentCacheKey, JSON.stringify(res)); } catch(e){}
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const fetchSilentData = async () => {
    if (!id) return;
    try {
      const res = await api.getAccountDetails(parseInt(id), days);
      setData(res);
      setTrendRefreshTrigger(prev => prev + 1);
      const currentCacheKey = `account_detail_cache_${id}_${days}`;
      try { sessionStorage.setItem(currentCacheKey, JSON.stringify(res)); } catch(e){}
    } catch (error) {}
  };

  useEffect(() => { fetchData(); }, [id, days]);

  useEffect(() => {
    if (!id) return;
    let isChecking = false;
    const pollProgress = async () => {
      if (isChecking) return;
      isChecking = true;
      try {
        const prog = await api.getRefreshProgress(parseInt(id));
        if (prog && !prog.done) {
          setProgress(prog);
          isWorkingRef.current = true;
        } else if (prog && prog.done) {
          if (isWorkingRef.current) {
            isWorkingRef.current = false;
            setProgress(prog);
            fetchSilentData();
            setTimeout(() => setProgress(null), 3500);
          }
        }
      } catch(e) {} finally { isChecking = false; }
    };
    pollProgress();
    const interval = setInterval(pollProgress, 1500);
    return () => clearInterval(interval);
  }, [id, days]); 

  useEffect(() => {
    if (data?.videos && data.videos.length > 0 && activeTrendVids.length === 0) {
       try {
         const saved = localStorage.getItem(`trendVids_${id}`);
         if (!saved || JSON.parse(saved).length === 0) {
            const top10 = [...data.videos].sort((a,b) => b.play_count - a.play_count).slice(0, 10).map(v => v.video_id);
            setActiveTrendVids(top10);
         }
       } catch (e) {}
    }
  }, [data?.videos, id]);

  useEffect(() => {
    if (activeTrendVids.length > 0) { localStorage.setItem(`trendVids_${id}`, JSON.stringify(activeTrendVids)); }
  }, [activeTrendVids, id]);

  useEffect(() => {
    const handleScroll = (e: Event) => {
      const target = e.target as HTMLElement | Document;
      if (target instanceof HTMLElement && target.closest && target.closest('[role="dialog"]')) return;
      const scrollTop = target instanceof Document ? document.documentElement.scrollTop : target.scrollTop;
      setShowScrollTop(scrollTop > 300);
    };
    const mainScrollContainer = document.getElementById('main-scroll-container');
    if (mainScrollContainer) mainScrollContainer.addEventListener('scroll', handleScroll, true);
    return () => { if (mainScrollContainer) mainScrollContainer.removeEventListener('scroll', handleScroll, true); }
  }, []);

  const scrollToTop = () => {
    const mainScrollContainer = document.getElementById('main-scroll-container');
    if (mainScrollContainer) mainScrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToVideoCard = (vid: string) => { document.getElementById(`video-card-${vid}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); };

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if ((e.ctrlKey || e.metaKey) && enlargedChartType) {
        e.preventDefault(); 
        setZoomScale(prev => {
          const newScale = e.deltaY < 0 ? prev * 1.15 : prev / 1.15;
          return Math.max(1, Math.min(newScale, 10)); 
        });
      }
    };
    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => window.removeEventListener('wheel', handleWheel);
  }, [enlargedChartType]); 

  useEffect(() => {
    if (!enlargedChartType && !videoTrendModal && !followerTrendModal) setZoomScale(1);
  }, [enlargedChartType, videoTrendModal, followerTrendModal]);

  const handleRefresh = async () => {
    if (!id) return;
    setProgress({ total: updateLimit, current: 0, status: '正在下发更新指令...', done: false });
    isWorkingRef.current = true; 
    try { 
      await api.refreshAccount(parseInt(id), updateLimit); 
      setProgress({ total: updateLimit, current: 0, status: '数据抓取排队中...', done: false });
    } catch (error) { 
      console.error(error); 
      setProgress(null);
      isWorkingRef.current = false;
      alert('更新失败，请重试！');
    }
  };

  const handleAddManualVideo = async () => {
    if (!newVideoUrl || !newVideoUrl.includes("tiktok.com")) { alert("请输入有效的 TikTok 视频链接！"); return; }
    if (!id) return;
    const match = newVideoUrl.match(/\/video\/(\d+)/);
    const extractedVid = match ? match[1] : null;

    setAddingVideo(true);
    try {
      await api.addManualVideo(parseInt(id), newVideoUrl.trim());
      setNewVideoUrl("");
      if (extractedVid) {
        setPinnedVideos(prev => [{id: extractedVid, type: 'new'}, ...prev.filter(item => item.id !== extractedVid)]);
        setIsManualSort(false); 
      }
      setTimeout(() => fetchSilentData(), 4000); 
    } catch(e) { alert("添加失败，网络错误或链接格式不对"); } finally { setAddingVideo(false); }
  };

  const handleRetryFailedVideos = async () => {
    if (!id) return;
    const failedCount = data?.account?.failed_video_count || (data?.videos || []).filter((v: any) => v.sync_status === 0).length;
    if (failedCount === 0) {
      alert('当前没有抓取失败的视频');
      return;
    }
    if (!window.confirm(`确定要重新抓取这 ${failedCount} 个失败的视频吗？\n将强制重新同步并更新这批数据。`)) return;
    
    setRetryingFailed(true);
    setProgress({ total: failedCount, current: 0, status: '正在下发重试指令...', done: false });
    isWorkingRef.current = true;
    try {
      await api.retryFailedVideos(parseInt(id));
      setProgress({ total: failedCount, current: 0, status: '重试抓取排队中...', done: false });
    } catch(e) {
      console.error(e);
      alert('下发重试指令失败');
      setProgress(null);
      isWorkingRef.current = false;
    } finally {
      setRetryingFailed(false);
    }
  };

  const handleDeleteVideo = async (videoId: string) => {
    if (window.confirm("确定将此视频链接移入回收站吗？\n移入回收站后批量更新将自动忽略此视频。\n(若误删可在左侧【回收站】中将其恢复)")) {
      await api.deleteVideo(videoId); fetchData(); 
    }
  };

  const handleSingleRefresh = async (videoId: string) => {
    if (!id) return;
    setRefreshingVideos(prev => [...prev, videoId]); 
    setPinnedVideos(prev => [{id: videoId, type: 'updated'}, ...prev.filter(item => item.id !== videoId)]);
    setIsManualSort(false);
    try {
      await api.refreshSingleVideo(videoId, parseInt(id));
      setTimeout(() => fetchSilentData(), 4000); 
    } catch (e) { alert("分析请求失败，请重试！"); } finally { setRefreshingVideos(prev => prev.filter(vid => vid !== videoId)); }
  };

  const handleExport = async () => {
    if (!id || !data?.account) return;
    try {
      const exportData = await api.exportAccountData(parseInt(id));
      const BOM = '\uFEFF';
      const a = exportData.account;
      let accCsv = BOM + "账号ID,自定义重命名,系统获取作者名,抖音用户名,所属分组,所在国家,系统发现注册时间,最后一次数据同步时间\n";
      accCsv += `${a.id},${a.custom_name || ''},${a.nickname || ''},${a.username},${a.group_name || '默认分组'},${a.country || '未知'},${a.reg_time || '未知'},${a.last_updated}\n`;

      let pidCsv = BOM + "视频ID,账号自定义名,抖音用户名,所在国家,所属分组,播放量,点赞量,评论数,分享数,发布时间,视频类型,抓取的商品PID,商品所属类目\n";
      exportData.videos.forEach((v: any) => {
         const createTime = new Date((Number(v.create_time) || 0) * 1000).toLocaleString();
         pidCsv += `${v.video_id},${v.custom_name || ''},${v.account_username},${v.country || '未知'},${v.group_name || '默认分组'},${v.play_count || 0},${v.digg_count || 0},${v.comment_count || 0},${v.share_count || 0},${createTime},${v.video_type || ''},${v.pid || ''},${v.product_category || ''}\n`;
      });

      const downloadFile = (content: string, filename: string) => {
         const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
         const url = URL.createObjectURL(blob);
         const link = document.createElement('a');
         link.setAttribute('href', url);
         link.setAttribute('download', filename);
         document.body.appendChild(link);
         link.click();
         document.body.removeChild(link);
      };
      const timeStr = format(new Date(), 'MMdd_HHmm');
      const safeName = a.custom_name || a.username;
      downloadFile(accCsv, `[${safeName}]_账号基本资料_${timeStr}.csv`);
      downloadFile(pidCsv, `[${safeName}]_关联PID视频明细_${timeStr}.csv`);
    } catch (e) { alert("数据导出请求失败，请稍后重试！"); }
  };

  const handleOpenVideoTrend = async (videoId: string, desc: string, forceDays?: number) => {
    const queryDays = forceDays !== undefined ? forceDays : trendDays;
    setIsTrendLoading(true);
    const safeDesc = String(desc || '');
    setVideoTrendModal({ videoId, title: safeDesc ? safeDesc.substring(0, 30) + '... 真实新增趋势' : '单日真实新增量趋势', data: [] }); 
    try {
      const [trendData] = await Promise.all([
         api.getVideoTrend(videoId, queryDays),
         new Promise(resolve => setTimeout(resolve, 250))
      ]);
      setVideoTrendModal(prev => prev ? { ...prev, data: trendData } : null);
      if (forceDays !== undefined) setTrendDays(forceDays);
    } catch (e) { console.error("加载趋势失败", e); } finally { setIsTrendLoading(false); }
  };

  const handlePidClick = async (pid: string) => {
    setProductModal({ pid: String(pid), info: null, loading: true });
    setCurrentImgIndex(0);
    try {
      const [info] = await Promise.all([api.getProductInfo(String(pid)), new Promise(r => setTimeout(r, 250))]);
      setProductModal({ pid: String(pid), info, loading: false });
    } catch(e) { console.error("加载商品详情失败", e); setProductModal(prev => prev ? {...prev, loading: false} : null); }
  };

  const openEnlargedChart = (type: 'trend' | 'play') => {
    setEnlargedChartType(type); setIsEnlargedChartRendering(true);
    setTimeout(() => setIsEnlargedChartRendering(false), 250);
  };

  const openFollowerTrend = () => {
    setFollowerTrendModal(true); setIsFollowerChartRendering(true);
    setTimeout(() => setIsFollowerChartRendering(false), 250);
  };

  const handlePlayTrendClick = (clickedDate: string) => {
    if (!data?.videos || !clickedDate) return;
    setVideoListModal({ title: `${clickedDate} 发布的视频`, videos: [], loading: true });
    setTimeout(() => {
       const filtered = data.videos.filter((v:any) => {
           const ts = (Number(v.create_time) || 0) * 1000;
           const d = new Date(ts);
           return !isNaN(d.getTime()) && format(d, 'yyyy-MM-dd') === clickedDate;
       });
       setVideoListModal({ title: `${clickedDate} 发布的视频`, videos: filtered, loading: false });
    }, 250);
  };

  const sortedVideos = useMemo(() => {
    if (!data?.videos) return [];
    let result = [...data.videos].sort((a, b) => {
      const valA = Number(a[sortKey]) || 0;
      const valB = Number(b[sortKey]) || 0;
      return sortOrder === 'asc' ? valA - valB : valB - valA;
    });

    // 🚀 新增优化：强制将失败视频置于列表的最上方，让你一眼就能看到这些带有红框的视频！
    if (!isManualSort) {
      const failedItems = result.filter(v => v.sync_status === 0);
      const normalItems = result.filter(v => v.sync_status !== 0);
      result = [...failedItems, ...normalItems];
    }

    if (!isManualSort && pinnedVideos.length > 0) {
      const pinnedIds = pinnedVideos.map(q => q.id);
      const pinnedItems = pinnedVideos.map(q => result.find(v => v.video_id === q.id)).filter(Boolean) as Video[];
      const normalItems = result.filter(v => !pinnedIds.includes(v.video_id));
      return [...pinnedItems, ...normalItems];
    }
    
    return result;
  }, [data?.videos, sortKey, sortOrder, pinnedVideos, isManualSort]);

  const globalVideoIndexMap = useMemo(() => {
    const map: Record<string, number> = {};
    if (!data?.videos) return map;
    const descendingList = [...data.videos].sort((a, b) => {
      const valA = Number(a['play_count']) || 0;
      const valB = Number(b['play_count']) || 0;
      return valB - valA; 
    });
    descendingList.forEach((v, index) => { map[v.video_id] = index + 1; });
    return map;
  }, [data?.videos]);

  const handleToggleTrendVid = (vid: string) => { setActiveTrendVids(prev => prev.includes(vid) ? prev.filter(i => i !== vid) : [...prev, vid]); };

  const sortedActiveTrendVids = useMemo(() => {
    return [...activeTrendVids].sort((a, b) => {
      const idxA = Number(globalVideoIndexMap[a]) || 9999;
      const idxB = Number(globalVideoIndexMap[b]) || 9999;
      return idxA - idxB;
    });
  }, [activeTrendVids, globalVideoIndexMap]);

  useEffect(() => {
    let isMounted = true;
    const fetchTrends = async () => {
      if (activeTrendVids.length === 0) { setTop10Trends([]); return; }
      setIsTop10Loading(true);
      try {
        const promises = activeTrendVids.map(vid => api.getVideoTrend(vid, days));
        const results = await Promise.all(promises);
        if (!isMounted) return;
        
        const dateMap: Record<string, any> = {};
        results.forEach((trendData, index) => {
           const vidId = activeTrendVids[index];
           const vidKey = `v_${vidId}`; 
           trendData.forEach((pt: any) => {
              if (!dateMap[pt.date]) dateMap[pt.date] = { date: pt.date };
              dateMap[pt.date][vidKey] = pt.plays;
           });
        });
        const merged = Object.keys(dateMap).sort().map(k => dateMap[k]);
        setTop10Trends(merged);
      } catch (e) { console.error(e); } finally { if (isMounted) setIsTop10Loading(false); }
    };
    fetchTrends();
    return () => { isMounted = false; };
  }, [activeTrendVids.join(','), days, trendRefreshTrigger]);

  const handleLegendClick = (e: any) => {
    if (!e || !e.dataKey) return;
    const dataKey = String(e.dataKey); 
    const allKeys = sortedActiveTrendVids.map(vid => `v_${vid}`);
    
    setHiddenLines(prevHidden => {
      const currentVisible = allKeys.filter(k => !prevHidden.includes(k));
      if (currentVisible.length === allKeys.length) return allKeys.filter(k => k !== dataKey);
      if (currentVisible.includes(dataKey)) {
        const newVisible = currentVisible.filter(k => k !== dataKey);
        if (newVisible.length === 0) return []; 
        return allKeys.filter(k => !newVisible.includes(k));
      } else {
        const newVisible = [...currentVisible, dataKey];
        if (newVisible.length === allKeys.length) return []; 
        return allKeys.filter(k => !newVisible.includes(k));
      }
    });
  };

  const sortedModalVideos = useMemo(() => {
      if (!videoListModal?.videos) return [];
      return [...videoListModal.videos].sort((a, b) => {
        const valA = Number(a[modalSortKey as SortKey]) || 0;
        const valB = Number(b[modalSortKey as SortKey]) || 0;
        return modalSortOrder === 'asc' ? valA - valB : valB - valA;
      });
  }, [videoListModal?.videos, modalSortKey, modalSortOrder]);

  const isWorking = progress !== null && !progress.done;

  const TOPTEN_COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1'];
  const sortOptions: { label: string; key: SortKey }[] = [
    { label: '发布时间', key: 'create_time' }, { label: '播放量', key: 'play_count' },
    { label: '点赞量', key: 'digg_count' }, { label: '评论数', key: 'comment_count' },
    { label: '收藏数', key: 'collect_count' }, { label: '画质得分', key: 'vq_score' }
  ];

  return {
    days, setDays, data, loading, updateLimit, setUpdateLimit, progress,
    newVideoUrl, setNewVideoUrl, addingVideo, setAddingVideo,
    pinnedVideos, setPinnedVideos, isManualSort, setIsManualSort,
    refreshingVideos, setRefreshingVideos, sortKey, setSortKey, sortOrder, setSortOrder,
    modalSortKey, setModalSortKey, modalSortOrder, setModalSortOrder,
    zoomScale, setZoomScale, enlargedChartType, setEnlargedChartType,
    isEnlargedChartRendering, setIsEnlargedChartRendering, hiddenLines, setHiddenLines,
    videoListModal, setVideoListModal, videoTrendModal, setVideoTrendModal,
    trendDays, setTrendDays, isTrendLoading, setIsTrendLoading,
    followerTrendModal, setFollowerTrendModal, isFollowerChartRendering, setIsFollowerChartRendering,
    activeTrendVids, setActiveTrendVids, top10Trends, setTop10Trends, isTop10Loading, setIsTop10Loading,
    showScrollTop, setShowScrollTop, productModal, setProductModal, currentImgIndex, setCurrentImgIndex,
    latestVideoTime, timeSince, scrollToTop, scrollToVideoCard, handleRefresh, handleAddManualVideo,
    handleDeleteVideo, handleSingleRefresh, handleExport, handleOpenVideoTrend, handlePidClick,
    openEnlargedChart, openFollowerTrend, handlePlayTrendClick, sortedVideos, globalVideoIndexMap,
    handleToggleTrendVid, sortedActiveTrendVids, handleLegendClick, sortedModalVideos, isWorking,
    TOPTEN_COLORS, sortOptions, 
    retryingFailed, handleRetryFailedVideos 
  };
}