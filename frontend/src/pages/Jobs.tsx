import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { jobsApi, type Job, type JobCreate, type UrlScrapeRequest, type ScrapedJobResponse } from '@/lib/jobs';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

export default function Jobs() {
  const queryClient = useQueryClient();
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isUrlModalOpen, setIsUrlModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [jobUrl, setJobUrl] = useState('');
  const [scrapedJob, setScrapedJob] = useState<ScrapedJobResponse | null>(null);
  const [newJob, setNewJob] = useState<JobCreate>({
    title: '',
    company: '',
    description: '',
    job_url: '',
    application_status: 'saved',
    notes: '',
    source: '',
  });

  // 获取工作列表
  const { data: jobsData, isLoading } = useQuery({
    queryKey: ['jobs', selectedStatus],
    queryFn: () => jobsApi.getJobs({ 
      status: selectedStatus === 'all' ? undefined : selectedStatus,
      page: 1,
      per_page: 20 
    }),
  });

  // 获取工作统计
  const { data: stats } = useQuery({
    queryKey: ['jobStats'],
    queryFn: jobsApi.getJobStats,
  });

  // 创建工作
  const createJobMutation = useMutation({
    mutationFn: jobsApi.createJob,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['jobStats'] });
      setIsAddModalOpen(false);
      setNewJob({
        title: '',
        company: '',
        description: '',
        job_url: '',
        application_status: 'saved',
        notes: '',
        source: '',
      });
    },
  });

  // 更新工作状态
  const updateJobMutation = useMutation({
    mutationFn: ({ jobId, data }: { jobId: string; data: any }) => 
      jobsApi.updateJob(jobId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['jobStats'] });
    },
  });

  // 删除工作
  const deleteJobMutation = useMutation({
    mutationFn: jobsApi.deleteJob,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['jobStats'] });
    },
  });

  // 爬取URL
  const scrapeUrlMutation = useMutation({
    mutationFn: jobsApi.scrapeJobFromUrl,
    onSuccess: (data: ScrapedJobResponse) => {
      setScrapedJob(data);
      setIsUrlModalOpen(false);
      if (data.success) {
        setIsConfirmModalOpen(true);
      }
    },
  });

  const handleStatusChange = (jobId: string, newStatus: string) => {
    updateJobMutation.mutate({
      jobId,
      data: { 
        application_status: newStatus,
        applied_at: newStatus === 'applied' ? new Date().toISOString() : undefined
      }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createJobMutation.mutate(newJob);
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (jobUrl.trim()) {
      scrapeUrlMutation.mutate({ url: jobUrl.trim() });
    }
  };

  const handleConfirmJob = () => {
    if (scrapedJob && scrapedJob.success) {
      const jobData: JobCreate = {
        title: scrapedJob.title,
        company: scrapedJob.company || '',
        description: scrapedJob.description || '',
        job_url: scrapedJob.job_url,
        application_status: 'saved',
        source: 'seek_scraper',
        notes: ''
      };
      createJobMutation.mutate(jobData);
      setIsConfirmModalOpen(false);
      setScrapedJob(null);
      setJobUrl('');
    }
  };

  const closeUrlModal = () => {
    setIsUrlModalOpen(false);
    setJobUrl('');
    setScrapedJob(null);
  };

  const closeConfirmModal = () => {
    setIsConfirmModalOpen(false);
    setScrapedJob(null);
    setJobUrl('');
  };



  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'saved', label: 'Saved' },
    { value: 'applied', label: 'Applied' },
    { value: 'interview', label: 'Interview' },
    { value: 'offer', label: 'Offer' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'draft', label: 'Draft' },
  ];

  return (
    <Layout>
      <div className="space-y-8">
        {/* 页面头部 */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Job Management</h1>
            <p className="text-muted-foreground mt-2">Manage your job applications and track your progress</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setIsUrlModalOpen(true)}
              variant="outline"
              className="flex items-center gap-2"
            >
              <span>🔗</span>
              Add URL
            </Button>
            <Button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2"
            >
              <span>+</span>
              Add Job
            </Button>
          </div>
        </div>

        {/* 统计卡片 */}
        {stats && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total_jobs}</div>
                <p className="text-xs text-muted-foreground">
                  All job records
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Applied</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{stats.applied_jobs}</div>
                <p className="text-xs text-muted-foreground">
                  Applications submitted
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Saved</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.saved_jobs}</div>
                <p className="text-xs text-muted-foreground">
                  Interested positions
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Other Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600">{stats.other_jobs}</div>
                <p className="text-xs text-muted-foreground">
                  Interview, rejected etc.
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 筛选器和搜索 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">Status:</span>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            {jobsData?.total || 0} jobs found
          </p>
        </div>

        {/* 工作列表 */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Position</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : jobsData?.jobs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    No jobs found. Add your first job application!
                  </TableCell>
                </TableRow>
              ) : (
                jobsData?.jobs.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{job.title}</div>
                        <div className="text-sm text-muted-foreground">{job.company}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select 
                        value={job.application_status} 
                        onValueChange={(value) => handleStatusChange(job.id, value)}
                      >
                        <SelectTrigger className="w-24 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="saved">Saved</SelectItem>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="applied">Applied</SelectItem>
                          <SelectItem value="interview">Interview</SelectItem>
                          <SelectItem value="offer">Offer</SelectItem>
                          <SelectItem value="rejected">Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(job.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-sm">
                      {job.score ? (
                        <Badge variant="secondary">{job.score}%</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        {job.job_url && (
                          <Button
                            variant="ghost"
                            size="sm"
                            asChild
                          >
                            <a
                              href={job.job_url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              View
                            </a>
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteJobMutation.mutate(job.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>

        {/* 添加工作对话框 */}
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New Job</DialogTitle>
              <DialogDescription>
                Add a new job application to track your progress.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <label htmlFor="title" className="text-sm font-medium">
                    Job Title *
                  </label>
                  <Input
                    id="title"
                    type="text"
                    required
                    value={newJob.title}
                    onChange={(e) => setNewJob({ ...newJob, title: e.target.value })}
                    placeholder="Enter job title"
                  />
                </div>
                
                <div className="grid gap-2">
                  <label htmlFor="company" className="text-sm font-medium">
                    Company
                  </label>
                  <Input
                    id="company"
                    type="text"
                    value={newJob.company}
                    onChange={(e) => setNewJob({ ...newJob, company: e.target.value })}
                    placeholder="Enter company name"
                  />
                </div>
                
                <div className="grid gap-2">
                  <label htmlFor="job_url" className="text-sm font-medium">
                    Job URL
                  </label>
                  <Input
                    id="job_url"
                    type="url"
                    value={newJob.job_url}
                    onChange={(e) => setNewJob({ ...newJob, job_url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                
                <div className="grid gap-2">
                  <label htmlFor="status" className="text-sm font-medium">
                    Status
                  </label>
                  <Select 
                    value={newJob.application_status} 
                    onValueChange={(value) => setNewJob({ ...newJob, application_status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="saved">Saved</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="applied">Applied</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid gap-2">
                  <label htmlFor="notes" className="text-sm font-medium">
                    Notes
                  </label>
                  <Textarea
                    id="notes"
                    rows={3}
                    value={newJob.notes}
                    onChange={(e) => setNewJob({ ...newJob, notes: e.target.value })}
                    placeholder="Add any notes..."
                  />
                </div>
              </div>
              
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createJobMutation.isPending}
                >
                  {createJobMutation.isPending ? 'Adding...' : 'Add Job'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* URL爬取对话框 */}
        <Dialog open={isUrlModalOpen} onOpenChange={closeUrlModal}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add Job from URL</DialogTitle>
              <DialogDescription>
                Enter a Seek job URL to automatically extract job information.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUrlSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <label htmlFor="job_url" className="text-sm font-medium">
                    Seek Job URL *
                  </label>
                  <Input
                    id="job_url"
                    type="url"
                    required
                    value={jobUrl}
                    onChange={(e) => setJobUrl(e.target.value)}
                    placeholder="https://www.seek.com.au/job/..."
                  />
                  <p className="text-xs text-muted-foreground">
                    Please provide a valid Seek job posting URL
                  </p>
                </div>
              </div>
              
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeUrlModal}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={scrapeUrlMutation.isPending || !jobUrl.trim()}
                >
                  {scrapeUrlMutation.isPending ? 'Extracting...' : 'Extract Job Info'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* 确认爬取结果对话框 */}
        <Dialog open={isConfirmModalOpen} onOpenChange={closeConfirmModal}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Confirm Job Information</DialogTitle>
              <DialogDescription>
                Review the extracted job information and confirm to add it to your job list.
              </DialogDescription>
            </DialogHeader>
            
            {scrapedJob && (
              <div className="grid gap-4 py-4">
                {scrapedJob.success ? (
                  <>
                    <div className="grid gap-2">
                      <label className="text-sm font-medium">Job Title</label>
                      <div className="p-3 bg-muted rounded-md">
                        {scrapedJob.title || 'N/A'}
                      </div>
                    </div>
                    
                    <div className="grid gap-2">
                      <label className="text-sm font-medium">Company</label>
                      <div className="p-3 bg-muted rounded-md">
                        {scrapedJob.company || 'N/A'}
                      </div>
                    </div>
                    
                    <div className="grid gap-2">
                      <label className="text-sm font-medium">Job URL</label>
                      <div className="p-3 bg-muted rounded-md text-sm break-all">
                        {scrapedJob.job_url}
                      </div>
                    </div>
                    
                    {scrapedJob.description && (
                      <div className="grid gap-2">
                        <label className="text-sm font-medium">Description (Preview)</label>
                        <div className="p-3 bg-muted rounded-md max-h-32 overflow-y-auto text-sm">
                          {scrapedJob.description.substring(0, 300)}
                          {scrapedJob.description.length > 300 && '...'}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-6">
                    <div className="text-destructive text-lg mb-2">❌ Extraction Failed</div>
                    <p className="text-sm text-muted-foreground mb-4">
                      {scrapedJob.error_message || 'Unable to extract job information from the provided URL.'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Please make sure the URL is a valid Seek job posting and try again.
                    </p>
                  </div>
                )}
              </div>
            )}
            
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={closeConfirmModal}
              >
                {scrapedJob?.success ? 'Cancel' : 'Close'}
              </Button>
              {scrapedJob?.success && (
                <Button
                  onClick={handleConfirmJob}
                  disabled={createJobMutation.isPending}
                >
                  {createJobMutation.isPending ? 'Adding...' : 'Add Job'}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
