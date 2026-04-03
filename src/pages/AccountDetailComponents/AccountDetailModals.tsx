import { useRef, useState } from 'react';
import { createPortal } from 'react-dom'; 
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Loader2, ChevronLeft, ChevronRight, Minus, Plus, ChevronDown, Check, ArrowUp, ArrowDown, ExternalLink, Play, Heart, MessageCircle, Bookmark, Clock, X } from 'lucide-react';
import { AreaChart as AreaChartIcon } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { format } from 'date-fns';

export default function AccountDetailModals({
  productModal, setProductModal, currentImgIndex, setCurrentImgIndex, enlargedChartType, setEnlargedChartType,
  zoomScale, setZoomScale, isEnlargedChartRendering, top10Trends, play_trend, sortedActiveTrendVids, globalVideoIndexMap,
  TOPTEN_COLORS, hiddenLines, handleLegendClick, handlePlayTrendClick, videoListModal, setVideoListModal,
  modalSortKey, setModalSortKey, modalSortOrder, setModalSortOrder, sortOptions, sortedModalVideos, account,
  handlePidClick, handleOpenVideoTrend, videoTrendModal, setVideoTrendModal, trendDays, isTrendLoading,
  followerTrendModal, setFollowerTrendModal, days, setDays, isFollowerChartRendering, data, scrollToVideoCard,
  handleTabcutPageChange // 🚀 接收从 Hook 传来的翻页控制方法
}: any) {
  const chartWrapperRef = useRef<HTMLDivElement>(null);
  const [isImageFullScreen, setIsImageFullScreen] = useState(false);

  // 🚀 为抓取翻页计算总页数
  const totalScrapedPages = productModal ? Math.ceil(productModal.scrapedTotal / 10) : 0;

  return (
    <>
      <Dialog open={!!productModal} onOpenChange={(open) => { if (!open) setProductModal(null); }}>
        <DialogContent className="max-w-5xl w-[95vw] max-h-[90vh] overflow-y-auto bg-white rounded-xl">
          <DialogHeader><DialogTitle className="text-xl">商品 PID 情报及相关视频追踪</DialogTitle></DialogHeader>
          <div className="mt-2 min-h-[300px]">
            {productModal?.loading && !productModal?.info ? (
              <div className="flex flex-col items-center justify-center text-indigo-500 h-[300px]">
                <Loader2 className="animate-spin w-10 h-10 mb-4" />
                <span className="text-sm font-medium">正在实时抓取产品情报...</span>
              </div>
            ) : productModal?.info ? (
              <div className="space-y-8">
                {/* 1. 顶部基础商品信息区域 (原有逻辑保持不变) */}
                <div className="w-full bg-slate-50 p-6 rounded-xl border border-slate-200 flex flex-col md:flex-row gap-8 shadow-inner">
                  <div className="w-full md:w-[280px] shrink-0 relative aspect-square bg-slate-200 rounded-xl overflow-hidden group shadow-sm border border-slate-200/50">
                    {productModal.info.images && productModal.info.images.length > 0 ? (
                      <>
                        <img 
                          src={productModal.info.images[currentImgIndex]} 
                          className="w-full h-full object-cover cursor-pointer" 
                          referrerPolicy="no-referrer" 
                          alt="商品"
                          onClick={(e) => { e.stopPropagation(); setIsImageFullScreen(true); }}
                          title="点击放大预览图"
                        />
                        {productModal.info.images.length > 1 && (
                          <>
                            <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setCurrentImgIndex((prev:number) => prev === 0 ? productModal.info.images.length - 1 : prev - 1) }} className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/80 text-white p-2 rounded-full transition-all z-50 cursor-pointer"><ChevronLeft size={20}/></button>
                            <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setCurrentImgIndex((prev:number) => prev === productModal.info.images.length - 1 ? 0 : prev + 1) }} className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/80 text-white p-2 rounded-full transition-all z-50 cursor-pointer"><ChevronRight size={20}/></button>
                            <div className="absolute bottom-3 left-1/2 -translate-y-1/2 bg-black/60 text-white text-[11px] font-bold px-3 py-1 rounded-full backdrop-blur-md z-40">{currentImgIndex + 1} / {productModal.info.images.length}</div>
                          </>
                        )}
                      </>
                    ) : (<div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-100">无商品图片</div>)}
                  </div>
                  
                  <div className="flex-1 flex flex-col justify-center">
                    <h3 className="text-lg font-bold text-slate-900 mb-5">{productModal.info.introduction}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-6 text-[14px]">
                      <div className="flex border-b border-slate-200 pb-1.5 gap-4"><span className="text-slate-500 shrink-0 w-20">商品 PID</span><span className="font-bold text-slate-800 break-all">{productModal.pid}</span></div>
                      <div className="flex border-b border-slate-200 pb-1.5 gap-4"><span className="text-slate-500 shrink-0 w-20">品牌名称</span><span className="font-bold text-slate-800 break-all">{productModal.info.brand}</span></div>
                      <div className="flex border-b border-slate-200 pb-1.5 gap-4 md:col-span-2"><span className="text-slate-500 shrink-0 w-20">详细类目</span><span className="font-bold text-slate-800 break-all">{productModal.info.category}</span></div>
                      <div className="flex border-b border-slate-200 pb-1.5 gap-4"><span className="text-slate-500 shrink-0 w-20">国家地区</span><span className="font-bold text-slate-800 break-all">{productModal.info.country}</span></div>
                      <div className="flex border-b border-slate-200 pb-1.5 gap-4"><span className="text-slate-500 shrink-0 w-20">当前价格</span><span className="font-black text-red-600 text-[15px] break-all">{productModal.info.price}</span></div>
                      <div className="flex border-b border-slate-200 pb-1.5 gap-4"><span className="text-slate-500 shrink-0 w-20">商品评分</span><span className="font-black text-orange-500 break-all">{productModal.info.product_rating}</span></div>
                      <div className="flex border-b border-slate-200 pb-1.5 gap-4"><span className="text-slate-500 shrink-0 w-20">佣金率</span><span className="font-black text-emerald-600 break-all">{productModal.info.commission_rate}</span></div>
                      <div className="flex border-b border-slate-200 pb-1.5 gap-4"><span className="text-slate-500 shrink-0 w-20">总销量</span><span className="font-bold text-slate-800 break-all">{productModal.info.sold_count}</span></div>
                      <div className="flex border-b border-slate-200 pb-1.5 gap-4"><span className="text-slate-500 shrink-0 w-20">总 G M V</span><span className="font-black text-red-600 text-[15px] break-all">{productModal.info.sale_amount}</span></div>
                      <div className="flex border-b border-slate-200 pb-1.5 gap-4"><span className="text-slate-500 shrink-0 w-20">带货达人</span><span className="font-bold text-slate-800 break-all">{productModal.info.author_count}</span></div>
                      <div className="flex border-b border-slate-200 pb-1.5 gap-4"><span className="text-slate-500 shrink-0 w-20">视频数量</span><span className="font-bold text-slate-800 break-all">{productModal.info.aweme_count}</span></div>
                    </div>
                  </div>
                </div>

                {/* 🚀 2. 新增：下方双板块切换布局 (库里 vs 抓取) */}
                <div className="w-full">
                  <div className="flex gap-6 border-b border-slate-200 mb-6 px-2">
                    <button 
                      onClick={() => setProductModal((p:any) => ({...p, activeTab: 'db'}))}
                      className={`pb-3 font-semibold text-sm transition-colors border-b-2 ${productModal.activeTab === 'db' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                    >
                      系统库内包含此PID的视频 ({productModal.dbVideos.length})
                    </button>
                    <button 
                      onClick={() => setProductModal((p:any) => ({...p, activeTab: 'scraped'}))}
                      className={`pb-3 font-semibold text-sm transition-colors border-b-2 flex items-center gap-2 ${productModal.activeTab === 'scraped' ? 'border-orange-500 text-orange-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                    >
                      最新实时全网带货视频 ({productModal.scrapedTotal})
                      {productModal.scrapedLoading && <Loader2 className="animate-spin w-3 h-3 text-orange-500" />}
                    </button>
                  </div>

                  {/* 板块 A：库里的视频 */}
                  {productModal.activeTab === 'db' && (
                    <div className="grid gap-4">
                      {productModal.dbVideos.length === 0 ? (
                        <div className="py-10 text-center text-slate-400 bg-slate-50 rounded-lg">库内暂未收录关联此 PID 的视频</div>
                      ) : (
                        productModal.dbVideos.map((video: any) => (
                          <div key={video.video_id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex gap-4">
                            <div className="w-28 shrink-0 aspect-[3/4] bg-slate-100 rounded-lg overflow-hidden">
                              {video.cover_url && <img src={video.cover_url} className="w-full h-full object-cover" referrerPolicy="no-referrer" alt="cover"/>}
                            </div>
                            <div className="flex flex-col justify-between flex-1 py-1">
                              <div>
                                <h4 className="text-sm font-bold text-slate-800 line-clamp-2">{video.desc || '暂无描述'}</h4>
                                <div className="text-xs text-slate-500 mt-2 flex items-center gap-3">
                                  <span>发布时间：{new Date((Number(video.create_time) || 0) * 1000).toLocaleDateString()}</span>
                                  <a href={video.url || `https://www.tiktok.com/@${video.username}/video/${video.video_id}`} target="_blank" rel="noreferrer" className="text-indigo-500 hover:underline flex items-center gap-1">看原视频<ExternalLink size={12}/></a>
                                </div>
                              </div>
                              <div className="flex gap-4 text-xs font-semibold text-slate-600">
                                <span className="flex items-center gap-1"><Play size={12}/> {video.play_count?.toLocaleString()}</span>
                                <span className="flex items-center gap-1"><Heart size={12}/> {video.digg_count?.toLocaleString()}</span>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* 板块 B：抓取的视频 */}
                  {productModal.activeTab === 'scraped' && (
                    <div className="space-y-4">
                      {productModal.scrapedLoading && productModal.scrapedVideos.length === 0 ? (
                        <div className="py-20 flex flex-col items-center text-orange-400">
                          <Loader2 className="animate-spin w-8 h-8 mb-3" />
                          <span>正在从全网搜索此商品最新带货视频...</span>
                        </div>
                      ) : productModal.scrapedVideos.length === 0 ? (
                        <div className="py-10 text-center text-slate-400 bg-slate-50 rounded-lg border border-slate-100">暂未搜索到带货视频或接口访问受限</div>
                      ) : (
                        <>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {productModal.scrapedVideos.map((sv: any, idx: number) => (
                              <div key={sv.视频id || idx} className="bg-slate-50 rounded-xl border border-slate-200 p-4 shadow-sm flex gap-4 hover:shadow-md transition-shadow">
                                <div className="w-24 shrink-0 aspect-[3/4] bg-slate-200 rounded-lg overflow-hidden relative">
                                  {sv.视频封面 && <img src={sv.视频封面} className="w-full h-full object-cover" referrerPolicy="no-referrer" alt="cover"/>}
                                  {sv.是否ad投流 === "投流" && <span className="absolute top-1 left-1 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded font-bold shadow">广告</span>}
                                </div>
                                <div className="flex flex-col justify-between flex-1 py-1">
                                  <div>
                                    <div className="flex items-center gap-2 mb-1.5">
                                      {sv.头像url ? <img src={sv.头像url} className="w-5 h-5 rounded-full" referrerPolicy="no-referrer" alt="avatar"/> : <div className="w-5 h-5 rounded-full bg-slate-300"></div>}
                                      <span className="text-xs font-bold text-slate-800 line-clamp-1">@{sv.作者名称 || sv.作者id}</span>
                                      <span className="text-[10px] bg-white border border-slate-200 px-1.5 py-0.5 rounded text-slate-500">{sv.视频国家}</span>
                                    </div>
                                    <div className="text-xs text-slate-500 mt-2 space-y-1">
                                      <p>发布时间: <span className="text-slate-700 font-medium">{sv.视频发布时间}</span></p>
                                      <p>发现时间: <span className="text-slate-700 font-medium">{sv.发现时间}</span></p>
                                    </div>
                                  </div>
                                  <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold text-slate-700 mt-3 border-t border-slate-200/60 pt-2">
                                    <span className="flex items-center gap-1 text-indigo-600"><Play size={12}/> {sv.视频播放量?.toLocaleString() || 0}</span>
                                    <span className="flex items-center gap-1"><Heart size={12} className="text-slate-400"/> {sv.点赞数?.toLocaleString() || 0}</span>
                                    <span className="flex items-center gap-1"><MessageCircle size={12} className="text-slate-400"/> {sv.分享数?.toLocaleString() || 0}</span>
                                  </div>
                                  {sv.视频原链接 && (
                                    <a href={sv.视频原链接} target="_blank" rel="noreferrer" className="mt-2 text-[11px] text-blue-500 hover:underline flex items-center gap-1 w-max">
                                      看原视频 <ExternalLink size={10}/>
                                    </a>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                          
                          {/* 🚀 分页区域 */}
                          {totalScrapedPages > 1 && (
                            <div className="flex items-center justify-center gap-2 mt-6 pt-4 border-t border-slate-100">
                              <Button 
                                variant="outline" size="sm" 
                                disabled={productModal.scrapedPage <= 1 || productModal.scrapedLoading}
                                onClick={() => handleTabcutPageChange(productModal.scrapedPage - 1)}
                              >上一页</Button>
                              <div className="flex items-center gap-1 overflow-x-auto max-w-[200px] md:max-w-md no-scrollbar">
                                {Array.from({length: Math.min(10, totalScrapedPages)}, (_, i) => {
                                  // 简单的分页页码展示逻辑
                                  let pageNum = i + 1;
                                  if (totalScrapedPages > 10 && productModal.scrapedPage > 5) {
                                    pageNum = productModal.scrapedPage - 5 + i;
                                    if (pageNum > totalScrapedPages) pageNum = totalScrapedPages - (9 - i);
                                  }
                                  return (
                                    <button 
                                      key={pageNum}
                                      onClick={() => handleTabcutPageChange(pageNum)}
                                      disabled={productModal.scrapedLoading}
                                      className={`w-8 h-8 shrink-0 rounded-md text-xs font-bold transition-all ${productModal.scrapedPage === pageNum ? 'bg-orange-500 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                    >
                                      {pageNum}
                                    </button>
                                  )
                                })}
                              </div>
                              <Button 
                                variant="outline" size="sm" 
                                disabled={productModal.scrapedPage >= totalScrapedPages || productModal.scrapedLoading}
                                onClick={() => handleTabcutPageChange(productModal.scrapedPage + 1)}
                              >下一页</Button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (<div className="text-slate-500">暂无该 PID 数据或请求失败。</div>)}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!enlargedChartType} onOpenChange={(open) => { if (!open) setEnlargedChartType(null); }}>
        <DialogContent className="max-w-6xl w-[95vw] bg-white rounded-3xl">
          <DialogHeader>
            <div className="flex items-center justify-between pr-8">
              <DialogTitle className="text-xl font-black">{enlargedChartType === 'trend' ? '视频播放量日增长趋势' : '每日总播放量分布'}</DialogTitle>
              <div className="flex items-center gap-3">
                <span className="text-xs font-normal text-slate-500 bg-slate-100 px-3 py-1.5 rounded-md flex items-center gap-1.5">
                  💡 提示：按住 <kbd className="bg-white border border-slate-200 px-1 rounded shadow-sm font-sans">Ctrl</kbd> + 鼠标滚轮可无极缩放
                </span>
                <div className="flex items-center bg-slate-100 rounded-md border border-slate-200">
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-600 hover:bg-slate-200 rounded-r-none" onClick={() => setZoomScale((p:number) => Math.max(1, p / 1.2))}><Minus size={14}/></Button>
                  <span className="text-xs font-bold w-12 text-center tabular-nums text-slate-700">{Math.round(zoomScale * 100)}%</span>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-600 hover:bg-slate-200 rounded-l-none" onClick={() => setZoomScale((p:number) => Math.min(10, p * 1.2))}><Plus size={14}/></Button>
                </div>
              </div>
            </div>
          </DialogHeader>
          {/* 🚀 核心修复 1：将 overflow-auto 修改为 overflow-x-auto overflow-y-hidden 阻断边缘抖动 */}
          <div ref={chartWrapperRef} className="overflow-x-auto overflow-y-hidden w-full mt-2 border border-slate-100 rounded-lg relative" style={{ height: '65vh', maxHeight: '700px' }}>
            {isEnlargedChartRendering ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white z-10 text-slate-400">
                  <Loader2 className="animate-spin w-12 h-12 text-indigo-500 mb-4" />
                  <span>正为您渲染高精度图表引擎...</span>
                </div>
            ) : null}
            <div style={{ minWidth: `${Math.max(100, (enlargedChartType === 'trend' ? top10Trends?.length || 0 : play_trend?.length || 0) * 5) * zoomScale}%`, height: '100%', transition: 'min-width 0.1s ease-out' }}>
              <ResponsiveContainer width="100%" height="100%">
                {enlargedChartType === 'trend' ? (
                    <LineChart data={top10Trends || []}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="date" stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => { const num = Number(v); return !isNaN(num) && Math.abs(num) >= 10000 ? `${(num/10000).toFixed(1)}W` : String(v); }} />
                      {/* 🚀 核心修复 2：增加 isAnimationActive={false} 关闭重新渲染抖动，增加 zIndex 确保永远在最顶层 */}
                      <Tooltip isAnimationActive={false} cursor={{ stroke: '#94A3B8', strokeWidth: 1, strokeDasharray: '3 3' }} wrapperStyle={{ zIndex: 100 }} />
                      <Legend onClick={handleLegendClick} wrapperStyle={{ cursor: 'pointer', paddingBottom: '20px', fontSize: '12px', fontWeight: 'bold' }} />
                      {(sortedActiveTrendVids || []).map((vid: string, i: number) => {
                        const lineKey = `v_${vid}`;
                        return <Line key={vid} type="monotone" dataKey={lineKey} name={`NO.${globalVideoIndexMap?.[vid] || '?'}`} stroke={TOPTEN_COLORS?.[i % TOPTEN_COLORS.length] || '#000'} strokeWidth={3} dot={false} activeDot={hiddenLines?.includes(lineKey) ? false : { r: 8, cursor: 'pointer', onClick: () => scrollToVideoCard(vid) }} hide={hiddenLines?.includes(lineKey)} />
                      })}
                    </LineChart>
                ) : (
                    <AreaChart data={play_trend || []} onClick={(e) => { if(e && e.activeLabel) { handlePlayTrendClick(e.activeLabel); setEnlargedChartType(null); } }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="date" />
                      <YAxis tickFormatter={(v) => { const num = Number(v); return !isNaN(num) && Math.abs(num) >= 10000 ? `${(num/10000).toFixed(1)}W` : String(v); }} />
                      <Tooltip isAnimationActive={false} wrapperStyle={{ zIndex: 100 }} />
                      <Area type="monotone" dataKey="plays" name="播放量" stroke="#10B981" fill="#10B981" fillOpacity={0.2} activeDot={{r:8, cursor:'pointer'}} />
                    </AreaChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!videoListModal} onOpenChange={(open) => { if (!open) setVideoListModal(null); }}>
        <DialogContent className="max-w-5xl w-[90vw] max-h-[85vh] overflow-y-auto bg-slate-50">
          <DialogHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pr-8 pb-3 border-b border-slate-200/60">
              <DialogTitle className="text-xl pt-1 text-slate-800">
                {videoListModal?.title} 
                {!videoListModal?.loading && <span className="text-sm font-normal text-slate-500 ml-1">(共筛选出: {sortedModalVideos?.length || 0} 个)</span>}
              </DialogTitle>
              <div className="flex items-center gap-2 shrink-0">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2 h-8 text-xs bg-white">{(sortOptions || []).find((o:any) => o.key === modalSortKey)?.label || '排序'}<ChevronDown size={14} /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {(sortOptions || []).map((option: any) => (
                      <DropdownMenuItem key={option.key} onClick={() => setModalSortKey(option.key)}>
                        <span className={modalSortKey === option.key ? 'text-indigo-600 font-medium' : ''}>{option.label}</span>
                        {modalSortKey === option.key && <Check size={14} className="ml-auto text-indigo-600" />}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button variant="outline" size="icon" className="h-8 w-8 bg-white" onClick={() => setModalSortOrder(modalSortOrder === 'asc' ? 'desc' : 'asc')}>
                  {modalSortOrder === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                </Button>
              </div>
            </div>
          </DialogHeader>
          {videoListModal?.loading ? (
            <div className="py-24 flex flex-col items-center justify-center text-slate-400 space-y-4">
                <Loader2 className="animate-spin w-10 h-10 text-indigo-500" />
                <span className="font-medium tracking-wider">正在飞速调取庞大的矩阵数据网络，请稍候...</span>
            </div>
          ) : (
            <div className="grid gap-4 mt-2">
              {(sortedModalVideos || []).map((video: any) => {
                const globalIndex = globalVideoIndexMap?.[video.video_id] || '?';
                return (
                  <div key={video.id + (video.pid || "")} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row gap-4 hover:shadow-md transition-shadow duration-300">
                    <div className="w-full md:w-32 shrink-0 aspect-[3/4] bg-slate-100 rounded-lg overflow-hidden relative">
                      {video.cover_url && <img src={video.cover_url} alt="cover" className="w-full h-full object-cover" referrerPolicy="no-referrer" />}
                    </div>
                    <div className="flex-1 flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2.5 py-0.5 bg-slate-800 text-white text-xs font-black rounded-md shadow-sm">NO.{globalIndex}</span>
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-full font-bold">@{video.username || account?.username}</span>
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-xs rounded-full">{video.platform_category || '无类目'}</span>
                          {video.pid && (
                            <span onClick={() => handlePidClick(video.pid)} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-full cursor-pointer hover:bg-indigo-100 transition-colors border border-indigo-100" title="点击查看商品详情">🔍 PID: {String(video.pid).length > 20 ? String(video.pid).substring(0, 20) + '...' : video.pid}</span>
                          )}
                        </div>
                        <h3 className="text-sm font-bold text-slate-900 line-clamp-2">{video.desc || '无描述'}</h3>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <Clock size={12} /><span>
                            {(() => {
                              const d = new Date((Number(video.create_time) || 0) * 1000);
                              return isNaN(d.getTime()) ? '未知时间' : format(d, 'yyyy-MM-dd HH:mm');
                            })()}
                          </span>
                          <a href={video.url || `https://www.tiktok.com/@${video.username || account?.username}/video/${video.video_id}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-indigo-600"><ExternalLink size={12} />看原视频</a>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-6 mt-4 pt-3 border-t border-slate-100 text-xs text-slate-600">
                        <div className="flex items-center gap-1.5 font-bold">
                          <Play size={12} className="text-slate-400" />
                          <div className="text-indigo-600 cursor-pointer hover:bg-indigo-50 px-1 -ml-1 rounded transition-colors flex items-center gap-1" onClick={() => handleOpenVideoTrend(video.video_id, video.desc)} title="点击查看此视频历史新增趋势">
                            {video.play_count?.toLocaleString()}
                            <AreaChartIcon size={12} className="text-indigo-400" />
                          </div>
                        </div>
                        <div className="flex items-center gap-1"><Heart size={12} className="text-slate-400" /> <span className="font-bold text-slate-800">{video.digg_count?.toLocaleString()}</span></div>
                        <div className="flex items-center gap-1"><MessageCircle size={12} className="text-slate-400" /> <span className="font-bold text-slate-800">{video.comment_count?.toLocaleString()}</span></div>
                        <div className="flex items-center gap-1"><Bookmark size={12} className="text-slate-400" /> <span className="font-bold text-slate-800">{video.collect_count?.toLocaleString()}</span></div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      <Dialog open={!!videoTrendModal} onOpenChange={(open) => !open && setVideoTrendModal(null)}>
        <DialogContent className="max-w-3xl w-[90vw] bg-white">
          <DialogHeader>
            <div className="flex justify-between items-center pr-6">
              <DialogTitle className="text-lg">{videoTrendModal?.title}</DialogTitle>
              <div className="flex items-center gap-3">
                <Select value={trendDays?.toString() || '30'} onValueChange={(v) => handleOpenVideoTrend(videoTrendModal!.videoId, videoTrendModal!.title, parseInt(v))}>
                  <SelectTrigger className="w-28 h-8 text-xs"><SelectValue placeholder="时间范围" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">近 7 天</SelectItem>
                    <SelectItem value="30">近 30 天</SelectItem>
                    <SelectItem value="90">近 90 天</SelectItem>
                    <SelectItem value="0">全部历史</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-center bg-slate-100 rounded-md border border-slate-200">
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-600 hover:bg-slate-200 rounded-r-none" onClick={() => setZoomScale((p:number) => Math.max(1, p / 1.2))}><Minus size={14}/></Button>
                  <span className="text-xs font-bold w-10 text-center tabular-nums text-slate-700">{Math.round(zoomScale * 100)}%</span>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-600 hover:bg-slate-200 rounded-l-none" onClick={() => setZoomScale((p:number) => Math.min(10, p * 1.2))}><Plus size={14}/></Button>
                </div>
              </div>
            </div>
          </DialogHeader>
          <div className="overflow-x-auto overflow-y-hidden w-full mt-2 border border-slate-100 rounded-lg relative" style={{ height: '350px' }}>
            {isTrendLoading ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white z-10 text-slate-400">
                  <Loader2 className="animate-spin text-indigo-500 w-8 h-8 mb-3" />
                  <span>正为您分析数据...</span>
                </div>
            ) : videoTrendModal?.data && videoTrendModal.data.length > 0 ? (
              <div style={{ minWidth: `${Math.max(100, (videoTrendModal.data.length || 0) * 5) * zoomScale}%`, height: '100%', transition: 'min-width 0.1s ease-out' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={videoTrendModal.data}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="date" stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => { const num = Number(v); return !isNaN(num) && Math.abs(num) >= 10000 ? `${(num/10000).toFixed(1)}W` : String(v); }} />
                    <Tooltip isAnimationActive={false} wrapperStyle={{ zIndex: 100 }} />
                    <Area type="monotone" dataKey="plays" name="单日真实新增" stroke="#4F46E5" strokeWidth={2} fillOpacity={0.2} fill="#4F46E5" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                  <p className="text-slate-400 text-sm">该视频尚未沉淀足够的历史天数数据，请等待次日自动更新。</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={followerTrendModal} onOpenChange={setFollowerTrendModal}>
        <DialogContent className="max-w-3xl w-[90vw] bg-white">
          <DialogHeader>
            <div className="flex justify-between items-center pr-6">
              <DialogTitle className="text-lg">每日粉丝真实增长追踪</DialogTitle>
              <div className="flex items-center gap-3">
                <Select value={days?.toString() || '30'} onValueChange={(v) => setDays(parseInt(v))}>
                  <SelectTrigger className="w-28 h-8 text-xs"><SelectValue placeholder="数据范围" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">近 7 天</SelectItem>
                    <SelectItem value="30">近 30 天</SelectItem>
                    <SelectItem value="90">近 90 天</SelectItem>
                    <SelectItem value="0">全部历史</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-center bg-slate-100 rounded-md border border-slate-200">
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-600 hover:bg-slate-200 rounded-r-none" onClick={() => setZoomScale((p:number) => Math.max(1, p / 1.2))}><Minus size={14}/></Button>
                  <span className="text-xs font-bold w-10 text-center tabular-nums text-slate-700">{Math.round(zoomScale * 100)}%</span>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-600 hover:bg-slate-200 rounded-l-none" onClick={() => setZoomScale((p:number) => Math.min(10, p * 1.2))}><Plus size={14}/></Button>
                </div>
              </div>
            </div>
          </DialogHeader>
          <div className="overflow-x-auto overflow-y-hidden w-full mt-2 border border-slate-100 rounded-lg relative" style={{ height: '350px' }}>
            {isFollowerChartRendering ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-white z-10 text-slate-400">
                <Loader2 className="animate-spin text-indigo-500 w-8 h-8 mb-3" />
                <span>正为您渲染高精度图表引擎...</span>
              </div>
            ) : data?.follower_trend && data.follower_trend.length > 0 ? (
              <div style={{ minWidth: `${Math.max(100, (data.follower_trend.length || 0) * 5) * zoomScale}%`, height: '100%', transition: 'min-width 0.1s ease-out' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.follower_trend}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="date" stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => { const num = Number(v); return !isNaN(num) && Math.abs(num) >= 10000 ? `${(num/10000).toFixed(1)}W` : String(v); }} />
                    <Tooltip cursor={{ stroke: '#F59E0B', strokeWidth: 1, strokeDasharray: '3 3' }} isAnimationActive={false} wrapperStyle={{ zIndex: 100 }} />
                    <Area type="monotone" dataKey="followers_inc" name="单日净增粉丝" stroke="#F59E0B" strokeWidth={2} fillOpacity={0.2} fill="#F59E0B" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                  <p className="text-slate-400 text-sm">暂无这批号的历史粉丝更迭数据。</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 🚀 抽搐 Bug 核心修复区域 */}
      {isImageFullScreen && productModal?.info?.images && productModal.info.images.length > 0 && createPortal(
        <div 
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/90 backdrop-blur-sm" 
          style={{ pointerEvents: 'auto' }} 
          onClick={() => setIsImageFullScreen(false)}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <button className="absolute top-4 right-4 text-white hover:text-gray-300 p-2 z-[110]" onClick={() => setIsImageFullScreen(false)}>
            <X size={32} />
          </button>
          
          {/* 剥离 transition-transform 动画，确保鼠标无论怎么移动边缘都不会重新判定闪烁 */}
          <img 
            src={productModal.info.images[currentImgIndex]} 
            className="max-w-[90vw] max-h-[90vh] object-contain" 
            referrerPolicy="no-referrer" 
            alt="Fullscreen preview" 
            onClick={(e) => e.stopPropagation()} 
          />
          
          {productModal.info.images.length > 1 && (
            <>
              <button 
                onClick={(e) => { e.stopPropagation(); setCurrentImgIndex((prev: number) => prev === 0 ? productModal.info.images.length - 1 : prev - 1); }} 
                className="absolute left-6 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/90 text-white p-4 rounded-full transition-colors z-[110]"
              >
                <ChevronLeft size={32}/>
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); setCurrentImgIndex((prev: number) => prev === productModal.info.images.length - 1 ? 0 : prev + 1); }} 
                className="absolute right-6 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/90 text-white p-4 rounded-full transition-colors z-[110]"
              >
                <ChevronRight size={32}/>
              </button>
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/80 text-white text-sm px-4 py-2 rounded-full tracking-widest z-[110]">
                {currentImgIndex + 1} / {productModal.info.images.length}
              </div>
            </>
          )}
        </div>,
        document.body
      )}
    </>
  );
}