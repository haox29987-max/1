import React, { memo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Check, Edit, User, ChevronRight, Trash2, Folder, Globe, Award, Loader2, Pin, AlertTriangle, Smartphone } from 'lucide-react';
import { Account } from '@/api';

interface AccountCardProps {
  account: Account;
  prog: any;
  isMultiSelect: boolean;
  isSelected: boolean;
  onToggleSelect: (id: number) => void;
  onTogglePin: (id: number, currentPin: number) => void; 
  onEdit: (account: Account) => void;
  onNavigateDetail: (id: number) => void;
  onDeleteAccount: (id: number, username: string) => void;
}

const timeSince = (timestamp: number | string | undefined | null) => {
  if (!timestamp) return '尚未建立记录';
  try {
      const date = new Date(typeof timestamp === 'number' ? timestamp * 1000 : String(timestamp).replace(/-/g, '/').replace('T', ' '));
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      if (isNaN(diffMs) || diffMs < 0) return '刚刚';
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 60) return `${diffMins} 分钟前`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours} 小时前`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays} 天前`;
  } catch(e) { return '未知'; }
};

const AccountCard = ({ account, prog, isMultiSelect, isSelected, onToggleSelect, onTogglePin, onEdit, onNavigateDetail, onDeleteAccount }: AccountCardProps) => {
  const isScraping = prog && !prog.done;
  const displayName = account.custom_name || account.nickname || account.username;

  const now = new Date();
  const updatedDate = account.last_updated ? new Date(String(account.last_updated).replace(/-/g, '/').replace('T', ' ')) : new Date(0);
  const diffSeconds = (now.getTime() - updatedDate.getTime()) / 1000;
  const diffDays = diffSeconds / (60 * 60 * 24);
  const isJustUpdated = !isScraping && diffSeconds >= 0 && diffSeconds < 30;
  
  const isStale = diffDays >= 10;
  const isPinned = account.is_pinned === 1 || isStale;

  return (
    <Card 
      onClickCapture={(e) => {
        if (isMultiSelect) {
          e.stopPropagation();
          e.preventDefault();
          onToggleSelect(account.id);
        }
      }}
      className={`transition-all flex flex-col relative overflow-hidden ${isMultiSelect ? 'cursor-pointer hover:ring-2 hover:ring-indigo-300' : ''} ${isSelected ? 'ring-2 ring-indigo-600 bg-indigo-50/20' : 'border-slate-200 hover:shadow-md'}`}
    >
      {isScraping && <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-500 z-10 animate-pulse"></div>}
      
      {isMultiSelect && (
        <div className="absolute top-3 right-3 z-30">
          <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 bg-white'}`}>
            {isSelected && <Check size={14} strokeWidth={3} />}
          </div>
        </div>
      )}

      <CardContent className="p-5 flex-1 flex flex-col">
         <div className="flex justify-between items-start mb-3">
            <div className="flex gap-1.5 flex-wrap">
              {account.failed_video_count && account.failed_video_count > 0 ? (
                  <span className="text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded font-semibold border border-red-600 flex items-center gap-1 shadow-sm animate-pulse">
                      <AlertTriangle size={10} strokeWidth={3} />有视频更新失败
                  </span>
              ) : isJustUpdated ? (
                  <span className="text-[10px] bg-emerald-500 text-white px-1.5 py-0.5 rounded font-semibold border border-emerald-600 flex items-center gap-1 shadow-sm animate-pulse">
                      <Check size={10} strokeWidth={3} />刚刚更新完毕
                  </span>
              ) : null}
              
              {isStale && (
                  <span className="text-[10px] bg-orange-500 text-white px-1.5 py-0.5 rounded font-semibold border border-orange-600 flex items-center gap-1 shadow-sm">
                      <Pin size={10} className="fill-white" />久未更新自动置顶
                  </span>
              )}
              <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-semibold border border-slate-200 flex items-center gap-1">
                  <Folder size={10}/>{account.group_name || '默认分组'}
              </span>
              {account.country && account.country !== '未知' && (
                  <span className="text-[10px] bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded font-semibold border border-emerald-100 flex items-center gap-1">
                      <Globe size={10}/>{account.country}
                  </span>
              )}
              {account.mcn && (
                  <span className="text-[10px] bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded font-semibold border border-purple-100 flex items-center gap-1 max-w-[80px] truncate" title={account.mcn}>
                      <Award size={10}/>{account.mcn}
                  </span>
              )}
              {/* 🚀 设备小标签 */}
              {(account as any).device && (
                  <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-semibold border border-blue-100 flex items-center gap-1">
                      <Smartphone size={10}/>{(account as any).device}
                  </span>
              )}
            </div>
            
            {!isMultiSelect && (
              <div className="flex items-center gap-1">
                <button 
                  className={`text-slate-300 hover:text-indigo-600 transition-colors p-1 ${isPinned ? 'text-indigo-600' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onTogglePin(account.id, account.is_pinned || 0);
                  }}
                  title={isStale ? "超过10天未更新，系统已强制置顶，点击取消无效" : "点击手动置顶/取消置顶"}
                >
                  <Pin size={14} className={isPinned ? "fill-indigo-600" : ""} />
                </button>
                <button 
                  className="text-slate-300 hover:text-indigo-600 transition-colors p-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(account);
                  }}
                  title="配置账号名称、分组、国家与设备等"
                >
                  <Edit size={14} />
                </button>
              </div>
            )}
         </div>

         <div className="flex items-center gap-3 w-full">
           <Avatar className={`h-12 w-12 border-2 border-slate-50 shrink-0 ${isScraping ? 'animate-pulse ring-2 ring-indigo-100' : ''}`}>
             <AvatarImage src={account.avatar_url} loading="lazy" />
             <AvatarFallback><User className="text-slate-400" /></AvatarFallback>
           </Avatar>
           <div className="min-w-0 pr-4">
             <h4 className="font-bold text-slate-900 truncate" title={displayName}>{displayName}</h4>
             <p className="text-xs text-slate-500 truncate">@{account.username}</p>
           </div>
         </div>
         
         <div className="mt-3 mb-2 flex flex-col gap-1 text-[11px] text-slate-400">
            <span>入系统日期: <span className="font-mono">{account.created_at ? account.created_at.split(' ')[0] : '无'}</span></span>
            {/* 🚀 替换为昨日发布数 */}
            <span>昨日发布数: <strong className="text-slate-600 ml-1">{(account as any).yesterday_video_count || 0}</strong> 条</span>
            <span className={isJustUpdated ? "text-emerald-600 font-semibold" : ""}>距上次发布: <strong className="text-slate-600 ml-1">{timeSince(account.last_video_time)}</strong></span>
            <span>AI视频数量: <strong className="text-slate-600 ml-1">{account.ai_video_count || 0}</strong> 个</span>
         </div>

         <div className="mt-auto pt-3 border-t border-slate-100 flex flex-col gap-2 h-[36px] justify-center">
            {isScraping ? (
              <div className="w-full flex flex-col justify-center">
                 <div className="flex justify-between items-center text-[10px] text-indigo-600 mb-1.5 font-medium">
                    <span className="flex items-center gap-1.5 truncate max-w-[70%]">
                       <Loader2 size={12} className="animate-spin shrink-0"/>
                       <span className="truncate">{prog.status}</span>
                    </span>
                    <span className="shrink-0 tabular-nums">{prog.current} / {prog.total}</span>
                 </div>
                 <div className="w-full bg-indigo-100 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-indigo-500 h-full transition-all duration-300" style={{ width: `${prog.total > 0 ? (prog.current / Math.max(prog.total, 1)) * 100 : 0}%` }}></div>
                 </div>
              </div>
            ) : (
              <div className={`flex items-center gap-2 ${isMultiSelect ? 'opacity-50 pointer-events-none' : ''}`}>
                  <Button 
                    className="flex-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-800 shadow-none border-none font-semibold text-xs h-9" 
                    onClick={(e) => { e.stopPropagation(); onNavigateDetail(account.id); }}
                  >
                     作者详情 <ChevronRight size={16} className="ml-1"/>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="text-red-500 hover:text-red-600 hover:bg-red-50 border-red-100 shrink-0 h-9 w-9 p-0" 
                    onClick={(e) => { e.stopPropagation(); onDeleteAccount(account.id, account.username); }}
                    title="移入回收站"
                  >
                     <Trash2 size={15}/>
                  </Button>
              </div>
            )}
         </div>
      </CardContent>
    </Card>
  );
};

export default memo(AccountCard, (prevProps, nextProps) => {
  return (
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.isMultiSelect === nextProps.isMultiSelect &&
    JSON.stringify(prevProps.prog) === JSON.stringify(nextProps.prog) &&
    prevProps.account.last_updated === nextProps.account.last_updated &&
    prevProps.account.group_name === nextProps.account.group_name &&
    prevProps.account.custom_name === nextProps.account.custom_name &&
    prevProps.account.ai_video_count === nextProps.account.ai_video_count &&
    prevProps.account.is_pinned === nextProps.account.is_pinned && 
    prevProps.account.failed_video_count === nextProps.account.failed_video_count &&
    (prevProps.account as any).device === (nextProps.account as any).device &&
    (prevProps.account as any).yesterday_video_count === (nextProps.account as any).yesterday_video_count
  );
});