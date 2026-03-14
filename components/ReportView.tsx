import React from 'react';
import { AnalysisJob } from '../types';
import { ExternalLink, Download, FileVideo } from 'lucide-react';

interface ReportViewProps {
  job: AnalysisJob;
  API_BASE: string;
  username: string;
}

const ReportView: React.FC<ReportViewProps> = ({ job, API_BASE, username }) => {
  // 状态1：处理中
  if (job.status === 'pending' || job.status === 'scraping' || job.status === 'processing') {
    return (
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 p-24 h-full flex flex-col items-center justify-center text-gray-400">
        <div className="w-16 h-16 mb-6 border-4 border-t-blue-500 border-gray-200 rounded-full animate-spin"></div>
        <p className="text-xl font-black text-gray-700">正在云端分析中...</p>
        <p className="text-sm mt-2 font-bold uppercase tracking-widest text-gray-400">后台正在下载视频与切片分镜</p>
      </div>
    );
  }

  // 状态2：失败
  if (job.status === 'failed') {
    return (
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-red-100 p-24 h-full flex flex-col items-center justify-center text-red-500">
        <p className="text-2xl font-black mb-2">❌ 任务处理失败</p>
        <p className="text-sm font-medium">{job.error || '可能是网络问题或视频链接已失效'}</p>
      </div>
    );
  }

  // 状态3：完成，干净利落的跳转面板
  return (
    <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden h-full flex flex-col p-10 relative">
      <h2 className="text-2xl font-black mb-1 text-gray-800 tracking-tight">✅ 解析任务已完成</h2>
      <p className="text-sm text-gray-400 font-mono mb-8">单号: {job.id}</p>
      
      {/* 直接播放已经下载到服务器 D 盘的源视频 */}
      {job.video_rel_path ? (
        <div className="bg-black rounded-[2rem] overflow-hidden flex items-center justify-center mb-10 h-[360px] shadow-lg relative">
          <video controls src={job.video_rel_path} className="absolute inset-0 w-full h-full object-contain bg-black" />
        </div>
      ) : (
        <div className="bg-gray-50 rounded-[2rem] flex flex-col items-center justify-center mb-10 h-[360px] text-gray-400 border border-gray-100">
          <FileVideo size={48} className="mb-4 text-gray-300" />
          <span className="font-bold tracking-widest uppercase">暂无本地视频</span>
        </div>
      )}

      {/* 核心动作：跳转 & 下载 */}
      <div className="flex flex-col gap-4 mt-auto">
        <a
          href={`${API_BASE}${job.report_url}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-3 bg-black text-white p-5 rounded-2xl hover:bg-gray-800 transition-all shadow-md font-bold text-lg hover:-translate-y-1"
        >
          <ExternalLink size={24} /> 浏览器打开完整原生网页
        </a>

        <a
          href={`${API_BASE}/api/export/${encodeURIComponent(username)}/${job.id}`}
          className="flex items-center justify-center gap-3 bg-white border-2 border-gray-200 text-gray-800 p-5 rounded-2xl hover:border-gray-800 hover:text-gray-900 transition-all font-bold text-lg hover:shadow-lg hover:-translate-y-1"
        >
          <Download size={24} /> 📦 打包导出脱机 ZIP 离线包
        </a>
      </div>
      
      <p className="text-xs text-center text-gray-400 mt-6 font-medium">
        (导出的压缩包解压后，内部包含 MP4 视频、分镜文件夹及 HTML，断网可直接点击查看)
      </p>
    </div>
  );
};

export default ReportView;