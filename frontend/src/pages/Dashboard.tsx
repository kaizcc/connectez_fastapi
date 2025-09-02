import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { jobsApi } from '@/lib/jobs';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function Dashboard() {
  // 获取工作统计
  const { data: stats } = useQuery({
    queryKey: ['jobStats'],
    queryFn: jobsApi.getJobStats,
  });

  return (
    <Layout>
      <div className="space-y-8">
        {/* 功能卡片 */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>工作管理</CardTitle>
              <CardDescription>
                管理你的求职申请和面试进度
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/jobs">
                <Button className="w-full">
                  查看工作
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>简历管理</CardTitle>
              <CardDescription>
                创建和编辑你的简历模板
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="outline">
                管理简历
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>个人档案</CardTitle>
              <CardDescription>
                更新你的个人信息和技能
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="outline">
                编辑档案
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* 快速统计 */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold tracking-tight">快速统计</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">已申请工作</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {stats?.applied_jobs || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  已提交的申请
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">已保存工作</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {stats?.saved_jobs || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  感兴趣的职位
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">总工作数</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats?.total_jobs || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  所有记录的职位
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">其他状态</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600">
                  {stats?.other_jobs || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  面试、拒绝等状态
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
