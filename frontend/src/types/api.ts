// Simplified API Types for Upload Functionality
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  timestamp: string;
}

export interface FileUploadResponse {
  call_id: string;
  file_path: string;
  file_size: number;
  file_type: string;
  upload_status: 'uploaded' | 'processing' | 'completed' | 'failed';
  created_at: string;
}

export interface PipelineStatus {
  call_id: string;
  status: 'pending' | 'uploading' | 'processing' | 'transcribing' | 'analyzing' | 'completed' | 'failed';
  current_step: string;
  progress: number;
  created_at: string;
  updated_at: string;
}

// API Types for Results Functionality
export interface AudioAnalysis {
  duration: number;
  sample_rate?: number;
  channels?: number;
  format?: string;
}

export interface TranscriptionResult {
  transcription_text: string;
  confidence: number;
  language: string;
  processing_time?: number;
}

export interface NLPAnalysis {
  intent: { detected: string; confidence?: number; };
  sentiment: { overall: 'positive' | 'negative' | 'neutral'; score?: number; };
  risk?: { escalation_risk: 'low' | 'medium' | 'high' | 'critical'; risk_score?: number; };
  keywords?: string[];
  topics?: string[];
}

export interface ResultsFilters {
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  searchQuery?: string;
  limit?: number;
  offset?: number;
}

export interface PipelineResult {
  call_id: string;
  status: 'completed' | 'failed' | 'uploaded' | 'processing';
  file_info: {
    file_path: string;
    file_size: number;
    original_filename?: string;
    file_type?: string;
  };
  audio_analysis: AudioAnalysis;
  transcription?: TranscriptionResult;
  nlp_analysis?: NLPAnalysis;
  processing_time?: number;
  created_at: string;
}
