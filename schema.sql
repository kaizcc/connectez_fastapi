-- Connectez Database Schema (Updated with Agent Tasks)
-- This file contains all the SQL statements needed to set up the complete Connectez database schema
-- Run this against your PostgreSQL database to create all required tables

-- ========================================
-- 基础设置和函数
-- ========================================

-- First, ensure the UUID extension is available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 用户订阅管理
-- ========================================

-- Subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
  user_id uuid NOT NULL,
  stripe_customer_id text NULL,
  stripe_subscription_id text NULL,
  subscription_plan text NULL DEFAULT 'free'::text,
  subscription_status text NULL,
  current_period_end timestamp with time zone NULL,
  trial_end timestamp with time zone NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  
  -- 约束
  CONSTRAINT subscriptions_pkey PRIMARY KEY (user_id),
  CONSTRAINT subscriptions_user_id_key UNIQUE (user_id),
  CONSTRAINT subscriptions_stripe_subscription_id_key UNIQUE (stripe_subscription_id),
  CONSTRAINT subscriptions_stripe_customer_id_key UNIQUE (stripe_customer_id),
  CONSTRAINT subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users (id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT subscriptions_subscription_plan_check CHECK (
    subscription_plan = ANY (ARRAY['free'::text, 'pro'::text])
  ),
  CONSTRAINT subscriptions_subscription_status_check CHECK (
    (subscription_status IS NULL) OR 
    (subscription_status = ANY (ARRAY['active'::text, 'canceled'::text]))
  )
) TABLESPACE pg_default;

-- 触发器
DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER update_subscriptions_updated_at BEFORE
UPDATE ON subscriptions FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- RLS策略
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY subscriptions_policy ON public.subscriptions
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ========================================
-- 简历管理系统
-- ========================================

-- Resumes table
CREATE TABLE IF NOT EXISTS public.resumes (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  parent_id uuid NULL,
  is_base_resume boolean NULL DEFAULT false,
  name text NOT NULL,
  first_name text NULL,
  last_name text NULL,
  email text NULL,
  phone_number text NULL,
  location text NULL,
  website text NULL,
  linkedin_url text NULL,
  github_url text NULL,
  professional_summary text NULL,
  work_experience jsonb NULL DEFAULT '[]'::jsonb,
  education jsonb NULL DEFAULT '[]'::jsonb,
  skills jsonb NULL DEFAULT '[]'::jsonb,
  projects jsonb NULL DEFAULT '[]'::jsonb,
  certifications jsonb NULL DEFAULT '[]'::jsonb,
  section_order jsonb NULL DEFAULT '["professional_summary", "work_experience", "skills", "projects", "education", "certifications"]'::jsonb,
  section_configs jsonb NULL DEFAULT '{"skills": {"style": "grouped", "visible": true}, "projects": {"visible": true, "max_items": 3}, "education": {"visible": true, "max_items": null}, "certifications": {"visible": true}, "work_experience": {"visible": true, "max_items": null}}'::jsonb,
  resume_title text NULL,
  target_role text NULL,
  document_settings jsonb NULL DEFAULT '{"header_name_size": 24, "skills_margin_top": 2, "document_font_size": 10, "projects_margin_top": 2, "skills_item_spacing": 2, "document_line_height": 1.5, "education_margin_top": 2, "skills_margin_bottom": 2, "experience_margin_top": 2, "projects_item_spacing": 4, "education_item_spacing": 4, "projects_margin_bottom": 2, "education_margin_bottom": 2, "experience_item_spacing": 4, "document_margin_vertical": 36, "experience_margin_bottom": 2, "skills_margin_horizontal": 0, "document_margin_horizontal": 36, "header_name_bottom_spacing": 24, "projects_margin_horizontal": 0, "education_margin_horizontal": 0, "experience_margin_horizontal": 0}'::jsonb,
  others jsonb NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  
  -- 约束
  CONSTRAINT resumes_pkey PRIMARY KEY (id),
  CONSTRAINT resumes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT resumes_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES resumes(id) ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT resumes_parent_id_self_check CHECK (parent_id IS NULL OR parent_id != id)
) TABLESPACE pg_default;

-- 触发器
DROP TRIGGER IF EXISTS update_resumes_updated_at ON public.resumes;
CREATE TRIGGER update_resumes_updated_at BEFORE
UPDATE ON resumes FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 索引
CREATE INDEX IF NOT EXISTS idx_resumes_user_id ON public.resumes(user_id);
CREATE INDEX IF NOT EXISTS idx_resumes_parent_id ON public.resumes(parent_id) WHERE parent_id IS NOT NULL;

-- RLS策略
ALTER TABLE public.resumes ENABLE ROW LEVEL SECURITY;
CREATE POLICY resumes_policy ON public.resumes
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 注释
COMMENT ON COLUMN public.resumes.parent_id IS '父简历ID，用于记录简历的来源简历';
COMMENT ON COLUMN public.resumes.others IS '其他信息，用于存储额外的简历内容';

-- ========================================
-- Agent任务系统
-- ========================================
-- Agent Tasks table (修复语法 + 必要补充)
CREATE TABLE IF NOT EXISTS public.agent_tasks (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL,
    
    -- 任务基本信息
    task_type text NOT NULL,
    task_description text NOT NULL,
    status text NOT NULL DEFAULT 'pending',
    
    -- 统一参数存储
    task_instructions jsonb NULL DEFAULT '{}'::jsonb,
    
    -- 统一结果存储
    execution_result jsonb NULL,
    
    -- 简化的消息字段（用于错误信息等）
    other_message text NULL,
    
    -- 时间记录
    started_at timestamp with time zone NULL,
    completed_at timestamp with time zone NULL,
    created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    
    -- 扩展字段支持循环执行
    is_recurring boolean DEFAULT false,
    recurrence_config jsonb DEFAULT NULL,
    next_execution_at timestamp with time zone DEFAULT NULL,
    last_execution_at timestamp with time zone DEFAULT NULL,
    execution_count integer DEFAULT 0,
    max_executions integer DEFAULT NULL,
    is_active boolean DEFAULT true,
    
    -- 约束
    CONSTRAINT agent_tasks_pkey PRIMARY KEY (id),
    CONSTRAINT agent_tasks_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT agent_tasks_execution_count_check CHECK (execution_count >= 0),
    CONSTRAINT agent_tasks_max_executions_check CHECK (max_executions IS NULL OR max_executions > 0),
    CONSTRAINT agent_tasks_status_check CHECK (
        status = ANY (ARRAY[
            'pending'::text,
            'running'::text,
            'completed'::text,
            'failed'::text,
            'cancelled'::text,
            'paused'::text,
            'scheduled'::text,
            'recurring'::text
        ])
    )
) TABLESPACE pg_default;

-- 必要的索引
CREATE INDEX IF NOT EXISTS idx_agent_tasks_user_status ON public.agent_tasks(user_id, status);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_recurring_execution ON public.agent_tasks(is_recurring, is_active, next_execution_at) WHERE is_recurring = true;

-- updated_at 触发器
DROP TRIGGER IF EXISTS update_agent_tasks_updated_at ON public.agent_tasks;
CREATE TRIGGER update_agent_tasks_updated_at BEFORE
UPDATE ON agent_tasks FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- RLS策略
ALTER TABLE public.agent_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY agent_tasks_policy ON public.agent_tasks
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- 注释
COMMENT ON TABLE public.agent_tasks IS 'AI代理任务执行记录表，支持各种自动化任务类型';
COMMENT ON COLUMN public.agent_tasks.task_instructions IS '任务参数JSON，包含resume_id、search_criteria等所有执行参数';
COMMENT ON COLUMN public.agent_tasks.execution_result IS '任务执行结果JSON，包含找到的工作数量、申请结果等';

-- ========================================
-- 工作管理系统（更新版本，包含Agent支持）
-- ========================================

-- Jobs table (updated with agent support)
CREATE TABLE IF NOT EXISTS public.jobs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  company text NULL,
  description text NULL,
  job_url text NULL,
  resume_id uuid NULL,
  cover_letter jsonb NULL,
  application_status text NOT NULL DEFAULT 'saved',
  applied_at timestamp with time zone NULL,
  notes text NULL,
  source text NULL,
  score integer NULL,
  agent_task_id uuid NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  
  -- 约束
  CONSTRAINT jobs_pkey PRIMARY KEY (id),
  CONSTRAINT jobs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT jobs_resume_id_fkey FOREIGN KEY (resume_id) REFERENCES resumes(id) ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT jobs_agent_task_id_fkey FOREIGN KEY (agent_task_id) REFERENCES agent_tasks(id) ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT jobs_score_check CHECK (score >= 0 AND score <= 100),
  CONSTRAINT jobs_application_status_check CHECK (
    application_status = ANY (ARRAY[
      'saved'::text,
      'draft'::text,
      'applied'::text,
      'interview'::text,
      'rejected'::text,
      'accepted'::text,
      'agent_found'::text,
      'agent_applied'::text
    ])
  )
) TABLESPACE pg_default;

-- 触发器
DROP TRIGGER IF EXISTS update_jobs_updated_at ON public.jobs;
CREATE TRIGGER update_jobs_updated_at BEFORE
UPDATE ON jobs FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 索引
CREATE INDEX IF NOT EXISTS idx_jobs_user_status ON public.jobs(user_id, application_status);
CREATE INDEX IF NOT EXISTS idx_jobs_agent_task_id ON public.jobs(agent_task_id) WHERE agent_task_id IS NOT NULL;

-- RLS策略
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY jobs_policy ON public.jobs
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 注释
COMMENT ON COLUMN public.jobs.source IS '工作来源，记录工作信息的获取渠道';
COMMENT ON COLUMN public.jobs.agent_task_id IS '关联的AI代理任务ID，标识此工作记录来源于哪个agent执行';

-- ========================================
-- 用户档案系统
-- ========================================

-- Profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  user_id uuid NOT NULL,
  first_name text NULL,
  last_name text NULL,
  email text NULL,
  phone_number text NULL,
  location text NULL,
  website text NULL,
  linkedin_url text NULL,
  github_url text NULL,
  work_experience jsonb NULL DEFAULT '[]'::jsonb,
  education jsonb NULL DEFAULT '[]'::jsonb,
  skills jsonb NULL DEFAULT '[]'::jsonb,
  projects jsonb NULL DEFAULT '[]'::jsonb,
  certifications jsonb NULL DEFAULT '[]'::jsonb,
  qa jsonb NULL DEFAULT '{"commonQuestions": {}, "customQuestions": {}, "preferences": {}}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  
  -- 约束
  CONSTRAINT profiles_pkey PRIMARY KEY (user_id),
  CONSTRAINT profiles_user_id_key UNIQUE (user_id),
  CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE CASCADE
) TABLESPACE pg_default;

-- 触发器
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE
UPDATE ON profiles FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 索引
CREATE INDEX IF NOT EXISTS idx_profiles_qa ON public.profiles USING gin (qa);

-- RLS策略
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY profiles_policy ON public.profiles
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ========================================
-- 积分管理系统
-- ========================================

-- User Credits table
CREATE TABLE IF NOT EXISTS public.user_credits (
  user_id uuid NOT NULL,
  credits integer NOT NULL DEFAULT 0,
  total_earned integer NOT NULL DEFAULT 0,
  total_spent integer NOT NULL DEFAULT 0,
  last_monthly_refill timestamp with time zone NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  
  -- 约束
  CONSTRAINT user_credits_pkey PRIMARY KEY (user_id),
  CONSTRAINT user_credits_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT user_credits_non_negative CHECK (credits >= 0)
) TABLESPACE pg_default;

-- 触发器
DROP TRIGGER IF EXISTS update_user_credits_updated_at ON public.user_credits;
CREATE TRIGGER update_user_credits_updated_at BEFORE UPDATE ON user_credits 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS策略
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_credits_policy ON public.user_credits
  USING (user_id = auth.uid()) 
  WITH CHECK (user_id = auth.uid());

-- 注释
COMMENT ON TABLE public.user_credits IS '用户积分余额和统计表';

-- User Credit Usage table
CREATE TABLE IF NOT EXISTS public.user_credit_usage (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  feature_used text NOT NULL,
  credits_spent integer NOT NULL DEFAULT 1,
  reference_id uuid NULL, 
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  
  -- 约束
  CONSTRAINT user_credit_usage_pkey PRIMARY KEY (id),
  CONSTRAINT user_credit_usage_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
) TABLESPACE pg_default;

-- 索引
CREATE INDEX IF NOT EXISTS idx_user_credit_usage_user_feature ON public.user_credit_usage(user_id, feature_used);

-- RLS策略
ALTER TABLE public.user_credit_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_credit_usage_policy ON public.user_credit_usage
  USING (user_id = auth.uid()) 
  WITH CHECK (user_id = auth.uid());

-- 注释
COMMENT ON TABLE public.user_credit_usage IS '用户积分使用记录表';

-- User Activities table
CREATE TABLE IF NOT EXISTS public.user_activities (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  activity_type text NOT NULL,
  activity_key text NOT NULL,
  credits_earned integer DEFAULT 0,
  details jsonb DEFAULT '{}'::jsonb,
  completed_at timestamptz DEFAULT now(),
  
  -- 约束
  CONSTRAINT user_activities_pkey PRIMARY KEY (id),
  CONSTRAINT user_activities_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT user_activities_credits_check CHECK (credits_earned >= 0)
);

-- RLS策略
ALTER TABLE user_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_activities_policy ON user_activities
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 注释
COMMENT ON TABLE public.user_activities IS '用户活动记录表，包含任务完成和积分获得历史';

-- Credit Codes table
CREATE TABLE IF NOT EXISTS public.credit_codes (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  code text NOT NULL,
  credit_amount integer NOT NULL,
  max_uses integer DEFAULT NULL,
  current_uses integer DEFAULT 0,
  expires_at timestamptz DEFAULT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  
  -- 约束
  CONSTRAINT credit_codes_pkey PRIMARY KEY (id),
  CONSTRAINT credit_codes_code_key UNIQUE (code),
  CONSTRAINT credit_codes_credit_amount_check CHECK (credit_amount > 0),
  CONSTRAINT credit_codes_uses_check CHECK (current_uses >= 0)
);

-- RLS策略
ALTER TABLE credit_codes ENABLE ROW LEVEL SECURITY;

-- 注释
COMMENT ON TABLE public.credit_codes IS '积分激活码表，用于发放积分奖励';

-- ========================================
-- AI服务管理
-- ========================================

-- API Keys table
CREATE TABLE IF NOT EXISTS public.api_keys (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  provider text NOT NULL,
  api_key text NOT NULL,
  base_url text NULL,
  model_name text NULL,
  is_pro boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  daily_limit integer NULL,
  daily_usage integer NOT NULL DEFAULT 0,
  priority integer NOT NULL DEFAULT 0,
  last_used_at timestamp with time zone NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  
  -- 约束
  CONSTRAINT api_keys_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;

-- 触发器
DROP TRIGGER IF EXISTS update_api_keys_updated_at ON public.api_keys;
CREATE TRIGGER update_api_keys_updated_at BEFORE UPDATE ON api_keys 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 索引
CREATE INDEX IF NOT EXISTS idx_api_keys_provider_active ON public.api_keys(provider, is_active, priority);

-- RLS策略
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- ========================================
-- 简历评分系统
-- ========================================

-- Resume Scores table
CREATE TABLE IF NOT EXISTS public.resume_scores (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  resume_id uuid NOT NULL,
  job_id uuid NULL,
  score_data jsonb NOT NULL,
  overall_score integer NOT NULL,
  score_version text NOT NULL DEFAULT 'v1',
  ai_model text NULL,
  processing_time_ms integer NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  
  -- 约束
  CONSTRAINT resume_scores_pkey PRIMARY KEY (id),
  CONSTRAINT resume_scores_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT resume_scores_resume_id_fkey FOREIGN KEY (resume_id) REFERENCES resumes(id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT resume_scores_job_id_fkey FOREIGN KEY (job_id) REFERENCES jobs(id) ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT resume_scores_overall_score_check CHECK (overall_score >= 0 AND overall_score <= 100),
  CONSTRAINT resume_scores_processing_time_check CHECK (processing_time_ms >= 0)
) TABLESPACE pg_default;

-- 触发器
DROP TRIGGER IF EXISTS update_resume_scores_updated_at ON public.resume_scores;
CREATE TRIGGER update_resume_scores_updated_at BEFORE
UPDATE ON resume_scores FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 索引
CREATE INDEX IF NOT EXISTS idx_resume_scores_user_resume ON public.resume_scores(user_id, resume_id);

-- RLS策略
ALTER TABLE public.resume_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY resume_scores_policy ON public.resume_scores
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 注释
COMMENT ON TABLE public.resume_scores IS '简历评分历史记录表，存储AI生成的简历分析和评分结果';
COMMENT ON COLUMN public.resume_scores.score_data IS '完整的评分数据，包含所有维度的分析结果';
COMMENT ON COLUMN public.resume_scores.overall_score IS '总体评分(0-100)，便于快速查询和排序';

-- ========================================
-- 表单记录系统
-- ========================================

-- Form Records table
CREATE TABLE IF NOT EXISTS public.form_records (
 id uuid NOT NULL DEFAULT uuid_generate_v4(),
 user_id uuid NOT NULL,
 website_url VARCHAR(500) NOT NULL,
 resume_id uuid NULL,
 form_fields JSONB NOT NULL,
 ai_response JSONB NOT NULL,
 created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
 updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
 
 -- 约束
 CONSTRAINT form_records_pkey PRIMARY KEY (id),
 CONSTRAINT form_records_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE CASCADE,
 CONSTRAINT form_records_resume_id_fkey FOREIGN KEY (resume_id) REFERENCES resumes(id) ON UPDATE CASCADE ON DELETE SET NULL
) TABLESPACE pg_default;

-- 触发器
DROP TRIGGER IF EXISTS update_form_records_updated_at ON public.form_records;
CREATE TRIGGER update_form_records_updated_at BEFORE
UPDATE ON form_records FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 索引
CREATE INDEX IF NOT EXISTS idx_form_records_user_created_at ON form_records(user_id, created_at DESC);

-- RLS策略
ALTER TABLE public.form_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY form_records_policy ON public.form_records
 USING (user_id = auth.uid())
 WITH CHECK (user_id = auth.uid());

 -- ========================================
-- ai found jobs
-- ========================================

CREATE TABLE IF NOT EXISTS public.agent_found_jobs (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    agent_task_id uuid,
    user_id uuid NOT NULL,
    
    -- 工作基本信息
    title text NOT NULL,
    company text NOT NULL,
    location text,
    salary text,
    job_url text NULL,
    work_type text,
    detailed_description text,
    application_status text NOT NULL DEFAULT 'agent_found',
    source_platform text NULL,
    
    -- AI 分析结果
    match_score integer,
    ai_analysis jsonb,
    
    saved boolean DEFAULT false,  -- 添加默认值
    
    created_at timestamptz DEFAULT NOW(),
    updated_at timestamptz DEFAULT NOW(),  -- 补充完整定义
    
    -- 最必要的约束
    CONSTRAINT agent_found_jobs_pkey PRIMARY KEY (id),
    CONSTRAINT agent_found_jobs_user_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT agent_found_jobs_agent_task_fkey FOREIGN KEY (agent_task_id) REFERENCES agent_tasks(id) ON DELETE SET NULL,
    CONSTRAINT agent_found_jobs_match_score_check CHECK (match_score IS NULL OR (match_score >= 0 AND match_score <= 100))
);

-- 最必要的索引
CREATE INDEX idx_agent_found_jobs_user_created ON agent_found_jobs(user_id, created_at DESC);  -- 用户查看自己的工作列表
CREATE INDEX idx_agent_found_jobs_user_saved ON agent_found_jobs(user_id, saved);  -- 快速筛选已保存/未保存

-- RLS 策略
ALTER TABLE agent_found_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY agent_found_jobs_policy ON agent_found_jobs
    USING (user_id = auth.uid()) 
    WITH CHECK (user_id = auth.uid());

-- updated_at 触发器
CREATE TRIGGER update_agent_found_jobs_updated_at 
    BEFORE UPDATE ON agent_found_jobs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();




-- ========================================
-- 业务函数
-- ========================================

-- 用户积分初始化触发器函数
CREATE OR REPLACE FUNCTION initialize_user_credits()
RETURNS TRIGGER AS $$
BEGIN
  -- 为新注册用户创建积分记录，给予10个初始积分
  INSERT INTO public.user_credits (user_id, credits, total_earned)
  VALUES (NEW.id, 10, 10)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- 记录初始积分获得活动
  INSERT INTO public.user_activities (user_id, activity_type, activity_key, credits_earned, details)
  VALUES (NEW.id, 'system', 'initial_credits', 10, '{"description": "新用户注册初始积分"}'::jsonb);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建触发器：用户注册时自动给予积分
DROP TRIGGER IF EXISTS trigger_initialize_user_credits ON auth.users;
CREATE TRIGGER trigger_initialize_user_credits
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION initialize_user_credits();

-- Credit management function
CREATE OR REPLACE FUNCTION spend_credits(
  p_user_id uuid,
  p_feature text,
  p_cost integer DEFAULT 1,
  p_reference_id uuid DEFAULT NULL
) RETURNS boolean AS $$
DECLARE
  v_current_credits integer;
BEGIN
  -- 检查积分余额
  SELECT credits INTO v_current_credits 
  FROM user_credits WHERE user_id = p_user_id;
  
  -- 如果用户记录不存在，说明数据有问题
  IF v_current_credits IS NULL THEN
    RAISE EXCEPTION '用户积分记录不存在: %', p_user_id;
  END IF;
  
  -- 检查积分是否足够
  IF v_current_credits < p_cost THEN
    RETURN false;
  END IF;
  
  -- 扣除积分
  UPDATE user_credits SET 
    credits = credits - p_cost,
    total_spent = total_spent + p_cost,
    updated_at = NOW()
  WHERE user_id = p_user_id;
  
  -- 记录使用
  INSERT INTO user_credit_usage (user_id, feature_used, credits_spent, reference_id)
  VALUES (p_user_id, p_feature, p_cost, p_reference_id);
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- API Key usage increment function
CREATE OR REPLACE FUNCTION increment_api_key_usage(
  key_id uuid
) RETURNS void AS $$
BEGIN
  -- Increment daily_usage and update last_used_at atomically
  UPDATE api_keys SET 
    daily_usage = daily_usage + 1,
    last_used_at = NOW(),
    updated_at = NOW()
  WHERE id = key_id;
END;
$$ LANGUAGE plpgsql;