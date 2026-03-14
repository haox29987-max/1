import React, { useState } from 'react';
import { Loader2, Zap } from 'lucide-react';

interface AnalysisFormProps {
  onStart: (inputs: { urls: string[], model: string, files: File[] }) => void;
  isProcessing: boolean;
  apiKey?: string;
}

const AnalysisForm: React.FC<AnalysisFormProps> = ({ onStart, isProcessing, apiKey }) => {
  const [urlInput, setUrlInput] = useState('');
  const [model, setModel] = useState('gpt-5.2');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

  const modelPresets = ['claude-sonnet-4-6', 'gpt-5.2-chat-latest', 'gemini-3-pro-preview'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const urls = urlInput.split('\n').map(u => u.trim()).filter(u => u.startsWith('http'));
    if (urls.length === 0) {
      alert('请至少输入一个视频链接');
      return;
    }
    onStart({ urls, model, files: [] });
    setUrlInput('');
  };

  const handleTestConnection = async () => {
    if (!apiKey) {
      alert('未分配 API Key，无法进行测试。请联系管理员。');
      return;
    }
    setIsTesting(true);
    setTestResult(null);

    // ✨ 动态获取当前环境的后端基础路径
    const API_BASE = import.meta.env.VITE_API_BASE || `http://${window.location.hostname}:8001`;

    try {
      // ✨ 核心修复：请求转交给后端处理，彻底解决浏览器 CORS 跨域限制
      const response = await fetch(`${API_BASE}/api/test_ai`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model,
          api_key: apiKey
        })
      });

      const data = await response.json();
      setTestResult({ type: data.status, msg: data.msg });
    } catch (err: any) {
      setTestResult({ type: 'error', msg: `连接后端服务器失败: ${err.message}` });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="bg-white rounded-[2rem] shadow-2xl shadow-gray-200/50 border border-gray-50 p-8 overflow-hidden relative">
      <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-600 to-blue-400"></div>
      
      <h3 className="text-xl font-black text-gray-900 mb-8 flex items-center select-none cursor-default">
        解析配置
      </h3>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3 select-none cursor-default">视频链接 (支持 TikTok/抖音 - 一行一个)</label>
          <textarea
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            className="w-full h-44 px-6 py-5 bg-gray-50 border-0 rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all resize-none text-sm font-bold leading-relaxed overflow-x-auto"
            placeholder="粘贴链接，例如: https://www.tiktok.com/@clipm0ney/video/..."
            style={{ whiteSpace: 'nowrap', fontFamily: 'inherit' }}
          />
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3 select-none cursor-default">AI 智囊模型</label>
            <div className="flex gap-3">
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="flex-1 px-5 py-4 bg-gray-50 border-0 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm font-bold text-indigo-600"
                placeholder="手动输入模型名称..."
              />
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting}
                className="px-8 bg-slate-950 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 hover:bg-black transition-all disabled:opacity-50 whitespace-nowrap shadow-lg shadow-slate-200 select-none"
              >
                {isTesting ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} className="text-amber-400 fill-amber-400" />}
                接口测试
              </button>
            </div>
            
            <div className="flex flex-wrap gap-2 mt-4 mb-4 select-none">
              {modelPresets.map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setModel(p)}
                  className={`text-[10px] px-3 py-1.5 border rounded-full font-bold transition-all ${model === p ? 'border-indigo-500 bg-indigo-50 text-indigo-600' : 'bg-white border-gray-100 text-gray-500 hover:border-gray-300'}`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {testResult && (
            <div className={`p-4 rounded-xl text-[11px] font-bold leading-relaxed border animate-in fade-in zoom-in duration-300 ${testResult.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
              {testResult.msg}
            </div>
          )}
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={isProcessing}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-indigo-100 flex items-center justify-center space-x-3 group select-none"
            style={{ height: '56px' }}
          >
            <span className="text-lg">启动深度拆解</span>
            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
};

export default AnalysisForm;