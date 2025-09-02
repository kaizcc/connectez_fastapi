import { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  executeBrowserTask, 
  getAgentServiceStatus, 
  testLLMConnection 
} from '@/lib/agent';
import type { BrowserTaskRequest, BrowserTaskResult } from '@/types';
import { Loader2, Play, Settings, Eye, Monitor, Network, Video, Wrench } from 'lucide-react';

interface BrowserTaskFormProps {
  onCancel?: () => void;
}

export default function BrowserTaskForm({ onCancel }: BrowserTaskFormProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [taskResult, setTaskResult] = useState<BrowserTaskResult | null>(null);
  const [headersInput, setHeadersInput] = useState<string>('');
  
  // 表单状态
  const [formData, setFormData] = useState<BrowserTaskRequest>({
    task: '',
    url: 'https://google.com',
    max_steps: 8,
    use_vision: true,
    max_actions_per_step: 2,
    model_provider: 'deepseek',
    model_name: '',
    temperature: 0.3,
    headless: false,
    viewport_width: 1920,
    viewport_height: 1080,
    disable_security: false,
    ignore_https_errors: false,
    save_recording: false,
    enable_trace: false,
    save_screenshots: false,
    no_viewport: false,
    extra_chromium_args: [],
  });

  // 获取服务状态
  const { data: agentStatus, isLoading: statusLoading } = useQuery({
    queryKey: ['agent-status'],
    queryFn: getAgentServiceStatus,
    refetchInterval: 30000, // 30秒刷新一次
  });

  // 测试 LLM 连接
  const { data: llmStatus, isLoading: llmLoading } = useQuery({
    queryKey: ['llm-status'],
    queryFn: testLLMConnection,
    enabled: !!agentStatus?.intelligent_features?.available,
  });

  // 执行任务 mutation
  const executeTaskMutation = useMutation({
    mutationFn: executeBrowserTask,
    onSuccess: (result) => {
      setTaskResult(result);
    },
    onError: (error) => {
      console.error('执行任务失败:', error);
    },
  });

  // 获取可用的模型列表
  const getAvailableModels = (provider: string) => {
    return agentStatus?.supported_models?.[provider as keyof typeof agentStatus.supported_models] || [];
  };

  // 处理表单提交
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.task.trim()) {
      alert('请输入任务描述');
      return;
    }

    // 解析 extra_http_headers（如果用户填写了 JSON）
    let extraHeaders: Record<string, string> | undefined = undefined;
    if (headersInput && headersInput.trim().length > 0) {
      try {
        const parsed = JSON.parse(headersInput);
        if (parsed && typeof parsed === 'object') {
          extraHeaders = parsed;
        }
      } catch (err) {
        alert('extra_http_headers 不是合法的 JSON');
        return;
      }
    }
    
    // 清理空值，但保留有效的 false 和 0 值
    const cleanedData = Object.fromEntries(
      Object.entries(formData).filter(([_, value]) => {
        // 保留 false 和 0，只过滤 null、undefined 和空字符串
        if (value === false || value === 0) return true;
        if (value === null || value === undefined) return false;
        if (typeof value === 'string' && value.trim() === '') return false;
        if (Array.isArray(value) && value.length === 0) return false;
        return true;
      })
    ) as BrowserTaskRequest;

    // 应用解析后的 headers
    if (extraHeaders) {
      cleanedData.extra_http_headers = extraHeaders;
    }

    // 当启用录制但未指定路径时，给出默认路径
    if (cleanedData.save_recording && !cleanedData.recording_path) {
      cleanedData.recording_path = './tmp/record_videos';
    }
    // 当启用追踪但未指定路径时，给出默认路径
    if (cleanedData.enable_trace && !cleanedData.trace_path) {
      cleanedData.trace_path = './tmp/traces';
    }
    
    console.log('发送的任务数据:', cleanedData);
    executeTaskMutation.mutate(cleanedData);
  };

  // 处理字段变化
  const handleInputChange = (field: keyof BrowserTaskRequest, value: any) => {
    console.log(`更新字段 ${field}:`, value);
    setFormData(prev => {
      const newData = {
        ...prev,
        [field]: value
      };
      console.log('更新后的表单数据:', newData);
      return newData;
    });
  };

  // 当 provider 变化时，重置模型选择
  useEffect(() => {
    if (formData.model_provider) {
      const availableModels = getAvailableModels(formData.model_provider);
      if (availableModels.length > 0 && !availableModels.includes(formData.model_name || '')) {
        handleInputChange('model_name', availableModels[0]);
      }
    }
  }, [formData.model_provider, agentStatus]);

  return (
    <div className="space-y-6">
      {/* 服务状态检查 */}
      {statusLoading ? (
        <Alert>
          <Loader2 className="h-4 w-4 animate-spin" />
          正在检查服务状态...
        </Alert>
      ) : !agentStatus?.intelligent_features?.available ? (
        <Alert variant="destructive">
          智能浏览器功能不可用，请检查后端服务
        </Alert>
      ) : (
        <Alert>
          <Eye className="h-4 w-4" />
          智能浏览器功能可用 - {agentStatus.service} v{agentStatus.version}
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 基础配置 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="h-5 w-5" />
              基础任务配置
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">任务描述 *</label>
              <Input
                placeholder="例如：打开百度搜索'人工智能'并获取前3个结果"
                value={formData.task}
                onChange={(e) => handleInputChange('task', e.target.value)}
                required
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">起始 URL</label>
                <Input
                  placeholder="https://google.com"
                  value={formData.url}
                  onChange={(e) => handleInputChange('url', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">最大步骤数</label>
                <Input
                  type="number"
                  min={1}
                  max={50}
                  value={formData.max_steps || 8}
                  onChange={(e) => handleInputChange('max_steps', parseInt(e.target.value) || 8)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AI 模型配置 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              AI 模型配置
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">模型提供商</label>
                <Select 
                  value={formData.model_provider || ''} 
                  onValueChange={(value) => handleInputChange('model_provider', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择模型提供商" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="deepseek">
                      DeepSeek 
                      <Badge variant={agentStatus?.intelligent_features?.deepseek_api_key === '已配置' ? 'success' : 'destructive'} className="ml-2">
                        {agentStatus?.intelligent_features?.deepseek_api_key === '已配置' ? '可用' : '未配置'}
                      </Badge>
                    </SelectItem>
                    <SelectItem value="openai">
                      OpenAI
                      <Badge variant={agentStatus?.intelligent_features?.openai_api_key === '已配置' ? 'success' : 'destructive'} className="ml-2">
                        {agentStatus?.intelligent_features?.openai_api_key === '已配置' ? '可用' : '未配置'}
                      </Badge>
                    </SelectItem>
                    <SelectItem value="anthropic">
                      Anthropic
                      <Badge variant={agentStatus?.intelligent_features?.anthropic_api_key === '已配置' ? 'success' : 'destructive'} className="ml-2">
                        {agentStatus?.intelligent_features?.anthropic_api_key === '已配置' ? '可用' : '未配置'}
                      </Badge>
                    </SelectItem>
                    <SelectItem value="ollama">Ollama</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">模型名称</label>
                <Select 
                  value={formData.model_name || ''} 
                  onValueChange={(value) => handleInputChange('model_name', value)}
                  disabled={!formData.model_provider}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择模型" />
                  </SelectTrigger>
                  <SelectContent>
                    {formData.model_provider && getAvailableModels(formData.model_provider).map((model) => (
                      <SelectItem key={model} value={model}>
                        {model}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">温度参数</label>
                <Input
                  type="number"
                  min={0}
                  max={2}
                  step={0.1}
                  value={formData.temperature || 0.3}
                  onChange={(e) => handleInputChange('temperature', parseFloat(e.target.value) || 0.3)}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">每步最大动作数</label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={formData.max_actions_per_step || 2}
                  onChange={(e) => handleInputChange('max_actions_per_step', parseInt(e.target.value) || 2)}
                />
              </div>

              <div className="flex items-center space-x-2 pt-6">
                <input
                  type="checkbox"
                  id="use_vision"
                  checked={formData.use_vision}
                  onChange={(e) => handleInputChange('use_vision', e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="use_vision" className="text-sm font-medium">
                  启用视觉识别
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 浏览器配置 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="h-5 w-5" />
              浏览器配置
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">视口宽度</label>
                <Input
                  type="number"
                  min={800}
                  max={3840}
                  value={formData.viewport_width || 1920}
                  onChange={(e) => handleInputChange('viewport_width', parseInt(e.target.value) || 1920)}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">视口高度</label>
                <Input
                  type="number"
                  min={600}
                  max={2160}
                  value={formData.viewport_height || 1080}
                  onChange={(e) => handleInputChange('viewport_height', parseInt(e.target.value) || 1080)}
                />
              </div>

              <div className="flex flex-col gap-2 pt-6">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="headless"
                    checked={formData.headless}
                    onChange={(e) => handleInputChange('headless', e.target.checked)}
                    className="rounded"
                  />
                  <label htmlFor="headless" className="text-sm">无头模式</label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="disable_security"
                    checked={formData.disable_security}
                    onChange={(e) => handleInputChange('disable_security', e.target.checked)}
                    className="rounded"
                  />
                  <label htmlFor="disable_security" className="text-sm">禁用安全特性</label>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 高级配置弹窗 */}
        <Dialog open={advancedOpen} onOpenChange={setAdvancedOpen}>
          <DialogTrigger asChild>
            <div className="flex">
              <Button type="button" variant="outline" className="ml-auto">高级设置</Button>
            </div>
          </DialogTrigger>
          <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>高级设置</DialogTitle>
            </DialogHeader>

            {/* 网络配置 */}
            <Card className="border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Network className="h-5 w-5" />
                  网络配置
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">代理服务器</label>
                    <Input
                      placeholder="http://proxy.example.com:8080"
                      value={formData.proxy_server || ''}
                      onChange={(e) => handleInputChange('proxy_server', e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">代理绕过(逗号分隔)</label>
                    <Input
                      placeholder="localhost,127.0.0.1,*.internal"
                      value={formData.proxy_bypass || ''}
                      onChange={(e) => handleInputChange('proxy_bypass', e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">代理用户名</label>
                    <Input
                      placeholder="username"
                      value={formData.proxy_username || ''}
                      onChange={(e) => handleInputChange('proxy_username', e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">代理密码</label>
                    <Input
                      type="password"
                      placeholder="password"
                      value={formData.proxy_password || ''}
                      onChange={(e) => handleInputChange('proxy_password', e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">自定义 User-Agent</label>
                    <Input
                      placeholder="自定义浏览器标识"
                      value={formData.user_agent || ''}
                      onChange={(e) => handleInputChange('user_agent', e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="ignore_https_errors"
                    checked={formData.ignore_https_errors}
                    onChange={(e) => handleInputChange('ignore_https_errors', e.target.checked)}
                    className="rounded"
                  />
                  <label htmlFor="ignore_https_errors" className="text-sm">忽略 HTTPS 错误</label>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">额外 HTTP 头 (JSON)</label>
                  <textarea
                    className="w-full border rounded p-2 text-sm font-mono"
                    rows={5}
                    placeholder='{"X-Test":"1"}'
                    value={headersInput}
                    onChange={(e) => setHeadersInput(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* 录制配置 */}
            <Card className="border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Video className="h-5 w-5" />
                  录制与追踪
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">录制文件路径</label>
                    <Input
                      placeholder="./recordings/"
                      value={formData.recording_path || ''}
                      onChange={(e) => handleInputChange('recording_path', e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">追踪文件路径</label>
                    <Input
                      placeholder="./traces/"
                      value={formData.trace_path || ''}
                      onChange={(e) => handleInputChange('trace_path', e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="save_recording"
                      checked={formData.save_recording}
                      onChange={(e) => handleInputChange('save_recording', e.target.checked)}
                      className="rounded"
                    />
                    <label htmlFor="save_recording" className="text-sm">保存录制视频</label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="enable_trace"
                      checked={formData.enable_trace}
                      onChange={(e) => handleInputChange('enable_trace', e.target.checked)}
                      className="rounded"
                    />
                    <label htmlFor="enable_trace" className="text-sm">启用执行追踪</label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="save_screenshots"
                      checked={formData.save_screenshots}
                      onChange={(e) => handleInputChange('save_screenshots', e.target.checked)}
                      className="rounded"
                    />
                    <label htmlFor="save_screenshots" className="text-sm">保存步骤截图</label>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">HAR 路径</label>
                    <Input
                      placeholder="./tmp/har/network.har"
                      value={formData.record_har_path || ''}
                      onChange={(e) => handleInputChange('record_har_path', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">HAR 模式</label>
                    <Select value={(formData.record_har_mode as any) || ''} onValueChange={(v) => handleInputChange('record_har_mode', v as any)}>
                      <SelectTrigger>
                        <SelectValue placeholder="选择模式" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="full">full</SelectItem>
                        <SelectItem value="minimal">minimal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">HAR 内容</label>
                    <Select value={(formData.record_har_content as any) || ''} onValueChange={(v) => handleInputChange('record_har_content', v as any)}>
                      <SelectTrigger>
                        <SelectValue placeholder="选择内容" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="embed">embed</SelectItem>
                        <SelectItem value="omit">omit</SelectItem>
                        <SelectItem value="attach">attach</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 高级浏览器配置 */}
            <Card className="border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wrench className="h-5 w-5" />
                  高级浏览器配置
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Chrome 路径</label>
                    <Input
                      placeholder="自定义 Chrome 可执行文件路径"
                      value={formData.chrome_path || ''}
                      onChange={(e) => handleInputChange('chrome_path', e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Cookie 文件</label>
                    <Input
                      placeholder="./cookies.json"
                      value={formData.cookies_file || ''}
                      onChange={(e) => handleInputChange('cookies_file', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Device Scale Factor (DPI)</label>
                    <Input
                      type="number"
                      step={0.1}
                      min={0.5}
                      max={4}
                      value={formData.device_scale_factor ?? ''}
                      onChange={(e) => handleInputChange('device_scale_factor', e.target.value === '' ? undefined : parseFloat(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">窗口位置 (X,Y)</label>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="number"
                        placeholder="X"
                        value={formData.window_position_x ?? 0}
                        onChange={(e) => handleInputChange('window_position_x', parseInt(e.target.value) || 0)}
                      />
                      <Input
                        type="number"
                        placeholder="Y"
                        value={formData.window_position_y ?? 0}
                        onChange={(e) => handleInputChange('window_position_y', parseInt(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Channel</label>
                    <Input
                      placeholder="chromium | chrome | msedge"
                      value={formData.channel || ''}
                      onChange={(e) => handleInputChange('channel', e.target.value)}
                    />
                  </div>
                  <div className="flex items-center space-x-2 pt-6">
                    <input
                      type="checkbox"
                      id="devtools"
                      checked={!!formData.devtools}
                      onChange={(e) => handleInputChange('devtools', e.target.checked)}
                      className="rounded"
                    />
                    <label htmlFor="devtools" className="text-sm">启动 DevTools</label>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Slow Mo (ms)</label>
                    <Input
                      type="number"
                      min={0}
                      step={50}
                      value={formData.slow_mo ?? 0}
                      onChange={(e) => handleInputChange('slow_mo', parseInt(e.target.value) || 0)}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" id="chromium_sandbox" checked={!!formData.chromium_sandbox} onChange={(e) => handleInputChange('chromium_sandbox', e.target.checked)} className="rounded" />
                    <label htmlFor="chromium_sandbox" className="text-sm">启用 Chromium Sandbox</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" id="keep_alive" checked={!!formData.keep_alive} onChange={(e) => handleInputChange('keep_alive', e.target.checked)} className="rounded" />
                    <label htmlFor="keep_alive" className="text-sm">任务结束保持浏览器</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" id="enable_default_extensions" checked={formData.enable_default_extensions ?? true} onChange={(e) => handleInputChange('enable_default_extensions', e.target.checked)} className="rounded" />
                    <label htmlFor="enable_default_extensions" className="text-sm">启用默认扩展</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" id="deterministic_rendering" checked={!!formData.deterministic_rendering} onChange={(e) => handleInputChange('deterministic_rendering', e.target.checked)} className="rounded" />
                    <label htmlFor="deterministic_rendering" className="text-sm">确定性渲染(不推荐)</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" id="cross_origin_iframes" checked={!!formData.cross_origin_iframes} onChange={(e) => handleInputChange('cross_origin_iframes', e.target.checked)} className="rounded" />
                    <label htmlFor="cross_origin_iframes" className="text-sm">跨域 iframe 支持</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" id="highlight_elements" checked={formData.highlight_elements ?? true} onChange={(e) => handleInputChange('highlight_elements', e.target.checked)} className="rounded" />
                    <label htmlFor="highlight_elements" className="text-sm">高亮可交互元素</label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">WebSocket 调试 URL</label>
                  <Input
                    placeholder="ws://localhost:9222"
                    value={formData.wss_url || ''}
                    onChange={(e) => handleInputChange('wss_url', e.target.value)}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="no_viewport"
                    checked={formData.no_viewport || false}
                    onChange={(e) => handleInputChange('no_viewport', e.target.checked)}
                    className="rounded"
                  />
                  <label htmlFor="no_viewport" className="text-sm">禁用视口设置</label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">下载目录</label>
                    <Input
                      placeholder="./downloads"
                      value={formData.downloads_path || ''}
                      onChange={(e) => handleInputChange('downloads_path', e.target.value)}
                    />
                  </div>
                  <div className="flex items-center space-x-2 pt-6">
                    <input type="checkbox" id="accept_downloads" checked={formData.accept_downloads ?? true} onChange={(e) => handleInputChange('accept_downloads', e.target.checked)} className="rounded" />
                    <label htmlFor="accept_downloads" className="text-sm">自动接受下载</label>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">允许访问域名(逗号分隔)</label>
                    <Input
                      placeholder="*.google.com, https://example.com, chrome-extension://*"
                      value={(formData.allowed_domains || []).join(', ')}
                      onChange={(e) => handleInputChange('allowed_domains', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Service Workers 策略</label>
                    <Select value={formData.service_workers || 'allow'} onValueChange={(v) => handleInputChange('service_workers', v as any)}>
                      <SelectTrigger>
                        <SelectValue placeholder="策略" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="allow">allow</SelectItem>
                        <SelectItem value="block">block</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text sm font-medium mb-2">Locale</label>
                    <Input value={formData.locale || ''} onChange={(e) => handleInputChange('locale', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text sm font-medium mb-2">时区</label>
                    <Input value={formData.timezone_id || ''} onChange={(e) => handleInputChange('timezone_id', e.target.value)} />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">额外 Chromium 参数 (以 --flag 或 --flag=value 形式)</label>
                  <Input
                    placeholder="--disable-gpu, --use-gl=angle"
                    value={(formData.extra_chromium_args || []).join(', ')}
                    onChange={(e) => handleInputChange('extra_chromium_args', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setAdvancedOpen(false)}>关闭</Button>
              <Button type="button" onClick={() => setAdvancedOpen(false)}>完成</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* 操作按钮 */}
        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setFormData({
                  task: '',
                  url: 'https://google.com',
                  max_steps: 8,
                  use_vision: true,
                  max_actions_per_step: 2,
                  model_provider: 'deepseek',
                  model_name: '',
                  temperature: 0.3,
                  headless: false,
                  viewport_width: 1920,
                  viewport_height: 1080,
                  disable_security: false,
                  ignore_https_errors: false,
                  save_recording: false,
                  enable_trace: false,
                  save_screenshots: false,
                  no_viewport: false,
                  extra_chromium_args: [],
                  device_scale_factor: undefined,
                  window_position_x: 0,
                  window_position_y: 0,
                  channel: '',
                  devtools: false,
                  slow_mo: 0,
                  chromium_sandbox: undefined,
                  keep_alive: undefined,
                  enable_default_extensions: true,
                  deterministic_rendering: false,
                  cross_origin_iframes: false,
                  highlight_elements: true,
                  proxy_bypass: '',
                  proxy_username: '',
                  proxy_password: '',
                  record_har_path: '',
                  record_har_mode: undefined,
                  record_har_content: undefined,
                  downloads_path: '',
                  accept_downloads: true,
                  allowed_domains: [],
                  service_workers: 'allow',
                  locale: '',
                  timezone_id: '',
                });
                setTaskResult(null);
                setHeadersInput('');
              }}
            >
              重置表单
            </Button>
          </div>

          <div className="flex justify-center">
            <Button 
              type="submit" 
              disabled={executeTaskMutation.isPending || !agentStatus?.intelligent_features?.available}
              size="lg"
              className="min-w-[200px]"
            >
              {executeTaskMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  执行中...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  执行任务
                </>
              )}
            </Button>
          </div>
        </div>
      </form>

      {/* 执行进度 */}
      {executeTaskMutation.isPending && (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">正在执行智能浏览器任务...</span>
                <Badge variant="outline">
                  使用 {formData.model_provider} {formData.model_name}
                </Badge>
              </div>
              <Progress value={50} className="w-full" />
              <p className="text-xs text-muted-foreground">
                任务描述: {formData.task}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 执行结果 */}
      {taskResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Badge variant={taskResult.success ? 'success' : 'destructive'}>
                {taskResult.success ? '执行成功' : '执行失败'}
              </Badge>
              <span className="text-base">任务结果</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 基本信息 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="font-medium">执行模式:</span>
                <p>{taskResult.mode}</p>
              </div>
              <div>
                <span className="font-medium">使用模型:</span>
                <p>{taskResult.model_used}</p>
              </div>
              <div>
                <span className="font-medium">总步骤:</span>
                <p>{taskResult.total_steps}</p>
              </div>
              <div>
                <span className="font-medium">执行时间:</span>
                <p>{taskResult.execution_time ? `${taskResult.execution_time.toFixed(1)}秒` : '-'}</p>
              </div>
            </div>

            {/* 执行结果 */}
            {taskResult.result && (
              <div>
                <span className="font-medium">执行结果:</span>
                <div className="bg-muted rounded p-3 mt-1">
                  <p className="text-sm">{taskResult.result}</p>
                </div>
              </div>
            )}

            {/* 错误信息 */}
            {taskResult.error && (
              <div>
                <span className="font-medium text-destructive">错误信息:</span>
                <div className="bg-destructive/10 border border-destructive/20 rounded p-3 mt-1">
                  <p className="text-sm text-destructive">{taskResult.error}</p>
                </div>
              </div>
            )}

            {/* 执行步骤 */}
            {taskResult.steps && taskResult.steps.length > 0 && (
              <div>
                <span className="font-medium">执行步骤:</span>
                <div className="space-y-2 mt-2">
                  {taskResult.steps.map((step, index) => (
                    <div 
                      key={index} 
                      className={`p-3 rounded border-l-4 ${
                        step.success 
                          ? 'border-green-400 bg-green-50' 
                          : 'border-red-400 bg-red-50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            步骤 {step.step_number}: {step.action}
                          </p>
                          {step.reasoning && (
                            <p className="text-xs text-muted-foreground mt-1">
                              推理: {step.reasoning}
                            </p>
                          )}
                          {step.error && (
                            <p className="text-xs text-destructive mt-1">
                              错误: {step.error}
                            </p>
                          )}
                        </div>
                        <Badge variant={step.success ? 'success' : 'destructive'} className="ml-2">
                          {step.success ? '成功' : '失败'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 配置信息 */}
            {taskResult.config_used && (
              <div>
                <span className="font-medium">使用配置:</span>
                <pre className="bg-muted rounded p-3 text-xs overflow-x-auto mt-1">
                  {JSON.stringify(taskResult.config_used, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* LLM 状态信息 */}
      {llmStatus && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">LLM 连接状态</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              {Object.entries(llmStatus).map(([provider, status]: [string, any]) => (
                <div key={provider} className="flex items-center justify-between p-3 border rounded">
                  <span className="font-medium capitalize">{provider}</span>
                  <Badge variant={status.available ? 'success' : 'destructive'}>
                    {status.available ? '可用' : '不可用'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 调试面板 - 显示当前表单数据 */}
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">调试信息 - 当前表单数据</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-muted rounded p-3 text-xs overflow-x-auto">
            {JSON.stringify(formData, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
