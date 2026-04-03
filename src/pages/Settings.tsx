import { useEffect, useState } from 'react';
import { api } from '@/api';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, RefreshCw, Trash2, Activity, Globe } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

export function Settings() {
  const [internalScrapeLimit, setInternalScrapeLimit] = useState(30);
  const [externalScrapeLimit, setExternalScrapeLimit] = useState(30);
  
  const [deepseekApiKey, setDeepseekApiKey] = useState('');

  const [warnNormalPlay, setWarnNormalPlay] = useState(8000);
  const [warnNormalHigh, setWarnNormalHigh] = useState(20000);
  const [warnGrowthPlay, setWarnGrowthPlay] = useState(1000);
  const [warnGrowthHigh, setWarnGrowthHigh] = useState(3000);
  const [warnLowDays, setWarnLowDays] = useState(2);
  const [warnLowPlay, setWarnLowPlay] = useState(100);

  const [autoUpdateInternalHourly, setAutoUpdateInternalHourly] = useState('0');
  const [autoUpdateExternalHourly, setAutoUpdateExternalHourly] = useState('0');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingAll, setUpdatingAll] = useState(false);
  const [retryingAll, setRetryingAll] = useState(false);
  const [cleaningLowPlay, setCleaningLowPlay] = useState(false);

  const [pingData, setPingData] = useState<{ time: string; ping: number }[]>([]);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await api.getSettings();
        setInternalScrapeLimit(parseInt(res.internal_scrape_video_limit || '30'));
        setExternalScrapeLimit(parseInt(res.external_scrape_video_limit || '30'));
        setDeepseekApiKey(res.deepseek_api_key || ''); 
        
        setWarnNormalPlay(parseInt(res.warning_normal_play || '8000'));
        setWarnNormalHigh(parseInt(res.warning_normal_high || '20000'));
        setWarnGrowthPlay(parseInt(res.warning_growth_play || '1000'));
        setWarnGrowthHigh(parseInt(res.warning_growth_high || '3000'));
        setWarnLowDays(parseInt(res.warning_low_days || '2'));
        setWarnLowPlay(parseInt(res.warning_low_play || '100'));

        setAutoUpdateInternalHourly(res.auto_update_internal_hourly || '0');
        setAutoUpdateExternalHourly(res.auto_update_external_hourly || '0');
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  // 🚀 核心更新：真实外部公网/出海节点延迟监控
  useEffect(() => {
    let isMounted = true;
    
    const initData = Array.from({ length: 20 }).map(() => ({ time: '', ping: 0 }));
    setPingData(initData);

    const checkRealNetwork = async () => {
      const start = performance.now();
      try {
        // 请求 Google 专用的极速空白探测节点 (生成 204 状态码)，用来精准测量当前物理机到海外公网的真实延迟
        // 使用 mode: 'no-cors' 和随机时间戳，完全绕过浏览器跨域拦截和缓存
        await fetch(`https://www.google.com/generate_204?_t=${Date.now()}`, { 
          mode: 'no-cors', 
          cache: 'no-store' 
        });
        
        const end = performance.now();
        let latency = Math.round(end - start);
        
        if (isMounted) {
          setPingData(prev => {
            const now = new Date();
            const timeStr = `${now.getSeconds()}s`;
            const newData = [...prev, { time: timeStr, ping: latency }];
            return newData.slice(-20); 
          });
        }
      } catch (error) {
        if (isMounted) {
          setPingData(prev => {
            const now = new Date();
            const timeStr = `${now.getSeconds()}s`;
            // 真实网络请求失败，大概率是断网或节点/代理失效
            const newData = [...prev, { time: timeStr, ping: 2000 }];
            return newData.slice(-20);
          });
        }
      }
    };

    // 每 2 秒探测一次真实外部网络
    const interval = setInterval(checkRealNetwork, 2000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.saveSettings({
        internal_scrape_video_limit: internalScrapeLimit.toString(),
        external_scrape_video_limit: externalScrapeLimit.toString(),
        warning_normal_play: warnNormalPlay.toString(),
        warning_normal_high: warnNormalHigh.toString(),
        warning_growth_play: warnGrowthPlay.toString(),
        warning_growth_high: warnGrowthHigh.toString(),
        warning_low_days: warnLowDays.toString(),
        warning_low_play: warnLowPlay.toString(),
        deepseek_api_key: deepseekApiKey, 
        auto_update_internal_hourly: autoUpdateInternalHourly,
        auto_update_external_hourly: autoUpdateExternalHourly,
      });
      alert('系统全局设置已保存');
    } catch (error: any) {
      alert('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleForceUpdateAll = async () => {
    if(!window.confirm("确定要立即触发后台线程抓取全库所有活跃账号吗？此操作将消耗较大网络资源。")) return;
    setUpdatingAll(true);
    try {
      await api.forceUpdateAll();
      alert("全局更新指令已成功下发至后台排队处理！你可以去监控面板查看各账号进度。");
    } catch (error) {
      alert("指令下发失败");
    } finally {
      setUpdatingAll(false);
    }
  }

  const handleRetryAllFailed = async () => {
    if(!window.confirm("确定要立即全局重试所有账号中抓取失败的视频吗？\n这将在后台自动提取所有带有⚠️标记的失效视频进行重抓取。")) return;
    setRetryingAll(true);
    try {
      await api.retryAllFailedVideos();
      alert("全局失败视频重试指令已下发！系统将在后台重新抓取所有无效数据。");
    } catch (error) {
      alert("重试指令下发失败");
    } finally {
      setRetryingAll(false);
    }
  }

  const handleCleanupLowPlay = async () => {
    if(!window.confirm("确定要一键清理全系统内发布超过 30 天且播放量不足 1000 的视频吗？\n为防止被防爬系统再次抓取，这些视频将被软删除并移入回收站。")) return;
    setCleaningLowPlay(true);
    try {
      const res = await api.cleanupLowPlayVideos();
      alert(`清理完成！共将 ${res.deleted_count} 个低播放无意义视频移入了回收站。`);
    } catch (error) {
      alert("清理指令执行失败");
    } finally {
      setCleaningLowPlay(false);
    }
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-indigo-500" /></div>;

  const latestPing = pingData.length > 0 ? pingData[pingData.length - 1].ping : 0;
  
  // 对于跨境访问，代理延迟的标准通常在 50~300ms 之间
  const isNetworkGood = latestPing > 0 && latestPing < 400;
  const isNetworkWarning = latestPing >= 400 && latestPing < 1000;
  const isNetworkBad = latestPing >= 1000;

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      <div className="flex items-center justify-between mb-6">
         <h2 className="text-2xl font-bold">系统设置</h2>
         <div className="flex gap-2">
           <Button onClick={handleRetryAllFailed} disabled={retryingAll} variant="outline" className="text-red-600 border-red-200 hover:bg-red-50">
              {retryingAll ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              全局重试失败视频
           </Button>
           <Button onClick={handleForceUpdateAll} disabled={updatingAll} className="bg-slate-800 hover:bg-slate-900 text-white">
              {updatingAll ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              一键全库账号强制更新
           </Button>
         </div>
      </div>

      <Card className="border-blue-100 shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-900 text-white py-3">
          <CardTitle className="flex items-center justify-between text-base">
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-blue-400 animate-pulse" />
              <span>外部出海网络真实延迟监测 (实时)</span>
            </div>
            <div className="flex items-center gap-2 text-sm font-normal">
              {latestPing === 0 ? (
                <span className="text-slate-400">网络测速中...</span>
              ) : isNetworkBad ? (
                <span className="text-red-400 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>代理断开/极度拥堵 ({latestPing}ms)</span>
              ) : isNetworkWarning ? (
                <span className="text-amber-400 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500"></span>节点卡顿 ({latestPing}ms)</span>
              ) : (
                <span className="text-emerald-400 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span>外网连接畅通 ({latestPing}ms)</span>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 bg-slate-50 h-[140px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={pingData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorPing" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={isNetworkBad ? "#EF4444" : isNetworkWarning ? "#F59E0B" : "#3B82F6"} stopOpacity={0.4}/>
                  <stop offset="95%" stopColor={isNetworkBad ? "#EF4444" : isNetworkWarning ? "#F59E0B" : "#3B82F6"} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <RechartsTooltip 
                contentStyle={{ backgroundColor: '#1E293B', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                itemStyle={{ color: '#60A5FA' }}
                formatter={(value: number) => [`${value} ms`, '公网延迟']}
                labelStyle={{ display: 'none' }}
              />
              <Area 
                type="monotone" 
                dataKey="ping" 
                stroke={isNetworkBad ? "#EF4444" : isNetworkWarning ? "#F59E0B" : "#3B82F6"} 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorPing)" 
                isAnimationActive={false} 
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      
      <Card className="border-emerald-100 shadow-sm">
        <CardHeader className="bg-emerald-50/50">
          <CardTitle className="text-emerald-800 flex items-center gap-2">
            每小时实时巡更引擎调度
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 mt-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <Label className="text-base text-slate-800">启用内部员工账号自动巡查 (每小时)</Label>
              <p className="text-xs text-slate-500 mt-1">自动检查【内部列表】中打开了“开启系统支持”的活跃号。</p>
            </div>
            <select 
              value={autoUpdateInternalHourly} 
              onChange={e => setAutoUpdateInternalHourly(e.target.value)}
              className="flex h-10 min-w-[140px] items-center justify-between rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="1">🟢 开启高频实时</option>
              <option value="0">关闭</option>
            </select>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-slate-100">
            <div>
              <Label className="text-base text-slate-800">启用外部监测账号自动巡查 (每小时)</Label>
              <p className="text-xs text-slate-500 mt-1">自动检查【外部列表】中打开了“开启系统支持”的活跃号。</p>
            </div>
            <select 
              value={autoUpdateExternalHourly} 
              onChange={e => setAutoUpdateExternalHourly(e.target.value)}
              className="flex h-10 min-w-[140px] items-center justify-between rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="1">🟢 开启高频实时</option>
              <option value="0">关闭</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Card className="border-indigo-100 shadow-sm">
        <CardHeader className="bg-indigo-50/50">
          <CardTitle className="text-indigo-800 flex items-center gap-2">
            AI 智能体配置 (DeepSeek)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 mt-4">
          <div className="grid gap-2">
            <Label htmlFor="deepseekApiKey">DeepSeek API Key (Token)</Label>
            <Input 
              id="deepseekApiKey" 
              type="password" 
              placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxx" 
              value={deepseekApiKey} 
              onChange={(e) => setDeepseekApiKey(e.target.value)} 
              className="font-mono"
            />
            <p className="text-xs text-slate-500">用于悬浮 AI 智能体的自然语言数据库查询及分析支撑。</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>抓取参数与策略配置</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-2">
            <Label htmlFor="internalScrapeLimit">内部核心号 - 默认抓取视频截取限制数</Label>
            <Input id="internalScrapeLimit" type="number" min="1" max="100" value={internalScrapeLimit} onChange={(e) => setInternalScrapeLimit(parseInt(e.target.value) || 0)} className="w-40" />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="externalScrapeLimit">外部侦测号 - 默认抓取视频截取限制数</Label>
            <Input id="externalScrapeLimit" type="number" min="1" max="100" value={externalScrapeLimit} onChange={(e) => setExternalScrapeLimit(parseInt(e.target.value) || 0)} className="w-40" />
          </div>
        </CardContent>
      </Card>

      <Card className="border-red-100">
        <CardHeader>
          <CardTitle className="text-red-800">数据清理与维护</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label>清理低质量历史数据</Label>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center mt-2">
              <Button onClick={handleCleanupLowPlay} disabled={cleaningLowPlay} variant="destructive" className="bg-red-500 hover:bg-red-600 text-white shrink-0">
                {cleaningLowPlay ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                一键清理30天外低播视频 (播放 &lt; 1000)
              </Button>
              <p className="text-xs text-slate-500">
                将全局库中发布时间超过 30 天且当前播放量不到 1000 的无效废弃视频统一移入回收站。
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>预警中心阈值配置</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>正常预警播放量起点</Label>
              <Input type="number" value={warnNormalPlay} onChange={(e) => setWarnNormalPlay(parseInt(e.target.value) || 0)} />
            </div>
            <div className="space-y-2">
              <Label>正常预警高亮标红点 (流量激增)</Label>
              <Input type="number" value={warnNormalHigh} onChange={(e) => setWarnNormalHigh(parseInt(e.target.value) || 0)} />
            </div>
            <div className="space-y-2">
              <Label>日增长预警起点 (24小时新增)</Label>
              <Input type="number" value={warnGrowthPlay} onChange={(e) => setWarnGrowthPlay(parseInt(e.target.value) || 0)} />
            </div>
            <div className="space-y-2">
              <Label>日增长强提醒起点</Label>
              <Input type="number" value={warnGrowthHigh} onChange={(e) => setWarnGrowthHigh(parseInt(e.target.value) || 0)} />
            </div>
            <div className="space-y-2">
              <Label>低播预警判断天数</Label>
              <Input type="number" value={warnLowDays} onChange={(e) => setWarnLowDays(parseInt(e.target.value) || 0)} />
            </div>
            <div className="space-y-2">
              <Label>低播预警播放量阈值 (低于该值触发)</Label>
              <Input type="number" value={warnLowPlay} onChange={(e) => setWarnLowPlay(parseInt(e.target.value) || 0)} />
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end border-t pt-6">
          <Button onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">
            {saving ? '正在写入系统缓存...' : '保存所有设置'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}