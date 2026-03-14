import React, { useState, useRef } from 'react';
import { Download, Video, AlertCircle, RotateCcw, Trash2, RefreshCw, Copy } from 'lucide-react';
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

const ActiveJobCard: React.FC<ActiveJobCardProps> = ({ 
  job, 
  API_BASE, 
  currentUser, 
  retryJob, 
  moveToTrash, 
  updateJobData, 
  formatShortDate 
}) => {
  const isCompleted = job.status === 'completed';
  const isFailed = job.status === 'failed';

  // 新增：用于控制底部轻提示的状态
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 触发提示的函数，2秒后自动消失
  const showToast = (msg: string) => {
    setToastMsg(msg);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMsg(null);
    }, 2000);
  };

  // 终极兼容版复制功能：抛弃 alert，改用轻提示
  const handleCopyUrl = (e: React.MouseEvent) => {
    e.stopPropagation();
    const textToCopy = job.url;
    
    if (!textToCopy) {
      showToast('⚠️ 当前任务缺少链接，请先点击“更新”按钮');
      return;
    }

    // 方案 A：现代 HTTPS 或 Localhost 安全环境
    if (navigator && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      navigator.clipboard.writeText(textToCopy)
        .then(() => showToast('✅ 视频链接已复制'))
        .catch(() => showToast('❌ 现代复制失败，请检查浏览器权限'));
    } else {
      // 方案 B：传统降级方案（专治 HTTP 局域网）
      try {
        const textArea = document.createElement("textarea");
        textArea.value = textToCopy;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        const successful = document.execCommand('copy');
        textArea.remove();
        
        if (successful) {
          showToast('✅ 视频链接已复制');
        } else {
          showToast('❌ 当前浏览器严格拦截，无法复制');
        }
      } catch (err) {
        showToast('❌ 复制出错，当前浏览器不支持');
      }
    }
  };

  return (
    <>
      <div 
        className="bg-white rounded-[1.5rem] shadow-sm border border-gray-100 overflow-hidden relative group hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col h-[340px] cursor-pointer"
        onClick={() => { if (isCompleted) window.open(`${API_BASE}${job.report_url}`, '_blank'); }}
      >
        {/* 下载 ZIP 按钮 */}
        {isCompleted && (
          <a href={`${API_BASE}/api/export/${encodeURIComponent(currentUser.username)}/${job.id}`} 
             onClick={e => e.stopPropagation()} 
             className="absolute top-4 right-4 z-20 bg-white/95 text-gray-800 p-2.5 rounded-xl shadow-md hover:bg-black hover:text-white transition-colors backdrop-blur-sm" 
             title="打包离线ZIP">
            <Download size={18} />
          </a>
        )}

        {/* 视频封面/进度条区域 */}
        <div className="h-44 bg-[#111] relative flex items-center justify-center overflow-hidden shrink-0">
          {job.video_rel_path ? (
            <video src={job.video_rel_path} muted loop playsInline 
                   className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" 
                   onMouseEnter={e => e.currentTarget.play()} 
                   onMouseLeave={e => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }} />
          ) : (
            <Video size={40} className="text-gray-700 opacity-50" />
          )}

          {/* 正在处理中的进度条覆盖层 */}
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
          
          {/* 失败状态覆盖层 */}
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

        {/* 底部信息与操作按钮区域 */}
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
           
           {/* 核心操作按钮组 */}
           <div className="flex justify-end gap-2 pt-2 shrink-0">
             {isCompleted && (
               <button 
                 onClick={e => updateJobData(e, job.id)} 
                 className="text-gray-400 hover:text-blue-500 transition-colors p-1.5 bg-gray-50 rounded-lg hover:bg-blue-50" 
                 title="无损更新实时数据与AI分析"
               >
                 <RefreshCw size={16} />
               </button>
             )}
             
             <button 
               onClick={handleCopyUrl} 
               className="text-gray-400 hover:text-green-500 transition-colors p-1.5 bg-gray-50 rounded-lg hover:bg-green-50" 
               title="一键复制原始视频链接"
             >
               <Copy size={16} />
             </button>
             
             <button 
               onClick={e => moveToTrash(e, job.id)} 
               className="text-gray-400 hover:text-red-500 transition-colors p-1.5 bg-gray-50 rounded-lg hover:bg-red-50" 
               title="移入回收站"
             >
               <Trash2 size={16} />
             </button>
           </div>
        </div>
      </div>

      {/* 底部悬浮轻提示 (Toast) */}
      {toastMsg && (
        <div className="fixed bottom-10 left-1/2 transform -translate-x-1/2 bg-gray-900/90 backdrop-blur-sm text-white px-5 py-2.5 rounded-full shadow-2xl text-[13px] font-medium z-[9999] pointer-events-none animate-in fade-in slide-in-from-bottom-5 duration-300">
          {toastMsg}
        </div>
      )}
    </>
  );
};

export default ActiveJobCard;