import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/api';
import { Loader2 } from 'lucide-react';

export function AddAccountDialog({ onAdded }: { onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [usernames, setUsernames] = useState('');
  const [type, setType] = useState('external');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const list = usernames.split('\n').map(u => u.trim()).filter(Boolean);
    if (list.length === 0) return;
    
    setLoading(true);
    let successCount = 0;
    const failedList: string[] = [];

    for (const u of list) {
      try {
        await api.addAccount(u, type);
        successCount++;
      } catch (error) {
        failedList.push(u);
      }
    }
    
    setLoading(false);

    if (failedList.length > 0) {
      alert(`成功添加 ${successCount} 个，失败 ${failedList.length} 个 (已为您留在输入框内重试)。`);
      setUsernames(failedList.join('\n'));
      if (successCount > 0) onAdded();
    } else {
      alert(`全部 ${successCount} 个账号添加成功！`);
      onAdded();
      setOpen(false);
      setUsernames('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">
          + 添加账号
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>添加新账号 (支持批量录入)</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="usernames" className="text-right mt-2">
              用户名<br/><span className="text-xs font-normal text-slate-400">一行一个</span>
            </Label>
            <textarea
              id="usernames"
              value={usernames}
              onChange={(e) => setUsernames(e.target.value)}
              className="col-span-3 flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="tiktok_user_id1&#10;tiktok_user_id2&#10;..."
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="type" className="text-right">
              类型
            </Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="选择类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="internal">员工内部账号</SelectItem>
                <SelectItem value="external">外部监测账号</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end mt-4">
            <Button type="submit" disabled={loading || !usernames.trim()}>
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin"/>录入中...</> : '确认添加'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}