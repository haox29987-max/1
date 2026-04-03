import React from 'react';
import { Button } from '@/components/ui/button';

interface BatchActionBarProps {
  selectedCount: number;
  onClear: () => void;
  onSelectAll: () => void; // 新增全选方法
  onBatchRefresh: () => void; // 新增批量更新方法
  onBatchGroupOpen: () => void;
  onBatchRemoveGroup: () => void;
  onBatchDelete: () => void;
  onExit: () => void;
}

export default function BatchActionBar({ selectedCount, onClear, onSelectAll, onBatchRefresh, onBatchGroupOpen, onBatchRemoveGroup, onBatchDelete, onExit }: BatchActionBarProps) {
  return (
    <div className="fixed bottom-0 left-[16rem] right-0 z-50 bg-white border-t border-slate-200 p-4 shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.15)] flex items-center justify-between px-8 animate-in slide-in-from-bottom-full duration-300">
      <div className="flex items-center gap-4">
        <span className="font-bold text-slate-800 text-lg">已选择 <span className="text-indigo-600">{selectedCount}</span> 个账号</span>
        {/* 新增的全选按钮 */}
        <Button variant="outline" size="sm" className="text-indigo-600 border-indigo-200 hover:bg-indigo-50" onClick={onSelectAll}>
          全选当前列表
        </Button>
        <Button variant="ghost" size="sm" className="text-slate-500" onClick={onClear}>清空选择</Button>
      </div>
      <div className="flex items-center gap-3">
        {/* 新增批量更新按钮 */}
        <Button onClick={onBatchRefresh} className="bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm">批量更新数据</Button>
        <div className="w-px h-6 bg-slate-200 mx-1"></div>
        <Button onClick={onBatchGroupOpen} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm">批量修改属性(分组/国家/机构/时间)</Button>
        <Button variant="outline" onClick={onBatchRemoveGroup} className="border-indigo-200 text-indigo-700 hover:bg-indigo-50">批量移除分组</Button>
        <div className="w-px h-6 bg-slate-200 mx-2"></div>
        <Button variant="destructive" onClick={onBatchDelete} className="bg-red-500 hover:bg-red-600 shadow-sm">批量移入回收站</Button>
        <Button variant="ghost" onClick={onExit} className="ml-2 font-bold text-slate-500">退出</Button>
      </div>
    </div>
  );
}