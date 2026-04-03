import { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { api, WarningVideo, ProductInfo } from '@/api';
import { format } from 'date-fns';
import { 
  Loader2, Zap, Tag, Music, ExternalLink, Play, Heart, MessageCircle, 
  Share2, Bookmark, Focus, Trash2, Clock, Activity, AlertTriangle, 
  Search, Download, Folder, Globe, ShieldAlert, X, Check,
  ChevronDown, ChevronUp, ChevronLeft, ChevronRight
} from 'lucide-react';
import { AreaChart as AreaChartIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export function WarningCenter() {
  const navigate = useNavigate();
  const [videos, setVideos] = useState<WarningVideo[]>([]);
  const [loading, setLoading] = useState(false);
  
  // 🔥 全面加入 sessionStorage 初始化记忆
  const [activeTab, setActiveTab] = useState<'normal' | 'growth' | 'low'>(() => (sessionStorage.getItem('warn_mem_tab') as any) || 'normal');
  const [searchQuery, setSearchQuery] = useState(() => sessionStorage.getItem('warn_mem_search') || '');
  const [listGroupFilter, setListGroupFilter] = useState(() => sessionStorage.getItem('warn_mem_group') || 'all');
  const [listCountryFilter, setListCountryFilter] = useState(() => sessionStorage.getItem('warn_mem_country') || 'all');
  const [listTypeFilter, setListTypeFilter] = useState(() => sessionStorage.getItem('warn_mem_type') || 'all');
  const [days, setDays] = useState<number>(() => parseInt(sessionStorage.getItem('warn_mem_days') || '30'));
  
  const [isMultiSelect, setIsMultiSelect] = useState(false);
  const [selectedVideoIds, setSelectedVideoIds] = useState<Set<number>>(new Set());

  // 🔥 懒加载与折叠状态记忆
  const [visibleGroupsCount, setVisibleGroupsCount] = useState<number>(() => parseInt(sessionStorage.getItem('warn_mem_visible_count') || '5'));
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => {
    const saved = sessionStorage.getItem('warn_mem_expanded');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  const [refreshingVideos, setRefreshingVideos] = useState<string[]>([]);
  
  // 图表 Modal 逻辑
  const [trendOpen, setTrendOpen] = useState(false);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [trendLoading, setTrendLoading] = useState(false);
  const [trendTitle, setTrendTitle] = useState('');

  // 产品弹窗 Modal 逻辑 
  const [productInfo, setProductInfo] = useState<ProductInfo | null>(null);
  const [productLoading, setProductLoading] = useState(false);
  const [activePid, setActivePid] = useState('');
  const [currentImgIndex, setCurrentImgIndex] = useState(0);
  const [isImageFullScreen, setIsImageFullScreen] = useState(false);

  const fetchWarnings = async () => {
    setLoading(true);
    try {
      const data = await api.getWarningVideos(activeTab);
      setVideos(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWarnings();
  }, [activeTab]);

  // 处理全局滚动条懒加载 (触底加 5 个组)
  useEffect(() => {
    const container = document.getElementById('main-scroll-container');
    if (!container) return;
    const handleScroll = () => {
      if (container.scrollHeight - container.scrollTop - container.clientHeight < 300) {
        setVisibleGroupsCount(prev => prev + 5);
      }
    };
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // 🔥 状态变化时实时保存到 sessionStorage
  useEffect(() => { sessionStorage.setItem('warn_mem_tab', activeTab); }, [activeTab]);
  useEffect(() => { sessionStorage.setItem('warn_mem_search', searchQuery); }, [searchQuery]);
  useEffect(() => { sessionStorage.setItem('warn_mem_group', listGroupFilter); }, [listGroupFilter]);
  useEffect(() => { sessionStorage.setItem('warn_mem_country', listCountryFilter); }, [listCountryFilter]);
  useEffect(() => { sessionStorage.setItem('warn_mem_type', listTypeFilter); }, [listTypeFilter]);
  useEffect(() => { sessionStorage.setItem('warn_mem_days', days.toString()); }, [days]);
  useEffect(() => { sessionStorage.setItem('warn_mem_visible_count', visibleGroupsCount.toString()); }, [visibleGroupsCount]);
  useEffect(() => { sessionStorage.setItem('warn_mem_expanded', JSON.stringify(Array.from(expandedGroups))); }, [expandedGroups]);

  // 🔥 切换分类或搜索条件时重置状态 (重置为全部折叠)
  // 使用 isMounted 防止在首次加载（带记忆恢复）时误触重置
  const isMounted = useRef(false);
  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true;
      return; // 首次加载跳过，保留记忆
    }
    // 只有用户主动修改了条件，才将页面重置回初始展开状态
    setVisibleGroupsCount(5);
    setSelectedVideoIds(new Set());
    setExpandedGroups(new Set()); 
  }, [activeTab, searchQuery, listGroupFilter, listCountryFilter, listTypeFilter, days]);

  const availableGroups = useMemo(() => Array.from(new Set(videos.map(v => v.group_name || '默认分组'))).sort(), [videos]);
  const availableCountries = useMemo(() => Array.from(new Set(videos.map(v => v.country || '未知'))).sort(), [videos]);

  // 前端过滤与作者分组计算
  const filteredGroupedVideos = useMemo(() => {
    const filtered = videos.filter(v => {
      const matchesGroup = listGroupFilter === 'all' || (v.group_name || '默认分组') === listGroupFilter;
      const matchesCountry = listCountryFilter === 'all' || (v.country || '未知') === listCountryFilter;
      const matchesType = listTypeFilter === 'all' || ((v as any).account_type === listTypeFilter);
      const matchesSearch = searchQuery === '' || 
        (v.account_username?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (v.nickname?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (v.desc?.toLowerCase().includes(searchQuery.toLowerCase()));
      
      // 新增：日期筛选逻辑计算
      let matchesDays = true;
      if (days !== 0) {
        const createTimeMs = (Number(v.create_time) || 0) * 1000;
        const cutoffTimeMs = Date.now() - days * 24 * 60 * 60 * 1000;
        matchesDays = createTimeMs >= cutoffTimeMs;
      }
      
      return matchesGroup && matchesCountry && matchesType && matchesSearch && matchesDays;
    });

    const groupMap: Record<string, { account: any, vids: WarningVideo[] }> = {};
    filtered.forEach(v => {
      const key = v.account_username || '未知账号';
      if (!groupMap[key]) {
        groupMap[key] = { 
          account: { id: v.account_id, username: key, nickname: v.nickname, avatar: v.avatar_url, group: v.group_name, country: v.country, type: (v as any).account_type }, 
          vids: [] 
        };
      }
      groupMap[key].vids.push(v);
    });

    return Object.values(groupMap).sort((a, b) => {
      if (activeTab === 'normal') return Math.max(...b.vids.map(v => v.play_count)) - Math.max(...a.vids.map(v => v.play_count));
      if (activeTab === 'growth') return Math.max(...b.vids.map(v => v.daily_growth)) - Math.max(...a.vids.map(v => v.daily_growth));
      return Math.min(...a.vids.map(v => v.create_time)) - Math.min(...b.vids.map(v => v.create_time));
    });
  }, [videos, listGroupFilter, listCountryFilter, listTypeFilter, searchQuery, days, activeTab]);

  // 展开/折叠作者区块
  const toggleGroupExpand = (username: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(username)) next.delete(username); else next.add(username);
      return next;
    });
  };

  const handleExport = () => {
    if (filteredGroupedVideos.length === 0) return alert("没有可导出的数据");
    const rows = [["账号ID", "账号昵称", "视频ID", "视频描述", "发布时间", "播放量", "日增播放", "点赞", "评论", "PID", "分组", "国家", "账号类型", "视频链接"]];
    filteredGroupedVideos.forEach(group => {
      group.vids.forEach(v => {
        const createDate = new Date((Number(v.create_time) || 0) * 1000);
        const dateStr = isNaN(createDate.getTime()) ? '未知时间' : format(createDate, 'yyyy-MM-dd HH:mm');
        const url = v.url || `https://www.tiktok.com/@${v.account_username}/video/${v.video_id}`;
        rows.push([
          v.account_username || '', v.nickname || '', String(v.video_id || ''), `"${(v.desc || '').replace(/"/g, '""')}"`, 
          dateStr, String(v.play_count || 0), String(v.daily_growth || 0), String(v.digg_count || 0), String(v.comment_count || 0),
          String(v.pid || ''), v.group_name || '', v.country || '', group.account.type === 'internal' ? '内部号' : '外部号', url
        ]);
      });
    });
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + rows.map(e => e.join(",")).join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `预警数据导出_${activeTab}_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSingleRefresh = async (videoId: string, accountId: number) => {
    setRefreshingVideos(prev => [...prev, videoId]);
    try {
      await api.refreshSingleVideo(videoId, accountId);
      setTimeout(fetchWarnings, 3000);
    } catch (e) {
      alert("抓取失败");
    } finally {
      setRefreshingVideos(prev => prev.filter(id => id !== videoId));
    }
  };

  const handleDeleteVideo = async (videoId: string) => {
    if (!window.confirm("确定要将此预警视频移入回收站吗？")) return;
    try {
      await api.deleteVideo(videoId);
      setVideos(prev => prev.filter(v => v.video_id !== videoId));
    } catch (error) {
      alert("删除失败");
    }
  };

  const handleBatchDelete = async () => {
    if (selectedVideoIds.size === 0) return alert('请先选择需要操作的视频');
    if (!window.confirm(`确定将选中的 ${selectedVideoIds.size} 个视频移入回收站吗？`)) return;
    try {
      await api.batchDeleteVideos(Array.from(selectedVideoIds));
      setVideos(prev => prev.filter(v => !selectedVideoIds.has(v.id)));
      setSelectedVideoIds(new Set());
    } catch (e) {
      alert("批量删除失败");
    }
  };

  const handleSelectAll = () => {
    const allIds = new Set<number>();
    filteredGroupedVideos.forEach(g => g.vids.forEach(v => allIds.add(v.id)));
    setSelectedVideoIds(allIds);
  };

  const toggleVideoSelection = (id: number) => {
    setSelectedVideoIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAuthorSelection = (group: { account: any, vids: WarningVideo[] }) => {
    const groupVideoIds = group.vids.map(v => v.id);
    const isAllSelected = groupVideoIds.length > 0 && groupVideoIds.every(id => selectedVideoIds.has(id));

    setSelectedVideoIds(prev => {
      const next = new Set(prev);
      if (isAllSelected) {
        groupVideoIds.forEach(id => next.delete(id)); // 反选
      } else {
        groupVideoIds.forEach(id => next.add(id));    // 全选
      }
      return next;
    });
  };

  const handlePidClick = async (pid: string) => {
    const cleanPid = String(pid).replace(/[^a-zA-Z0-9]/g, '');
    setActivePid(cleanPid);
    setProductInfo(null);
    setCurrentImgIndex(0);
    setProductLoading(true);
    try {
      const info = await api.getProductInfo(cleanPid);
      setProductInfo(info);
    } catch (e) {
      alert("获取商品详情失败，请检查网络或PID是否正确");
    } finally {
      setProductLoading(false);
    }
  };

  const handleOpenVideoTrend = async (videoId: string, desc: string) => {
    setTrendTitle(desc || '视频播放趋势');
    setTrendOpen(true);
    setTrendLoading(true);
    try {
      const data = await api.getVideoTrend(videoId, 30);
      setTrendData(data);
    } catch (e) {
      console.error(e);
    } finally {
      setTrendLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-24 relative">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2 text-slate-900">
            <AlertTriangle className="text-amber-500" /> 视频流量预警中心
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            自动追踪爆款、日增长异动与沉寂低播数据（当前符合条件：<strong className="text-indigo-600 px-1">{filteredGroupedVideos.length}</strong>个账号）
          </p>
        </div>
      </div>

      <div className="flex bg-slate-100 p-1 rounded-lg w-full max-w-2xl gap-1 overflow-x-auto">
        <button onClick={() => setActiveTab('normal')} className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-semibold rounded-md transition-all whitespace-nowrap ${activeTab === 'normal' ? 'bg-white shadow-sm text-red-600' : 'text-slate-500 hover:text-slate-800'}`}>🚀 正常流量预警</button>
        <button onClick={() => setActiveTab('growth')} className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-semibold rounded-md transition-all whitespace-nowrap ${activeTab === 'growth' ? 'bg-white shadow-sm text-amber-600' : 'text-slate-500 hover:text-slate-800'}`}>⚡ 日增长极速预警</button>
        <button onClick={() => setActiveTab('low')} className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-semibold rounded-md transition-all whitespace-nowrap ${activeTab === 'low' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-800'}`}>🧊 低播沉寂预警</button>
      </div>

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant={isMultiSelect ? "default" : "outline"} size="sm" onClick={() => { setIsMultiSelect(!isMultiSelect); setSelectedVideoIds(new Set()); }} className={`h-9 ${isMultiSelect ? 'bg-indigo-600 hover:bg-indigo-700 shadow-md' : 'border-slate-300'}`}>
            {isMultiSelect ? '退出批量选择' : '批量管理视频'}
          </Button>
          <div className="w-px h-6 bg-slate-200 mx-1"></div>
          
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <Input placeholder="搜索作者或描述..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-40 sm:w-48 h-9 pl-8 pr-8 text-sm" />
            {searchQuery && (
              <X 
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer hover:text-slate-600 transition-colors" 
                size={14} 
                onClick={() => setSearchQuery('')} 
              />
            )}
          </div>

          <Select value={days.toString()} onValueChange={(v) => setDays(parseInt(v))}>
            <SelectTrigger className="w-auto min-w-[110px] h-9">
              <SelectValue placeholder="数据范围" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">近 7 天</SelectItem>
              <SelectItem value="30">近 30 天</SelectItem>
              <SelectItem value="90">近 90 天</SelectItem>
              <SelectItem value="0">全部时间</SelectItem>
            </SelectContent>
          </Select>

          <Select value={listTypeFilter} onValueChange={setListTypeFilter}>
            <SelectTrigger className="w-auto min-w-[110px] h-9"><SelectValue placeholder="账号类型" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">所有账号</SelectItem>
              <SelectItem value="internal">内部核心号</SelectItem>
              <SelectItem value="external">外部监测号</SelectItem>
            </SelectContent>
          </Select>

          <Select value={listGroupFilter} onValueChange={setListGroupFilter}>
            <SelectTrigger className="w-auto min-w-[100px] h-9"><SelectValue placeholder="分组" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">所有分组</SelectItem>
              {availableGroups.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={listCountryFilter} onValueChange={setListCountryFilter}>
            <SelectTrigger className="w-auto min-w-[100px] h-9"><SelectValue placeholder="国家" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">所有国家</SelectItem>
              {availableCountries.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <Button onClick={handleExport} variant="outline" className="text-indigo-600 border-indigo-200 hover:bg-indigo-50 h-9 shrink-0">
          <Download size={14} className="mr-1.5" /> 导出当前预警
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-indigo-500 w-8 h-8" /></div>
      ) : filteredGroupedVideos.length === 0 ? (
        <div className="text-center py-20 text-slate-500 bg-white rounded-xl border border-dashed border-slate-300 flex flex-col items-center">
          <ShieldAlert size={48} className="text-slate-200 mb-4" />
          <p className="font-semibold">当前分类下没有任何触发预警的视频</p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredGroupedVideos.slice(0, visibleGroupsCount).map((group, gIdx) => {
            const isExpanded = expandedGroups.has(group.account.username);
            const groupVideoIds = group.vids.map(v => v.id);
            const isAuthorAllSelected = groupVideoIds.length > 0 && groupVideoIds.every(id => selectedVideoIds.has(id));

            return (
              <div key={group.account.username} className={`rounded-2xl border transition-all duration-300 shadow-sm relative overflow-hidden ${isMultiSelect && isAuthorAllSelected ? 'bg-indigo-50/60 border-indigo-300' : 'bg-slate-50/70 border-slate-200'}`}>
                
                <div 
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-indigo-50/50 transition-colors select-none"
                  onClick={() => toggleGroupExpand(group.account.username)}
                >
                  <div className="flex items-center gap-4">
                    {isMultiSelect && (
                      <div 
                        className={`w-7 h-7 shrink-0 rounded-full border-[3px] flex items-center justify-center transition-all shadow-sm bg-white ${isAuthorAllSelected ? 'border-indigo-600 bg-indigo-600 scale-110' : 'border-slate-400 hover:border-indigo-500'}`}
                        onClick={(e) => { e.stopPropagation(); toggleAuthorSelection(group); }}
                        title="全选/反选该作者下所有预警视频"
                      >
                        {isAuthorAllSelected && <Check size={18} className="text-indigo-600" strokeWidth={4} />}
                      </div>
                    )}
                    
                    <Avatar 
                      className="w-12 h-12 border-2 border-white shadow-sm cursor-pointer hover:opacity-80 transition-opacity" 
                      onClick={(e) => { e.stopPropagation(); navigate(`/account/${group.account.id}`); }}
                    >
                      <AvatarImage src={group.account.avatar} referrerPolicy="no-referrer" />
                      <AvatarFallback>{group.account.nickname?.charAt(0) || 'U'}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 
                        className="text-lg font-bold text-slate-900 flex items-center gap-2 cursor-pointer hover:text-indigo-600 transition-colors"
                        onClick={(e) => { e.stopPropagation(); navigate(`/account/${group.account.id}`); }}
                      >
                        {group.account.nickname || group.account.username}
                        <span className="text-xs font-normal text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full hover:bg-indigo-100 hover:text-indigo-700 transition-colors">@{group.account.username}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ml-1 ${group.account.type === 'internal' ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                          {group.account.type === 'internal' ? '内部号' : '外部号'}
                        </span>
                      </h3>
                      <div className="flex items-center gap-3 text-xs font-medium text-slate-500 mt-1">
                        <span className="flex items-center gap-1"><Folder size={12} className="text-indigo-400"/> {group.account.group || '默认分组'}</span>
                        <span className="flex items-center gap-1"><Globe size={12} className="text-emerald-400"/> {group.account.country || '未知'}</span>
                        <span className="bg-white border border-slate-200 px-2 py-0.5 rounded shadow-sm text-slate-700 font-bold">涉及 {group.vids.length} 个预警视频</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-slate-400 pr-4">
                    {!isExpanded ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="p-4 pt-0 grid gap-6 bg-white border-t border-slate-100">
                    <div className="pt-4 grid gap-6">
                      {group.vids.map((video, vIdx) => {
                        let borderClass = 'border-slate-200';
                        if (activeTab === 'normal' && video.is_high_play) borderClass = 'border-red-400 shadow-md ring-1 ring-red-200 bg-red-50/10';
                        else if (activeTab === 'growth' && video.is_high_growth) borderClass = 'border-amber-400 shadow-md ring-1 ring-amber-200 bg-amber-50/10';
                        else if (activeTab === 'low') borderClass = 'border-blue-200 shadow-sm bg-blue-50/30';

                        const isSelected = selectedVideoIds.has(video.id);

                        const cardContainerClass = isMultiSelect 
                          ? (isSelected 
                              ? `relative bg-indigo-50/60 rounded-2xl border-2 border-indigo-600 ring-4 ring-indigo-500/20 p-6 transition-all duration-300 flex flex-col md:flex-row gap-6 cursor-pointer shadow-md scale-[1.01] z-10`
                              : `relative bg-white rounded-2xl border-2 border-slate-200 p-6 hover:border-indigo-400 transition-all duration-300 flex flex-col md:flex-row gap-6 cursor-pointer opacity-90 hover:opacity-100`)
                          : `relative bg-white rounded-2xl border ${borderClass} p-6 hover:shadow-md transition-all duration-300 flex flex-col md:flex-row gap-6`;

                        return (
                          <div key={video.video_id} onClick={() => { if(isMultiSelect) toggleVideoSelection(video.id) }} className={cardContainerClass}>
                            
                            {!isMultiSelect && activeTab === 'normal' && video.is_high_play && <div className="absolute -top-3 -right-3 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-bl-xl rounded-tr-2xl z-20 shadow-lg border-2 border-white animate-pulse">🔥 顶级爆款</div>}
                            {!isMultiSelect && activeTab === 'growth' && video.is_high_growth && <div className="absolute -top-3 -right-3 bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-bl-xl rounded-tr-2xl z-20 shadow-lg border-2 border-white">⚡ 极速攀升</div>}

                            {isMultiSelect && (
                              <div className={`absolute -left-2 -top-2 z-20 w-8 h-8 rounded-full border-[3px] flex items-center justify-center transition-all shadow-md bg-white ${isSelected ? 'border-indigo-600 bg-indigo-600 scale-110' : 'border-slate-400 hover:border-indigo-500'}`}>
                                {isSelected && <Check size={20} className="text-indigo-600" strokeWidth={4} />}
                              </div>
                            )}

                            <div className="w-full md:w-48 shrink-0">
                              <div className="aspect-[3/4] bg-slate-100 rounded-xl overflow-hidden relative shadow-inner">
                                {video.cover_url && <img src={video.cover_url} alt="cover" loading="lazy" className={`w-full h-full object-cover transition-transform duration-500 ${isMultiSelect && isSelected ? 'opacity-90' : 'hover:scale-105'}`} referrerPolicy="no-referrer" />}
                                <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded backdrop-blur-sm flex items-center gap-1"><Zap size={10} className="fill-yellow-400 text-yellow-400" />{video.duration || 0}s</div>
                              </div>
                            </div>

                            <div className="flex-1 flex flex-col justify-between py-1">
                              <div className="space-y-3">
                                <div className="flex flex-wrap items-center gap-2 pr-12">
                                  {activeTab !== 'low' && (
                                    <span className={`px-2 py-1 text-xs font-bold rounded flex items-center gap-1 border shadow-sm ${activeTab === 'normal' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-amber-50 text-amber-600 border-amber-200'}`}>
                                      {activeTab === 'normal' ? <><Play size={12} className="fill-current"/> 总播 {(video.play_count || 0).toLocaleString()}</> : <><Activity size={12}/> 日增 +{(video.daily_growth || 0).toLocaleString()}</>}
                                    </span>
                                  )}
                                  
                                  <span className="px-2.5 py-1 bg-slate-800 text-white text-xs font-black rounded-md flex items-center shadow-sm">NO.{gIdx + 1}-{vIdx + 1}</span>
                                  <span className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-semibold rounded-full flex items-center gap-1.5"><Tag size={12} className="text-indigo-400" />{video.platform_category || video.category || '无类目'}</span>
                                  {video.sub_label && <span className="px-3 py-1 bg-blue-50 text-blue-600 text-xs font-semibold rounded-full">{video.sub_label}</span>}
                                  {video.video_type && <span className="px-3 py-1 bg-purple-50 text-purple-600 text-xs font-semibold rounded-full">类型: {video.video_type}</span>}
                                  {video.music_name && <span className="px-3 py-1 bg-rose-50 text-rose-600 text-xs font-semibold rounded-full max-w-[150px] truncate" title={video.music_name}><Music size={12} className="inline mr-1" />{video.music_name}</span>}
                                  {video.vq_score && <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-xs font-semibold rounded-full">画质: {video.vq_score}</span>}
                                  {video.is_ai && <span className="px-3 py-1 bg-orange-50 text-orange-600 text-xs font-semibold rounded-full">AI: {video.is_ai}</span>}
                                  
                                  {video.pid && (
                                    <span onClick={(e) => { e.stopPropagation(); handlePidClick(String(video.pid).replace(/[^a-zA-Z0-9]/g, '')); }} className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-full cursor-pointer hover:bg-indigo-100 transition-colors border border-indigo-100 shadow-sm" title="点击分析商品">
                                      🔍 PID: {String(video.pid).replace(/[^a-zA-Z0-9]/g, '').length > 20 ? String(video.pid).replace(/[^a-zA-Z0-9]/g, '').substring(0, 20) + '...' : String(video.pid).replace(/[^a-zA-Z0-9]/g, '')}
                                    </span>
                                  )}
                                  {video.product_category && <span className="px-3 py-1 bg-pink-50 text-pink-600 text-xs font-semibold rounded-full">商品: {String(video.product_category).length > 10 ? String(video.product_category).substring(0, 10) + '...' : video.product_category}</span>}
                                </div>
                                
                                <div className="space-y-1 mt-1">
                                  <h3 className="text-lg font-bold text-slate-900 line-clamp-2" title={video.desc}>{video.desc || '无描述'}</h3>
                                  <div className="flex items-center gap-2 text-sm text-slate-500">
                                    <Clock size={14} /><span>{(() => { const d = new Date((Number(video.create_time) || 0) * 1000); return isNaN(d.getTime()) ? '未知时间' : format(d, 'yyyy-MM-dd HH:mm'); })()}</span>
                                    <span className="text-slate-300">|</span>
                                    <a href={video.url || `https://www.tiktok.com/@${video.account_username}/video/${video.video_id}`} onClick={e => e.stopPropagation()} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-indigo-600 transition-colors"><ExternalLink size={14} />看原视频</a>
                                  </div>
                                </div>
                              </div>

                              <div className="flex flex-col lg:flex-row lg:items-end justify-between mt-6 pt-6 border-t border-slate-100 gap-4">
                                <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 flex-1">
                                  <div className="space-y-1">
                                    <div className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1.5"><Play size={12} /> 播放量</div>
                                    <div className="text-lg font-bold text-indigo-600 cursor-pointer hover:bg-indigo-50 px-1 -ml-1 rounded transition-colors flex items-center gap-1.5" onClick={(e) => { e.stopPropagation(); handleOpenVideoTrend(video.video_id, video.desc); }} title="点击查看历史播放量新增趋势">
                                      {(video.play_count || 0).toLocaleString()} <AreaChartIcon size={14} className="text-indigo-400" />
                                    </div>
                                  </div>
                                  <div className="space-y-1"><div className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1.5"><Heart size={12} /> 点赞量</div><div className="text-lg font-bold text-slate-900">{(video.digg_count || 0).toLocaleString()}</div></div>
                                  <div className="space-y-1"><div className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1.5"><MessageCircle size={12} /> 评论数</div><div className="text-lg font-bold text-slate-900">{(video.comment_count || 0).toLocaleString()}</div></div>
                                  <div className="space-y-1"><div className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1.5"><Share2 size={12} /> 分享数</div><div className="text-lg font-bold text-slate-900">{(video.share_count || 0).toLocaleString()}</div></div>
                                  <div className="space-y-1"><div className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1.5"><Bookmark size={12} /> 收藏数</div><div className="text-lg font-bold text-slate-900">{(video.collect_count || 0).toLocaleString()}</div></div>
                                </div>
                                
                                {!isMultiSelect && (
                                  <div className="flex items-center gap-2 shrink-0">
                                    <Button size="sm" variant="outline" className="text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border-none h-8 text-xs font-semibold px-3" onClick={(e) => { e.stopPropagation(); handleSingleRefresh(video.video_id, video.account_id); }} disabled={refreshingVideos.includes(video.video_id)}>
                                      {refreshingVideos.includes(video.video_id) ? <Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> : <Focus size={13} className="mr-1.5" />} 
                                      {refreshingVideos.includes(video.video_id) ? "深度抓取中..." : "单独深度分析"}
                                    </Button>
                                    <Button size="sm" variant="outline" className="text-red-500 hover:text-red-600 bg-red-50 hover:bg-red-100 border-none h-8 text-xs font-semibold px-3" onClick={(e) => { e.stopPropagation(); handleDeleteVideo(video.video_id); }}>
                                      <Trash2 size={13} className="mr-1.5" /> 移至回收站
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {visibleGroupsCount < filteredGroupedVideos.length && (
            <div className="py-4 text-center">
              <Loader2 className="w-6 h-6 animate-spin text-slate-300 mx-auto" />
            </div>
          )}
          {visibleGroupsCount >= filteredGroupedVideos.length && filteredGroupedVideos.length > 0 && (
            <div className="py-8 text-center text-sm font-semibold text-slate-400 bg-slate-50 rounded-lg">
              已到底部，加载了所有的 {filteredGroupedVideos.length} 个受影响的账号。
            </div>
          )}
        </div>
      )}

      {isMultiSelect && (
        <div className="fixed bottom-0 left-[16rem] right-0 z-50 bg-white border-t border-slate-200 p-4 shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.15)] flex items-center justify-between px-8 animate-in slide-in-from-bottom-full duration-300">
          <div className="flex items-center gap-4">
            <span className="font-bold text-slate-800 text-lg">已选中 <span className="text-indigo-600">{selectedVideoIds.size}</span> 个视频</span>
            <Button variant="outline" size="sm" className="text-indigo-600 border-indigo-200 hover:bg-indigo-50 h-8" onClick={handleSelectAll}>本页全选</Button>
            <Button variant="ghost" size="sm" className="text-slate-500 h-8" onClick={() => setSelectedVideoIds(new Set())}>清空</Button>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="destructive" onClick={handleBatchDelete} className="bg-red-500 hover:bg-red-600 shadow-sm"><Trash2 size={16} className="mr-2"/> 批量移至回收站</Button>
            <div className="w-px h-6 bg-slate-200 mx-2"></div>
            <Button variant="ghost" onClick={() => { setIsMultiSelect(false); setSelectedVideoIds(new Set()); }} className="font-bold text-slate-500">退出批量管理</Button>
          </div>
        </div>
      )}

      <Dialog open={trendOpen} onOpenChange={setTrendOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle className="line-clamp-1 pr-8">趋势视图: {trendTitle}</DialogTitle></DialogHeader>
          <div className="h-[400px] mt-4">
            {trendLoading ? (
               <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin text-indigo-500" /></div>
            ) : trendData.length === 0 ? (
               <div className="flex h-full items-center justify-center text-slate-400">暂无历史趋势数据</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorPlaysWarn" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/><stop offset="95%" stopColor="#6366f1" stopOpacity={0}/></linearGradient>
                  </defs>
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(val) => val >= 1000 ? `${(val/1000).toFixed(1)}k` : val} />
                  <Tooltip formatter={(value: number) => [`+${value.toLocaleString()}`, '新增量']} />
                  <Area type="monotone" dataKey="plays" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorPlaysWarn)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!productInfo || productLoading} onOpenChange={(open) => { if (!open) { setProductInfo(null); setProductLoading(false); } }}>
        <DialogContent className="max-w-4xl w-[90vw] bg-white rounded-xl">
          <DialogHeader><DialogTitle className="text-xl">商品 PID 详情</DialogTitle></DialogHeader>
          <div className="mt-2 min-h-[300px] flex items-center justify-center">
            {productLoading ? (
              <div className="flex flex-col items-center text-indigo-500">
                <Loader2 className="animate-spin w-10 h-10 mb-4" />
                <span className="text-sm font-medium">正在实时抓取产品情报...</span>
              </div>
            ) : productInfo ? (
              <div className="w-full bg-slate-50 p-6 rounded-xl border border-slate-200 flex flex-col md:flex-row gap-8 shadow-inner">
                <div className="w-full md:w-[280px] shrink-0 relative aspect-square bg-slate-200 rounded-xl overflow-hidden group shadow-sm border border-slate-200/50">
                  {productInfo.images && productInfo.images.length > 0 ? (
                    <>
                      <img 
                        src={productInfo.images[currentImgIndex]} 
                        className="w-full h-full object-cover transition-all cursor-pointer hover:opacity-90 hover:scale-105" 
                        referrerPolicy="no-referrer" 
                        alt="商品"
                        onClick={(e) => { e.stopPropagation(); setIsImageFullScreen(true); }}
                        title="点击放大预览图"
                      />
                      {productInfo.images.length > 1 && (
                        <>
                          <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setCurrentImgIndex((prev:number) => prev === 0 ? productInfo.images.length - 1 : prev - 1) }} className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/80 text-white p-2 rounded-full transition-all z-50 cursor-pointer"><ChevronLeft size={20}/></button>
                          <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setCurrentImgIndex((prev:number) => prev === productInfo.images.length - 1 ? 0 : prev + 1) }} className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/80 text-white p-2 rounded-full transition-all z-50 cursor-pointer"><ChevronRight size={20}/></button>
                          <div className="absolute bottom-3 left-1/2 -translate-y-1/2 bg-black/60 text-white text-[11px] font-bold px-3 py-1 rounded-full backdrop-blur-md z-40">{currentImgIndex + 1} / {productInfo.images.length}</div>
                        </>
                      )}
                    </>
                  ) : (<div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-100">无商品图片</div>)}
                </div>
                
                <div className="flex-1 flex flex-col justify-center">
                  <h3 className="text-lg font-bold text-slate-900 mb-5">{productInfo.introduction}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-6 text-[14px]">
                    <div className="flex border-b border-slate-200 pb-1.5 gap-4"><span className="text-slate-500 shrink-0 w-20">商品 PID</span><span className="font-bold text-slate-800 break-all">{activePid}</span></div>
                    <div className="flex border-b border-slate-200 pb-1.5 gap-4"><span className="text-slate-500 shrink-0 w-20">品牌名称</span><span className="font-bold text-slate-800 break-all">{productInfo.brand}</span></div>
                    <div className="flex border-b border-slate-200 pb-1.5 gap-4 md:col-span-2"><span className="text-slate-500 shrink-0 w-20">详细类目</span><span className="font-bold text-slate-800 break-all">{productInfo.category}</span></div>
                    <div className="flex border-b border-slate-200 pb-1.5 gap-4"><span className="text-slate-500 shrink-0 w-20">国家地区</span><span className="font-bold text-slate-800 break-all">{productInfo.country}</span></div>
                    <div className="flex border-b border-slate-200 pb-1.5 gap-4"><span className="text-slate-500 shrink-0 w-20">当前价格</span><span className="font-black text-red-600 text-[15px] break-all">{productInfo.price}</span></div>
                    <div className="flex border-b border-slate-200 pb-1.5 gap-4"><span className="text-slate-500 shrink-0 w-20">商品评分</span><span className="font-black text-orange-500 break-all">{productInfo.product_rating}</span></div>
                    <div className="flex border-b border-slate-200 pb-1.5 gap-4"><span className="text-slate-500 shrink-0 w-20">佣金率</span><span className="font-black text-emerald-600 break-all">{productInfo.commission_rate}</span></div>
                    <div className="flex border-b border-slate-200 pb-1.5 gap-4"><span className="text-slate-500 shrink-0 w-20">总销量</span><span className="font-bold text-slate-800 break-all">{productInfo.sold_count}</span></div>
                    <div className="flex border-b border-slate-200 pb-1.5 gap-4"><span className="text-slate-500 shrink-0 w-20">总 G M V</span><span className="font-black text-red-600 text-[15px] break-all">{productInfo.sale_amount}</span></div>
                    <div className="flex border-b border-slate-200 pb-1.5 gap-4"><span className="text-slate-500 shrink-0 w-20">带货达人</span><span className="font-bold text-slate-800 break-all">{productInfo.author_count}</span></div>
                    <div className="flex border-b border-slate-200 pb-1.5 gap-4"><span className="text-slate-500 shrink-0 w-20">视频数量</span><span className="font-bold text-slate-800 break-all">{productInfo.aweme_count}</span></div>
                  </div>
                </div>
              </div>
            ) : (<div className="text-slate-500">暂无该 PID 数据或请求失败。</div>)}
          </div>
        </DialogContent>
      </Dialog>

      {isImageFullScreen && productInfo?.images && productInfo.images.length > 0 && createPortal(
        <div 
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/90 backdrop-blur-sm" 
          style={{ pointerEvents: 'auto' }} 
          onClick={() => setIsImageFullScreen(false)}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <button className="absolute top-4 right-4 text-white hover:text-gray-300 p-2 z-[110]" onClick={() => setIsImageFullScreen(false)}>
            <X size={32} />
          </button>
          
          <img 
            src={productInfo.images[currentImgIndex]} 
            className="max-w-[90vw] max-h-[90vh] object-contain transition-transform duration-200" 
            referrerPolicy="no-referrer" 
            alt="Fullscreen preview" 
            onClick={(e) => e.stopPropagation()} 
          />
          
          {productInfo.images.length > 1 && (
            <>
              <button 
                onClick={(e) => { e.stopPropagation(); setCurrentImgIndex((prev: number) => prev === 0 ? productInfo.images.length - 1 : prev - 1); }} 
                className="absolute left-6 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/90 text-white p-4 rounded-full transition-colors z-[110]"
              >
                <ChevronLeft size={32}/>
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); setCurrentImgIndex((prev: number) => prev === productInfo.images.length - 1 ? 0 : prev + 1); }} 
                className="absolute right-6 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/90 text-white p-4 rounded-full transition-colors z-[110]"
              >
                <ChevronRight size={32}/>
              </button>
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/80 text-white text-sm px-4 py-2 rounded-full tracking-widest z-[110]">
                {currentImgIndex + 1} / {productInfo.images.length}
              </div>
            </>
          )}
        </div>,
        document.body
      )}

    </div>
  );
}