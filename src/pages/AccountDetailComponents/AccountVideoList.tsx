import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Loader2, Plus, ChevronDown, Check, ArrowUp, ArrowDown, Zap, Tag, Music, ExternalLink, Play, Heart, MessageCircle, Share2, Bookmark, Focus, Trash2, X, Clock, RefreshCw } from 'lucide-react';
import { AreaChart as AreaChartIcon } from 'lucide-react';
import { format } from 'date-fns';

export default function AccountVideoList({
  data, sortedVideos, account, pinnedVideos, activeTrendVids, globalVideoIndexMap, sortKey, sortOrder,
  setSortKey, setSortOrder, setIsManualSort, sortOptions, newVideoUrl, setNewVideoUrl, addingVideo,
  handleAddManualVideo, handleToggleTrendVid, handlePidClick, handleOpenVideoTrend, handleSingleRefresh,
  refreshingVideos, handleDeleteVideo, retryingFailed, handleRetryFailedVideos
}: any) {
  
  const aiCount = (data?.videos || []).filter((v: any) => v.is_ai === '是').length;
  // 🚀 修复 Bug：优先读取后端精准返回的失败数量，避免由于限制最新100条导致的失败条目漏算
  const failedCount = data?.account?.failed_video_count || (data?.videos || []).filter((v: any) => v.sync_status === 0).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="flex items-center flex-wrap gap-4 w-full">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight whitespace-nowrap">
            包含多PID分析的视频列表 
            <span className="text-sm font-normal text-slate-500 ml-2">
              (全部链接：{data?.videos?.length || 0} | AI生成：{aiCount})
            </span>
          </h2>
          
          <div className="flex items-center gap-1.5 ml-0 sm:ml-auto w-full sm:w-auto relative">
            {/* 🚀 在这里只当有失败的视频时，才显示这个一键重试的按钮 */}
            {failedCount > 0 && (
              <Button size="sm" className="h-9 px-4 shrink-0 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200" onClick={handleRetryFailedVideos} disabled={retryingFailed}>
                {retryingFailed ? <Loader2 className="animate-spin w-3.5 h-3.5 mr-1.5" /> : <RefreshCw className="w-3.5 h-3.5 mr-1.5" />} 重试失败 ({failedCount})
              </Button>
            )}
            
            <div className="relative w-full sm:w-[280px]">
              <Input 
                placeholder="在此粘贴TikTok链接以手动补充..." 
                value={newVideoUrl} 
                onChange={(e) => setNewVideoUrl(e.target.value)} 
                className="w-full h-9 text-xs border-slate-300 focus-visible:ring-indigo-500 pr-8"
              />
              {newVideoUrl && (
                <X 
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer hover:text-slate-600 transition-colors" 
                  size={14} 
                  onClick={() => setNewVideoUrl('')} 
                />
              )}
            </div>
            <Button size="sm" className="h-9 px-4 shrink-0 bg-slate-800 hover:bg-slate-900 text-white" onClick={handleAddManualVideo} disabled={addingVideo}>
              {addingVideo ? <Loader2 className="animate-spin w-3.5 h-3.5 mr-1.5" /> : <Plus className="w-3.5 h-3.5 mr-1.5" />} 主动添加
            </Button>
          </div>
        </div>
        
        <div className="flex items-center gap-2 self-end lg:self-auto shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2 h-9">{(sortOptions || []).find((o:any) => o.key === sortKey)?.label || '排序'}<ChevronDown size={14} /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {(sortOptions || []).map((option: any) => (
                <DropdownMenuItem 
                  key={option.key} 
                  onClick={() => { 
                    setSortKey(option.key); 
                    setIsManualSort(true); 
                  }}
                >
                  <span className={sortKey === option.key ? 'text-indigo-600 font-medium' : ''}>{option.label}</span>
                  {sortKey === option.key && <Check size={14} className="ml-auto text-indigo-600" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button 
            variant="outline" 
            size="icon" 
            className="h-9 w-9" 
            onClick={() => { 
              setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
              setIsManualSort(true); 
            }}
          >
            {sortOrder === 'asc' ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
          </Button>
        </div>
      </div>

      <div className="grid gap-6">
        {(sortedVideos || []).map((video: any, idx: number) => {
          const actionItem = (pinnedVideos || []).find((q:any) => q.id === video.video_id);
          const isNew = actionItem?.type === 'new';
          const isUpdated = actionItem?.type === 'updated';
          const isCustomAdded = (activeTrendVids || []).includes(video.video_id);
          
          const isFailed = video.sync_status === 0;

          let borderClass = 'border-slate-200';
          if (isFailed) borderClass = 'border-red-500 shadow-md ring-1 ring-red-300 bg-red-50/10';
          else if (isNew) borderClass = 'border-red-400 shadow-md ring-1 ring-red-200 bg-red-50/10';
          else if (isUpdated) borderClass = 'border-emerald-400 shadow-md ring-1 ring-emerald-200 bg-emerald-50/10';

          return (
            <div id={`video-card-${video.video_id}`} key={video.id} className={`relative bg-white rounded-2xl border ${borderClass} p-6 hover:shadow-md transition-all duration-300 group`}>
              
              {isFailed && <div className="absolute -top-3 -right-3 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-bl-xl rounded-tr-2xl z-20 shadow-lg border-2 border-white animate-pulse">⚠️ 本次抓取失败/无数据</div>}
              {!isFailed && isNew && <div className="absolute -top-3 -right-3 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-bl-xl rounded-tr-2xl z-20 shadow-lg border-2 border-white animate-bounce">✨ 新添加</div>}
              {!isFailed && isUpdated && <div className="absolute -top-3 -right-3 bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-bl-xl rounded-tr-2xl z-20 shadow-lg border-2 border-white animate-pulse">🔥 更新成功</div>}

              <div className="flex flex-col md:flex-row gap-6">
                <div className="w-full md:w-48 shrink-0">
                  <div className="aspect-[3/4] bg-slate-100 rounded-xl overflow-hidden relative">
                    <img src={video.cover_url} alt="cover" loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" referrerPolicy="no-referrer" />
                    <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded backdrop-blur-sm flex items-center gap-1"><Zap size={10} className="fill-yellow-400 text-yellow-400" />{video.duration || 0}s</div>
                  </div>
                </div>

                <div className="flex-1 flex flex-col justify-between py-1">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2 pr-12">
                      <span className="px-2.5 py-1 bg-slate-800 text-white text-xs font-black rounded-md flex items-center shadow-sm">
                        NO.{globalVideoIndexMap?.[video.video_id] || idx + 1}
                      </span>
                      <span className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-semibold rounded-full flex items-center gap-1.5"><Tag size={12} className="text-indigo-500" /> {video.platform_category || video.category || '其他'}</span>
                      {video.sub_label && <span className="px-3 py-1 bg-blue-50 text-blue-600 text-xs font-semibold rounded-full">{video.sub_label}</span>}
                      {video.video_type && <span className="px-3 py-1 bg-purple-50 text-purple-600 text-xs font-semibold rounded-full">类型: {video.video_type}</span>}
                      {video.music_name && <span className="px-3 py-1 bg-rose-50 text-rose-600 text-xs font-semibold rounded-full max-w-[150px] truncate" title={video.music_name}><Music size={12} className="inline mr-1" />{video.music_name}</span>}
                      {video.vq_score && <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-xs font-semibold rounded-full">画质: {video.vq_score}</span>}
                      {video.is_ai && <span className="px-3 py-1 bg-orange-50 text-orange-600 text-xs font-semibold rounded-full">AI: {video.is_ai}</span>}
                      
                      {video.pid && <span onClick={() => handlePidClick(String(video.pid).replace(/[^a-zA-Z0-9]/g, ''))} className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-full flex items-center gap-1 cursor-pointer hover:bg-indigo-100 transition-colors border border-indigo-100" title="点击查看商品详情">🔍 PID: {String(video.pid).replace(/[^a-zA-Z0-9]/g, '').length > 20 ? String(video.pid).replace(/[^a-zA-Z0-9]/g, '').substring(0, 20) + '...' : String(video.pid).replace(/[^a-zA-Z0-9]/g, '')}</span>}
                      {video.product_category && <span className="px-3 py-1 bg-pink-50 text-pink-600 text-xs font-semibold rounded-full">商品: {String(video.product_category).length > 10 ? String(video.product_category).substring(0, 10) + '...' : video.product_category}</span>}
                      
                      <Button 
                        variant={isCustomAdded ? "default" : "outline"} 
                        size="sm" 
                        className={`h-7 px-3 ml-2 text-[11px] font-bold rounded-full transition-all ${isCustomAdded ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200 shadow-md text-white' : 'border-dashed border-indigo-300 text-indigo-600 hover:bg-indigo-50'}`}
                        onClick={() => handleToggleTrendVid(video.video_id)}
                      >
                        {isCustomAdded ? <><X size={12} className="mr-1"/>取消对比</> : <><Plus size={12} className="mr-1"/>加入日增长趋势图</>}
                      </Button>
                    </div>
                    
                    <div className="space-y-1 mt-1">
                      <h3 className="text-lg font-bold text-slate-900 line-clamp-2" title={video.desc}>{video.desc || '无描述'}</h3>
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Clock size={14} /><span>
                          {(() => {
                            const d = new Date((Number(video.create_time) || 0) * 1000);
                            return isNaN(d.getTime()) ? '未知时间' : format(d, 'yyyy-MM-dd HH:mm');
                          })()}
                        </span>
                        <span className="text-slate-300">|</span>
                        <a href={video.url || `https://www.tiktok.com/@${account?.username || 'user'}/video/${video.video_id}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-indigo-600 transition-colors"><ExternalLink size={14} />查看原视频</a>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col lg:flex-row lg:items-end justify-between mt-6 pt-6 border-t border-slate-100 gap-4">
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 flex-1">
                      <div className="space-y-1">
                        <div className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1.5"><Play size={12} /> 播放量</div>
                        <div 
                          className={`text-lg font-bold cursor-pointer hover:bg-indigo-50 px-1 -ml-1 rounded transition-colors flex items-center gap-1.5 ${isFailed ? 'text-red-500' : 'text-indigo-600'}`}
                          onClick={() => handleOpenVideoTrend(video.video_id, video.desc)}
                          title="点击查看历史播放量新增趋势"
                        >
                          {(video.play_count || 0).toLocaleString()} 
                          <AreaChartIcon size={14} className={isFailed ? 'text-red-400' : 'text-indigo-400'} />
                        </div>
                      </div>
                      <div className="space-y-1"><div className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1.5"><Heart size={12} /> 点赞量</div><div className="text-lg font-bold text-slate-900">{(video.digg_count || 0).toLocaleString()}</div></div>
                      <div className="space-y-1"><div className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1.5"><MessageCircle size={12} /> 评论数</div><div className="text-lg font-bold text-slate-900">{(video.comment_count || 0).toLocaleString()}</div></div>
                      <div className="space-y-1"><div className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1.5"><Share2 size={12} /> 分享数</div><div className="text-lg font-bold text-slate-900">{(video.share_count || 0).toLocaleString()}</div></div>
                      <div className="space-y-1"><div className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1.5"><Bookmark size={12} /> 收藏数</div><div className="text-lg font-bold text-slate-900">{(video.collect_count || 0).toLocaleString()}</div></div>
                    </div>
                    
                    <div className="flex items-center gap-2 shrink-0">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border-none h-8 text-xs font-semibold px-3" 
                        onClick={() => handleSingleRefresh(video.video_id)}
                        disabled={(refreshingVideos || []).includes(video.video_id)}
                      >
                        {(refreshingVideos || []).includes(video.video_id) ? <Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> : <Focus size={13} className="mr-1.5" />} 
                        {(refreshingVideos || []).includes(video.video_id) ? "深度抓取中..." : "单独深度分析"}
                      </Button>
                      <Button size="sm" variant="outline" className="text-red-500 hover:text-red-600 bg-red-50 hover:bg-red-100 border-none h-8 text-xs font-semibold px-3" onClick={() => handleDeleteVideo(video.video_id)}>
                        <Trash2 size={13} className="mr-1.5" /> 移至回收站
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}