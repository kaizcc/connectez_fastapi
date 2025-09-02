import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Alert, AlertDescription } from './ui/alert';
import { resumeMatchingApi, resumeMatchingHelpers } from '../lib/resumeMatching';
import type { AgentFoundJob } from '../types';

interface JobAnalysisResultsProps {
  taskId?: string;
  refreshTrigger?: number;
}

const JobAnalysisResults: React.FC<JobAnalysisResultsProps> = ({ 
  taskId, 
  refreshTrigger = 0 
}) => {
  const [jobs, setJobs] = useState<AgentFoundJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<AgentFoundJob | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadJobAnalysis();
  }, [taskId, refreshTrigger]);

  const loadJobAnalysis = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const jobsData = await resumeMatchingApi.getJobsWithAnalysis(taskId);
      setJobs(jobsData);
      
    } catch (err: any) {
      console.error('Error loading job analysis:', err);
      setError('加载分析结果失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJobClick = (job: AgentFoundJob) => {
    setSelectedJob(job);
  };

  const getScoreStats = () => {
    if (jobs.length === 0) return { average: 0, highest: 0, count: 0 };
    
    const scores = jobs.map(job => job.match_score || 0);
    const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const highest = Math.max(...scores);
    
    return {
      average: Math.round(average),
      highest,
      count: jobs.length
    };
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span>加载分析结果中...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent>
          <Alert className="border-red-200 bg-red-50">
            <AlertDescription className="text-red-700">
              {error}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (jobs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>AI分析结果</CardTitle>
          <CardDescription>暂无已分析的工作岗位</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">还没有AI分析结果</p>
            <p className="text-sm text-gray-400">
              请先使用"AI匹配分析"功能对工作岗位进行分析
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const stats = getScoreStats();

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            📊 AI分析结果
            <Badge variant="outline" className="ml-2">
              {jobs.length} 个工作已分析
            </Badge>
          </CardTitle>
          <CardDescription>
            点击查看详细的AI匹配分析结果
          </CardDescription>
        </CardHeader>

        <CardContent>
          {/* 统计信息 */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{stats.average}</div>
              <div className="text-sm text-blue-600">平均匹配度</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{stats.highest}</div>
              <div className="text-sm text-green-600">最高匹配度</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{stats.count}</div>
              <div className="text-sm text-purple-600">已分析工作</div>
            </div>
          </div>

          {/* 工作列表 */}
          <div className="space-y-3">
            {jobs
              .sort((a, b) => (b.match_score || 0) - (a.match_score || 0))
              .map((job) => (
                <div
                  key={job.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => handleJobClick(job)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="font-medium text-gray-900">{job.title}</h3>
                        <Badge 
                          className={`${resumeMatchingHelpers.getScoreBadgeColor(job.match_score || 0)}`}
                        >
                          {job.match_score}分 - {resumeMatchingHelpers.getScoreDescription(job.match_score || 0)}
                        </Badge>
                      </div>
                      
                      <div className="text-sm text-gray-600 mb-2">
                        <span className="font-medium">{job.company}</span>
                        {job.location && <span className="ml-2">📍 {job.location}</span>}
                        {job.work_type && <span className="ml-2">💼 {job.work_type}</span>}
                        {job.salary && <span className="ml-2">💰 {job.salary}</span>}
                      </div>

                      {job.ai_analysis?.summary && (
                        <p className="text-sm text-gray-700 line-clamp-2">
                          {job.ai_analysis.summary}
                        </p>
                      )}
                    </div>

                    <div className="ml-4">
                      <div 
                        className={`text-3xl font-bold ${resumeMatchingHelpers.getScoreColor(job.match_score || 0)}`}
                      >
                        {job.match_score}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* 详细分析对话框 */}
      <Dialog open={!!selectedJob} onOpenChange={() => setSelectedJob(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <span>{selectedJob?.title}</span>
              <Badge className={`${resumeMatchingHelpers.getScoreBadgeColor(selectedJob?.match_score || 0)}`}>
                {selectedJob?.match_score}分
              </Badge>
            </DialogTitle>
            <DialogDescription>
              {selectedJob?.company} • {selectedJob?.location}
            </DialogDescription>
          </DialogHeader>

          {selectedJob && selectedJob.ai_analysis && (
            <div className="space-y-4">
              {/* 基本信息 */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>工作类型:</strong> {selectedJob.work_type || '未指定'}
                </div>
                <div>
                  <strong>薪资:</strong> {selectedJob.salary || '面议'}
                </div>
              </div>

              {/* AI分析结果 */}
              <div className="space-y-3">
                {selectedJob.ai_analysis.summary && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">📋 分析概述</h4>
                    <p className="text-gray-700 text-sm bg-gray-50 p-3 rounded">
                      {selectedJob.ai_analysis.summary}
                    </p>
                  </div>
                )}

                {selectedJob.ai_analysis.strengths?.length > 0 && (
                  <div>
                    <h4 className="font-medium text-green-700 mb-2">✅ 匹配优势</h4>
                    <ul className="space-y-1">
                      {selectedJob.ai_analysis.strengths.map((strength: string, index: number) => (
                        <li key={index} className="text-sm text-gray-700 bg-green-50 p-2 rounded flex items-start">
                          <span className="text-green-500 mr-2">•</span>
                          {strength}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedJob.ai_analysis.gaps?.length > 0 && (
                  <div>
                    <h4 className="font-medium text-orange-700 mb-2">⚠️ 技能差距</h4>
                    <ul className="space-y-1">
                      {selectedJob.ai_analysis.gaps.map((gap: string, index: number) => (
                        <li key={index} className="text-sm text-gray-700 bg-orange-50 p-2 rounded flex items-start">
                          <span className="text-orange-500 mr-2">•</span>
                          {gap}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedJob.ai_analysis.recommendations?.length > 0 && (
                  <div>
                    <h4 className="font-medium text-blue-700 mb-2">💡 改进建议</h4>
                    <ul className="space-y-1">
                      {selectedJob.ai_analysis.recommendations.map((rec: string, index: number) => (
                        <li key={index} className="text-sm text-gray-700 bg-blue-50 p-2 rounded flex items-start">
                          <span className="text-blue-500 mr-2">•</span>
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedJob.ai_analysis.reasoning && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">🤔 详细推理</h4>
                    <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded whitespace-pre-wrap">
                      {selectedJob.ai_analysis.reasoning}
                    </p>
                  </div>
                )}
              </div>

              {/* 操作按钮 */}
              <div className="flex justify-between items-center pt-4 border-t">
                <div className="text-xs text-gray-500">
                  分析时间: {new Date(selectedJob.updated_at).toLocaleString()}
                </div>
                
                {selectedJob.job_url && (
                  <Button
                    onClick={() => window.open(selectedJob.job_url, '_blank')}
                    variant="outline"
                    size="sm"
                  >
                    🔗 查看原始职位
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default JobAnalysisResults;
