import { useEffect, useState } from 'react';
import { api, Account, Video } from '@/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Trash2, RefreshCcw, User, Video as VideoIcon, Calendar, Play, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';

export function RecycleBin() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState<'videos' | 'accounts'>('videos');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [accountsRes, videosRes] = await Promise.all([
        api.getDeletedAccounts(),
        api.getDeletedVideos()
      ]);
      setAccounts(accountsRes);
      setVideos(videosRes);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleRestoreAccount = async (id: number) => {
    await api.restoreAccount(id);
    fetchData();
  };

  // 修改：去除了确认弹窗，直接调用
  const handleHardDeleteAccount = async (id: number) => {
    await api.permanentDeleteAccount(id);
    fetchData();
  };

  const handleRestoreVideo = async (videoId: string) => {
    await api.restoreVideo(videoId);
    fetchData();
  };

  // 修改：去除了确认弹窗，直接调用
  const handleHardDeleteVideo = async (videoId: string) => {
    await api.hardDeleteVideo(videoId);
    fetchData();
  };

  // 新增：一键清空方法，直接调用，不弹窗确认
  const handleEmptyRecycleBin = async () => {
    await api.emptyRecycleBin();
    fetchData();
  };

  if (loading && accounts.length === 0 && videos.length === 0) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-indigo-500" /></div>;

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">数据回收站</h2>
            {/* 新增：一键清空按钮 */}
            <Button variant="destructive" onClick={handleEmptyRecycleBin} className="bg-red-500 hover:bg-red-600 shadow-sm">
              <Trash2 size={16} className="mr-1.5" /> 一键清空回收站
            </Button>
          </div>
          <p className="text-sm text-slate-500">所有被你标记移入回收站/屏蔽隐藏的链接与帐号将被停放在此，你可随时反悔进行复原，或通过“物理粉碎”永久腾出硬盘空间。</p>
        </div>

        <div className="flex items-center gap-4 border-b border-slate-200">
          <button 
            className={`pb-3 px-2 text-sm font-semibold transition-colors flex items-center gap-2 ${activeTab === 'videos' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
            onClick={() => setActiveTab('videos')}
          >
            <VideoIcon size={16} /> 被抛弃的视频名单 <span className="ml-1 bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full text-xs">{videos.length}</span>
          </button>
          <button 
            className={`pb-3 px-2 text-sm font-semibold transition-colors flex items-center gap-2 ${activeTab === 'accounts' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
            onClick={() => setActiveTab('accounts')}
          >
            <User size={16} /> 被拉黑作废的博主 <span className="ml-1 bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full text-xs">{accounts.length}</span>
          </button>
        </div>

        <div className="mt-6">
          {activeTab === 'videos' && (
            <div className="grid gap-4">
              {videos.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-200"><p className="text-slate-400">目前回收站内的废弃视频已被清理干净。</p></div>
              ) : (
                videos.map((video) => (
                  <Card key={video.id + (video.pid || "")} className="overflow-hidden hover:shadow-sm transition-all border-slate-200">
                    <div className="flex flex-col md:flex-row gap-4 p-4">
                      <div className="w-full md:w-24 shrink-0 aspect-[3/4] bg-slate-100 rounded-md overflow-hidden opacity-70 relative">
                        {video.cover_url && <img src={video.cover_url} alt="cover" className="w-full h-full object-cover grayscale" referrerPolicy="no-referrer" />}
                      </div>
                      <div className="flex-1 flex flex-col justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="bg-red-50 text-red-600 px-2 py-0.5 rounded text-[11px] font-bold">🚫 已被手动标记抛弃忽略</span>
                            <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">隶属账号: @{video.account_username || video.username}</span>
                            <a href={`https://www.tiktok.com/@${video.account_username || video.username}/video/${video.video_id}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[11px] text-indigo-500 hover:text-indigo-600 ml-auto">
                                检查外链源 <ExternalLink size={12}/>
                            </a>
                          </div>
                          <h3 className="text-sm font-medium text-slate-800 line-clamp-2 line-through opacity-80">{video.desc || '（空标题记录）'}</h3>
                          <p className="text-[11px] text-slate-400 font-mono flex items-center gap-2"><Play size={10}/>被删除时播放定格在：{video.play_count} / 原系统PID:{video.pid}</p>
                        </div>
                        <div className="flex justify-between items-end mt-4">
                          <span className="text-[11px] text-slate-400 flex items-center gap-1"><Calendar size={12}/> 发布日期：{format(new Date(video.create_time * 1000), 'yyyy-MM-dd')}</span>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" className="h-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-200" onClick={() => handleRestoreVideo(video.video_id)}>
                              <RefreshCcw size={14} className="mr-1.5" /> 取消拉黑并复原
                            </Button>
                            <Button variant="outline" size="sm" className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200" onClick={() => handleHardDeleteVideo(video.video_id)}>
                              <Trash2 size={14} className="mr-1.5" /> 数据库物理粉碎
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          )}

          {activeTab === 'accounts' && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {accounts.length === 0 ? (
                <div className="col-span-full text-center py-16 bg-white rounded-xl border border-dashed border-slate-200"><p className="text-slate-400">目前暂无被作废的账号。</p></div>
              ) : (
                accounts.map((account) => (
                  <Card key={account.id} className="relative overflow-hidden group border-slate-200">
                    <div className="absolute inset-0 bg-slate-50 opacity-50 z-0"></div>
                    <CardContent className="p-6 relative z-10 flex flex-col items-center text-center">
                      <Avatar className="h-16 w-16 mb-4 grayscale opacity-70">
                        <AvatarImage src={account.avatar_url} />
                        <AvatarFallback><User size={24} /></AvatarFallback>
                      </Avatar>
                      <h3 className="font-bold text-slate-700 line-through">{account.nickname || account.username}</h3>
                      <p className="text-sm text-slate-400 mb-6">@{account.username}</p>
                      <div className="w-full flex gap-3">
                        <Button className="flex-1 bg-white border-emerald-200 text-emerald-600 hover:bg-emerald-50" variant="outline" onClick={() => handleRestoreAccount(account.id)}>
                          <RefreshCcw size={14} className="mr-2" />复原号主
                        </Button>
                        <Button className="flex-1 bg-white border-red-200 text-red-600 hover:bg-red-50" variant="outline" onClick={() => handleHardDeleteAccount(account.id)}>
                          <Trash2 size={14} className="mr-2" />粉碎
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}