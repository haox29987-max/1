import React, { useState, useEffect, useRef } from 'react';
import { Bot, Send, X, Loader2, Trash2 } from 'lucide-react';
import { api } from '@/api';

const DEFAULT_MESSAGE = {
  role: 'assistant', 
  content: '你好！我是乘风数据罗盘AI。我能“看到”你当前的页面和筛选条件，你可以直接向我提问（例如：“外部账号中播放量最高的是谁？”）。'
};

export function AIChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: string, content: string }[]>([DEFAULT_MESSAGE]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 🚀 核心优化 1：拖拽状态管理与坐标定位
  const [position, setPosition] = useState({ left: 32, top: typeof window !== 'undefined' ? window.innerHeight - 100 : 800 });
  const isDragging = useRef(false);

  useEffect(() => {
    // 窗口缩放时，确保按钮不会跑出屏幕外
    const handleResize = () => {
      setPosition(prev => ({
        left: Math.min(prev.left, window.innerWidth - 80),
        top: Math.min(prev.top, window.innerHeight - 80)
      }));
    };
    window.addEventListener('resize', handleResize);
    setPosition({ left: 32, top: window.innerHeight - 100 }); // 初始化在左下角
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault(); // 防止拖拽时选中文字
    const startX = e.clientX;
    const startY = e.clientY;
    const startLeft = position.left;
    const startTop = position.top;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      isDragging.current = true;
      
      let newLeft = startLeft + (moveEvent.clientX - startX);
      let newTop = startTop + (moveEvent.clientY - startY);

      // 边界限制，防止按钮被拖出屏幕外
      const btnSize = 60;
      const maxLeft = window.innerWidth - btnSize;
      const maxTop = window.innerHeight - btnSize;
      
      newLeft = Math.max(0, Math.min(newLeft, maxLeft));
      newTop = Math.max(0, Math.min(newTop, maxTop));

      setPosition({ left: newLeft, top: newTop });
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      // 给一个极小的延迟，防止拖拽松开的瞬间触发 Click 事件导致面板意外打开
      setTimeout(() => {
          isDragging.current = false;
      }, 100); 
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleButtonClick = () => {
    if (!isDragging.current) {
      setIsOpen(true);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    }
  }, [messages, isOpen]);

  const getPageContext = () => {
    const path = window.location.pathname;
    const session_storage: Record<string, string | null> = {};
    
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && (key.startsWith('dash_mem_') || key.startsWith('warn_mem_'))) {
        session_storage[key] = sessionStorage.getItem(key);
      }
    }

    if (path.includes('/warning')) {
      const tab = session_storage['warn_mem_tab'];
      if (tab === 'normal') session_storage['当前选中的预警分类是'] = '正常流量预警';
      if (tab === 'growth') session_storage['当前选中的预警分类是'] = '日增长极速预警';
      if (tab === 'low') session_storage['当前选中的预警分类是'] = '低播沉寂预警';
    }

    return { current_path: path, session_storage };
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    const userMsg = input.trim();
    setInput('');
    const newMessages = [...messages, { role: 'user', content: userMsg }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const context = getPageContext();
      const apiMessages = newMessages.filter((_, i) => i !== 0 || newMessages.length === 1); 
      
      const res = await api.chatWithAI(apiMessages, context);

      if (res.action === 'export' && res.csv_data) {
        const blob = new Blob(['\uFEFF' + res.csv_data], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', res.filename || 'export.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        setMessages([...newMessages, { role: 'assistant', content: res.content || `为您生成并导出了表格文件：${res.filename || 'export.csv'}` }]);
      } else {
        setMessages([...newMessages, { role: res.role || 'assistant', content: res.content }]);
      }
    } catch (error) {
      setMessages([...newMessages, { role: 'assistant', content: '抱歉，网络异常或未在设置中正确配置 DeepSeek API Key。' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSend();
  };

  const handleNewChat = () => {
    if (messages.length > 1 && window.confirm("确定要开启新对话并清空当前历史记录吗？")) {
      setMessages([DEFAULT_MESSAGE]);
    } else if (messages.length <= 1) {
      setMessages([DEFAULT_MESSAGE]);
    }
  };

  // 🚀 核心优化 2：智能计算对话面板的展开位置，防止超出屏幕
  const panelWidth = 384; // w-96 = 24rem = 384px
  const panelHeight = 600; // max height
  let panelLeft = position.left;
  let panelTop = position.top - panelHeight - 16; // 默认在按钮上方展开
  
  // 如果上方空间不够，则在下方展开
  if (panelTop < 16) {
      panelTop = position.top + 60 + 16; 
      // 如果下方也超出屏幕，就锁死在窗口最底端
      if (panelTop + panelHeight > window.innerHeight) {
          panelTop = window.innerHeight - panelHeight - 16; 
      }
  }
  // 如果右侧超出屏幕，向左偏移
  if (panelLeft + panelWidth > window.innerWidth - 16) {
      panelLeft = window.innerWidth - panelWidth - 16;
  }
  // 如果左侧溢出屏幕，锁定在左侧边界
  if (panelLeft < 16) panelLeft = 16;

  return (
    <>
      {!isOpen && (
        <button
          onMouseDown={handleMouseDown}
          onClick={handleButtonClick}
          style={{ left: position.left, top: position.top }}
          className="fixed bg-indigo-600 hover:bg-indigo-700 text-white p-4 rounded-full shadow-2xl transition-transform hover:scale-105 z-50 flex items-center justify-center group cursor-grab active:cursor-grabbing"
        >
          <Bot size={28} />
          <span className="absolute left-full ml-4 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity pointer-events-none">
            唤醒智能数据助手
          </span>
        </button>
      )}

      {isOpen && (
        <div 
          style={{ left: panelLeft, top: Math.max(16, panelTop) }}
          className="fixed w-96 h-[600px] max-h-[80vh] bg-white rounded-2xl shadow-2xl flex flex-col z-50 border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200"
        >
          <div className="bg-indigo-600 p-4 flex items-center justify-between text-white shrink-0 cursor-move" 
               onMouseDown={handleMouseDown} // 允许拖拽面板的头部来移动
          >
            <div className="flex items-center gap-2 pointer-events-none">
              <Bot size={20} />
              <span className="font-medium text-sm">乘风数据罗盘 AI</span>
            </div>
            
            <div className="flex items-center gap-1">
              <button 
                onClick={handleNewChat} 
                className="hover:bg-indigo-500 p-1.5 rounded transition-colors flex items-center justify-center" 
                title="开启新对话 / 清空历史记录"
              >
                <Trash2 size={16} />
              </button>
              <button 
                onClick={() => setIsOpen(false)} 
                className="hover:bg-indigo-500 p-1.5 rounded transition-colors flex items-center justify-center"
                title="最小化"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl p-3 text-sm shadow-sm ${
                  msg.role === 'user' 
                    ? 'bg-indigo-600 text-white rounded-br-none' 
                    : 'bg-white text-slate-700 border border-slate-100 rounded-bl-none'
                }`}>
                  <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white text-slate-500 border border-slate-100 rounded-2xl rounded-bl-none p-3 shadow-sm flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin text-indigo-500" />
                  <span className="text-xs">AI 正在思考并执行数据库查询...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-3 border-t border-slate-100 bg-white shrink-0">
            <div className="flex items-center gap-2">
              <div className="flex items-center relative flex-1">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="直接问我关于数据的问题..."
                  className="w-full bg-slate-100 border-none rounded-xl pl-4 pr-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
                />
                {input && (
                  <X 
                    size={14} 
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer hover:text-slate-600" 
                    onClick={() => setInput('')} 
                  />
                )}
              </div>
              <button 
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="bg-indigo-600 text-white p-2 rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}