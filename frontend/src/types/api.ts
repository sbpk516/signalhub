// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  timestamp: string;
}

// File Upload Types
export interface FileUploadRequest {
  file: File;
  metadata?: {
    description?: string;
    tags?: string[];
    priority?: 'low' | 'medium' | 'high';
  };
}

export interface FileUploadResponse {
  call_id: string;
  file_path: string;
  file_size: number;
  file_type: string;
  upload_status: 'uploaded' | 'processing' | 'completed' | 'failed';
  created_at: string;
}

// Audio Processing Types
export interface AudioAnalysis {
  duration: number;
  sample_rate: number;
  channels: number;
  format: string;
  bit_rate?: number;
  segments?: AudioSegment[];
}

export interface AudioSegment {
  start_time: number;
  end_time: number;
  duration: number;
  confidence: number;
}

// Transcription Types
export interface TranscriptionResult {
  transcription_text: string;
  confidence: number;
  language: string;
  segments: TranscriptionSegment[];
  processing_time: number;
}

export interface TranscriptionSegment {
  start: number;
  end: number;
  text: string;
  confidence: number;
}

// NLP Analysis Types
export interface NLPAnalysis {
  intent: {
    detected: string;
    confidence: number;
    alternatives?: string[];
  };
  sentiment: {
    overall: 'positive' | 'negative' | 'neutral';
    score: number; // -100 to 100
    details: {
      positive: number;
      negative: number;
      neutral: number;
    };
  };
  risk: {
    escalation_risk: 'low' | 'medium' | 'high' | 'critical';
    risk_score: number; // 0 to 100
    factors: string[];
  };
  keywords: string[];
  topics: string[];
  urgency_level: 'low' | 'medium' | 'high' | 'critical';
  compliance_risk: 'none' | 'low' | 'medium' | 'high';
}

// Pipeline Types
export interface PipelineStatus {
  call_id: string;
  status: 'pending' | 'uploading' | 'processing' | 'transcribing' | 'analyzing' | 'completed' | 'failed';
  current_step: string;
  progress: number; // 0 to 100
  steps: PipelineStep[];
  created_at: string;
  updated_at: string;
}

export interface PipelineStep {
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  start_time?: string;
  end_time?: string;
  duration?: number;
  error?: string;
  result?: any;
}

export interface PipelineResult {
  call_id: string;
  status: 'completed' | 'failed';
  file_info: FileUploadResponse;
  audio_analysis: AudioAnalysis;
  transcription: TranscriptionResult;
  nlp_analysis: NLPAnalysis;
  processing_time: number;
  created_at: string;
}

// Database Types
export interface CallRecord {
  id: string;
  call_id: string;
  file_path: string;
  file_size: number;
  file_type: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface TranscriptRecord {
  id: string;
  call_id: string;
  transcription_text: string;
  confidence: number;
  language: string;
  created_at: string;
}

export interface AnalysisRecord {
  id: string;
  call_id: string;
  intent: string;
  intent_confidence: number;
  sentiment: string;
  sentiment_score: number;
  escalation_risk: string;
  risk_score: number;
  keywords: string;
  topics: string;
  urgency_level: string;
  compliance_risk: string;
  created_at: string;
}

// Error Types
export interface ApiError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

// Monitoring Types
export interface SystemMetrics {
  cpu_usage: number;
  memory_usage: number;
  disk_usage: number;
  active_connections: number;
  timestamp: string;
}

export interface PerformanceMetrics {
  average_processing_time: number;
  requests_per_minute: number;
  error_rate: number;
  success_rate: number;
  timestamp: string;
}

// Component Props Types
export interface FileUploadProps {
  onUpload: (file: File) => void;
  onProgress?: (progress: number) => void;
  onError?: (error: string) => void;
  accept?: string;
  maxSize?: number; // in bytes
  disabled?: boolean;
}

export interface PipelineStatusProps {
  status: PipelineStatus;
  onRefresh?: () => void;
  showDetails?: boolean;
}

export interface AnalysisResultsProps {
  analysis: NLPAnalysis;
  transcription: TranscriptionResult;
  audioAnalysis: AudioAnalysis;
}

// Hook Types
export interface UseApiOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: ApiError) => void;
  onLoading?: (loading: boolean) => void;
}

export interface UseFileUploadOptions {
  onProgress?: (progress: number) => void;
  onSuccess?: (result: FileUploadResponse) => void;
  onError?: (error: string) => void;
}

// Utility Types
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export type FileType = 'audio/wav' | 'audio/mp3' | 'audio/m4a' | 'audio/aiff';

export type Priority = 'low' | 'medium' | 'high';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export type Sentiment = 'positive' | 'negative' | 'neutral';
