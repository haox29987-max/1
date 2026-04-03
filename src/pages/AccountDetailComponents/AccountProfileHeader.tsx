import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Loader2, RefreshCw, User, Globe, Folder, Download, Clock, Play } from 'lucide-react';
import { AreaChart as AreaChartIcon } from 'lucide-react';

export default function AccountProfileHeader({
  account, snapshots, latestVideoTime, days, setDays, updateLimit, setUpdateLimit, 
  handleRefresh, isWorking, progress, handleExport, openFollowerTrend, timeSince
}: any) {
  const displayName = account?.custom_name || account?.nickname || account?.username || '未知账号';

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
      <div className="flex gap-4">
        <Avatar className="h-20 w-20 border-4 border-slate-50">
          <AvatarImage src={account?.avatar_url} />
          <AvatarFallback><User size={32} /></AvatarFallback>
        </Avatar>
        <div>
          <div className="flex items-center flex-wrap gap-3">
            <h1 className="text-2xl font-bold text-slate-900">{displayName}</h1>
            {account?.country && account.country !== '未知' && (
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 flex items-center gap-1"><Globe size={12}/>{account.country}</span>
            )}
            {account?.group_name && (
                <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100 flex items-center gap-1"><Folder size={12}/>{account.group_name}</span>
            )}
            {account?.reg_time && <span className="text-xs font-medium text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">注册: {account.reg_time}</span>}
          </div>
          
          <div className="flex items-center gap-4 mt-1">
            <p className="text-slate-500">@{account?.username}</p>
            {/* 核心修正：读取真实的 uid 字段，如果后台还没抓取到则显示提示 */}
            <span className="text-sm font-medium text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
              UID：{account?.uid || '正在等待爬虫解析...'}
            </span>
          </div>
          
          <div className="flex flex-col gap-1.5 mt-3.5 bg-slate-50 p-2.5 rounded-md border border-slate-100 text-[13px]">
            <span className="text-slate-500 flex items-center gap-2"><Clock size={14} className="text-slate-400"/> 距作者发布最新视频已过：<strong className="text-indigo-800 font-semibold">{timeSince(latestVideoTime)}</strong></span>
            <span className="text-slate-500 flex items-center gap-2"><RefreshCw size={14} className="text-slate-400"/> 距上次为您提取此号数据：<strong className="text-indigo-800 font-semibold">{timeSince(account?.last_updated)}</strong></span>
          </div>

          <div className="flex flex-wrap gap-4 mt-4">
            <div 
              className="flex items-center gap-2 bg-slate-50/80 border border-slate-200 px-3 py-1.5 rounded-md transition-colors hover:bg-indigo-50 cursor-pointer group"
              onClick={openFollowerTrend}
              title="点击查看粉丝每日真实增长趋势"
            >
              <User size={14} className="text-slate-500 group-hover:text-indigo-500" />
              <span className="text-[13px] font-medium text-slate-500 group-hover:text-indigo-600">粉丝数：</span>
              <span className="text-base font-bold text-slate-800 group-hover:text-indigo-700">
                {snapshots?.length > 0 ? snapshots[snapshots.length - 1]?.follower_count?.toLocaleString() : '-'}
                <AreaChartIcon size={14} className="inline-block ml-1.5 text-indigo-400 group-hover:text-indigo-600" />
              </span>
            </div>
            <div className="flex items-center gap-2 bg-slate-50/80 border border-slate-200 px-3 py-1.5 rounded-md transition-colors hover:bg-slate-50">
              <Play size={14} className="text-slate-500" />
              <span className="text-[13px] font-medium text-slate-500">全部发布视频数：</span>
              <span className="text-base font-bold text-slate-800">{snapshots?.length > 0 ? snapshots[snapshots.length - 1]?.video_count : '-'}</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex flex-col items-end gap-3 w-full md:w-auto mt-4 md:mt-0">
          <div className="grid grid-cols-2 gap-3 w-full md:w-[320px]">
            <Button onClick={handleExport} variant="outline" className="w-full border-slate-200 text-slate-600 hover:bg-slate-50 h-10 px-2 whitespace-nowrap">
              <Download size={16} className="mr-1.5" /> 导出本号数据
            </Button>
            <Select value={days.toString()} onValueChange={(v) => setDays(parseInt(v))}>
              <SelectTrigger className="w-full h-10 bg-white px-3"><SelectValue placeholder="数据范围" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7">近 7 天</SelectItem>
                <SelectItem value="30">近 30 天</SelectItem>
                <SelectItem value="90">近 90 天</SelectItem>
                <SelectItem value="0">全部历史</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-2 gap-3 w-full md:w-[320px]">
            <div className="flex items-center border border-slate-200 rounded-md bg-white overflow-hidden h-10 shadow-sm w-full" title="填写要往后抓取最新发布的几条视频">
              <span className="text-xs text-slate-500 px-2.5 whitespace-nowrap bg-slate-50 border-r border-slate-200 h-full flex items-center font-medium">更新数量</span>
              <Input 
                type="number" 
                min="1" 
                value={updateLimit === 0 ? '' : updateLimit} 
                onChange={(e) => setUpdateLimit(parseInt(e.target.value) || 0)} 
                className="flex-1 min-w-0 h-full text-center border-none focus-visible:ring-0 rounded-none font-bold text-indigo-700 text-sm px-1" 
              />
            </div>
            <Button variant="default" className="w-full bg-indigo-600 hover:bg-indigo-700 h-10 px-2 whitespace-nowrap" onClick={handleRefresh} disabled={isWorking}>
              <RefreshCw className={`mr-1.5 h-4 w-4 ${isWorking ? 'animate-spin' : ''}`} />{isWorking ? '分析中...' : '同步最新视频'}
            </Button>
          </div>
          
          {progress && (
            <div className="w-full md:w-[320px] mt-1 bg-indigo-50 p-2.5 rounded-lg border border-indigo-100 shadow-sm transition-all duration-300">
              <div className="flex justify-between items-center text-[11px] font-semibold text-indigo-700 mb-1.5 px-1">
                <span className="flex items-center gap-1.5">
                    {!progress.done && <Loader2 className="w-3 h-3 animate-spin"/>}
                    {progress.status}
                </span>
                <span className="bg-white/60 px-1.5 py-0.5 rounded tabular-nums">{progress.current} / {progress.total}</span>
              </div>
              <div className="w-full bg-indigo-200/50 rounded-full h-2 overflow-hidden">
                <div className="bg-indigo-500 h-full transition-all duration-500" style={{ width: `${progress.total > 0 ? (progress.current/Math.max(progress.total, 1))*100 : 0}%` }}></div>
              </div>
            </div>
          )}
      </div>
    </div>
  );
}