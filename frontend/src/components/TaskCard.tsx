import { useState } from 'react';
// 简单的日期格式化函数
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};
import { Clock, Play, Pause, XCircle, CheckCircle, AlertCircle, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  getTaskStatusText, 
  getTaskStatusColor, 
  canCancelTask, 
  formatExecutionTime,
  cancelTask 
} from '@/lib/agent';
import type { AgentTask } from '@/types';

interface TaskCardProps {
  task: AgentTask;
  onStatusChange?: () => void;
  onViewDetails?: (task: AgentTask) => void;
}

export default function TaskCard({ task, onStatusChange, onViewDetails }: TaskCardProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleCancel = async () => {
    if (!canCancelTask(task.status)) return;
    
    setIsLoading(true);
    try {
      await cancelTask(task.id);
      onStatusChange?.();
    } catch (error) {
      console.error('取消任务失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'running':
        return <Play className="h-4 w-4" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4" />;
      case 'paused':
        return <Pause className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getProgressValue = (status: string) => {
    switch (status) {
      case 'pending':
        return 0;
      case 'running':
        return 50;
      case 'completed':
        return 100;
      case 'failed':
      case 'cancelled':
        return 0;
      default:
        return 0;
    }
  };

  const getBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'failed':
        return 'destructive';
      case 'running':
        return 'info';
      case 'pending':
        return 'warning';
      case 'cancelled':
        return 'secondary';
      default:
        return 'default';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            {getStatusIcon(task.status)}
            <span className="truncate">{task.task_description}</span>
          </CardTitle>
          <Badge variant={getBadgeVariant(task.status)}>
            {getTaskStatusText(task.status)}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* 任务进度 */}
        {task.status === 'running' && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>执行进度</span>
              <span>{getProgressValue(task.status)}%</span>
            </div>
            <Progress value={getProgressValue(task.status)} />
          </div>
        )}

        {/* 任务信息 */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">任务类型：</span>
            <span className="ml-1">{task.task_type}</span>
          </div>
          <div>
            <span className="text-muted-foreground">创建时间：</span>
            <span className="ml-1">
              {formatDate(task.created_at)}
            </span>
          </div>
          {task.started_at && (
            <div>
              <span className="text-muted-foreground">开始时间：</span>
              <span className="ml-1">
                {formatDate(task.started_at)}
              </span>
            </div>
          )}
          {task.completed_at && (
            <div>
              <span className="text-muted-foreground">完成时间：</span>
              <span className="ml-1">
                {formatDate(task.completed_at)}
              </span>
            </div>
          )}
        </div>

        {/* 执行结果摘要 */}
        {task.execution_result && (
          <div className="bg-muted/50 rounded-lg p-3 space-y-2">
            <h4 className="font-medium text-sm">执行结果</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {task.execution_result.jobs_viewed && (
                <div>
                  <span className="text-muted-foreground">查看职位：</span>
                  <span className="ml-1 font-medium">{task.execution_result.jobs_viewed}</span>
                </div>
              )}
              {task.execution_result.jobs_found_matching && (
                <div>
                  <span className="text-muted-foreground">匹配职位：</span>
                  <span className="ml-1 font-medium text-green-600">
                    {task.execution_result.jobs_found_matching}
                  </span>
                </div>
              )}
              {task.execution_result.execution_time_seconds && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">执行时间：</span>
                  <span className="ml-1">
                    {formatExecutionTime(task.execution_result.execution_time_seconds)}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 错误信息 */}
        {task.status === 'failed' && task.other_message && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
            <p className="text-sm text-destructive">{task.other_message}</p>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewDetails?.(task)}
            className="flex-1"
          >
            <Eye className="h-4 w-4 mr-2" />
            查看详情
          </Button>
          
          {canCancelTask(task.status) && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleCancel}
              disabled={isLoading}
              className="flex-1"
            >
              <XCircle className="h-4 w-4 mr-2" />
              取消任务
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
