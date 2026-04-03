import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Settings, Trash2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AIChat } from '@/components/AIChat';

export function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  const navItems = [
    { href: '/', label: '员工内部账号', icon: Users },
    { href: '/external', label: '外部监测账号', icon: LayoutDashboard },
    { href: '/warning-center', label: '预警中心', icon: AlertTriangle },
    { href: '/recycle-bin', label: '回收站', icon: Trash2 },
    { href: '/settings', label: '设置', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-slate-50">
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-6 border-b border-slate-100">
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <svg viewBox="0 0 100 100" className="w-8 h-8 shrink-0 shadow-sm rounded-lg">
              <rect width="100" height="100" rx="22" fill="#4F46E5"/>
              <circle cx="50" cy="50" r="32" fill="none" stroke="#ffffff" strokeWidth="6" strokeDasharray="12 8"/>
              <path d="M50 18 L62 50 L50 82 L38 50 Z" fill="#ffffff"/>
              <circle cx="50" cy="50" r="7" fill="#F59E0B"/>
            </svg>
            乘风数据罗盘
          </h1>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive 
                    ? "bg-indigo-50 text-indigo-700" 
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <item.icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <main id="main-scroll-container" className="flex-1 overflow-auto relative">
        <div className="max-w-7xl mx-auto p-8">
          {children}
        </div>
        
        <AIChat />
      </main>
    </div>
  );
}