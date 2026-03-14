import React, { useState, useEffect } from 'react';
import { AllowedUser } from '../types';

interface AdminPortalProps {
  onLogout: () => void;
  allowedUsers: AllowedUser[];
  setAllowedUsers: React.Dispatch<React.SetStateAction<AllowedUser[]>>;
}

const AdminPortal: React.FC<AdminPortalProps> = ({ onLogout, allowedUsers, setAllowedUsers }) => {
  // 核心：新增顶部 Tab 切换控制流
  const [activeTab, setActiveTab] = useState<'users' | 'videos'>('users');
  
  // 原有的用户管理状态
  const [newUserName, setNewUserName] = useState('');
  const [newUserPass, setNewUserPass] = useState('');
  const [newApiKey, setNewApiKey] = useState('');

  // 新增的全局视频数据矩阵状态
  const [videos, setVideos] = useState<any[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(false);

  // 当切换到视频管理页时，实时拉取并挂载全局视频数据
  useEffect(() => {
    if (activeTab === 'videos') {
      fetchVideos();
    }
  }, [activeTab]);

  const fetchVideos = async () => {
    setLoadingVideos(true);
    try {
      // 智能解析 API 基础地址（兼容本地与线上联调模式）
      const API_BASE = "http://" + window.location.hostname + ":8001";
      const res = await fetch(`${API_BASE}/api/admin/videos`);
      const data = await res.json();
      if (data.videos) {
        setVideos(data.videos);
      }
    } catch (error) {
      console.error("加载全局视频数据库池失败", error);
    } finally {
      setLoadingVideos(false);
    }
  };

  const handleDeleteVideo = async (videoId: string) => {
    // 操作告警拦截：确保拥有极高权限的管理员不点错
    if (!confirm(`【危险操作警报】确定要彻底粉碎视频 [${videoId}] 吗？\n警告：系统将穿透扫描所有的用户物理存储隔离层，将所有绑定了该视频的分析包同步物理粉碎，此操作不可逆转！`)) return;
    try {
      const API_BASE = "http://" + window.location.hostname + ":8001";
      const res = await fetch(`${API_BASE}/api/admin/videos/${videoId}`, { method: 'DELETE' });
      if (res.ok) {
        alert('🎯 清理指令下达成功！系统底层已完成级联物理粉碎。');
        fetchVideos(); // 粉碎后立刻重新映射界面数据
      } else {
        alert('清理异常，请检查后端引擎状态。');
      }
    } catch (e) {
      console.error(e);
      alert('底层服务请求异常');
    }
  };

  // 动态时间换算引擎，计算文件留存周期
  const formatExistTime = (timestamp: number) => {
    const diffMs = Date.now() - timestamp * 1000;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    if (diffDays > 0) return `留存 ${diffDays}天 ${diffHours}小时`;
    if (diffHours > 0) return `留存 ${diffHours}小时 ${diffMins}分钟`;
    return `留存 ${diffMins}分钟`;
  };

  const handleAddUser = () => {
    if (!newUserName || !newUserPass || !newApiKey) {
      alert("请填写完整人员信息及专属 API Key");
      return;
    }
    // Prevent duplicates
    if (allowedUsers.some(u => u.username === newUserName)) {
      alert("该用户名已存在");
      return;
    }
    setAllowedUsers([...allowedUsers, { 
      username: newUserName, 
      password: newUserPass,
      api_key: newApiKey 
    }]);
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
      {/* Sidebar 侧边动态导航锚点 */}
      <aside className="w-80 bg-slate-900 text-slate-400 flex flex-col p-8 space-y-10 z-10 shadow-2xl">
        <div className="flex items-center space-x-4 mb-2">
          <div className="bg-white text-slate-950 p-2 rounded-2xl shadow-lg">
             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
          </div>
          <h1 className="text-xl font-black tracking-tight text-white italic text-nowrap">乘风 · 控制台</h1>
        </div>
        
        <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest px-1">超级管理员：秦涛</p>

        <nav className="flex-1 space-y-3">
          {/* 用户管理 Tab */}
          <button 
            onClick={() => setActiveTab('users')}
            className={`w-full flex items-center gap-4 px-5 py-4 text-white rounded-2xl font-black text-sm transition-all shadow-lg border ${
              activeTab === 'users' ? 'bg-indigo-600 border-indigo-500' : 'bg-white/5 border-white/5 hover:bg-white/10'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
            账号与权限管理
          </button>

          {/* 所有视频管理 Tab */}
          <button 
            onClick={() => setActiveTab('videos')}
            className={`w-full flex items-center gap-4 px-5 py-4 text-white rounded-2xl font-black text-sm transition-all shadow-lg border ${
              activeTab === 'videos' ? 'bg-emerald-600 border-emerald-500' : 'bg-white/5 border-white/5 hover:bg-white/10'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
            全局引擎视频池
          </button>
        </nav>

        <div className="pt-4 border-t border-white/5">
          <button 
            onClick={onLogout} 
            className="w-full flex items-center justify-center gap-3 p-4 bg-red-500/10 rounded-2xl text-sm font-black text-red-400 hover:bg-red-500 hover:text-white transition-all border border-red-500/20"
          >
            退出后台管理
          </button>
        </div>
      </aside>

      {/* Main Content 面板分发 */}
      <main className="flex-1 overflow-y-auto p-12 bg-slate-50">
        <div className="max-w-6xl mx-auto space-y-12">
          
          {activeTab === 'users' ? (
            /* 原版：人员权限管理页面，未做任何修改与阉割 */
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
                  <button 
                    onClick={handleAddUser}
                    className="bg-indigo-600 text-white px-8 py-3 rounded-2xl text-sm font-black hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 w-full lg:w-auto"
                  >添加人员</button>
                </div>

                <div className="pt-8 border-t border-slate-50">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 px-1">当前已授权名单 ({allowedUsers.length})</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {allowedUsers.length === 0 ? (
                      <div className="col-span-full py-12 text-center text-slate-300 font-bold italic uppercase tracking-widest border-2 border-dashed border-slate-100 rounded-3xl">
                        暂无已授权人员
                      </div>
                    ) : (
                      allowedUsers.map((u, i) => (
                        <div key={i} className="group relative bg-slate-50/50 rounded-3xl p-6 border border-slate-100 hover:border-indigo-200 hover:bg-white transition-all flex flex-col gap-4">
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center font-black text-slate-400 shadow-sm border border-slate-50">
                                {u.username[0]}
                              </div>
                              <div className="flex flex-col">
                                <span className="text-sm font-black text-slate-900">{u.username}</span>
                                <span className="text-[9px] font-bold text-slate-400">PW: {u.password}</span>
                              </div>
                            </div>
                            <button 
                              onClick={() => handleDeleteUser(u.username)}
                              className="p-2 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                            </button>
                          </div>
                          <div className="bg-white/80 px-4 py-2 rounded-xl border border-slate-200/50">
                             <span className="text-[10px] text-indigo-600 font-mono font-bold truncate block">
                               🔑 {u.api_key}
                             </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </section>
          ) : (
            /* 新增：全局引擎缓冲池穿透管理 */
            <section className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">全局视频缓存引擎池</h2>
                <button onClick={fetchVideos} className="text-emerald-600 hover:text-emerald-700 font-bold text-sm bg-emerald-50 px-4 py-2 rounded-xl transition-colors">
                  🔄 刷新矩阵映射
                </button>
              </div>
              
              <div className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-xl shadow-slate-200/50">
                {loadingVideos ? (
                  <div className="py-20 text-center text-slate-400 font-bold animate-pulse">正在穿透底层读取物理数据并计算矩阵...</div>
                ) : videos.length === 0 ? (
                  <div className="py-20 text-center text-slate-300 font-bold italic uppercase tracking-widest border-2 border-dashed border-slate-100 rounded-3xl">
                    目前底层公有池没有任何已被缓存的视频文件
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                          <th className="pb-4 pl-4">视频识别码 / ID</th>
                          <th className="pb-4">AI解构标题</th>
                          <th className="pb-4 text-center">绑定员工占用</th>
                          <th className="pb-4">缓存存活期</th>
                          <th className="pb-4 text-right pr-4">物理控制</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm">
                        {videos.map((vid, idx) => (
                          <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                            <td className="py-4 pl-4 font-mono font-bold text-slate-700">{vid.videoId}</td>
                            <td className="py-4">
                              <span className="font-bold text-slate-900 block truncate max-w-[200px] xl:max-w-[300px]" title={vid.title}>
                                {vid.title}
                              </span>
                            </td>
                            <td className="py-4 text-center">
                              <div className="inline-flex flex-col items-center">
                                <span className={`px-3 py-1 rounded-full text-xs font-black ${vid.userCount > 0 ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>
                                  {vid.userCount} 份独立挂载
                                </span>
                                {vid.relatedUsers && vid.relatedUsers.length > 0 && (
                                  <span className="text-[9px] text-slate-400 mt-1 font-bold">
                                    {vid.relatedUsers.join(", ")}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-4">
                              <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-1 rounded-lg text-xs">
                                {formatExistTime(vid.timestamp)}
                              </span>
                            </td>
                            <td className="py-4 text-right pr-4">
                              <button 
                                onClick={() => handleDeleteVideo(vid.videoId)}
                                className="bg-red-50 text-red-500 hover:bg-red-500 hover:text-white px-4 py-2 rounded-xl text-xs font-black transition-colors"
                              >
                                彻底抹除
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