import Layout from '@/components/Layout';
import BrowserTaskForm from '@/components/BrowserTaskForm';
import { Bot } from 'lucide-react';

export default function Agent() {
  return (
    <Layout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Bot className="h-10 w-10 text-primary" />
            <h1 className="text-4xl font-bold">AI智能浏览器代理</h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            使用AI驱动的智能代理进行自动化浏览器操作，支持多种AI模型和完整的参数配置
          </p>
        </div>

        {/* 智能浏览器任务表单 */}
        <div className="max-w-5xl mx-auto">
          <BrowserTaskForm />
        </div>
      </div>
    </Layout>
  );
}
