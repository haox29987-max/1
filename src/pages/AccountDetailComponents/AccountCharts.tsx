import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Maximize2, Play, Loader2 } from 'lucide-react';
import { AreaChart as AreaChartIcon } from 'lucide-react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function AccountCharts({
  top10Trends, play_trend, isTop10Loading, sortedActiveTrendVids, globalVideoIndexMap,
  TOPTEN_COLORS, hiddenLines, handleLegendClick, openEnlargedChart, handlePlayTrendClick
}: any) {
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card className="relative group overflow-hidden border-slate-100">
        <Button variant="ghost" size="icon" className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 z-10" onClick={() => openEnlargedChart('trend')}>
          <Maximize2 size={16} className="text-slate-400" />
        </Button>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><AreaChartIcon size={16} className="text-indigo-500" /> 视频播放量日增长趋势</CardTitle></CardHeader>
        <CardContent className="h-[300px]">
          {isTop10Loading ? <div className="w-full h-full flex flex-col items-center justify-center space-y-2"><Loader2 className="animate-spin text-indigo-500" /><p className="text-[10px] text-slate-400 font-bold uppercase">数据模型构建中...</p></div> : (
            <ResponsiveContainer width="100%" height="100%">
              {/* 🚀 增加空值回退 || [] 防止报错 */}
              <LineChart data={top10Trends || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => { const num = Number(v); return !isNaN(num) && Math.abs(num) >= 10000 ? `${(num/10000).toFixed(1)}W` : String(v); }} />
                <Tooltip 
                  cursor={{ stroke: '#94A3B8', strokeWidth: 1, strokeDasharray: '3 3' }} 
                  itemSorter={(a: any, b: any) => {
                    const numA = parseInt(String(a?.name || '').match(/\d+/)?.[0] || '9999', 10);
                    const numB = parseInt(String(b?.name || '').match(/\d+/)?.[0] || '9999', 10);
                    return numA - numB;
                  }}
                />
                {/* 🚀 增加空值回退 || [] 防止 map 报错 */}
                {(sortedActiveTrendVids || []).map((vid: string, i: number) => (
                    <Line 
                      key={vid} 
                      type="monotone" 
                      dataKey={`v_${vid}`} 
                      name={`NO.${globalVideoIndexMap?.[vid] || '?'}`} 
                      stroke={TOPTEN_COLORS?.[i % (TOPTEN_COLORS?.length || 1)] || '#000'} 
                      strokeWidth={2.5} 
                      dot={false} 
                      activeDot={{ r: 5, strokeWidth: 0 }}
                    />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card className="border-slate-100 relative group">
          <Button variant="ghost" size="icon" className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 z-10" onClick={() => openEnlargedChart('play')}>
            <Maximize2 size={16} className="text-slate-400" />
          </Button>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Play size={16} className="text-emerald-500" /> 每日总播放量分布 (按发布日)</CardTitle></CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              {/* 🚀 增加空值回退 || [] 防止报错 */}
              <AreaChart data={play_trend || []} onClick={(e) => { if(e && e.activeLabel) handlePlayTrendClick(e.activeLabel) }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => { const num = Number(v); return !isNaN(num) && Math.abs(num) >= 10000 ? `${(num/10000).toFixed(1)}W` : String(v); }} />
                <Tooltip />
                <Area type="monotone" dataKey="plays" name="播放总量" stroke="#10b981" fill="#10b981" fillOpacity={0.1} strokeWidth={2} activeDot={{ r: 6, cursor: 'pointer' }} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
      </Card>
    </div>
  );
}