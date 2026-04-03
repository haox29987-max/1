import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowUp } from 'lucide-react';

import AccountProfileHeader from './AccountDetailComponents/AccountProfileHeader';
import AccountCharts from './AccountDetailComponents/AccountCharts';
import AccountVideoList from './AccountDetailComponents/AccountVideoList';
import AccountDetailModals from './AccountDetailComponents/AccountDetailModals';
import { useAccountDetailLogic } from './AccountDetailHooks/useAccountDetailLogic';

export function AccountDetail() {
  const { id } = useParams<{ id: string }>();
  // 1. 全部交给自定义 Hook 处理
  const state = useAccountDetailLogic(id);

  // 2. 加载状态控制
  if (state.loading && !state.data) {
    return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-indigo-500" /></div>;
  }
  if (!state.data) {
    return <div className="p-12 text-center">未找到账号，可能是数据还未完成抓取。</div>;
  }

  const { account, snapshots, play_trend } = state.data;

  // 3. 极其清爽的布局排版
  return (
    <div className="space-y-8 relative">
      <AccountProfileHeader 
        account={account} snapshots={snapshots} latestVideoTime={state.latestVideoTime}
        days={state.days} setDays={state.setDays} updateLimit={state.updateLimit} setUpdateLimit={state.setUpdateLimit}
        handleRefresh={state.handleRefresh} isWorking={state.isWorking} progress={state.progress} 
        handleExport={state.handleExport} openFollowerTrend={state.openFollowerTrend} timeSince={state.timeSince}
      />

      <AccountCharts 
        top10Trends={state.top10Trends} play_trend={play_trend} isTop10Loading={state.isTop10Loading}
        sortedActiveTrendVids={state.sortedActiveTrendVids} globalVideoIndexMap={state.globalVideoIndexMap}
        TOPTEN_COLORS={state.TOPTEN_COLORS} hiddenLines={state.hiddenLines} handleLegendClick={state.handleLegendClick}
        openEnlargedChart={state.openEnlargedChart} handlePlayTrendClick={state.handlePlayTrendClick}
      />

      {/* 🚀 注入了全新的 retryingFailed 与 handleRetryFailedVideos 属性 */}
      <AccountVideoList 
        data={state.data} sortedVideos={state.sortedVideos} account={account} pinnedVideos={state.pinnedVideos}
        activeTrendVids={state.activeTrendVids} globalVideoIndexMap={state.globalVideoIndexMap} sortKey={state.sortKey} sortOrder={state.sortOrder}
        setSortKey={state.setSortKey} setSortOrder={state.setSortOrder} setIsManualSort={state.setIsManualSort} sortOptions={state.sortOptions}
        newVideoUrl={state.newVideoUrl} setNewVideoUrl={state.setNewVideoUrl} addingVideo={state.addingVideo} handleAddManualVideo={state.handleAddManualVideo}
        handleToggleTrendVid={state.handleToggleTrendVid} handlePidClick={state.handlePidClick} handleOpenVideoTrend={state.handleOpenVideoTrend}
        handleSingleRefresh={state.handleSingleRefresh} refreshingVideos={state.refreshingVideos} handleDeleteVideo={state.handleDeleteVideo}
        retryingFailed={state.retryingFailed} handleRetryFailedVideos={state.handleRetryFailedVideos}
      />

      <AccountDetailModals 
        productModal={state.productModal} setProductModal={state.setProductModal} currentImgIndex={state.currentImgIndex} setCurrentImgIndex={state.setCurrentImgIndex}
        enlargedChartType={state.enlargedChartType} setEnlargedChartType={state.setEnlargedChartType} zoomScale={state.zoomScale} setZoomScale={state.setZoomScale}
        isEnlargedChartRendering={state.isEnlargedChartRendering} top10Trends={state.top10Trends} play_trend={play_trend} sortedActiveTrendVids={state.sortedActiveTrendVids}
        globalVideoIndexMap={state.globalVideoIndexMap} TOPTEN_COLORS={state.TOPTEN_COLORS} hiddenLines={state.hiddenLines} handleLegendClick={state.handleLegendClick} handlePlayTrendClick={state.handlePlayTrendClick}
        videoListModal={state.videoListModal} setVideoListModal={state.setVideoListModal} modalSortKey={state.modalSortKey} setModalSortKey={state.setModalSortKey} modalSortOrder={state.modalSortOrder} setModalSortOrder={state.setModalSortOrder} sortOptions={state.sortOptions} sortedModalVideos={state.sortedModalVideos}
        account={account} handlePidClick={state.handlePidClick} handleOpenVideoTrend={state.handleOpenVideoTrend} videoTrendModal={state.videoTrendModal} setVideoTrendModal={state.setVideoTrendModal}
        trendDays={state.trendDays} isTrendLoading={state.isTrendLoading} followerTrendModal={state.followerTrendModal} setFollowerTrendModal={state.setFollowerTrendModal}
        days={state.days} setDays={state.setDays} isFollowerChartRendering={state.isFollowerChartRendering} data={state.data} scrollToVideoCard={state.scrollToVideoCard}
      />
      
      {state.showScrollTop && (
        <Button onClick={state.scrollToTop} className="fixed bottom-8 right-8 rounded-full w-14 h-14 shadow-2xl bg-slate-900 hover:bg-black text-white z-50 transition-all hover:-translate-y-2 flex items-center justify-center p-0" size="icon">
          <ArrowUp size={28} strokeWidth={3}/>
        </Button>
      )}
    </div>
  );
}