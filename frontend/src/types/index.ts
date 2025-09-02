// 用户相关类型
export interface User {
  id: string;
  email?: string;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  user_id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone_number?: string;
  location?: string;
  website?: string;
  linkedin_url?: string;
  github_url?: string;
  work_experience?: any[];
  education?: any[];
  skills?: any[];
  projects?: any[];
  certifications?: any[];
  qa?: any;
  created_at: string;
  updated_at: string;
}

// 注意：Job相关类型已移至 lib/jobs.ts 文件中

// 简历相关类型
export interface Resume {
  id: string;
  user_id: string;
  parent_id?: string;
  is_base_resume?: boolean;
  name: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone_number?: string;
  location?: string;
  website?: string;
  linkedin_url?: string;
  github_url?: string;
  professional_summary?: string;
  work_experience?: any[];
  education?: any[];
  skills?: any[];
  projects?: any[];
  certifications?: any[];
  section_order?: string[];
  section_configs?: any;
  resume_title?: string;
  target_role?: string;
  document_settings?: any;
  others?: any[];
  created_at: string;
  updated_at: string;
}

// API 响应类型
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

// 认证相关类型
export interface AuthState {
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

// Agent 任务相关类型
export interface SearchCriteria {
  position: string;
  keywords: string[];
  location: string;
  salary_min?: number;
  salary_max?: number;
  employment_type: string[];
  work_arrangement: string[];
}

export interface MatchingConfig {
  matching_threshold: number;
  max_jobs_to_return: number;
}

export interface Filters {
  company_blacklist: string[];
  experience_level: string[];
  exclude_recruitment_agencies: boolean;
}

export interface TargetConfig {
  primary_site: string;
}

export interface Metadata {
  user_timezone: string;
  request_timestamp: string;
}

export interface JobSearchTaskRequest {
  task_type: string;
  user_id: string;
  resume_id: string;
  target_config: TargetConfig;
  search_criteria: SearchCriteria;
  matching_config: MatchingConfig;
  filters: Filters;
  metadata: Metadata;
}

export interface TaskStartResponse {
  task_id: string;
  status: string;
  message: string;
}

export interface ExecutionSummary {
  jobs_viewed: number;
  jobs_found_matching: number;
  execution_time_seconds: number;
}

export interface ResultsPreview {
  best_match: Record<string, string>;
}

export interface TaskCompletionNotification {
  task_id: string;
  user_id: string;
  status: string;
  execution_summary: ExecutionSummary;
  results_preview: ResultsPreview;
}

export interface TaskStatusResponse {
  task_id: string;
  status: string;
  progress_percentage?: number;
  current_activity?: string;
  execution_result?: any;
  error_message?: string;
  started_at?: string;
  completed_at?: string;
}

export interface AgentTask {
  id: string;
  user_id: string;
  task_type: string;
  task_description: string;
  status: string;
  task_instructions?: any;
  execution_result?: any;
  other_message?: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface TaskListResponse {
  tasks: AgentTask[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface AgentStats {
  total_tasks: number;
  pending_tasks: number;
  running_tasks: number;
  completed_tasks: number;
  failed_tasks: number;
  cancelled_tasks: number;
  success_rate: number;
}

// 智能浏览器任务相关类型
export interface BrowserTaskRequest {
  // 基础任务参数
  task: string;
  url?: string;
  
  // 执行控制参数
  max_steps?: number;
  use_vision?: boolean;
  max_actions_per_step?: number;
  
  // LLM 模型参数
  model_provider?: string;
  model_name?: string;
  temperature?: number;
  
  // 浏览器配置参数
  headless?: boolean;
  viewport_width?: number;
  viewport_height?: number;
  chrome_path?: string;
  disable_security?: boolean;
  device_scale_factor?: number;
  no_viewport?: boolean;
  window_position_x?: number;
  window_position_y?: number;
  channel?: string;
  devtools?: boolean;
  slow_mo?: number;
  chromium_sandbox?: boolean;
  keep_alive?: boolean;
  enable_default_extensions?: boolean;
  deterministic_rendering?: boolean;
  cross_origin_iframes?: boolean;
  highlight_elements?: boolean;
  
  // 网络和代理参数
  proxy_server?: string;
  proxy_bypass?: string;
  proxy_username?: string;
  proxy_password?: string;
  user_agent?: string;
  ignore_https_errors?: boolean;
  extra_http_headers?: Record<string, string>;
  
  // 录制和追踪参数
  save_recording?: boolean;
  recording_path?: string;
  enable_trace?: boolean;
  trace_path?: string;
  save_screenshots?: boolean;
  record_har_path?: string;
  record_har_mode?: 'full' | 'minimal';
  record_har_content?: 'embed' | 'omit' | 'attach';
  
  // 高级配置参数
  cookies_file?: string;
  extra_chromium_args?: string[];
  wss_url?: string;
  downloads_path?: string;
  accept_downloads?: boolean;
  allowed_domains?: string[];
  service_workers?: 'allow' | 'block';
  locale?: string;
  timezone_id?: string;
}

export interface DetailedStepInfo {
  step_number: number;
  action: string;
  reasoning?: string;
  success: boolean;
  error?: string;
  execution_time?: number;
}

export interface BrowserTaskResult {
  success: boolean;
  result?: string;
  error?: string;
  mode: string;
  steps?: DetailedStepInfo[];
  total_steps?: number;
  execution_time?: number;
  model_used?: string;
  config_used?: Record<string, any>;
  recording_file?: string;
  trace_file?: string;
  screenshots?: string[];
  final_url?: string;
  final_title?: string;
  cookies_saved?: string;
}

export interface AgentStatusResponse {
  service: string;
  version: string;
  intelligent_features: {
    available: boolean;
    deepseek_api_key: string;
    openai_api_key: string;
    anthropic_api_key: string;
  };
  supported_models: {
    deepseek: string[];
    openai: string[];
    anthropic: string[];
    ollama: string[];
    azure: string[];
  };
  endpoints: Record<string, string>;
  total_parameters: number;
}

// Task管理相关类型
export interface SeekScraperRequest {
  job_titles: string[];
  location: string;
  job_required: number;
  task_description?: string;
}

export interface SeekScraperResponse {
  task_id: string;
  message: string;
  jobs_found: number;
  status: string;
}

export interface AgentFoundJob {
  id: string;
  agent_task_id?: string;
  user_id: string;
  title: string;
  company: string;
  location?: string;
  salary?: string;
  job_url?: string;
  work_type?: string;
  detailed_description?: string;
  application_status: string;
  source_platform?: string;
  match_score?: number;
  ai_analysis?: any;
  saved: boolean;
  created_at: string;
  updated_at: string;
}

export interface AgentTaskResponse {
  id: string;
  user_id: string;
  task_type: string;
  task_description: string;
  status: string;
  task_instructions?: any;
  execution_result?: any;
  other_message?: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
  execution_count: number;
  last_execution_at?: string;
  next_execution_at?: string;
  is_active: boolean;
}

// Resume Job Matching 相关类型
export interface ResumeJobMatchingRequest {
  resume_id: string;
  task_id: string;
  ai_model: string;
  task_description?: string;
}

export interface ResumeJobMatchingResponse {
  task_id: string;
  message: string;
  jobs_analyzed: number;
  resume_id: string;
  ai_model: string;
}