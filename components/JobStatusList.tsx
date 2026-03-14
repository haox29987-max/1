import React from 'react';
import { AnalysisJob } from '../types';
import { Trash2, RotateCcw } from 'lucide-react';

interface JobStatusListProps {
  jobs: AnalysisJob[];
  selectedJobId: string | null;
  onSelectJob: (id: string) => void;
  onDelete: (id: string) => void;
  onRetry?: (id: string) => void;
}

const JobStatusList: React.FC<JobStatusListProps> = ({ jobs, selectedJobId, onSelectJob, onDelete, onRetry }) => {
  if (jobs.length === 0) return null;

  const getStatusColor = (status: AnalysisJob['status']) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      case 'pending': return 'bg-gray-300';
      default: return 'bg-indigo-500 animate-pulse';
    }
  };

  const getStatusText = (status: AnalysisJob['status']) => {
    switch (status) {
      case 'scraping': return '获取中...';
      case 'downloading': return '下载中...';
      case 'analyzing': return '分析中...';
      case 'completed': return '分析完成';
      case 'failed': return '处理失败';
      default: return '队列中';
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 animate-in fade-in duration-500 select-none">
      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center justify-between cursor-default">
        工作台任务
        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full">{jobs.length}</span>
      </h3>
      
      <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
        {jobs.map((job) => (
          <div
            key={job.id}
            onClick={() => onSelectJob(job.id)}
            className={`p-4 rounded-xl border transition-all cursor-pointer group relative ${
              selectedJobId === job.id 
                ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500' 
                : 'border-gray-100 hover:border-indigo-300 hover:bg-gray-50'
            }`}
          >
            <div className="flex justify-between items-start mb-2">
              <span className="text-sm font-bold text-gray-800 truncate max-w-[150px] cursor-pointer">
                {job.filename || '解析任务'}
              </span>
              <div className="flex items-center gap-1">
                <span className={`text-[9px] px-2 py-0.5 rounded-full text-white font-bold uppercase tracking-wider cursor-default ${getStatusColor(job.status)}`}>
                  {getStatusText(job.status)}
                </span>
                
                {job.status === 'failed' && onRetry && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); onRetry(job.id); }}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-blue-500 transition-all hover:bg-blue-50 rounded-lg select-none"
                    title="重新解析"
                  >
                     <RotateCcw size={14} />
                  </button>
                )}
                
                <button 
                  onClick={(e) => { e.stopPropagation(); onDelete(job.id); }}
                  className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-500 transition-all hover:bg-red-50 rounded-lg select-none"
                  title="移入回收站"
                >
                   <Trash2 size={14} />
                </button>
              </div>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-1 mb-2 overflow-hidden cursor-default">
              <div 
                className={`h-1 rounded-full transition-all duration-500 ${getStatusColor(job.status)}`}
                style={{ width: `${job.progress || 0}%` }}
              ></div>
            </div>

            <div className="flex justify-between items-center text-[10px] text-gray-400 font-bold uppercase tracking-widest cursor-default">
              <span>PROGRESS: {Math.round(job.progress || 0)}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default JobStatusList;