import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, ChevronDown, Check, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, Clock, ExternalLink, Play, Heart, MessageCircle, X } from 'lucide-react';
import { format } from 'date-fns';
import { Account, Video, ProductInfo, TabcutVideo } from '@/api';
import { SortKey, SortOrder } from '../Dashboard';

interface DashboardModalsProps {
  editAccount: Account | null; setEditAccount: (v: Account | null) => void;
  editCustomName: string; setEditCustomName: (v: string) => void;
  editGroupName: string; setEditGroupName: (v: string) => void;
  editCountry: string; setEditCountry: (v: string) => void;
  editMcn: string; setEditMcn: (v: string) => void;
  editCreatedAt: string; setEditCreatedAt: (v: string) => void;
  editDevice: string; setEditDevice: (v: string) => void;
  editAutoUpdate: number; setEditAutoUpdate: (v: number) => void;
  handleSaveAccountMeta: () => void;
  batchMetaModalOpen: boolean; setBatchMetaModalOpen: (v: boolean) => void;
  batchTargetGroup: string; setBatchTargetGroup: (v: string) => void;
  batchTargetCountry: string; setBatchTargetCountry: (v: string) => void;
  batchTargetMcn: string; setBatchTargetMcn: (v: string) => void;
  batchTargetCreatedAt: string; setBatchTargetCreatedAt: (v: string) => void;
  handleBatchUpdateMeta: () => void;
  selectedAccountIdsSize: number;
  isAddAccountOpen: boolean; setIsAddAccountOpen: (v: boolean) => void;
  newAccountUrl: string; setNewAccountUrl: (v: string) => void;
  addingAccount: boolean; handleAddAccount: () => void;
  videoListModal: any; setVideoListModal: (v: any) => void;
  sortedModalVideos: Video[];
  modalSortKey: SortKey; setModalSortKey: (v: SortKey) => void;
  modalSortOrder: SortOrder; setModalSortOrder: (v: SortOrder) => void;
  sortOptions: { label: string; key: SortKey }[];
  productLoading: boolean; productInfo: ProductInfo | null;
  currentImgIndex: number; setCurrentImgIndex: React.Dispatch<React.SetStateAction<number>>;
  activePid: string; copyPid: (pid?: string) => void;
  isImageFullScreen: boolean; setIsImageFullScreen: (v: boolean) => void;
  activeTab: 'db' | 'scraped'; setActiveTab: (v: 'db' | 'scraped') => void;
  tabcutVideos: TabcutVideo[]; tabcutTotal: number; tabcutPage: number; tabcutLoading: boolean;
  handleTabcutPageChange: (page: number, customSortKey?: string, customSortOrder?: string, customDays?: number) => void;
  tabcutSortKey: 'create_time' | 'play_count'; setTabcutSortKey: (v: 'create_time' | 'play_count') => void;
  tabcutSortOrder: SortOrder; setTabcutSortOrder: (v: SortOrder) => void;
  tabcutDays: number; setTabcutDays: (v: number) => void; // 🚀 新增接口接收
}

export default function DashboardModals({
  editAccount, setEditAccount, editCustomName, setEditCustomName, editGroupName, setEditGroupName, editCountry, setEditCountry, 
  editMcn, setEditMcn, editCreatedAt, setEditCreatedAt, editDevice, setEditDevice, editAutoUpdate, setEditAutoUpdate, handleSaveAccountMeta,
  batchMetaModalOpen, setBatchMetaModalOpen, batchTargetGroup, setBatchTargetGroup, batchTargetCountry, setBatchTargetCountry,
  batchTargetMcn, setBatchTargetMcn, batchTargetCreatedAt, setBatchTargetCreatedAt, handleBatchUpdateMeta, selectedAccountIdsSize,
  isAddAccountOpen, setIsAddAccountOpen, newAccountUrl, setNewAccountUrl, addingAccount, handleAddAccount,
  videoListModal, setVideoListModal, sortedModalVideos, modalSortKey, setModalSortKey, modalSortOrder, setModalSortOrder, sortOptions,
  productLoading, productInfo, currentImgIndex, setCurrentImgIndex, activePid, copyPid,
  isImageFullScreen, setIsImageFullScreen,
  activeTab, setActiveTab, tabcutVideos, tabcutTotal, tabcutPage, tabcutLoading, handleTabcutPageChange,
  tabcutSortKey, setTabcutSortKey, tabcutSortOrder, setTabcutSortOrder, tabcutDays, setTabcutDays
}: DashboardModalsProps) {

  const [jumpPage, setJumpPage] = React.useState('');

  const totalScrapedPages = Math.ceil(tabcutTotal / 10);

  const renderDbVideos = () => (
    <div className="grid gap-4 mt-2">
      {sortedModalVideos?.map((video) => (
        <div key={video.id + (video.pid || "")} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row gap-4 hover:shadow-md transition-shadow duration-300">
          <div className="w-full md:w-32 shrink-0 aspect-[3/4] bg-slate-100 rounded-lg overflow-hidden relative">
            {video.cover_url && <img src={video.cover_url} alt="cover" className="w-full h-full object-cover" referrerPolicy="no-referrer" />}
          </div>
          <div className="flex-1 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-full font-bold">@{video.username || '未收录作者'}</span>
                <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-xs rounded-full">{video.platform_category || '无类目'}</span>
                {video.pid && (
                  <span onClick={() => copyPid(video.pid)} className="px-2 py-0.5 bg-red-50 text-red-600 text-xs font-semibold rounded-full cursor-pointer hover:bg-red-100 transition-colors" title="点击复制PID">复制 PID: {video.pid}</span>
                )}
              </div>
              <h3 className="text-sm font-bold text-slate-900">{video.desc || '无描述'}</h3>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Clock size={12} /><span>{format(new Date((video.create_time||0) * 1000), 'yyyy-MM-dd HH:mm')}</span>
                <a href={video.url || `https://www.tiktok.com/@${video.username}/video/${video.video_id}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-indigo-600"><ExternalLink size={12} />看原视频</a>
              </div>
            </div>
            <div className="flex items-center gap-6 mt-4 pt-3 border-t border-slate-100 text-xs text-slate-600">
              <div className="flex items-center gap-1"><Play size={12} /> {video.play_count?.toLocaleString()}</div>
              <div className="flex items-center gap-1"><Heart size={12} /> {video.digg_count?.toLocaleString()}</div>
              <div className="flex items-center gap-1"><MessageCircle size={12} /> {video.comment_count?.toLocaleString()}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <>
      <Dialog open={!!editAccount} onOpenChange={(open) => { if (!open) setEditAccount(null); }}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader><DialogTitle>编辑账号信息</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto px-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">自定义重命名</label>
              <Input placeholder="输入自定义名称" value={editCustomName} onChange={e => setEditCustomName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">所属分组</label>
              <Input placeholder="例如: 核心组、竞品组等" value={editGroupName} onChange={e => setEditGroupName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">所在国家</label>
              <Input placeholder="例如: 美国、英国等" value={editCountry} onChange={e => setEditCountry(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">对应设备</label>
              <Input placeholder="例如: iPhone-01, 云手机-14等" value={editDevice} onChange={e => setEditDevice(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">机构名称(MCN)</label>
              <Input placeholder="输入机构名称" value={editMcn} onChange={e => setEditMcn(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">录入系统时间</label>
              <Input placeholder="例如: 2023-10-01 12:00:00" value={editCreatedAt} onChange={e => setEditCreatedAt(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">系统自动刷新 (整点高频)</label>
              <select 
                value={editAutoUpdate} 
                onChange={e => setEditAutoUpdate(Number(e.target.value))}
                className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2"
              >
                <option value={1}>🟢 开启支持 (允许系统调用高频刷新)</option>
                <option value={0}>🔴 关闭支持 (剔除出高频刷新队伍)</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditAccount(null)}>取消</Button>
            <Button onClick={handleSaveAccountMeta} className="bg-indigo-600 hover:bg-indigo-700">保存修改</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={batchMetaModalOpen} onOpenChange={setBatchMetaModalOpen}>
        <DialogContent className="sm:max-w-md bg-white">
           <DialogHeader><DialogTitle>批量修改账号属性</DialogTitle></DialogHeader>
           <div className="py-4 space-y-4">
              <p className="text-sm text-slate-500">正在为选中的 {selectedAccountIdsSize} 个账号执行批量修改，留空的项不会被更改。</p>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">统一修改分组</label>
                <Input placeholder="输入目标分组名，不修改请留空" value={batchTargetGroup} onChange={e => setBatchTargetGroup(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">统一修改国家</label>
                <Input placeholder="输入国家，不修改请留空" value={batchTargetCountry} onChange={e => setBatchTargetCountry(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">统一修改机构(MCN)</label>
                <Input placeholder="输入机构名，不修改请留空" value={batchTargetMcn} onChange={e => setBatchTargetMcn(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">统一修改录入时间</label>
                <Input placeholder="例如: 2023-10-01 12:00:00，不修改请留空" value={batchTargetCreatedAt} onChange={e => setBatchTargetCreatedAt(e.target.value)} />
              </div>
           </div>
           <DialogFooter>
             <Button variant="outline" onClick={() => setBatchMetaModalOpen(false)}>取消</Button>
             <Button onClick={handleBatchUpdateMeta} className="bg-indigo-600 hover:bg-indigo-700">确定修改</Button>
           </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddAccountOpen} onOpenChange={setIsAddAccountOpen}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader><DialogTitle>录入 TikTok 监测账号</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">账号主页链接 或 用户名 <span className="text-slate-400 font-normal">(一行一个，支持批量)</span></label>
              <textarea 
                placeholder="例如:&#10;tiktok.com/@user1&#10;username2" 
                value={newAccountUrl} 
                onChange={(e) => setNewAccountUrl(e.target.value)} 
                className="w-full min-h-[120px] rounded-md border border-slate-300 p-2 text-sm focus:outline-none focus:border-indigo-500 shadow-sm"
              />
              <p className="text-xs text-slate-500">添加后大盘卡片将自动在后台开启状态捕获。分组和国家稍后可在卡片上点击编辑进行配置。录入时间将自动记录为当前时间。</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddAccountOpen(false)}>取消</Button>
            <Button onClick={handleAddAccount} disabled={addingAccount} className="bg-indigo-600 hover:bg-indigo-700">
              {addingAccount ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> 执行队列中...</> : '确认添加'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!videoListModal} onOpenChange={(open) => { if (!open) setVideoListModal(null); }}>
        <DialogContent className="max-w-5xl w-[90vw] max-h-[85vh] overflow-y-auto bg-slate-50">
           <DialogHeader>
             <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pr-8 pb-3 border-b border-slate-200/60">
                <DialogTitle className="text-xl pt-1 text-slate-800">
                  {videoListModal?.title} 
                  {!videoListModal?.loading && activeTab === 'db' && (
                    <span className="text-sm font-normal text-slate-500 ml-2">
                       (包含 {sortedModalVideos.length} 个本地收录的视频)
                    </span>
                  )}
                </DialogTitle>
                <div className="flex items-center gap-2 shrink-0">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-2 h-8 text-xs bg-white">{sortOptions.find(o => o.key === modalSortKey)?.label}<ChevronDown size={14} /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {sortOptions.map((option) => (
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
            <>
              {activePid ? (
                <>
                  {productLoading ? (
                    <div className="flex justify-center items-center py-6 border border-slate-200 bg-white rounded-xl mb-4 shadow-sm">
                       <Loader2 className="animate-spin text-indigo-500 w-6 h-6" />
                       <span className="ml-3 text-sm text-slate-500 font-medium tracking-wide">正在连接服务端穿透爬取带货链接情报...</span>
                    </div>
                  ) : productInfo ? (
                    <div className="bg-white p-5 rounded-xl border border-slate-200 mb-2 flex flex-col md:flex-row gap-6 shadow-sm">
                      <div className="w-full md:w-[240px] shrink-0 relative aspect-square bg-slate-100 rounded-lg overflow-hidden group">
                        {productInfo.images && productInfo.images.length > 0 ? (
                          <>
                            <img 
                              src={productInfo.images[currentImgIndex]} 
                              className="w-full h-full object-cover cursor-pointer" 
                              referrerPolicy="no-referrer" 
                              alt="商品" 
                              onClick={(e) => { e.stopPropagation(); setIsImageFullScreen(true); }}
                              title="点击放大预览图"
                            />
                            {productInfo.images.length > 1 && (
                              <>
                                <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setCurrentImgIndex(prev => prev === 0 ? productInfo.images.length - 1 : prev - 1); }} className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/80 text-white p-1.5 rounded-full transition-opacity z-50"><ChevronLeft size={16}/></button>
                                <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setCurrentImgIndex(prev => prev === productInfo.images.length - 1 ? 0 : prev + 1); }} className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/80 text-white p-1.5 rounded-full transition-opacity z-50"><ChevronRight size={16}/></button>
                                <div className="absolute bottom-2 left-1/2 -translate-y-1/2 bg-black/60 text-white text-[10px] px-2.5 py-0.5 rounded-full backdrop-blur-sm z-40">{currentImgIndex + 1} / {productInfo.images.length}</div>
                              </>
                            )}
                          </>
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 bg-slate-50">暂无图片</div>
                        )}
                      </div>
                      
                      <div className="flex-1 flex flex-col justify-center">
                        <h3 className="text-base font-bold text-slate-900 mb-4">{productInfo.introduction}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-6 text-[13px]">
                          <div className="flex border-b border-slate-100 pb-1.5 gap-4"><span className="text-slate-500 shrink-0 w-16">商品 PID</span><span className="font-semibold text-slate-800 break-all">{activePid}</span></div>
                          <div className="flex border-b border-slate-100 pb-1.5 gap-4"><span className="text-slate-500 shrink-0 w-16">品牌名称</span><span className="font-semibold text-slate-800 break-all">{productInfo.brand}</span></div>
                          <div className="flex border-b border-slate-100 pb-1.5 gap-4 md:col-span-2"><span className="text-slate-500 shrink-0 w-16">详细类目</span><span className="font-semibold text-slate-800 break-all">{productInfo.category}</span></div>
                          <div className="flex border-b border-slate-100 pb-1.5 gap-4"><span className="text-slate-500 shrink-0 w-16">国家地区</span><span className="font-semibold text-slate-800 break-all">{productInfo.country}</span></div>
                          <div className="flex border-b border-slate-100 pb-1.5 gap-4"><span className="text-slate-500 shrink-0 w-16">当前价格</span><span className="font-bold text-red-600 break-all">{productInfo.price}</span></div>
                          <div className="flex border-b border-slate-100 pb-1.5 gap-4"><span className="text-slate-500 shrink-0 w-16">商品评分</span><span className="font-semibold text-orange-500 break-all">{productInfo.product_rating}</span></div>
                          <div className="flex border-b border-slate-100 pb-1.5 gap-4"><span className="text-slate-500 shrink-0 w-16">佣金率</span><span className="font-semibold text-emerald-600 break-all">{productInfo.commission_rate}</span></div>
                          <div className="flex border-b border-slate-100 pb-1.5 gap-4"><span className="text-slate-500 shrink-0 w-16">总销量</span><span className="font-semibold text-slate-800 break-all">{productInfo.sold_count}</span></div>
                          <div className="flex border-b border-slate-100 pb-1.5 gap-4"><span className="text-slate-500 shrink-0 w-16">总 G M V</span><span className="font-bold text-red-600 break-all">{productInfo.sale_amount}</span></div>
                          <div className="flex border-b border-slate-100 pb-1.5 gap-4"><span className="text-slate-500 shrink-0 w-16">带货达人</span><span className="font-semibold text-slate-800 break-all">{productInfo.author_count}</span></div>
                          <div className="flex border-b border-slate-100 pb-1.5 gap-4"><span className="text-slate-500 shrink-0 w-16">视频数量</span><span className="font-semibold text-slate-800 break-all">{productInfo.aweme_count}</span></div>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  <div className="w-full mt-6">
                    <div className="flex gap-6 border-b border-slate-200 mb-6 px-2">
                      <button 
                        onClick={() => setActiveTab('db')}
                        className={`pb-3 font-semibold text-sm transition-colors border-b-2 ${activeTab === 'db' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                      >
                        系统库内包含此PID的视频 ({sortedModalVideos.length})
                      </button>
                      <button 
                        onClick={() => setActiveTab('scraped')}
                        className={`pb-3 font-semibold text-sm transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'scraped' ? 'border-orange-500 text-orange-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                      >
                        最新实时全网带货视频
                        {tabcutLoading && <Loader2 className="animate-spin w-3 h-3 text-orange-500" />}
                      </button>
                    </div>

                    {activeTab === 'db' && renderDbVideos()}

                    {activeTab === 'scraped' && (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center mb-4 px-2 flex-wrap gap-2">
                          <span className="text-sm font-medium text-slate-600 flex items-center gap-2">
                            云端实时全局调取 <span className="text-[11px] font-normal text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">共 {tabcutTotal} 条数据</span>
                          </span>
                          <div className="flex items-center gap-2">
                            {/* 🚀 新增：全网数据日期筛选 */}
                            <select
                              className="h-8 rounded-md border border-slate-200 text-xs px-2 outline-none focus:border-orange-500 bg-white"
                              value={tabcutDays}
                              onChange={e => {
                                const newDays = parseInt(e.target.value);
                                setTabcutDays(newDays);
                                // 日期改变，打回第一页并请求新范围
                                handleTabcutPageChange(1, tabcutSortKey, tabcutSortOrder, newDays);
                              }}
                            >
                              <option value={7}>近 7 天</option>
                              <option value={30}>近 30 天</option>
                              <option value={90}>近 90 天</option>
                              <option value={0}>全部时间段</option>
                            </select>

                            <select
                              className="h-8 rounded-md border border-slate-200 text-xs px-2 outline-none focus:border-orange-500 bg-white"
                              value={tabcutSortKey}
                              onChange={e => {
                                const newKey = e.target.value as any;
                                setTabcutSortKey(newKey);
                                handleTabcutPageChange(1, newKey, tabcutSortOrder, tabcutDays);
                              }}
                            >
                              <option value="create_time">按发布日期查询</option>
                              <option value="play_count">按播放量全局查询</option>
                            </select>
                            
                            <Button 
                              variant="outline" 
                              size="icon" 
                              className="h-8 w-8 bg-white" 
                              onClick={() => {
                                const newOrder = tabcutSortOrder === 'asc' ? 'desc' : 'asc';
                                setTabcutSortOrder(newOrder);
                                handleTabcutPageChange(1, tabcutSortKey, newOrder, tabcutDays);
                              }}
                            >
                              {tabcutSortOrder === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                            </Button>
                          </div>
                        </div>

                        {tabcutLoading && tabcutVideos.length === 0 ? (
                          <div className="py-20 flex flex-col items-center text-orange-400">
                            <Loader2 className="animate-spin w-8 h-8 mb-3" />
                            <span>正在向云端提交复杂的筛选与排序指令，请稍候...</span>
                          </div>
                        ) : tabcutVideos.length === 0 ? (
                          <div className="py-10 text-center text-slate-400 bg-slate-50 rounded-lg border border-slate-100">该时间段下暂未搜索到带货视频</div>
                        ) : (
                          <>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* 直接使用接口发来的正确结果进行渲染 */}
                              {tabcutVideos.map((sv: any, idx: number) => (
                                <div key={sv.视频id || idx} className="bg-slate-50 rounded-xl border border-slate-200 p-4 shadow-sm flex gap-4 hover:shadow-md transition-shadow relative">
                                  {tabcutLoading && <div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center"><Loader2 className="animate-spin w-6 h-6 text-orange-500" /></div>}
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
                            
                            {totalScrapedPages > 1 && (
                              <div className="flex items-center justify-center gap-2 mt-6 pt-4 border-t border-slate-100 flex-wrap">
                                <Button 
                                  variant="outline" size="sm" 
                                  disabled={tabcutPage <= 1 || tabcutLoading}
                                  onClick={() => handleTabcutPageChange(tabcutPage - 1)}
                                >上一页</Button>
                                <div className="flex items-center gap-1 overflow-x-auto max-w-[200px] md:max-w-md no-scrollbar">
                                  {Array.from({length: Math.min(10, totalScrapedPages)}, (_, i) => {
                                    let pageNum = i + 1;
                                    if (totalScrapedPages > 10 && tabcutPage > 5) {
                                      pageNum = tabcutPage - 5 + i;
                                      if (pageNum > totalScrapedPages) pageNum = totalScrapedPages - (9 - i);
                                    }
                                    return (
                                      <button 
                                        key={pageNum}
                                        onClick={() => handleTabcutPageChange(pageNum)}
                                        disabled={tabcutLoading}
                                        className={`w-8 h-8 shrink-0 rounded-md text-xs font-bold transition-all ${tabcutPage === pageNum ? 'bg-orange-500 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                      >
                                        {pageNum}
                                      </button>
                                    )
                                  })}
                                </div>
                                <Button 
                                  variant="outline" size="sm" 
                                  disabled={tabcutPage >= totalScrapedPages || tabcutLoading}
                                  onClick={() => handleTabcutPageChange(tabcutPage + 1)}
                                >下一页</Button>

                                <div className="flex items-center gap-1 ml-4 border-l border-slate-200 pl-4">
                                  <Input 
                                    className="w-14 h-8 text-center text-xs px-1 focus:ring-orange-500" 
                                    placeholder="跳至页码" 
                                    value={jumpPage} 
                                    onChange={e => setJumpPage(e.target.value)}
                                    onKeyDown={e => {
                                      if (e.key === 'Enter') {
                                        const p = parseInt(jumpPage);
                                        if (!isNaN(p) && p >= 1 && p <= totalScrapedPages) {
                                          handleTabcutPageChange(p);
                                          setJumpPage('');
                                        } else {
                                          alert(`请输入 1 到 ${totalScrapedPages} 之间的有效页码`);
                                        }
                                      }
                                    }}
                                  />
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="h-8 text-xs bg-white" 
                                    disabled={tabcutLoading}
                                    onClick={() => {
                                      const p = parseInt(jumpPage);
                                      if (!isNaN(p) && p >= 1 && p <= totalScrapedPages) {
                                        handleTabcutPageChange(p);
                                        setJumpPage('');
                                      } else {
                                        alert(`请输入 1 到 ${totalScrapedPages} 之间的有效页码`);
                                      }
                                    }}
                                  >
                                    跳转
                                  </Button>
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                renderDbVideos()
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
      
      {isImageFullScreen && productInfo && productInfo.images.length > 0 && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm" onClick={() => setIsImageFullScreen(false)}>
          <button className="absolute top-4 right-4 text-white hover:text-gray-300 p-2 z-[110]" onClick={() => setIsImageFullScreen(false)}>
            <X size={32} />
          </button>
          
          <img 
            src={productInfo.images[currentImgIndex]} 
            className="max-w-[90vw] max-h-[90vh] object-contain" 
            referrerPolicy="no-referrer" 
            alt="Fullscreen preview" 
            onClick={(e) => e.stopPropagation()} 
          />
          
          {productInfo.images.length > 1 && (
            <>
              <button 
                onClick={(e) => { e.stopPropagation(); setCurrentImgIndex(prev => prev === 0 ? productInfo.images.length - 1 : prev - 1); }} 
                className="absolute left-6 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/90 text-white p-4 rounded-full transition-colors z-[110]"
              >
                <ChevronLeft size={32}/>
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); setCurrentImgIndex(prev => prev === productInfo.images.length - 1 ? 0 : prev + 1); }} 
                className="absolute right-6 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/90 text-white p-4 rounded-full transition-colors z-[110]"
              >
                <ChevronRight size={32}/>
              </button>
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/80 text-white text-sm px-4 py-2 rounded-full tracking-widest z-[110]">
                {currentImgIndex + 1} / {productInfo.images.length}
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}