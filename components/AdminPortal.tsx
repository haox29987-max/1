import React, { useState, useEffect } from 'react';
import { AllowedUser } from '../types';

interface AdminPortalProps {
  onLogout: () => void;
  allowedUsers: AllowedUser[];
  setAllowedUsers: React.Dispatch<React.SetStateAction<AllowedUser[]>>;
}

type SortKey = 'userCount' | 'timestamp' | 'playCount';

const AdminPortal: React.FC<AdminPortalProps> = ({ onLogout, allowedUsers, setAllowedUsers }) => {
  const [activeTab, setActiveTab] = useState<'users' | 'videos'>('users');
  
  const [newUserName, setNewUserName] = useState('');
  const [newUserPass, setNewUserPass] = useState('');
  const [newApiKey, setNewApiKey] = useState('');

  // 视频引擎池系统状态
  const [videos, setVideos] = useState<any[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' } | null>(null);

  // 基础环境 API 地址计算
  const API_BASE = "http://" + window.location.hostname + ":8001";

  useEffect(() => {
    if (activeTab === 'videos') {
      fetchVideos();
    }
  }, [activeTab]);

  const fetchVideos = async () => {
    setLoadingVideos(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/videos`);
      const data = await res.json();
      if (data.videos) {
        setVideos(data.videos);
        setSelectedIds([]); // 刷新数据时重置选择
      }
    } catch (error) {
      console.error("加载全局视频数据库池失败", error);
    } finally {
      setLoadingVideos(false);
    }
  };

  // 排序控制引擎
  const handleSort = (key: SortKey) => {
    let direction: 'asc' | 'desc' = 'desc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };

  // 排序计算器
  const sortedVideos = React.useMemo(() => {
    let sortableVideos = [...videos];
    if (sortConfig !== null) {
      sortableVideos.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableVideos;
  }, [videos, sortConfig]);

  // 全选/反选逻辑
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(sortedVideos.map(v => v.videoId));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  // 单个粉碎操作
  const handleDeleteVideo = async (videoId: string) => {
    if (!confirm(`【危险操作警报】确定要彻底粉碎视频 [${videoId}] 吗？\n系统将同步物理粉碎所有绑定了该视频的员工独立解析包！`)) return;
    try {
      const res = await fetch(`${API_BASE}/api/admin/videos/${videoId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchVideos();
      }
    } catch (e) {
      console.error(e);
      alert('底层服务请求异常');
    }
  };

  // 批量粉碎引擎
  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`【高危操作】您正在一次性彻底粉碎选中的 ${selectedIds.length} 个核心视频数据。\n此操作不可逆，且会清空所有关联员工名下的副本，确定执行吗？`)) return;
    
    try {
      const res = await fetch(`${API_BASE}/api/admin/videos/batch-delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ video_ids: selectedIds })
      });
      if (res.ok) {
        alert('🎯 批量清理指令下达成功！系统底层已完成级联物理粉碎。');
        fetchVideos();
      } else {
        alert('清理异常，请检查后端引擎状态。');
      }
    } catch (e) {
      console.error(e);
      alert('底层服务请求异常');
    }
  };

  const formatExistTime = (timestamp: number) => {
    const diffMs = Date.now() - timestamp * 1000;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    if (diffDays > 0) return `存活 ${diffDays}天 ${diffHours}时`;
    if (diffHours > 0) return `存活 ${diffHours}时 ${diffMins}分`;
    return `存活 ${diffMins}分`;
  };

  const formatPlayCount = (num: number) => {
    if (num >= 10000) return (num / 10000).toFixed(1) + ' 万';
    return num.toLocaleString();
  };

  const handleAddUser = () => {
    if (!newUserName || !newUserPass || !newApiKey) { alert("请填写完整人员信息及专属 API Key"); return; }
    if (allowedUsers.some(u => u.username === newUserName)) { alert("该用户名已存在"); return; }
    setAllowedUsers([...allowedUsers, { username: newUserName, password: newUserPass, api_key: newApiKey }]);
    setNewUserName(''); setNewUserPass(''); setNewApiKey('');
    alert("授权成功！");
  };

  const handleDeleteUser = (u: string) => {
    if (confirm(`确定撤销 ${u} 的权限？`)) {
      setAllowedUsers(allowedUsers.filter(user => user.username !== u));
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex">
      <aside className="w-80 bg-slate-900 text-slate-400 flex flex-col p-8 space-y-10 z-10 shadow-2xl">
        <div className="flex items-center space-x-4 mb-2">
          <div className="bg-white text-slate-950 p-2 rounded-2xl shadow-lg">
             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
          </div>
          <h1 className="text-xl font-black tracking-tight text-white italic text-nowrap">乘风 · 控制台</h1>
        </div>
        <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest px-1">超级管理员：秦涛</p>

        <nav className="flex-1 space-y-3">
          <button onClick={() => setActiveTab('users')}
            className={`w-full flex items-center gap-4 px-5 py-4 text-white rounded-2xl font-black text-sm transition-all shadow-lg border ${ activeTab === 'users' ? 'bg-indigo-600 border-indigo-500' : 'bg-white/5 border-white/5 hover:bg-white/10' }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
            账号与权限管理
          </button>
          <button onClick={() => setActiveTab('videos')}
            className={`w-full flex items-center gap-4 px-5 py-4 text-white rounded-2xl font-black text-sm transition-all shadow-lg border ${ activeTab === 'videos' ? 'bg-emerald-600 border-emerald-500' : 'bg-white/5 border-white/5 hover:bg-white/10' }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
            全局引擎视频池
          </button>
        </nav>

        <div className="pt-4 border-t border-white/5">
          <button onClick={onLogout} className="w-full flex items-center justify-center gap-3 p-4 bg-red-500/10 rounded-2xl text-sm font-black text-red-400 hover:bg-red-500 hover:text-white transition-all border border-red-500/20">
            退出后台管理
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-12 bg-slate-50">
        <div className="max-w-6xl mx-auto space-y-12">
          
          {activeTab === 'users' ? (
            <section className="space-y-6">
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">员工账户与 API 授权</h2>
              <div className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-xl shadow-slate-200/50 space-y-10">
                <div className="flex flex-col gap-4 lg:flex-row items-end">
                  <div className="flex-1 space-y-3 w-full">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">用户名</label>
                    <input type="text" value={newUserName} onChange={e => setNewUserName(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3 text-sm font-bold" />
                  </div>
                  <div className="flex-1 space-y-3 w-full">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">登录密码</label>
                    <input type="text" value={newUserPass} onChange={e => setNewUserPass(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3 text-sm font-bold" />
                  </div>
                  <div className="flex-[1.5] space-y-3 w-full">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">专属 API Key</label>
                    <input type="text" placeholder="sk-..." value={newApiKey} onChange={e => setNewApiKey(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3 text-sm font-mono font-bold text-indigo-600" />
                  </div>
                  <button onClick={handleAddUser} className="bg-indigo-600 text-white px-8 py-3 rounded-2xl text-sm font-black hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 w-full lg:w-auto">添加人员</button>
                </div>

                <div className="pt-8 border-t border-slate-50">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 px-1">当前已授权名单 ({allowedUsers.length})</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {allowedUsers.length === 0 ? (
                      <div className="col-span-full py-12 text-center text-slate-300 font-bold italic uppercase tracking-widest border-2 border-dashed border-slate-100 rounded-3xl">暂无已授权人员</div>
                    ) : (
                      allowedUsers.map((u, i) => (
                        <div key={i} className="group relative bg-slate-50/50 rounded-3xl p-6 border border-slate-100 hover:border-indigo-200 hover:bg-white transition-all flex flex-col gap-4">
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center font-black text-slate-400 shadow-sm border border-slate-50">{u.username[0]}</div>
                              <div className="flex flex-col">
                                <span className="text-sm font-black text-slate-900">{u.username}</span>
                                <span className="text-[9px] font-bold text-slate-400">PW: {u.password}</span>
                              </div>
                            </div>
                            <button onClick={() => handleDeleteUser(u.username)} className="p-2 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                            </button>
                          </div>
                          <div className="bg-white/80 px-4 py-2 rounded-xl border border-slate-200/50">
                             <span className="text-[10px] text-indigo-600 font-mono font-bold truncate block">🔑 {u.api_key}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </section>
          ) : (
            <section className="space-y-6">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight">全局缓存视频引擎池</h2>
                  {selectedIds.length > 0 && (
                    <button 
                      onClick={handleBatchDelete}
                      className="bg-red-500 hover:bg-red-600 text-white px-5 py-2 rounded-xl text-sm font-bold shadow-lg shadow-red-500/30 transition-all flex items-center gap-2 animate-fade-in"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                      一键粉碎选中的 {selectedIds.length} 项
                    </button>
                  )}
                </div>
                <button onClick={fetchVideos} className="text-emerald-600 hover:text-emerald-700 font-bold text-sm bg-emerald-50 px-4 py-2 rounded-xl transition-colors flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                  刷新矩阵数据
                </button>
              </div>
              
              <div className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-xl shadow-slate-200/50">
                {loadingVideos ? (
                  <div className="py-20 text-center text-slate-400 font-bold animate-pulse">正在穿透底层读取物理数据并计算矩阵...</div>
                ) : sortedVideos.length === 0 ? (
                  <div className="py-20 text-center text-slate-300 font-bold italic uppercase tracking-widest border-2 border-dashed border-slate-100 rounded-3xl">
                    目前底层公有池没有任何已被缓存的视频文件
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-[11px] font-black text-slate-400 uppercase tracking-widest border-b-2 border-slate-100">
                          <th className="pb-4 pl-4 w-12">
                            <input 
                              type="checkbox" 
                              className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer"
                              checked={selectedIds.length === sortedVideos.length && sortedVideos.length > 0}
                              onChange={handleSelectAll}
                            />
                          </th>
                          <th className="pb-4">视图信息 & 报告跳转</th>
                          {/* 可排序表头：播放量 */}
                          <th className="pb-4 cursor-pointer hover:text-indigo-600 transition-colors select-none group" onClick={() => handleSort('playCount')}>
                            <div className="flex items-center gap-1">播放量数据
                              <span className={`text-[10px] ${sortConfig?.key === 'playCount' ? 'text-indigo-600' : 'text-slate-200 group-hover:text-indigo-300'}`}>
                                {sortConfig?.key === 'playCount' && sortConfig.direction === 'asc' ? '▲' : '▼'}
                              </span>
                            </div>
                          </th>
                          {/* 可排序表头：绑定员工数量 */}
                          <th className="pb-4 cursor-pointer hover:text-indigo-600 transition-colors select-none group" onClick={() => handleSort('userCount')}>
                            <div className="flex items-center gap-1">绑定员工分布
                              <span className={`text-[10px] ${sortConfig?.key === 'userCount' ? 'text-indigo-600' : 'text-slate-200 group-hover:text-indigo-300'}`}>
                                {sortConfig?.key === 'userCount' && sortConfig.direction === 'asc' ? '▲' : '▼'}
                              </span>
                            </div>
                          </th>
                          {/* 可排序表头：存活期 */}
                          <th className="pb-4 cursor-pointer hover:text-indigo-600 transition-colors select-none group" onClick={() => handleSort('timestamp')}>
                            <div className="flex items-center gap-1">底层存活期
                              <span className={`text-[10px] ${sortConfig?.key === 'timestamp' ? 'text-indigo-600' : 'text-slate-200 group-hover:text-indigo-300'}`}>
                                {sortConfig?.key === 'timestamp' && sortConfig.direction === 'asc' ? '▲' : '▼'}
                              </span>
                            </div>
                          </th>
                          <th className="pb-4 text-right pr-4">单独操作</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm">
                        {sortedVideos.map((vid, idx) => (
                          <tr key={idx} className={`border-b border-slate-50 transition-colors ${selectedIds.includes(vid.videoId) ? 'bg-indigo-50/50' : 'hover:bg-slate-50/50'}`}>
                            <td className="py-5 pl-4">
                              <input 
                                type="checkbox" 
                                className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer"
                                checked={selectedIds.includes(vid.videoId)}
                                onChange={() => handleSelectOne(vid.videoId)}
                              />
                            </td>
                            <td className="py-5">
                              <div className="flex flex-col gap-1">
                                <span className="font-bold text-slate-900 truncate max-w-[200px] xl:max-w-[300px]" title={vid.title}>
                                  {vid.title}
                                </span>
                                <div className="flex items-center gap-3">
                                  <span className="font-mono text-[10px] font-bold text-slate-400">ID: {vid.videoId}</span>
                                  {/* ✨ 新增：直接点击进入 HTML 报告阅览页 */}
                                  <a 
                                    href={`${API_BASE}/cache/${vid.videoId}/report.html`} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="text-[10px] font-black text-indigo-500 hover:text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full flex items-center gap-1 transition-all hover:bg-indigo-100"
                                  >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                                    查看本地脱机报告
                                  </a>
                                </div>
                              </div>
                            </td>
                            <td className="py-5">
                              <span className="font-black text-slate-700 text-sm">
                                {formatPlayCount(vid.playCount)}
                              </span>
                            </td>
                            <td className="py-5">
                              <div className="flex flex-col items-start">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-black ${vid.userCount > 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                                  {vid.userCount} 个副本被挂载
                                </span>
                                {/* ✨ 新增排版：详细展示哪些员工在使用该缓存视频 */}
                                {vid.relatedUsers && vid.relatedUsers.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-2 max-w-[200px]">
                                    {vid.relatedUsers.map((uname: string) => (
                                      <span key={uname} className="px-2 py-0.5 bg-white border border-slate-200 shadow-sm text-slate-600 rounded-md text-[10px] font-bold">
                                        👤 {uname}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="py-5">
                              <span className="text-emerald-600 font-bold bg-emerald-50 px-2.5 py-1 rounded-lg text-xs">
                                {formatExistTime(vid.timestamp)}
                              </span>
                            </td>
                            <td className="py-5 text-right pr-4">
                              <button 
                                onClick={() => handleDeleteVideo(vid.videoId)}
                                className="bg-white border border-slate-200 text-red-500 hover:bg-red-500 hover:text-white px-3 py-1.5 rounded-xl text-[11px] font-black transition-all shadow-sm"
                              >
                                粉碎
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminPortal;