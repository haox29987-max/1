import React, { useState } from 'react';
import { AnalysisJob } from '../types';
import { Trash2, RotateCcw, XCircle, Play, Video } from 'lucide-react';

interface TrashManagerProps {
  jobs: AnalysisJob[];
  onRestore: (id: string) => void;
  onPermanentDelete: (id: string) => void;
  onClearAll: () => void;
}

const TrashManager: React.FC<TrashManagerProps> = ({ jobs, onRestore, onPermanentDelete, onClearAll }) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null); // 控制视频全屏弹窗

  const getRemainingDays = (deletedAt?: string) => {
    if (!deletedAt) return 3;
    const timestamp = new Date(deletedAt).getTime();
    if (isNaN(timestamp)) return 3;
    const passedDays = Math.floor((Date.now() - timestamp) / (1000 * 3600 * 24));
    return Math.max(3 - passedDays, 0);
  };

  return (
    <div className="bg-white rounded-[2.5rem] shadow-sm border border-red-50 p-10 min-h-[600px] flex flex-col h-full relative">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-black text-gray-800 flex items-center gap-3">
            <Trash2 className="text-red-500" size={28} /> 回收站
          </h2>
          <p className="text-sm font-medium text-orange-500 mt-2">
            项目在 3 天后将被后端系统强制进行永久物理粉碎
          </p>
        </div>
        <button onClick={onClearAll} disabled={jobs.length === 0} className="bg-red-50 text-red-500 font-bold px-6 py-3 rounded-2xl hover:bg-red-100 transition-colors disabled:opacity-50">
          一键清空回收站
        </button>
      </div>

      {jobs.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-300">
          <Trash2 size={48} className="mb-4 opacity-30" />
          <p className="font-bold tracking-widest uppercase">回收站为空</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start auto-rows-max">
          {jobs.map((job: any) => (
            <div key={job.id} className="bg-gray-50 rounded-[1.5rem] border border-gray-100 flex flex-col relative opacity-90 hover:opacity-100 transition-opacity overflow-hidden">
              
              {/* 👀 增加了和主页一样的悬浮静音播放面板，并且点击可以呼出全屏预览 */}
              <div 
                className="h-44 bg-[#111] relative flex items-center justify-center overflow-hidden shrink-0 group cursor-pointer"
                onClick={() => job.video_rel_path && setPreviewUrl(job.video_rel_path)}
              >
                {job.video_rel_path ? (
                  <video src={job.video_rel_path} muted loop playsInline 
                         className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" 
                         onMouseEnter={e => e.currentTarget.play()} onMouseLeave={e => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }} />
                ) : (
                  <Video size={40} className="text-gray-700 opacity-50" />
                )}
                {job.video_rel_path && (
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="bg-black/60 p-3 rounded-full text-white backdrop-blur-md">
                      <Play size={24} fill="currentColor" className="ml-1" />
                    </div>
                  </div>
                )}
                <div className="absolute top-3 right-3 bg-red-500/90 text-white text-[10px] font-black px-2.5 py-1 rounded-lg backdrop-blur-md shadow-sm pointer-events-none">
                   已移入回收站
                </div>
              </div>

              <div className="p-5 flex flex-col flex-1">
                <div className="text-sm font-bold text-gray-800 mb-1 line-clamp-1">{job.title || '解析任务'}</div>
                <div className="text-[11px] text-gray-400 mb-4 font-mono truncate" title={job.videoId}>视频 ID: {job.videoId || '未知'}</div>
                
                <div className="text-xs font-bold text-orange-500 mb-4 bg-orange-50 w-fit px-3 py-1.5 rounded-lg border border-orange-100">
                  剩余保存时间: {getRemainingDays(job.deletedAt)} 天
                </div>

                <div className="flex gap-3 mt-auto shrink-0">
                  <button onClick={() => onRestore(job.id)} className="flex-1 flex justify-center items-center gap-2 bg-white border border-gray-200 py-2.5 rounded-xl text-sm font-bold hover:bg-gray-100 transition-colors shadow-sm">
                    <RotateCcw size={16} /> 恢复
                  </button>
                  <button onClick={() => onPermanentDelete(job.id)} className="flex-1 flex justify-center items-center gap-2 bg-red-500 text-white py-2.5 rounded-xl text-sm font-bold hover:bg-red-600 transition-colors shadow-sm">
                    <XCircle size={16} /> 粉碎
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 🎬 视频弹窗全屏暗黑播放器 */}
      {previewUrl && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-6 backdrop-blur-md transition-all" onClick={() => setPreviewUrl(null)}>
          <div className="relative w-full max-w-4xl bg-black rounded-3xl overflow-hidden shadow-2xl border border-white/10 animate-in zoom-in duration-300" onClick={e => e.stopPropagation()}>
            <div className="p-4 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent absolute top-0 w-full z-10 pointer-events-none">
              <span className="text-white font-bold text-sm drop-shadow-md">视频预览确认</span>
              <button onClick={() => setPreviewUrl(null)} className="pointer-events-auto text-white/80 hover:text-white hover:bg-white/20 p-2 rounded-full transition-colors backdrop-blur-md">
                <XCircle size={24} />
              </button>
            </div>
            <video src={previewUrl} controls autoPlay className="w-full max-h-[85vh] object-contain outline-none bg-black" />
          </div>
        </div>
      )}
    </div>
  );
};

export default TrashManager;