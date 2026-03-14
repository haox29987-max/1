import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Routes, Route, Navigate, useNavigate, Link } from 'react-router-dom';
import { UserData, AllowedUser } from './types';
import Header from './components/Header';
import AnalysisForm from './components/AnalysisForm';
import LoginForm from './components/LoginForm';
import AdminPortal from './components/AdminPortal';
import TrashManager from './components/TrashManager';
import ActiveJobCard from './components/ActiveJobCard';
import { LayoutDashboard, Trash2 } from 'lucide-react';

// ✨ 优化：动态读取环境变量，若未配置则优雅降级为当前域名
const API_BASE = import.meta.env.VITE_API_BASE || `http://${window.location.hostname}:8001`;

export const formatShortDate = (dateStr?: string) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return `${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
};

const App: React.FC = () => {
  const navigate = useNavigate(); // ✨ 优化：引入路由导航钩子

  const [currentUser, setCurrentUser] = useState<UserData | null>(null);
  const [isLoggedInAsAdmin, setIsLoggedInAsAdmin] = useState(false);
  const [iconClicks, setIconClicks] = useState(0);

  const [allowedUsers, setAllowedUsers] = useState<AllowedUser[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const pollIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/users`).then(res => res.json()).then(data => setAllowedUsers(data.users || []));
  }, []);

  const handleUpdateAllowedUsers = async (users: AllowedUser[]) => {
    setAllowedUsers(users);
    await fetch(`${API_BASE}/api/users`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ users }) });
  };

  const fetchJobs = async () => {
    if (!currentUser) return;
    try {
      const res = await fetch(`${API_BASE}/api/jobs?username=${encodeURIComponent(currentUser.username)}`);
      if (res.ok) {
        const data = await res.json();
        setJobs(data.jobs.map((job: any) => ({
          ...job,
          video_rel_path: job.video_rel_path && !job.video_rel_path.startsWith('http') ? `${API_BASE}${job.video_rel_path}` : job.video_rel_path
        })));
      }
    } catch (err) {}
  };

  useEffect(() => {
    if (currentUser && jobs.some(j => !['completed', 'failed'].includes(j.status))) {
      pollIntervalRef.current = window.setInterval(fetchJobs, 1500);
    } else {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    }
    return () => { if (pollIntervalRef.current) clearInterval(pollIntervalRef.current); };
  }, [currentUser, jobs]);

  useEffect(() => { if (currentUser && !isLoggedInAsAdmin) fetchJobs(); }, [currentUser]);

  const activeJobs = useMemo(() => jobs.filter(j => !j.deletedAt), [jobs]);
  const trashJobs = useMemo(() => jobs.filter(j => !!j.deletedAt), [jobs]);

  const handleLogoClick = () => {
    setIconClicks(prev => { 
      const next = prev + 1; 
      if (next >= 7) { 
        navigate('/admin-login'); // ✨ 优化：触发彩蛋后跳转到管理员登录路由
        return 0; 
      } 
      return next; 
    });
  };
  
  useEffect(() => { if (iconClicks > 0) { const timer = setTimeout(() => setIconClicks(0), 1500); return () => clearTimeout(timer); } }, [iconClicks]);

  const handleLogout = () => { 
    setCurrentUser(null); 
    setIsLoggedInAsAdmin(false); 
    setJobs([]); 
    navigate('/login'); // ✨ 优化：登出后跳转至登录页
  };

  const handleLogin = async (user: UserData, mode: 'employee' | 'admin') => {
    try {
      const res = await fetch(`${API_BASE}/api/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: user.username, mode }) });
      const data = await res.json();
      if (data.status !== 'success') { alert(data.message); return; }
      
      if (mode === 'admin') {
        setIsLoggedInAsAdmin(true);
        navigate('/admin'); // ✨ 优化：管理员登录成功进入控制台路由
      } else {
        setCurrentUser(user);
        navigate('/dashboard'); // ✨ 优化：员工登录成功进入工作台路由
      }
    } catch { alert("服务器连接失败！请确认后端系统已启动。"); }
  };

  const startAnalysis = async (inputs: { urls: string[], model: string }) => {
    if (!currentUser) return;
    setIsProcessing(true);
    try {
      await fetch(`${API_BASE}/api/analyze`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ urls: inputs.urls, model: inputs.model, username: currentUser.username }) });
      navigate('/dashboard'); // ✨ 优化：开始任务后自动切换到工作台面板
      fetchJobs();
    } catch {} finally { setIsProcessing(false); }
  };

  const retryJob = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!currentUser) return;
    try {
      await fetch(`${API_BASE}/api/jobs/${id}/retry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: currentUser.username })
      });
      fetchJobs(); 
    } catch { alert("发送失败，请检查网络！"); }
  };

  // 新增：触发无损更新数据与AI分析的函数
  const updateJobData = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!currentUser) return;
    try {
      await fetch(`${API_BASE}/api/jobs/${id}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: currentUser.username })
      });
      fetchJobs(); 
    } catch { alert("发送失败，请检查网络！"); }
  };

  const moveToTrash = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!currentUser) return;
    await fetch(`${API_BASE}/api/jobs/${id}/trash`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: currentUser.username }) });
    fetchJobs(); 
  };
  
  const restoreJob = async (id: string) => { await fetch(`${API_BASE}/api/jobs/${id}/restore`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: currentUser!.username }) }); fetchJobs(); };
  const permanentDelete = async (id: string) => { if (confirm('确认物理粉碎？')) { await fetch(`${API_BASE}/api/jobs/${id}?username=${encodeURIComponent(currentUser!.username)}`, { method: 'DELETE' }); fetchJobs(); } };
  const clearTrash = async () => { if (confirm('清空回收站将彻底删除物理文件！')) { for (const job of trashJobs) await fetch(`${API_BASE}/api/jobs/${job.id}?username=${encodeURIComponent(currentUser!.username)}`, { method: 'DELETE' }); fetchJobs(); } };

  // ✨ 优化：将原先的工作台和回收站提取为渲染函数，由路由复用
  const renderWorkbench = (viewMode: 'active' | 'trash') => (
    <main className="container mx-auto px-6 mt-12 max-w-[1400px]">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        <div className="lg:col-span-5 space-y-8">
          <AnalysisForm onStart={startAnalysis} isProcessing={isProcessing} apiKey={currentUser?.apiKey} />
          <div className="flex gap-2 p-1.5 bg-gray-100 rounded-2xl">
            {/* ✨ 优化：将原本的 button 替换为 react-router-dom 的 Link */}
            <Link to="/dashboard" className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black transition-all ${viewMode === 'active' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
              <LayoutDashboard size={18} /> 工作台 ({activeJobs.length})
            </Link>
            <Link to="/trash" className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black transition-all ${viewMode === 'trash' ? 'bg-white text-red-500 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
              <Trash2 size={18} /> 回收站
            </Link>
          </div>
        </div>

        <div className="lg:col-span-7 h-full">
          {viewMode === 'active' ? (
            activeJobs.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start auto-rows-max">
                {activeJobs.map(job => (
                  <ActiveJobCard 
                    key={job.id} 
                    job={job} 
                    API_BASE={API_BASE} 
                    currentUser={currentUser!} 
                    retryJob={retryJob} 
                    moveToTrash={moveToTrash}
                    updateJobData={updateJobData}
                    formatShortDate={formatShortDate}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 p-24 h-full min-h-[600px] flex flex-col items-center justify-center text-gray-300">
                <LayoutDashboard size={64} className="mb-6 opacity-20" />
                <p className="text-xl font-black tracking-widest text-gray-400">目前没有任何任务</p>
              </div>
            )
          ) : (
            <div className="min-h-[600px] h-full">
              <TrashManager jobs={trashJobs} onRestore={restoreJob} onPermanentDelete={permanentDelete} onClearAll={clearTrash} />
            </div>
          )}
        </div>
      </div>
    </main>
  );

  // ✨ 优化：标准化的路由架构，全面替代原先的 if-return 逻辑
  return (
    <Routes>
      <Route path="/" element={<Navigate to={currentUser ? "/dashboard" : "/login"} replace />} />

      <Route path="/login" element={
        currentUser ? <Navigate to="/dashboard" replace /> : 
        <LoginForm mode="employee" allowedUsers={allowedUsers} onLogin={(user) => handleLogin(user, 'employee')} onLogoClick={handleLogoClick} />
      } />

      <Route path="/admin-login" element={
        isLoggedInAsAdmin ? <Navigate to="/admin" replace /> : 
        <LoginForm mode="admin" allowedUsers={allowedUsers} onLogin={(user) => handleLogin(user, 'admin')} onCancel={() => navigate('/login')} />
      } />

      <Route path="/admin" element={
        isLoggedInAsAdmin ? (
          <AdminPortal onLogout={handleLogout} allowedUsers={allowedUsers} setAllowedUsers={handleUpdateAllowedUsers} />
        ) : <Navigate to="/admin-login" replace />
      } />

      <Route path="/dashboard" element={
        currentUser ? (
          <div className="min-h-screen pb-20 bg-[#fafafa]">
            <Header onLogoClick={handleLogoClick} user={currentUser} onLogout={handleLogout} />
            {renderWorkbench('active')}
          </div>
        ) : <Navigate to="/login" replace />
      } />

      <Route path="/trash" element={
        currentUser ? (
          <div className="min-h-screen pb-20 bg-[#fafafa]">
            <Header onLogoClick={handleLogoClick} user={currentUser} onLogout={handleLogout} />
            {renderWorkbench('trash')}
          </div>
        ) : <Navigate to="/login" replace />
      } />

      {/* 捕获所有未定义路由 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;