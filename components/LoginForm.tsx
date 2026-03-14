
import React, { useState } from 'react';
import { UserData, AllowedUser } from '../types';

interface LoginFormProps {
  mode: 'employee' | 'admin';
  allowedUsers: AllowedUser[];
  onLogin: (user: UserData) => void;
  onLogoClick?: () => void;
  onCancel?: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ mode, allowedUsers, onLogin, onLogoClick, onCancel }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username || !password) {
      setError('请完整填写信息');
      return;
    }

    if (mode === 'admin') {
      if (username === '秦涛' && password === 'qt20030802') {
        onLogin({ username: '超级管理员' });
      } else {
        setError('管理员身份或密码错误');
      }
    } else {
      // Check against allowedUsers list
      const userMatch = allowedUsers.find(
        u => u.username === username && u.password === password
      );

      if (userMatch) {
        onLogin({ 
          username: userMatch.username,
          apiKey: userMatch.api_key 
        });
      } else {
        setError('账号不存在或密码错误，请联系管理员');
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 overflow-hidden relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(79,70,229,0.12),transparent_60%)]"></div>
      
      <div className="w-full max-w-md bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[3rem] p-12 shadow-2xl relative z-10 animate-in fade-in zoom-in duration-700 text-center">
        <div 
          onClick={onLogoClick}
          className={`w-20 h-20 rounded-[1.8rem] mx-auto flex items-center justify-center mb-10 shadow-2xl transition-all active:scale-95 cursor-pointer select-none ${
            mode === 'admin' ? 'bg-amber-500 shadow-amber-500/20' : 'bg-indigo-600 shadow-indigo-500/20'
          }`}
        >
          <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={mode === 'admin' ? 2 : 2.5} d={mode === 'admin' ? "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" : "M13 10V3L4 14h7v7l9-11h-7z"} />
          </svg>
        </div>

        <h2 className="text-3xl font-black text-white tracking-tight mb-2">
          {mode === 'admin' ? '中枢控制台' : '乘风 · 智影'}
        </h2>
        <p className="text-slate-500 mb-12 text-sm font-bold uppercase tracking-widest">
          {mode === 'admin' ? '核心管理权限验证' : '内部生产力引擎'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-5 text-left">
          <div>
            <input 
              type="text" 
              placeholder={mode === 'admin' ? "管理员用户名" : "分配的账号"}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-8 text-white outline-none font-bold text-center focus:ring-2 focus:ring-indigo-500/50 transition-all placeholder:text-slate-600" 
            />
          </div>
          <div>
            <input 
              type="password" 
              placeholder="访问密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-8 text-white outline-none font-bold text-center focus:ring-2 focus:ring-indigo-500/50 transition-all placeholder:text-slate-600" 
            />
          </div>
          
          {error && <p className="text-red-400 text-[11px] font-black text-center mt-2 uppercase tracking-wider">{error}</p>}
          
          <button 
            type="submit"
            className={`w-full py-4 rounded-2xl font-black transition-all shadow-xl flex justify-center items-center gap-2 mt-4 text-white ${
              mode === 'admin' ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/10' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/10'
            }`}
          >
            {mode === 'admin' ? '进入后台' : '验证身份'}
          </button>

          {mode === 'admin' && (
            <button 
              type="button" 
              onClick={onCancel}
              className="w-full text-slate-500 text-xs font-black py-2 hover:text-slate-300 transition-colors uppercase tracking-widest"
            >
              返回员工登录
            </button>
          )}
        </form>
      </div>
    </div>
  );
};

export default LoginForm;
