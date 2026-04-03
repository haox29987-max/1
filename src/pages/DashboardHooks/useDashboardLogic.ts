import { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, Video, Account, ProductInfo, TabcutVideo } from '@/api';

export type SortKey = 'play_count' | 'digg_count' | 'comment_count' | 'share_count' | 'create_time' | 'duration' | 'vq_score';
export type SortOrder = 'asc' | 'desc';

export function useDashboardLogic(type?: string) {
  const navigate = useNavigate();

  const getCache = (key: string, def: string) => sessionStorage.getItem(`dash_mem_${type || 'all'}_${key}`) || def;
  const setCache = (key: string, val: string) => sessionStorage.setItem(`dash_mem_${type || 'all'}_${key}`, val);

  const [days, setDays] = useState<number>(() => parseInt(getCache('days', '30')));
  const [selectedGroup, setSelectedGroup] = useState<string>(() => getCache('selectedGroup', 'all'));
  const [selectedCountry, setSelectedCountry] = useState<string>(() => getCache('selectedCountry', 'all'));
  
  const [listGroupFilter, setListGroupFilter] = useState<string>(() => getCache('listGroupFilter', 'all'));
  const [listCountryFilter, setListCountryFilter] = useState<string>(() => getCache('listCountryFilter', 'all'));
  const [accountSortBy, setAccountSortBy] = useState<'default' | 'video_count' | 'reg_time' | 'follower_count'>(() => getCache('accountSortBy', 'default') as any);
  const [listSortOrder, setListSortOrder] = useState<'asc' | 'desc'>(() => getCache('listSortOrder', 'desc') as any);
  const [searchQuery, setSearchQuery] = useState(() => getCache('searchQuery', ''));

  useEffect(() => { setCache('days', days.toString()); }, [days, type]);
  useEffect(() => { setCache('selectedGroup', selectedGroup); }, [selectedGroup, type]);
  useEffect(() => { setCache('selectedCountry', selectedCountry); }, [selectedCountry, type]);
  useEffect(() => { setCache('listGroupFilter', listGroupFilter); }, [listGroupFilter, type]);
  useEffect(() => { setCache('listCountryFilter', listCountryFilter); }, [listCountryFilter, type]);
  useEffect(() => { setCache('accountSortBy', accountSortBy); }, [accountSortBy, type]);
  useEffect(() => { setCache('listSortOrder', listSortOrder); }, [listSortOrder, type]);
  useEffect(() => { setCache('searchQuery', searchQuery); }, [searchQuery, type]);

  const [stats, setStats] = useState<any>(() => {
    try {
      const cache = sessionStorage.getItem(`dashboard_cache_${type}_${days}_${selectedGroup}_${selectedCountry}`);
      return cache ? JSON.parse(cache).statsData : null;
    } catch(e) { return null; }
  });
  const [accounts, setAccounts] = useState<Account[]>(() => {
    try {
      const cache = sessionStorage.getItem(`dashboard_cache_${type}_${days}_${selectedGroup}_${selectedCountry}`);
      return cache ? JSON.parse(cache).accountsData : [];
    } catch(e) { return []; }
  });
  const [loading, setLoading] = useState(() => {
    try {
      const cache = sessionStorage.getItem(`dashboard_cache_${type}_${days}_${selectedGroup}_${selectedCountry}`);
      return cache ? false : true;
    } catch(e) { return true; }
  });
  
  const [progressMap, setProgressMap] = useState<Record<string, any>>({});
  const activeIdsRef = useRef<Set<string>>(new Set());

  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [newAccountUrl, setNewAccountUrl] = useState('');
  const [addingAccount, setAddingAccount] = useState(false);
  const [editAccount, setEditAccount] = useState<Account | null>(null);
  const [editCustomName, setEditCustomName] = useState('');
  const [editGroupName, setEditGroupName] = useState('');
  const [editCountry, setEditCountry] = useState('');
  const [editMcn, setEditMcn] = useState('');
  const [editCreatedAt, setEditCreatedAt] = useState('');
  const [editDevice, setEditDevice] = useState('');
  const [editAutoUpdate, setEditAutoUpdate] = useState(1);
  
  const [videoListModal, setVideoListModal] = useState<{ title: string; videos: Video[]; loading?: boolean } | null>(null);
  const [modalSortKey, setModalSortKey] = useState<SortKey>('create_time');
  const [modalSortOrder, setModalSortOrder] = useState<SortOrder>('desc');
  const [productInfo, setProductInfo] = useState<ProductInfo | null>(null);
  const [productLoading, setProductLoading] = useState(false);
  const [currentImgIndex, setCurrentImgIndex] = useState(0);
  const [activePid, setActivePid] = useState<string>('');
  
  const [isImageFullScreen, setIsImageFullScreen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const [isMultiSelect, setIsMultiSelect] = useState(false);
  const [selectedAccountIds, setSelectedAccountIds] = useState<Set<number>>(new Set());
  
  const [batchMetaModalOpen, setBatchMetaModalOpen] = useState(false);
  const [batchTargetGroup, setBatchTargetGroup] = useState('');
  const [batchTargetCountry, setBatchTargetCountry] = useState('');
  const [batchTargetMcn, setBatchTargetMcn] = useState('');
  const [batchTargetCreatedAt, setBatchTargetCreatedAt] = useState('');

  const [activeTab, setActiveTab] = useState<'db' | 'scraped'>('db');
  
  // 云端全局数据状态管理
  const [tabcutVideos, setTabcutVideos] = useState<TabcutVideo[]>([]);
  const [tabcutTotal, setTabcutTotal] = useState(0);
  const [tabcutPage, setTabcutPage] = useState(1);
  const [tabcutLoading, setTabcutLoading] = useState(false);
  
  // 核心控制区
  const [tabcutDays, setTabcutDays] = useState<number>(30); // 增加天数控制
  const [tabcutSortKey, setTabcutSortKey] = useState<'create_time' | 'play_count'>('create_time');
  const [tabcutSortOrder, setTabcutSortOrder] = useState<'asc' | 'desc'>('desc');

  const availableGroups = useMemo(() => Array.from(new Set(accounts.map(a => a.group_name || '默认分组'))).sort(), [accounts]);
  const availableCountries = useMemo(() => Array.from(new Set(accounts.map(a => a.country || '未知'))).sort(), [accounts]);

  const fetchData = async () => {
    //... (保持原样)
    const currentCacheKey = `dashboard_cache_${type}_${days}_${selectedGroup}_${selectedCountry}`;
    let cached = null;
    try { cached = sessionStorage.getItem(currentCacheKey); } catch(e) {}

    if (cached) {
      try {
        const { statsData, accountsData } = JSON.parse(cached);
        setStats(statsData);
        setAccounts(accountsData);
        setLoading(false);
        fetchSilentData(); 
        return;
      } catch(e) {}
    }

    setLoading(true);
    try {
      const [statsData, accountsData] = await Promise.all([
        api.getDashboardStats(type, days, selectedGroup, selectedCountry),
        api.getAccounts(type) 
      ]);
      setStats(statsData);
      setAccounts(accountsData);
      try { sessionStorage.setItem(currentCacheKey, JSON.stringify({ statsData, accountsData })); } catch(e){}
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSilentData = async () => {
    try {
      const [statsData, accountsData] = await Promise.all([
        api.getDashboardStats(type, days, selectedGroup, selectedCountry),
        api.getAccounts(type)
      ]);
      setStats(statsData);
      setAccounts(accountsData);
      const currentCacheKey = `dashboard_cache_${type}_${days}_${selectedGroup}_${selectedCountry}`;
      try { sessionStorage.setItem(currentCacheKey, JSON.stringify({ statsData, accountsData })); } catch(e){}
    } catch (error) {}
  };

  useEffect(() => { fetchData(); }, [type, days, selectedGroup, selectedCountry]);

  useEffect(() => {
    if (!loading && accounts.length > 0) {
      const saved = sessionStorage.getItem('dashboardScroll');
      if (saved) {
        requestAnimationFrame(() => {
          setTimeout(() => {
            const scrollContainer = document.getElementById('main-scroll-container');
            if (scrollContainer) scrollContainer.scrollTop = parseInt(saved);
          }, 50);
        });
        sessionStorage.removeItem('dashboardScroll'); 
      }
    }
  }, [loading, accounts.length]);

  useEffect(() => {
    let isChecking = false;
    const pollAllProgress = async () => {
      if (isChecking) return;
      isChecking = true;
      try {
        const map = await api.getAllProgress();
        
        setProgressMap(prev => {
           const next = { ...map };
           Object.keys(prev).forEach(k => {
              if (prev[k] && !prev[k].done && !map[k]) {
                 next[k] = prev[k];
              }
           });
           return next;
        });

        const currentActive = new Set<string>();
        let newlyFinished = false;

        Object.entries(map).forEach(([id, prog]: [string, any]) => {
           if (!prog.done) currentActive.add(id);
        });

        activeIdsRef.current.forEach(oldId => {
           if (!currentActive.has(oldId)) newlyFinished = true;
        });
        activeIdsRef.current = currentActive;

        if (newlyFinished) fetchSilentData();
      } catch(e) {} finally {
        isChecking = false;
      }
    };
    pollAllProgress();
    const interval = setInterval(pollAllProgress, 2000); 
    return () => clearInterval(interval);
  }, [type, days, selectedGroup, selectedCountry]);

  useEffect(() => {
    const scrollContainer = document.getElementById('main-scroll-container');
    const handleScroll = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target.closest && target.closest('[role="dialog"]')) return;
      if (target.scrollTop > 300) setShowScrollTop(true);
      else if (target.scrollTop < 50) setShowScrollTop(false);
    };
    if(scrollContainer) scrollContainer.addEventListener('scroll', handleScroll, true);
    return () => { if(scrollContainer) scrollContainer.removeEventListener('scroll', handleScroll, true); }
  }, []);

  const navigateToDetail = (id: number) => {
    const scrollContainer = document.getElementById('main-scroll-container');
    if (scrollContainer) sessionStorage.setItem('dashboardScroll', scrollContainer.scrollTop.toString());
    navigate(`/account/${id}`);
  };

  const scrollToTop = () => {
    const scrollContainer = document.getElementById('main-scroll-container');
    if(scrollContainer) scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
    const scrollables = document.querySelectorAll('.overflow-y-auto, .overflow-auto');
    scrollables.forEach(el => {
       if (!el.closest('[role="dialog"]')) el.scrollTo({ top: 0, behavior: 'smooth' });
    });
  };

  const handleAddAccount = async () => {
    //...(保持原样)
    const list = newAccountUrl.split('\n').map(u => u.trim()).filter(Boolean);
    if (list.length === 0) return;
    setAddingAccount(true);
    let successCount = 0;
    const failedList = [];
    for (const u of list) {
       try { await api.addAccount(u, type || 'external'); successCount++; } catch { failedList.push(u); }
    }
    setAddingAccount(false);

    if (failedList.length > 0) {
      alert(`添加完毕！\n成功: ${successCount}个\n失败: ${failedList.length}个\n(失败的已为您保留在输入框内)`);
      setNewAccountUrl(failedList.join('\n'));
      if(successCount > 0) fetchSilentData();
    } else {
      setNewAccountUrl(''); setIsAddAccountOpen(false); fetchSilentData(); 
    }
  };

  const handleSaveAccountMeta = async () => {
    if (!editAccount) return;
    const updatedMeta = {
      custom_name: editCustomName.trim(), 
      group_name: editGroupName.trim() || '默认分组', 
      country: editCountry.trim() || '未知',
      mcn: editMcn.trim(),
      created_at: editCreatedAt.trim() || editAccount.created_at || '',
      device: editDevice.trim(),
      auto_update: editAutoUpdate
    };
    setAccounts(prev => prev.map(acc => 
      acc.id === editAccount.id ? { ...acc, ...updatedMeta } : acc
    ));
    setEditAccount(null); 
    try {
      await api.updateAccountMeta(editAccount.id, updatedMeta);
      setTimeout(() => fetchSilentData(), 500); 
    } catch { 
      alert("保存失败，请检查网络！"); 
      fetchData(); 
    }
  };

  const handleTogglePin = async (id: number, currentPin: number) => {
    const newPin = currentPin === 1 ? 0 : 1;
    setAccounts(prev => prev.map(acc => acc.id === id ? { ...acc, is_pinned: newPin } : acc));
    try {
      await api.togglePinAccount(id, newPin);
      fetchSilentData();
    } catch (e) {
      alert('置顶操作失败，请检查网络');
      fetchSilentData();
    }
  };

  const handleDeleteAccount = async (id: number, username: string) => {
    if (window.confirm(`确定将账号 @${username} 移入回收站吗？\n移入后该账号将停止更新，且数据不会出现在大盘图表中。\n(后续可在左侧【回收站】中随时恢复)`)) {
      await api.deleteAccount(id); fetchData();
    }
  };

  const generateCSV = (videos: any[], filename: string) => {
      //...(保持原样)
      if (!videos || videos.length === 0) {
          alert("没有可导出的数据");
          return;
      }
      const rows = [["账号名", "自定义名", "视频ID", "视频描述", "发布时间", "时长(s)", "播放量", "点赞量", "评论数", "分享数", "挂车PID", "商品类目", "视频画质", "AI视频", "归属分组", "国家"]];
      videos.forEach(v => {
          const createDate = new Date((Number(v.create_time) || 0) * 1000);
          const dateStr = isNaN(createDate.getTime()) ? '未知时间' : 
              `${createDate.getFullYear()}-${String(createDate.getMonth()+1).padStart(2, '0')}-${String(createDate.getDate()).padStart(2, '0')} ${String(createDate.getHours()).padStart(2, '0')}:${String(createDate.getMinutes()).padStart(2, '0')}`;
          rows.push([
              v.account_username || '', v.custom_name || '', String(v.video_id || ''), 
              `"${(v.desc || '').replace(/"/g, '""')}"`, dateStr, String(v.duration || 0), 
              String(v.play_count || 0), String(v.digg_count || 0), String(v.comment_count || 0), 
              String(v.share_count || 0), String(v.pid || ''), v.product_category || '', 
              v.vq_score || '', v.is_ai || '', v.group_name || '', v.country || ''
          ]);
      });
      const csvContent = "\uFEFF" + rows.map(e => e.join(",")).join("\n");
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
  };

  const handleExport = async () => { 
      try {
          const btnTxt = type === 'internal' ? '内部号全量数据' : type === 'external' ? '外部号全量数据' : '全局大盘数据';
          alert(`正在从数据库为您极速提取【${btnTxt}】... 根据数据量可能需要几秒钟，请勿关闭页面。`);
          const data = await api.exportData(type, 'all');
          generateCSV(data.videos, `${btnTxt}导出.csv`);
      } catch (e) {
          alert("全量导出失败，请检查网络！");
      }
  };

  // 🚀 核心回归：完全利用云端请求完成真正的全库排序和时间筛选
  const handleTabcutPageChange = async (newPage: number, customSortKey = tabcutSortKey, customSortOrder = tabcutSortOrder, customDays = tabcutDays) => {
    setTabcutLoading(true); setTabcutPage(newPage);
    try {
      const tabcutRes = await api.getProductTabcutVideos(activePid, newPage, customSortKey, customSortOrder, customDays);
      setTabcutVideos(tabcutRes.videos);
      setTabcutTotal(tabcutRes.total);
    } catch(e) {
      console.error("翻页抓取失败", e);
    } finally {
      setTabcutLoading(false);
    }
  };

  const handleChartClick = async (filterType: string, filterVal: string, title: string) => {
    setVideoListModal({ title, videos: [], loading: true });
    
    if (filterType === 'pid') {
      setActivePid(filterVal); 
      setProductLoading(true); 
      setProductInfo(null); 
      setCurrentImgIndex(0);
      setActiveTab('db');
      setTabcutVideos([]);
      setTabcutTotal(0);
      setTabcutPage(1);
      setTabcutLoading(true);
    } else {
      setActivePid(''); 
      setProductInfo(null); 
    }

    try {
      const [videos] = await Promise.all([
        api.getFilteredVideos(filterType, filterVal, type),
        new Promise(res => setTimeout(res, 250))
      ]);
      setVideoListModal({ title, videos, loading: false });

      if (filterType === 'pid') {
        try {
          const [info, tabcutRes] = await Promise.all([
            api.getProductInfo(filterVal),
            // 初始化默认第一页、当前排序、当前选定时间
            api.getProductTabcutVideos(filterVal, 1, tabcutSortKey, tabcutSortOrder, tabcutDays)
          ]);
          setProductInfo(info);
          setTabcutVideos(tabcutRes.videos);
          setTabcutTotal(tabcutRes.total);
        } catch(e) {
          console.error("Fetch product info/videos failed", e);
        } finally {
          setProductLoading(false);
          setTabcutLoading(false);
        }
      }
    } catch (e) { console.error(e); setVideoListModal(null); }
  };

  const filteredAndSortedAccounts = useMemo(() => {
    let result = accounts.filter(a => 
      (listGroupFilter === 'all' || a.group_name === listGroupFilter) &&
      (listCountryFilter === 'all' || a.country === listCountryFilter) &&
      (searchQuery === '' || 
        ((a.nickname && a.nickname.toLowerCase().includes(searchQuery.toLowerCase())) || 
         (a.username && a.username.toLowerCase().includes(searchQuery.toLowerCase())) || 
         (a.mcn && a.mcn.toLowerCase().includes(searchQuery.toLowerCase())) ||
         (a.custom_name && a.custom_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
         (a.country && a.country.toLowerCase().includes(searchQuery.toLowerCase())) ||
         (a.group_name && a.group_name.toLowerCase().includes(searchQuery.toLowerCase()))))
    );
    result.sort((a, b) => {
      const now = new Date().getTime();
      const getStaleDays = (acc: Account) => {
        if (!acc.last_updated) return 0;
        const updatedDate = new Date(acc.last_updated.replace(/-/g, '/').replace('T', ' ')).getTime();
        return (now - updatedDate) / (1000 * 60 * 60 * 24);
      };
      
      const isStaleA = getStaleDays(a) >= 10;
      const isStaleB = getStaleDays(b) >= 10;
      const isPinnedA = a.is_pinned === 1 || isStaleA;
      const isPinnedB = b.is_pinned === 1 || isStaleB;
      
      if (isPinnedA && !isPinnedB) return -1;
      if (!isPinnedA && isPinnedB) return 1;

      let valA: any = 0; let valB: any = 0;
      if (accountSortBy === 'video_count') { valA = a.video_count || 0; valB = b.video_count || 0; } 
      else if (accountSortBy === 'follower_count') { valA = a.follower_count || 0; valB = b.follower_count || 0; } 
      else if (accountSortBy === 'reg_time') {
         valA = a.reg_time && a.reg_time !== '未知' ? new Date(a.reg_time.replace(/-/g, '/')).getTime() : 0;
         valB = b.reg_time && b.reg_time !== '未知' ? new Date(b.reg_time.replace(/-/g, '/')).getTime() : 0;
      } else {
         valA = a.last_updated ? new Date(a.last_updated.replace(/-/g, '/')).getTime() : 0;
         valB = b.last_updated ? new Date(b.last_updated.replace(/-/g, '/')).getTime() : 0;
      }
      if (valA === valB) return 0;
      if (listSortOrder === 'asc') return valA > valB ? 1 : -1;
      return valA < valB ? 1 : -1;
    });
    return result;
  }, [accounts, listGroupFilter, listCountryFilter, accountSortBy, listSortOrder, searchQuery]);

  const sortedModalVideos = useMemo(() => {
      if (!videoListModal?.videos) return [];
      return [...videoListModal.videos].sort((a, b) => {
        const valA = Number(a[modalSortKey]) || 0; const valB = Number(b[modalSortKey]) || 0;
        return modalSortOrder === 'asc' ? valA - valB : valB - valA;
      });
  }, [videoListModal?.videos, modalSortKey, modalSortOrder]);

  const toggleSelection = (id: number) => {
    setSelectedAccountIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    const allIds = filteredAndSortedAccounts.map(a => a.id);
    setSelectedAccountIds(new Set(allIds));
  };

  const handleBatchDelete = async () => {
    if (selectedAccountIds.size === 0) return alert('请先选择账号');
    await api.batchDeleteAccounts(Array.from(selectedAccountIds));
    setSelectedAccountIds(new Set()); fetchData();
  };

  const handleBatchRemoveGroup = async () => {
    if (selectedAccountIds.size === 0) return alert('请先选择账号');
    if (window.confirm(`确定将这 ${selectedAccountIds.size} 个账号全部移除所在分组吗？`)) {
      await api.batchUpdateGroup(Array.from(selectedAccountIds), '默认分组');
      setSelectedAccountIds(new Set()); fetchData();
    }
  };

  const handleBatchRefresh = async () => {
    if (selectedAccountIds.size === 0) return alert('请先选择账号');
    if (!window.confirm(`确定要在后台为您刚刚勾选的 ${selectedAccountIds.size} 个账号发起极速更新任务吗？`)) return;
    
    const mockMap: any = {};
    selectedAccountIds.forEach(id => {
       mockMap[id] = { total: 30, current: 0, status: '排队进入更新队列...', done: false };
    });
    setProgressMap(prev => ({ ...prev, ...mockMap }));

    for (const id of Array.from(selectedAccountIds)) {
       try { await api.refreshAccount(id, 30); } catch(e) {}
    }
    setIsMultiSelect(false);
    setSelectedAccountIds(new Set());
  };

  const handleRefreshFiltered = async () => {
    if (filteredAndSortedAccounts.length === 0) return alert('当前列表无账号可更新');
    if (!window.confirm(`确定要批量一键更新当前筛选出的 ${filteredAndSortedAccounts.length} 个账号吗？\n(任务将在后台排队执行)`)) return;
    
    const mockMap: any = {};
    filteredAndSortedAccounts.forEach(acc => {
       mockMap[acc.id] = { total: 30, current: 0, status: '排队进入更新队列...', done: false };
    });
    setProgressMap(prev => ({ ...prev, ...mockMap }));

    for (const acc of filteredAndSortedAccounts) {
       try { await api.refreshAccount(acc.id, 30); } catch(e) {}
    }
  };

  const handleGroupExport = async () => {  
    try {
        if (filteredAndSortedAccounts.length === 0) return alert("当前列表为空，没有可导出的数据");
        alert("正在为您提取当前列表内账号的所有数据，请稍候...");
        const validAccountIds = new Set(filteredAndSortedAccounts.map(a => a.id));
        const data = await api.exportData(type, 'all');
        const filteredVideos = data.videos.filter((v: any) => validAccountIds.has(v.account_id));
        generateCSV(filteredVideos, `当前筛选列表账号_全量数据导出.csv`);
    } catch (e) {
        alert("列表导出失败，请检查网络！");
    }
  };

  const handleBatchUpdateMeta = async () => {
    const payload: any = {};
    if (batchTargetGroup.trim()) payload.group_name = batchTargetGroup.trim();
    if (batchTargetCountry.trim()) payload.country = batchTargetCountry.trim();
    if (batchTargetMcn.trim()) payload.mcn = batchTargetMcn.trim();
    if (batchTargetCreatedAt.trim()) payload.created_at = batchTargetCreatedAt.trim();

    if (Object.keys(payload).length === 0) { return alert('请至少填写一个要批量修改的属性'); }

    setAccounts(prev => prev.map(acc => selectedAccountIds.has(acc.id) ? { ...acc, ...payload } : acc));
    setBatchMetaModalOpen(false); 
    setBatchTargetGroup(''); setBatchTargetCountry(''); setBatchTargetMcn(''); setBatchTargetCreatedAt('');
    const savedSelectedIds = new Set(selectedAccountIds);
    setSelectedAccountIds(new Set()); 
    
    try {
      await api.batchUpdateMeta(Array.from(savedSelectedIds), payload);
      setTimeout(() => fetchSilentData(), 500);
    } catch {
      alert("批量保存失败！"); fetchData(); 
    }
  };

  const copyPid = (pid?: string) => {
    if (!pid) return; navigator.clipboard.writeText(pid); alert(`已复制 PID: ${pid}`);
  };

  const sortOptions: { label: string; key: SortKey }[] = [
    { label: '发布时间', key: 'create_time' }, { label: '播放量', key: 'play_count' },
    { label: '点赞量', key: 'digg_count' }, { label: '评论数', key: 'comment_count' },
    { label: '画质得分', key: 'vq_score' }
  ];

  return {
    type, days, setDays, selectedGroup, setSelectedGroup, selectedCountry, setSelectedCountry,
    listGroupFilter, setListGroupFilter, listCountryFilter, setListCountryFilter,
    accountSortBy, setAccountSortBy, listSortOrder, setListSortOrder, searchQuery, setSearchQuery,
    stats, accounts, loading, progressMap, availableGroups, availableCountries, filteredAndSortedAccounts,
    isAddAccountOpen, setIsAddAccountOpen, newAccountUrl, setNewAccountUrl, addingAccount, setAddingAccount,
    editAccount, setEditAccount, editCustomName, setEditCustomName, editGroupName, setEditGroupName,
    editCountry, setEditCountry, editMcn, setEditMcn, editCreatedAt, setEditCreatedAt,
    editDevice, setEditDevice, editAutoUpdate, setEditAutoUpdate,
    videoListModal, setVideoListModal, modalSortKey, setModalSortKey, modalSortOrder, setModalSortOrder,
    productInfo, setProductInfo, productLoading, setProductLoading, currentImgIndex, setCurrentImgIndex,
    activePid, setActivePid, isImageFullScreen, setIsImageFullScreen, showScrollTop,
    isMultiSelect, setIsMultiSelect, selectedAccountIds, setSelectedAccountIds,
    batchMetaModalOpen, setBatchMetaModalOpen, batchTargetGroup, setBatchTargetGroup,
    batchTargetCountry, setBatchTargetCountry, batchTargetMcn, setBatchTargetMcn,
    batchTargetCreatedAt, setBatchTargetCreatedAt, sortOptions, sortedModalVideos,
    handleExport, handleGroupExport, handleRefreshFiltered, handleChartClick, toggleSelection, handleSelectAll,
    handleBatchDelete, handleBatchRemoveGroup, handleBatchRefresh, handleBatchUpdateMeta,
    handleAddAccount, handleSaveAccountMeta, handleDeleteAccount, copyPid, navigateToDetail, scrollToTop,
    handleTogglePin,
    activeTab, setActiveTab, tabcutVideos, tabcutTotal, tabcutPage, tabcutLoading, handleTabcutPageChange,
    tabcutSortKey, setTabcutSortKey, tabcutSortOrder, setTabcutSortOrder, 
    tabcutDays, setTabcutDays // 🚀 暴露出最新天数钩子给UI
  };
}