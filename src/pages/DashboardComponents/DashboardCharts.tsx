import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

interface DashboardChartsProps {
  stats: any;
  selectedCountry: string;
  selectedGroup: string;
  handleChartClick: (filterType: string, filterVal: string, title: string) => void;
}

export default function DashboardCharts({ stats, selectedCountry, selectedGroup, handleChartClick }: DashboardChartsProps) {
  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <Card className="border-slate-100 shadow-sm">
        <CardHeader>
           <CardTitle className="flex items-center justify-between">
              <span>PID 总数量发现排行 (Top 10)</span>
              {(selectedCountry !== 'all' || selectedGroup !== 'all') && <span className="text-xs font-normal text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">当前已过滤</span>}
           </CardTitle>
        </CardHeader>
        <CardContent className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats?.ranking || []} layout="vertical" margin={{ left: 50 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
              <XAxis type="number" stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="nickname" stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} width={100} />
              <RechartsTooltip cursor={{ fill: '#F1F5F9' }} />
              <Bar 
                dataKey="count" 
                name="视频条数" 
                fill="#10B981" 
                radius={[0, 4, 4, 0]} 
                barSize={24} 
                cursor="pointer" 
                onClick={(data: any) => {
                   const label = data?.nickname || data?.payload?.nickname;
                   if (label) handleChartClick('pid', label, `查阅附带 PID [${label}] 的归属视频`);
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="border-slate-100 shadow-sm">
        <CardHeader>
           <CardTitle className="flex items-center justify-between">
              <span>商品热门类目覆盖面排行</span>
              {(selectedCountry !== 'all' || selectedGroup !== 'all') && <span className="text-xs font-normal text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">当前已过滤</span>}
           </CardTitle>
        </CardHeader>
        <CardContent className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats?.categoryRanking || []} layout="vertical" margin={{ left: 50 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
              <XAxis type="number" stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="display_category" stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} width={100} />
              <RechartsTooltip cursor={{ fill: '#F1F5F9' }} />
              <Bar 
                dataKey="count" 
                name="视频条数" 
                fill="#F59E0B" 
                radius={[0, 4, 4, 0]} 
                barSize={24} 
                cursor="pointer" 
                onClick={(data: any) => {
                   // 获取原始完整路径用于发请求，显示时使用翻译后的 display_category
                   const label = data?.category || data?.payload?.category;
                   const displayLabel = data?.display_category || data?.payload?.display_category || label;
                   if (label) handleChartClick('category', label, `属于类目 [${displayLabel}] 范围的热门带货视频`);
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}