import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Download, Plus, Globe, Folder } from 'lucide-react';

export default function DashboardHeader(props: any) {
  const { 
    type, selectedCountry, setSelectedCountry, availableCountries, 
    selectedGroup, setSelectedGroup, availableGroups, 
    days, setDays, handleExport, setIsAddAccountOpen 
  } = props;

  return (
    <div className="flex flex-col md:flex-row items-start md:items-center justify-between bg-white p-6 rounded-xl shadow-sm border border-slate-100 gap-4">
      <div>
         <h2 className="text-2xl font-bold tracking-tight text-slate-900">
           {type === 'internal' ? '内部核心号概览' : type === 'external' ? '外部监测账号概览' : '全局总览数据'}
         </h2>
         <p className="text-slate-500 text-sm mt-1">洞察商品链接与受众走势数据大盘</p>
      </div>
      
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center bg-slate-50 border border-slate-200 rounded-md shrink-0">
           <Select value={selectedCountry} onValueChange={setSelectedCountry}>
             <SelectTrigger className="w-auto min-w-[120px] bg-transparent border-none shadow-none focus:ring-0 text-slate-700 font-medium whitespace-nowrap">
               <div className="flex items-center gap-1.5 whitespace-nowrap">
                 <Globe size={14} className="text-slate-400 shrink-0"/>
                 <SelectValue placeholder="筛选国家" />
               </div>
             </SelectTrigger>
             <SelectContent>
               <SelectItem value="all">所有国家</SelectItem>
               {availableCountries.map((c: string) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
             </SelectContent>
           </Select>
           <div className="w-px h-6 bg-slate-200 shrink-0"></div>
           <Select value={selectedGroup} onValueChange={setSelectedGroup}>
             <SelectTrigger className="w-auto min-w-[130px] bg-transparent border-none shadow-none focus:ring-0 text-slate-700 font-medium whitespace-nowrap">
               <div className="flex items-center gap-1.5 whitespace-nowrap">
                 <Folder size={14} className="text-slate-400 shrink-0"/>
                 <SelectValue placeholder="全局图表分组" />
               </div>
             </SelectTrigger>
             <SelectContent>
               <SelectItem value="all">所有账号组</SelectItem>
               {availableGroups.map((g: string) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
             </SelectContent>
           </Select>
        </div>

        <Select value={days.toString()} onValueChange={(v) => setDays(parseInt(v))}>
          <SelectTrigger className="w-auto min-w-[110px] bg-white shrink-0 whitespace-nowrap"><SelectValue placeholder="数据范围" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7">近 7 天</SelectItem><SelectItem value="30">近 30 天</SelectItem>
            <SelectItem value="90">近 90 天</SelectItem><SelectItem value="0">全部时间</SelectItem>
          </SelectContent>
        </Select>

        <Button onClick={handleExport} variant="outline" className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 shrink-0 whitespace-nowrap">
          <Download size={16} className="mr-1.5" /> 全量导出
        </Button>

        <Button onClick={() => setIsAddAccountOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 shrink-0 whitespace-nowrap">
          <Plus size={16} className="mr-1.5" /> 录入新账号
        </Button>
      </div>
    </div>
  );
}