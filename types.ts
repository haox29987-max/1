export interface VideoMetadata {
  url: string;
  author: string;
  fans: number | string;
  publish_time: string;
  desc: string;
  music: string;
  category: string;
  sub_tag: string;
  product_id: string;
  stats: {
    play: number;
    digg: number;
    comment: number;
    share: number;
    collect: number;
  };
}

export interface Segment {
  start_str: string;
  end_str: string;
  start_sec: number;
  end_sec: number;
  origin: string;
  trans: string;
  visual: string;
  gif_path: string;
}

export interface AIAnalysis {
  score: string;
  short_summary: string;
  detail_summary: string;
  suggestions: string;
}

export interface AnalysisJob {
  id: string;
  filename: string;
  status: 'pending' | 'scraping' | 'downloading' | 'analyzing' | 'completed' | 'failed';
  progress: number;
  video_rel_path?: string;
  metadata?: VideoMetadata;
  analysis?: AIAnalysis;
  segments?: Segment[];
  error?: string;
  deletedAt?: number; // Timestamp when moved to trash
  url?: string; // 补全 URL 供复制使用
  createdAt?: string; // 更新时间与抓取时间
  videoId?: string;
  title?: string;
  progressText?: string;
  report_url?: string;
}

export interface UserData {
  username: string;
  apiKey?: string;
}

export interface AllowedUser {
  username: string;
  password?: string;
  api_key?: string;
}