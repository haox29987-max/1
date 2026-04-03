import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input'; 
import { Search, ArrowUp, ArrowDown, Download, RefreshCw, X } from 'lucide-react';

export default function DashboardFilterBar(props: any) {
  const {
    filteredAndSortedAccounts, isMultiSelect, setIsMultiSelect, setSelectedAccountIds,
    searchQuery, setSearchQuery, listGroupFilter, setListGroupFilter, availableGroups,
    listCountryFilter, setListCountryFilter, availableCountries, accountSortBy, setAccountSortBy,
    listSortOrder, setListSortOrder, handleGroupExport, handleRefreshFiltered
  } = props;

  return (
    <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
      <div>
        <h3 className="text-xl font-bold text-slate-900">监测账号管理列表</h3>
        <p className="text-sm text-slate-500 mt-1">目前共收录 {filteredAndSortedAccounts.length} 个记录</p>
      </div>
      
      <div className="flex flex-wrap items-center gap-2">
         <Button 
           variant={isMultiSelect ? "default" : "outline"}
           size="sm" 
           onClick={() => { setIsMultiSelect(!isMultiSelect); setSelectedAccountIds(new Set()); }} 
           className={`h-9 ${isMultiSelect ? 'bg-indigo-600 hover:bg-indigo-700 shadow-md' : 'border-slate-300'}`}
         >
           {isMultiSelect ? '退出批量选择' : '批量管理'}
         </Button>
         <div className="w-px h-6 bg-slate-200 shrink-0 mx-1"></div>

         <div className="relative">
           <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
           <Input 
             placeholder="搜索作者或机构名..." 
             value={searchQuery}
             onChange={e => setSearchQuery(e.target.value)}
             className="w-40 sm:w-48 h-9 pl-8 pr-8 text-sm"
           />
           {searchQuery && (
             <X 
               className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer hover:text-slate-600 transition-colors" 
               size={14} 
               onClick={() => setSearchQuery('')} 
             />
           )}
         </div>

         <Select value={listGroupFilter} onValueChange={setListGroupFilter}>
           <SelectTrigger className="w-auto min-w-[100px] bg-white h-9 font-medium"><SelectValue placeholder="列表分组" /></SelectTrigger>
           <SelectContent>
             <SelectItem value="all" className="whitespace-nowrap">所有列表账号</SelectItem>
             {availableGroups.map((g: string) => <SelectItem key={g} value={g} className="whitespace-nowrap">{g}</SelectItem>)}
           </SelectContent>
         </Select>

         <Select value={listCountryFilter} onValueChange={setListCountryFilter}>
           <SelectTrigger className="w-auto min-w-[90px] bg-white h-9 font-medium"><SelectValue placeholder="国家" /></SelectTrigger>
           <SelectContent>
             <SelectItem value="all" className="whitespace-nowrap">所有国家</SelectItem>
             {availableCountries.map((c: string) => <SelectItem key={c} value={c} className="whitespace-nowrap">{c}</SelectItem>)}
           </SelectContent>
         </Select>
         
         <Select value={accountSortBy} onValueChange={(v: any) => setAccountSortBy(v)}>
           <SelectTrigger className="w-[140px] bg-white h-9 font-medium"><SelectValue placeholder="默认排序" /></SelectTrigger>
           <SelectContent>
             <SelectItem value="default">默认排列</SelectItem>
             <SelectItem value="video_count">发布视频数量</SelectItem>
             <SelectItem value="follower_count">粉丝数</SelectItem>
             <SelectItem value="reg_time">入驻时间</SelectItem>
           </SelectContent>
         </Select>

         <Button variant="outline" size="icon" className="h-9 w-9 bg-white shrink-0 ml-1" onClick={() => setListSortOrder(listSortOrder === 'asc' ? 'desc' : 'asc')}>
           {listSortOrder === 'asc' ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
         </Button>
         <Button variant="outline" size="sm" onClick={handleGroupExport} className="h-9 ml-2 bg-white"><Download size={14} className="mr-1.5" /> 导出本列表</Button>

         <Button variant="outline" size="sm" onClick={handleRefreshFiltered} className="h-9 ml-2 text-emerald-600 border-emerald-200 hover:bg-emerald-50 bg-white">
           <RefreshCw size={14} className="mr-1.5" /> 更新当前列表
         </Button>
      </div>
    </div>
  );
}