import React from 'react';
import { Download, Video, AlertCircle, RotateCcw, Trash2, RefreshCw } from 'lucide-react';
import { AnalysisJob, UserData } from '../types';

interface ActiveJobCardProps {
  job: AnalysisJob;
  API_BASE: string;
  currentUser: UserData;
  retryJob: (e: React.MouseEvent, id: string) => void;
  moveToTrash: (e: React.MouseEvent, id: string) => void;
  updateJobData: (e: React.MouseEvent, id: string) => void;
  formatShortDate: (dateStr?: string) => string;
}

const ActiveJobCard: React.FC<ActiveJobCardProps> = ({ job, API_BASE, currentUser, retryJob, moveToTrash, updateJobData, formatShortDate }) => {
  const isCompleted = job.status === 'completed';
  const isFailed = job.status === 'failed';

  return (
    <div 
      className="bg-white rounded-[1.5rem] shadow-sm border border-gray-100 overflow-hidden relative group hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col h-[340px] cursor-pointer"
      onClick={() => { if (isCompleted) window.open(`${API_BASE}${job.report_url}`, '_blank'); }}
    >
      {isCompleted && (
        <a href={`${API_BASE}/api/export/${encodeURIComponent(currentUser.username)}/${job.id}`} 
           onClick={e => e.stopPropagation()} 
           className="absolute top-4 right-4 z-20 bg-white/95 text-gray-800 p-2.5 rounded-xl shadow-md hover:bg-black hover:text-white transition-colors backdrop-blur-sm" title="打包离线ZIP">
          <Download size={18} />
        </a>
      )}

      <div className="h-44 bg-[#111] relative flex items-center justify-center overflow-hidden shrink-0">
        {job.video_rel_path ? (
          <video src={job.video_rel_path} muted loop playsInline 
                 className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" 
                 onMouseEnter={e => e.currentTarget.play()} onMouseLeave={e => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }} />
        ) : (
          <Video size={40} className="text-gray-700 opacity-50" />
        )}

        {!isCompleted && !isFailed && (
          <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center p-6 text-center z-10 backdrop-blur-sm">
             <span className="text-white text-[13px] font-bold tracking-wider mb-4 leading-relaxed px-2 line-clamp-2">
               {job.progressText || '加入云端队列...'}
             </span>
             <div className="w-10/12 bg-gray-800 rounded-full h-1.5 shadow-inner overflow-hidden">
                 <div className="bg-blue-500 h-full rounded-full transition-all duration-300 ease-out" style={{ width: `${job.progress || 0}%` }}></div>
             </div>
             <span className="text-gray-400 text-xs font-bold mt-3">{job.progress || 0}%</span>
          </div>
        )}
        
        {isFailed && (
          <div className="absolute inset-0 bg-red-950/90 flex flex-col items-center justify-center p-4 text-center z-10 backdrop-blur-sm shadow-inner pointer-events-auto">
             <AlertCircle size={32} className="mb-2 text-red-200" />
             <span className="text-white text-sm font-black mb-2 flex items-center gap-1">❌ 解析失败</span>
             <div className="text-red-200 text-[11px] font-medium leading-relaxed px-2 overflow-y-auto w-full max-h-20 break-words mb-3">
               {job.error || '任务发生未知网络错误'}
             </div>
             <button 
               onClick={(e) => retryJob(e, job.id)} 
               className="bg-white/10 border border-white/20 hover:bg-white/20 text-white text-xs font-bold py-2 px-5 rounded-full flex items-center gap-1.5 transition-all shadow-md active:scale-95"
             >
               <RotateCcw size={14} /> 重新解析
             </button>
          </div>
        )}
      </div>

      <div className="p-5 bg-white flex flex-col flex-1 justify-between">
         <div className="flex justify-between items-center gap-3 mb-3">
             <div className="bg-blue-50 text-blue-600 px-2.5 py-1.5 rounded-lg border border-blue-100 font-mono text-[11px] font-bold truncate flex-1 min-w-0" title={`ID: ${job.videoId}`}>
                 ID: {job.videoId || '获取中...'}
             </div>
             <div className="text-[11px] font-bold text-gray-400 shrink-0">
                 {formatShortDate(job.createdAt)}
             </div>
         </div>
         
         <h3 className="font-bold text-gray-800 text-[14px] leading-snug line-clamp-2 flex-1 mb-1" title={job.title}>
             {job.title || '正在抓取视频数据...'}
         </h3>
         
         <div className="flex justify-end gap-2 pt-2 shrink-0">
           {isCompleted && (
             <button onClick={e => updateJobData(e, job.id)} className="text-gray-400 hover:text-blue-500 transition-colors p-1.5 bg-gray-50 rounded-lg hover:bg-blue-50" title="无损更新实时数据与AI分析">
               <RefreshCw size={16} />
             </button>
           )}
           <button onClick={e => moveToTrash(e, job.id)} className="text-gray-400 hover:text-red-500 transition-colors p-1.5 bg-gray-50 rounded-lg hover:bg-red-50" title="移入回收站">
             <Trash2 size={16} />
           </button>
         </div>
      </div>
    </div>
  );
};

export default ActiveJobCard;