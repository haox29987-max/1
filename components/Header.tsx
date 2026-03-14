
import React from 'react';
import { UserData } from '../types';

interface HeaderProps {
  onLogoClick?: () => void;
  user?: UserData | null;
  onLogout?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onLogoClick, user, onLogout }) => {
  return (
    <header className="bg-white/70 backdrop-blur-xl border-b border-gray-100 sticky top-0 z-50 select-none">
      <div className="container mx-auto px-8 h-20 flex items-center justify-between">
        <div className="flex items-center space-x-5">
          <div 
            onClick={onLogoClick}
            className="w-11 h-11 bg-indigo-600 rounded-[1.1rem] flex items-center justify-center text-white shadow-xl shadow-indigo-100/50 hover:scale-105 transition-transform cursor-pointer active:scale-95 select-none"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div className="cursor-default">
            <h1 className="text-xl font-black text-gray-900 tracking-tight italic">乘风 · 智影</h1>
            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-[0.25em]">Chengfeng Insight</p>
          </div>
        </div>
        
        {user && (
          <div className="flex items-center space-x-6">
            <div className="hidden md:flex items-center space-x-3 bg-gray-50 px-4 py-2 rounded-2xl border border-gray-100 cursor-default">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-bold text-gray-700 select-none">{user.username}</span>
            </div>
            <button 
              onClick={onLogout}
              className="text-sm font-black text-gray-400 hover:text-red-500 transition-colors px-4 py-2 rounded-xl hover:bg-red-50 select-none"
            >
              登出
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;