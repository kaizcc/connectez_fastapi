import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Minus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
// import { Textarea } from '@/components/ui/textarea'; // 暂时未使用
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { startJobSearchTask } from '@/lib/agent';
import type { JobSearchTaskRequest } from '@/types';

interface CreateTaskFormProps {
  onTaskCreated?: (taskId: string) => void;
  onCancel?: () => void;
}

interface FormData {
  position: string;
  location: string;
  keywords: string;
  salaryMin: string;
  salaryMax: string;
  employmentTypes: string[];
  workArrangements: string[];
  matchingThreshold: string;
  maxJobsToReturn: string;
  experienceLevels: string[];
  excludeRecruitmentAgencies: boolean;
}

export default function CreateTaskForm({ onTaskCreated, onCancel }: CreateTaskFormProps) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [newKeyword, setNewKeyword] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<FormData>({
    defaultValues: {
      position: '',
      location: 'Sydney NSW',
      keywords: '',
      salaryMin: '80000',
      salaryMax: '120000',
      employmentTypes: ['full-time'],
      workArrangements: ['hybrid', 'remote'],
      matchingThreshold: '85',
      maxJobsToReturn: '5',
      experienceLevels: ['entry', 'mid'],
      excludeRecruitmentAgencies: true
    }
  });

  const addKeyword = () => {
    if (newKeyword.trim() && !keywords.includes(newKeyword.trim())) {
      const updatedKeywords = [...keywords, newKeyword.trim()];
      setKeywords(updatedKeywords);
      setNewKeyword('');
    }
  };

  const removeKeyword = (keyword: string) => {
    setKeywords(keywords.filter(k => k !== keyword));
  };

  const handleKeywordKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addKeyword();
    }
  };

  const onSubmit = async (data: FormData) => {
    if (!user) return;

    setIsLoading(true);
    try {
      // 确保数组字段正确处理
      const employmentTypes = Array.isArray(data.employmentTypes) 
        ? data.employmentTypes 
        : data.employmentTypes ? [data.employmentTypes] : ['full-time'];
      
      const workArrangements = Array.isArray(data.workArrangements) 
        ? data.workArrangements 
        : data.workArrangements ? [data.workArrangements] : ['hybrid', 'remote'];
      
      const experienceLevels = Array.isArray(data.experienceLevels) 
        ? data.experienceLevels 
        : data.experienceLevels ? [data.experienceLevels] : ['entry', 'mid'];

      // 构建请求数据
      const taskRequest: JobSearchTaskRequest = {
        task_type: 'job_search',
        user_id: user.id,
        resume_id: '00000000-0000-0000-0000-000000000000', // TODO: 从用户选择的简历获取
        target_config: {
          primary_site: 'seek.com.au'
        },
        search_criteria: {
          position: data.position,
          keywords: keywords,
          location: data.location,
          salary_min: data.salaryMin ? parseInt(data.salaryMin) : undefined,
          salary_max: data.salaryMax ? parseInt(data.salaryMax) : undefined,
          employment_type: employmentTypes,
          work_arrangement: workArrangements
        },
        matching_config: {
          matching_threshold: parseInt(data.matchingThreshold),
          max_jobs_to_return: parseInt(data.maxJobsToReturn)
        },
        filters: {
          company_blacklist: [],
          experience_level: experienceLevels,
          exclude_recruitment_agencies: data.excludeRecruitmentAgencies
        },
        metadata: {
          user_timezone: 'Australia/Sydney',
          request_timestamp: new Date().toISOString()
        }
      };

      console.log('发送任务请求:', taskRequest);
      const response = await startJobSearchTask(taskRequest);
      console.log('任务创建成功:', response);
      onTaskCreated?.(response.task_id);
    } catch (error: any) {
      console.error('创建任务失败:', error);
      
      // 显示详细的错误信息
      let errorMessage = '创建任务失败，请重试';
      if (error?.response?.data?.detail) {
        errorMessage = `创建失败: ${error.response.data.detail}`;
      } else if (error?.message) {
        errorMessage = `创建失败: ${error.message}`;
      }
      
      alert(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const employmentTypeOptions = [
    { value: 'full-time', label: '全职' },
    { value: 'part-time', label: '兼职' },
    { value: 'contract', label: '合同' },
    { value: 'temporary', label: '临时' },
    { value: 'internship', label: '实习' }
  ];

  const workArrangementOptions = [
    { value: 'remote', label: '远程' },
    { value: 'hybrid', label: '混合' },
    { value: 'onsite', label: '现场' }
  ];

  const experienceLevelOptions = [
    { value: 'entry', label: '入门级' },
    { value: 'mid', label: '中级' },
    { value: 'senior', label: '高级' },
    { value: 'lead', label: '主管级' }
  ];

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="text-xl">创建工作搜索任务</CardTitle>
        <p className="text-muted-foreground">
          配置AI代理自动搜索匹配的工作机会
        </p>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* 基础搜索条件 */}
          <div className="space-y-4">
            <h3 className="font-medium">搜索条件</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">职位名称 *</label>
                <Input
                  {...register('position', { required: '请输入职位名称' })}
                  placeholder="例如：Data Analyst"
                />
                {errors.position && (
                  <p className="text-sm text-destructive mt-1">{errors.position.message}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">工作地点 *</label>
                <Input
                  {...register('location', { required: '请输入工作地点' })}
                  placeholder="例如：Sydney NSW"
                />
                {errors.location && (
                  <p className="text-sm text-destructive mt-1">{errors.location.message}</p>
                )}
              </div>
            </div>

            {/* 技能关键词 */}
            <div>
              <label className="block text-sm font-medium mb-1">技能关键词</label>
              <div className="flex gap-2 mb-2">
                <Input
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  onKeyPress={handleKeywordKeyPress}
                  placeholder="添加技能关键词，如：Python"
                  className="flex-1"
                />
                <Button type="button" onClick={addKeyword} size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {keywords.map((keyword) => (
                  <Badge key={keyword} variant="secondary" className="flex items-center gap-1">
                    {keyword}
                    <button
                      type="button"
                      onClick={() => removeKeyword(keyword)}
                      className="ml-1 hover:text-destructive"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            {/* 薪资范围 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">最低薪资 (AUD)</label>
                <Input
                  {...register('salaryMin')}
                  type="number"
                  placeholder="80000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">最高薪资 (AUD)</label>
                <Input
                  {...register('salaryMax')}
                  type="number"
                  placeholder="120000"
                />
              </div>
            </div>
          </div>

          {/* 工作类型和安排 */}
          <div className="space-y-4">
            <h3 className="font-medium">工作偏好</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">雇佣类型</label>
                <div className="space-y-2">
                  {employmentTypeOptions.map((option) => (
                    <label key={option.value} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        value={option.value}
                        defaultChecked={option.value === 'full-time'}
                        {...register('employmentTypes')}
                      />
                      <span className="text-sm">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">工作安排</label>
                <div className="space-y-2">
                  {workArrangementOptions.map((option) => (
                    <label key={option.value} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        value={option.value}
                        defaultChecked={['hybrid', 'remote'].includes(option.value)}
                        {...register('workArrangements')}
                      />
                      <span className="text-sm">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 匹配配置 */}
          <div className="space-y-4">
            <h3 className="font-medium">匹配配置</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">匹配阈值 (0-100)</label>
                <Input
                  {...register('matchingThreshold')}
                  type="number"
                  min="0"
                  max="100"
                  placeholder="85"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  只返回匹配度大于此值的职位
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">最多返回职位数</label>
                <Input
                  {...register('maxJobsToReturn')}
                  type="number"
                  min="1"
                  max="20"
                  placeholder="5"
                />
              </div>
            </div>
          </div>

          {/* 过滤设置 */}
          <div className="space-y-4">
            <h3 className="font-medium">过滤设置</h3>
            
            <div>
              <label className="block text-sm font-medium mb-2">经验水平</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {experienceLevelOptions.map((option) => (
                  <label key={option.value} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      value={option.value}
                      defaultChecked={['entry', 'mid'].includes(option.value)}
                      {...register('experienceLevels')}
                    />
                    <span className="text-sm">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  defaultChecked={true}
                  {...register('excludeRecruitmentAgencies')}
                />
                <span className="text-sm">排除招聘机构</span>
              </label>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isLoading ? '创建中...' : '创建任务'}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
              取消
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
