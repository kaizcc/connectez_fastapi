import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import Layout from '../components/Layout';
import TaskForm from '../components/TaskForm';
import TaskList from '../components/TaskList';
import FoundJobsList from '../components/FoundJobsList';
import ResumeJobMatchingForm from '../components/ResumeJobMatchingForm';
import JobAnalysisResults from '../components/JobAnalysisResults';
import JobAgentForm from '../components/JobAgentForm';
import type { AgentTaskResponse } from '../types';

const Tasks: React.FC = () => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [selectedTask, setSelectedTask] = useState<AgentTaskResponse | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  const handleTaskCreated = (taskId: string) => {
    // 刷新任务列表
    setRefreshTrigger(prev => prev + 1);
    // 切换到任务列表标签
    setActiveTab('tasks');
  };

  const handleJobAgentCompleted = (result: any) => {
    // 刷新任务列表
    setRefreshTrigger(prev => prev + 1);
    // 切换到工作列表标签查看结果
    setActiveTab('jobs');
    // 显示成功消息
    alert(`智能助手完成！找到 ${result.jobs_found} 个工作，成功分析 ${result.successful_analyses} 个，平均匹配分数：${result.average_score}`);
  };

  const handleTaskSelect = (task: AgentTaskResponse) => {
    setSelectedTask(task);
    setActiveTab('jobs');
  };

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <Layout>
      <div className="space-y-8">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🤖 任务管理中心
          </h1>
          <p className="text-gray-600">
            创建和管理您的Seek爬虫任务，查看找到的工作机会
          </p>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">📝</div>
              <div className="text-sm text-gray-600 mt-1">总任务数</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">⏳</div>
              <div className="text-sm text-gray-600 mt-1">执行中</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">✅</div>
              <div className="text-sm text-gray-600 mt-1">已完成</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">💼</div>
              <div className="text-sm text-gray-600 mt-1">找到工作</div>
            </div>
          </CardContent>
          </Card>
        </div>

                {/* 主要内容 */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex justify-between items-center mb-6">
          <TabsList className="grid w-full max-w-3xl grid-cols-5">
            <TabsTrigger value="overview">📊 概览</TabsTrigger>
            <TabsTrigger value="job-agent">🤖 智能助手</TabsTrigger>
            <TabsTrigger value="tasks">📋 任务</TabsTrigger>
            <TabsTrigger value="jobs">💼 工作</TabsTrigger>
            <TabsTrigger value="ai-matching">🧠 AI匹配</TabsTrigger>
          </TabsList>
          
          <Button onClick={handleRefresh} variant="outline">
            🔄 刷新全部
          </Button>
          </div>

          {/* 概览标签 */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 创建任务表单 */}
            <div>
              <TaskForm onTaskCreated={handleTaskCreated} />
            </div>
            
            {/* 快速信息 */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>🚀 快速开始</CardTitle>
                  <CardDescription>
                    开始使用Seek爬虫任务管理
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">
                      1. 创建任务
                    </h4>
                    <p className="text-blue-700 text-sm">
                      在左侧表单中输入职位标题和搜索条件，创建新的爬虫任务
                    </p>
                  </div>
                  
                  <div className="p-4 bg-green-50 rounded-lg">
                    <h4 className="font-medium text-green-900 mb-2">
                      2. 监控执行
                    </h4>
                    <p className="text-green-700 text-sm">
                      在"任务"标签中查看任务状态和执行进度
                    </p>
                  </div>
                  
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <h4 className="font-medium text-purple-900 mb-2">
                      3. 查看结果
                    </h4>
                    <p className="text-purple-700 text-sm">
                      在"工作"标签中查看找到的工作机会并管理收藏
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>💡 使用提示</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-start">
                      <span className="text-blue-500 mr-2">•</span>
                      支持多个职位标题同时搜索，用逗号分隔
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-500 mr-2">•</span>
                      建议页数设置较小值避免被限制
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-500 mr-2">•</span>
                      任务执行需要时间，请耐心等待
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-500 mr-2">•</span>
                      可以保存感兴趣的工作以便后续查看
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
            </div>
          </TabsContent>

          {/* 智能助手标签 */}
          <TabsContent value="job-agent" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Job Agent 表单 */}
              <div>
                <JobAgentForm 
                  onTaskCreated={handleJobAgentCompleted}
                  onCancel={() => setActiveTab('overview')}
                />
              </div>
              
              {/* 功能介绍 */}
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      🤖 智能求职助手
                    </CardTitle>
                    <CardDescription>
                      一站式AI驱动的求职解决方案
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                      <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
                        🔍 自动搜索
                      </h4>
                      <p className="text-blue-700 text-sm">
                        根据您的职位需求，自动在 Seek.com 上搜索相关工作机会
                      </p>
                    </div>
                    
                    <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
                      <h4 className="font-medium text-purple-900 mb-2 flex items-center gap-2">
                        🧠 AI 分析
                      </h4>
                      <p className="text-purple-700 text-sm">
                        使用先进的AI模型分析每个工作与您简历的匹配度，提供详细评分和建议
                      </p>
                    </div>
                    
                    <div className="p-4 bg-gradient-to-r from-green-50 to-teal-50 rounded-lg border border-green-200">
                      <h4 className="font-medium text-green-900 mb-2 flex items-center gap-2">
                        📊 智能排序
                      </h4>
                      <p className="text-green-700 text-sm">
                        根据匹配分数自动排序，优先展示最适合您的工作机会
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>⚡ 使用流程</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">1</div>
                        <div>
                          <p className="font-medium">选择简历</p>
                          <p className="text-sm text-muted-foreground">选择要用于匹配分析的简历</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center text-xs font-bold">2</div>
                        <div>
                          <p className="font-medium">设置搜索条件</p>
                          <p className="text-sm text-muted-foreground">输入职位标题、地点和数量要求</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-bold">3</div>
                        <div>
                          <p className="font-medium">开始智能求职</p>
                          <p className="text-sm text-muted-foreground">系统自动搜索并分析，无需人工干预</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-xs font-bold">4</div>
                        <div>
                          <p className="font-medium">查看结果</p>
                          <p className="text-sm text-muted-foreground">获得带有AI分析的工作列表和匹配建议</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>🎯 AI 分析优势</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start gap-2">
                        <span className="text-green-500 mt-0.5">✓</span>
                        <span>多维度匹配分析（技能、经验、行业、教育）</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-500 mt-0.5">✓</span>
                        <span>个性化优势和不足识别</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-500 mt-0.5">✓</span>
                        <span>针对性的职业发展建议</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-500 mt-0.5">✓</span>
                        <span>支持多种AI模型（DeepSeek、OpenAI等）</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* 任务标签 */}
          <TabsContent value="tasks" className="space-y-6">
            <TaskList 
            refreshTrigger={refreshTrigger}
            onTaskSelect={handleTaskSelect}
          />
          
          {selectedTask && (
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle className="text-blue-900">
                  📌 已选择任务: {selectedTask.task_description}
                </CardTitle>
                <CardDescription className="text-blue-700">
                  点击"工作"标签查看该任务找到的工作
                </CardDescription>
              </CardHeader>
            </Card>
          )}
          </TabsContent>

          {/* 工作标签 */}
          <TabsContent value="jobs" className="space-y-6">
            {selectedTask && (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-medium text-green-900">
                      🎯 显示任务结果: {selectedTask.task_description}
                    </h3>
                    <p className="text-sm text-green-700">
                      任务ID: {selectedTask.id}
                    </p>
                  </div>
                  <Button
                    onClick={() => setSelectedTask(null)}
                    variant="outline"
                    size="sm"
                  >
                    显示全部工作
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
          
          <FoundJobsList 
            taskId={selectedTask?.id}
            refreshTrigger={refreshTrigger}
                    />
        </TabsContent>

        {/* AI匹配标签 */}
        <TabsContent value="ai-matching" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* AI匹配分析表单 */}
            <div>
              <ResumeJobMatchingForm 
                onMatchingStarted={(taskId) => {
                  setRefreshTrigger(prev => prev + 1);
                  setActiveTab('tasks'); // 切换到任务列表查看进度
                }}
              />
            </div>
            
            {/* AI分析结果 */}
            <div>
              <JobAnalysisResults 
                refreshTrigger={refreshTrigger}
              />
            </div>
          </div>
          
          {/* 使用指南 */}
          <Card>
            <CardHeader>
              <CardTitle>🎯 AI匹配分析指南</CardTitle>
              <CardDescription>
                如何有效使用AI简历工作匹配功能
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">
                      📝 准备工作
                    </h4>
                    <ul className="text-blue-700 text-sm space-y-1">
                      <li>• 确保已上传完整的简历信息</li>
                      <li>• 先完成工作爬取任务</li>
                      <li>• 选择合适的AI模型</li>
                    </ul>
                  </div>
                  
                  <div className="p-4 bg-green-50 rounded-lg">
                    <h4 className="font-medium text-green-900 mb-2">
                      🎯 匹配评分说明
                    </h4>
                    <ul className="text-green-700 text-sm space-y-1">
                      <li>• 90-100分：极度匹配，强烈推荐</li>
                      <li>• 80-89分：优秀匹配，值得申请</li>
                      <li>• 70-79分：良好匹配，可以考虑</li>
                      <li>• 60-69分：一般匹配，需要权衡</li>
                    </ul>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <h4 className="font-medium text-purple-900 mb-2">
                      🔍 分析内容
                    </h4>
                    <ul className="text-purple-700 text-sm space-y-1">
                      <li>• 技能匹配度分析</li>
                      <li>• 经验水平匹配</li>
                      <li>• 行业背景契合度</li>
                      <li>• 个人优势和不足</li>
                    </ul>
                  </div>
                  
                  <div className="p-4 bg-orange-50 rounded-lg">
                    <h4 className="font-medium text-orange-900 mb-2">
                      💡 优化建议
                    </h4>
                    <ul className="text-orange-700 text-sm space-y-1">
                      <li>• 获得针对性的技能提升建议</li>
                      <li>• 了解简历优化方向</li>
                      <li>• 获得面试准备指导</li>
                      <li>• 发现职业发展机会</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Tasks;
