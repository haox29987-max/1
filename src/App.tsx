import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Layout } from '@/components/Layout';
import { Dashboard } from '@/pages/Dashboard';
import { AccountDetail } from '@/pages/AccountDetail';
import { Settings } from '@/pages/Settings';
import { RecycleBin } from '@/pages/RecycleBin';
import { WarningCenter } from '@/pages/WarningCenter'; // 新增预警中心引入

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // 切换窗口不自动拉取，防止过度渲染
      retry: 1, // 失败重试1次
      staleTime: 1000 * 60 * 5, // 5分钟缓存保鲜
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Layout>
          <Routes>
            {/* 修复点：添加了 key="internal" 和 key="external" */}
            {/* 这会强制 React 在切换路由时完全重新挂载 Dashboard 组件，隔离内部和外部的状态，彻底解决数据串位 Bug */}
            <Route path="/" element={<Dashboard key="internal" type="internal" />} />
            <Route path="/external" element={<Dashboard key="external" type="external" />} />
            <Route path="/warning-center" element={<WarningCenter />} /> {/* 新增路由 */}
            <Route path="/recycle-bin" element={<RecycleBin />} />
            <Route path="/account/:id" element={<AccountDetail />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </Layout>
      </Router>
    </QueryClientProvider>
  );
}