
import React, { useState } from 'react';
import { AllowedUser } from '../types';

interface AdminPortalProps {
  onLogout: () => void;
  allowedUsers: AllowedUser[];
  setAllowedUsers: React.Dispatch<React.SetStateAction<AllowedUser[]>>;
}

const AdminPortal: React.FC<AdminPortalProps> = ({ onLogout, allowedUsers, setAllowedUsers }) => {
  const [newUserName, setNewUserName] = useState('');
  const [newUserPass, setNewUserPass] = useState('');
  const [newApiKey, setNewApiKey] = useState('');

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
      {/* Sidebar */}
      <aside className="w-80 bg-slate-900 text-slate-400 flex flex-col p-8 space-y-10 z-10 shadow-2xl">
        <div className="flex items-center space-x-4 mb-2">
          <div className="bg-white text-slate-950 p-2 rounded-2xl shadow-lg">
             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
          </div>
          <h1 className="text-xl font-black tracking-tight text-white italic text-nowrap">乘风 · 控制台</h1>
        </div>
        
        <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest px-1">超级管理员：秦涛</p>

        <nav className="flex-1 space-y-2">
          <button className="w-full flex items-center gap-4 px-5 py-4 bg-white/10 text-white rounded-2xl font-black text-sm transition-all shadow-lg border border-white/5">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
            账号与权限管理
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

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-12 bg-slate-50">
        <div className="max-w-5xl mx-auto space-y-12">
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
        </div>
      </main>
    </div>
  );
};

export default AdminPortal;
