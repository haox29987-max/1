import { Loader2, User, ArrowUp } from 'lucide-react'; 
import { Button } from '@/components/ui/button';

import DashboardCharts from './DashboardComponents/DashboardCharts';
import AccountCard from './DashboardComponents/AccountCard';
import BatchActionBar from './DashboardComponents/BatchActionBar';
import DashboardModals from './DashboardComponents/DashboardModals';
import DashboardHeader from './DashboardComponents/DashboardHeader';
import DashboardFilterBar from './DashboardComponents/DashboardFilterBar';
import { useDashboardLogic } from './DashboardHooks/useDashboardLogic';

export function Dashboard({ type }: { type?: string }) {
  const state = useDashboardLogic(type);

  if (state.loading && !state.stats) {
    return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-indigo-500" /></div>;
  }

  return (
    <div className="space-y-8 relative">
      <div className="space-y-6">
        <DashboardHeader {...state} />
        <DashboardCharts stats={state.stats} selectedCountry={state.selectedCountry} selectedGroup={state.selectedGroup} handleChartClick={state.handleChartClick} />
      </div>

      <div className="pt-8 border-t border-slate-200">
        <DashboardFilterBar {...state} />

        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {state.filteredAndSortedAccounts.length === 0 ? (
            <div className="col-span-full py-16 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
              <User size={40} className="text-slate-300 mb-3" />
              <p className="text-slate-500 font-medium">当前条件分类下没有查找到任何账号</p>
              <Button onClick={() => state.setIsAddAccountOpen(true)} variant="outline" className="mt-4">立即添加</Button>
            </div>
          ) : (
            state.filteredAndSortedAccounts.map(account => (
              <AccountCard 
                key={`${account.id}-${account.custom_name}-${account.group_name}-${account.country}-${account.mcn}`} 
                account={account} 
                prog={state.progressMap[account.id.toString()]} 
                isMultiSelect={state.isMultiSelect} 
                isSelected={state.selectedAccountIds.has(account.id)}
                onToggleSelect={state.toggleSelection}
                onTogglePin={state.handleTogglePin} 
                onEdit={(acc: any) => { 
                  state.setEditAccount(acc); 
                  state.setEditCustomName(acc.custom_name || ''); 
                  state.setEditGroupName(acc.group_name || ''); 
                  state.setEditCountry(acc.country || ''); 
                  state.setEditMcn(acc.mcn || '');
                  state.setEditCreatedAt(acc.created_at || '');
                  state.setEditDevice(acc.device || '');
                  state.setEditAutoUpdate(acc.auto_update ?? 1);
                }}
                onNavigateDetail={state.navigateToDetail}
                onDeleteAccount={state.handleDeleteAccount}
              />
            ))
          )}
        </div>
      </div>

      {state.isMultiSelect && (
        <BatchActionBar 
          selectedCount={state.selectedAccountIds.size} 
          onClear={() => state.setSelectedAccountIds(new Set())}
          onSelectAll={state.handleSelectAll}
          onBatchRefresh={state.handleBatchRefresh} 
          onBatchGroupOpen={() => { if(state.selectedAccountIds.size === 0) return alert('请先选择账号'); state.setBatchMetaModalOpen(true); }}
          onBatchRemoveGroup={state.handleBatchRemoveGroup}
          onBatchDelete={state.handleBatchDelete}
          onExit={() => { state.setIsMultiSelect(false); state.setSelectedAccountIds(new Set()); }}
        />
      )}

      <DashboardModals 
        editAccount={state.editAccount} setEditAccount={state.setEditAccount}
        editCustomName={state.editCustomName} setEditCustomName={state.setEditCustomName}
        editGroupName={state.editGroupName} setEditGroupName={state.setEditGroupName}
        editCountry={state.editCountry} setEditCountry={state.setEditCountry}
        editMcn={state.editMcn} setEditMcn={state.setEditMcn}
        editCreatedAt={state.editCreatedAt} setEditCreatedAt={state.setEditCreatedAt}
        editDevice={state.editDevice} setEditDevice={state.setEditDevice}
        editAutoUpdate={state.editAutoUpdate} setEditAutoUpdate={state.setEditAutoUpdate}
        handleSaveAccountMeta={state.handleSaveAccountMeta}
        batchMetaModalOpen={state.batchMetaModalOpen} setBatchMetaModalOpen={state.setBatchMetaModalOpen}
        batchTargetGroup={state.batchTargetGroup} setBatchTargetGroup={state.setBatchTargetGroup}
        batchTargetCountry={state.batchTargetCountry} setBatchTargetCountry={state.setBatchTargetCountry}
        batchTargetMcn={state.batchTargetMcn} setBatchTargetMcn={state.setBatchTargetMcn}
        batchTargetCreatedAt={state.batchTargetCreatedAt} setBatchTargetCreatedAt={state.setBatchTargetCreatedAt}
        handleBatchUpdateMeta={state.handleBatchUpdateMeta}
        selectedAccountIdsSize={state.selectedAccountIds.size}
        isAddAccountOpen={state.isAddAccountOpen} setIsAddAccountOpen={state.setIsAddAccountOpen}
        newAccountUrl={state.newAccountUrl} setNewAccountUrl={state.setNewAccountUrl}
        addingAccount={state.addingAccount} handleAddAccount={state.handleAddAccount}
        videoListModal={state.videoListModal} setVideoListModal={state.setVideoListModal}
        sortedModalVideos={state.sortedModalVideos}
        modalSortKey={state.modalSortKey} setModalSortKey={state.setModalSortKey}
        modalSortOrder={state.modalSortOrder} setModalSortOrder={state.setModalSortOrder}
        sortOptions={state.sortOptions}
        productLoading={state.productLoading} productInfo={state.productInfo}
        currentImgIndex={state.currentImgIndex} setCurrentImgIndex={state.setCurrentImgIndex}
        activePid={state.activePid} copyPid={state.copyPid}
        isImageFullScreen={state.isImageFullScreen} setIsImageFullScreen={state.setIsImageFullScreen}
        activeTab={state.activeTab} setActiveTab={state.setActiveTab}
        tabcutVideos={state.tabcutVideos} tabcutTotal={state.tabcutTotal}
        tabcutPage={state.tabcutPage} tabcutLoading={state.tabcutLoading}
        handleTabcutPageChange={state.handleTabcutPageChange}
        tabcutSortKey={state.tabcutSortKey} setTabcutSortKey={state.setTabcutSortKey}
        tabcutSortOrder={state.tabcutSortOrder} setTabcutSortOrder={state.setTabcutSortOrder}
        tabcutDays={state.tabcutDays} setTabcutDays={state.setTabcutDays} 
      />
      
      {state.showScrollTop && (
        <Button 
          onClick={state.scrollToTop} 
          className={`fixed right-8 rounded-full w-12 h-12 shadow-2xl bg-indigo-600 hover:bg-indigo-700 text-white z-50 transition-all hover:-translate-y-1 ${state.isMultiSelect ? 'bottom-[90px]' : 'bottom-8'}`} 
          size="icon" title="回到顶部"
        >
          <ArrowUp size={24} />
        </Button>
      )}
    </div>
  );
}