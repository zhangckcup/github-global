"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Navbar, Footer } from "@/components/layout";
import { 
  ArrowLeft, 
  Settings, 
  Play, 
  GitBranch, 
  Clock, 
  CheckCircle2, 
  XCircle,
  FileText, 
  Languages, 
  Loader2, 
  AlertCircle,
  ExternalLink,
  RefreshCw
} from "lucide-react";
import { SUPPORTED_LANGUAGES } from "@/lib/constants";

// 类型定义
interface TranslationTask {
  id: string;
  status: string;
  type: string;
  targetLanguages: string[];
  progress: number;
  totalFiles: number;
  completedFiles: number;
  failedFiles: number;
  pullRequestUrl: string | null;
  createdAt: string;
  completedAt: string | null;
}

interface RepoConfig {
  baseLanguage: string;
  targetLanguages: string[];
}

interface Repository {
  id: string;
  fullName: string;
  owner: string;
  name: string;
  description: string | null;
  defaultBranch: string;
  config: RepoConfig | null;
  translationTasks: TranslationTask[];
}

export default function RepoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const [repo, setRepo] = useState<Repository | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [taskError, setTaskError] = useState<string | null>(null);

  // 检查登录状态
  useEffect(() => {
    if (sessionStatus === 'unauthenticated') {
      router.push('/login');
    }
  }, [sessionStatus, router]);

  // 加载仓库详情
  const fetchRepo = async (showLoading = true) => {
    try {
      // 只有初始加载时才显示加载状态，轮询刷新时不显示
      if (showLoading) {
        setIsLoading(true);
      }
      setError(null);
      const response = await fetch(`/api/repos/${id}`);
      
      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login');
          return;
        }
        if (response.status === 404) {
          throw new Error('仓库不存在或已被删除');
        }
        if (response.status === 403) {
          throw new Error('没有权限访问该仓库');
        }
        throw new Error('加载仓库详情失败，请稍后重试');
      }
      
      const data = await response.json();
      setRepo(data.repository);
    } catch (err: any) {
      console.error('Fetch repo error:', err);
      // 轮询时出错不显示错误，避免干扰用户
      if (showLoading) {
        setError(err.message || '加载仓库详情失败');
      }
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    if (sessionStatus === 'authenticated') {
      fetchRepo();
    }
  }, [id, sessionStatus]);

  // 自动刷新运行中的任务（静默刷新，不显示加载状态）
  useEffect(() => {
    const hasRunningTask = repo?.translationTasks?.some(t => t.status === 'RUNNING');
    
    if (hasRunningTask) {
      const interval = setInterval(() => fetchRepo(false), 5000); // 每5秒静默刷新
      return () => clearInterval(interval);
    }
  }, [repo?.translationTasks]);

  // 创建翻译任务
  const handleCreateTask = async () => {
    if (!repo?.config?.targetLanguages?.length) {
      setTaskError('请先配置目标翻译语言');
      return;
    }

    setIsCreatingTask(true);
    setTaskError(null);
    
    try {
      const response = await fetch('/api/translations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          repositoryId: id,
          targetLanguages: repo.config.targetLanguages,
          type: 'FULL',
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('今日翻译次数已达上限，请明天再试或添加您自己的 API Key');
        }
        if (response.status === 401) {
          throw new Error('登录已过期，请重新登录');
        }
        throw new Error(data.error || '创建翻译任务失败，请稍后重试');
      }
      
      // 创建成功，刷新页面数据
      await fetchRepo();
    } catch (err: any) {
      console.error('Create task error:', err);
      setTaskError(err.message || '创建翻译任务失败');
    } finally {
      setIsCreatingTask(false);
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return {
          icon: CheckCircle2,
          color: "text-green-600",
          bgColor: "bg-green-500/10",
          borderColor: "border-green-500/30",
          progressColor: "bg-green-500",
          label: "已完成"
        };
      case "RUNNING":
        return {
          icon: Loader2,
          color: "text-blue-600",
          bgColor: "bg-blue-500/10",
          borderColor: "border-blue-500/30",
          progressColor: "bg-blue-500",
          label: "运行中",
          animate: true
        };
      case "FAILED":
        return {
          icon: XCircle,
          color: "text-red-600",
          bgColor: "bg-red-500/10",
          borderColor: "border-red-500/30",
          progressColor: "bg-red-500",
          label: "失败"
        };
      default:
        return {
          icon: Clock,
          color: "text-gray-600",
          bgColor: "bg-gray-500/10",
          borderColor: "border-gray-500/30",
          progressColor: "bg-gray-500",
          label: "等待中"
        };
    }
  };

  const getLanguageName = (code: string) => {
    return SUPPORTED_LANGUAGES.find((lang) => lang.code === code)?.name || code;
  };

  // Session 加载中
  if (sessionStatus === 'loading') {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar user={null} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-12 w-12 text-primary mx-auto mb-4 animate-spin" />
            <p className="text-muted-foreground">加载中...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // 加载中状态
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar user={session?.user} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-12 w-12 text-primary mx-auto mb-4 animate-spin" />
            <p className="text-muted-foreground">加载中...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // 错误状态
  if (error || !repo) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar user={session?.user} />
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="text-center py-12 max-w-md w-full">
            <CardContent>
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">加载失败</h3>
              <p className="text-muted-foreground mb-4">{error || '仓库不存在'}</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button onClick={() => fetchRepo()} variant="outline">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  重试
                </Button>
                <Link href="/dashboard">
                  <Button>返回控制台</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  const tasks = repo.translationTasks || [];
  const config = repo.config;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={session?.user} />

      <main className="flex-1">
        <div className="container mx-auto px-4 py-6 md:py-8">
          {/* 返回按钮 */}
          <Link href="/dashboard">
            <Button variant="ghost" className="mb-4 -ml-2">
              <ArrowLeft className="mr-2 h-4 w-4" />
              返回仓库列表
            </Button>
          </Link>

          {/* 仓库信息 */}
          <div className="mb-6 md:mb-8">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl md:text-3xl font-bold mb-2 flex items-center gap-2 flex-wrap">
                  <GitBranch className="h-7 w-7 md:h-8 md:w-8 text-primary flex-shrink-0" />
                  <span className="break-all">{repo.fullName}</span>
                </h1>
                <p className="text-muted-foreground">{repo.description || '暂无描述'}</p>
              </div>
              <Link href={`/repo/${id}/config`} className="flex-shrink-0">
                <Button variant="outline" className="w-full md:w-auto">
                  <Settings className="mr-2 h-4 w-4" />
                  配置
                </Button>
              </Link>
            </div>

            {/* 配置信息卡片 */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">翻译配置</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">基准语言</div>
                    <div className="font-medium">{getLanguageName(config?.baseLanguage || 'zh-CN')}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">目标语言</div>
                    <div className="font-medium">
                      {config?.targetLanguages?.length 
                        ? config.targetLanguages.map(getLanguageName).join(", ")
                        : <span className="text-amber-600">未配置</span>}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">默认分支</div>
                    <div className="font-medium">{repo.defaultBranch}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 操作按钮 */}
          <div className="mb-6 md:mb-8">
            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                size="lg" 
                onClick={handleCreateTask} 
                disabled={isCreatingTask || !config?.targetLanguages?.length}
                className="w-full sm:w-auto"
              >
                {isCreatingTask ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    创建中...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-5 w-5" />
                    开始新翻译
                  </>
                )}
              </Button>
              <Link href={`/repo/${id}/config`} className="w-full sm:w-auto">
                <Button size="lg" variant="outline" className="w-full">
                  <Languages className="mr-2 h-5 w-5" />
                  配置翻译选项
                </Button>
              </Link>
            </div>
            {taskError && (
              <div className="mt-3 flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                <p className="text-sm text-destructive">{taskError}</p>
              </div>
            )}
            {!config?.targetLanguages?.length && (
              <p className="mt-3 text-sm text-amber-600 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                请先配置目标翻译语言
              </p>
            )}
          </div>

          {/* 翻译任务列表 */}
          <div className="space-y-4 md:space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl md:text-2xl font-bold">翻译任务</h2>
              {tasks.length > 0 && (
                <Button variant="ghost" size="sm" onClick={() => fetchRepo()}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  刷新
                </Button>
              )}
            </div>
            
            {/* 任务卡片 - 响应式网格 */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
              {tasks.map((task) => {
                const statusConfig = getStatusConfig(task.status);
                const StatusIcon = statusConfig.icon;
                
                return (
                  <Card 
                    key={task.id} 
                    className={`transition-all hover:shadow-md ${statusConfig.borderColor} border-2`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <CardTitle className="text-base md:text-lg">
                              {task.type === "FULL" ? "全量翻译" : "增量翻译"}
                            </CardTitle>
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${statusConfig.bgColor} ${statusConfig.color}`}>
                              <StatusIcon className={`h-3.5 w-3.5 ${statusConfig.animate ? 'animate-spin' : ''}`} />
                              {statusConfig.label}
                            </span>
                          </div>
                          <CardDescription className="mt-1.5 text-sm">
                            {(task.targetLanguages as string[]).map(getLanguageName).join(", ")}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* 进度条 - 更明显的样式 */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">翻译进度</span>
                          <span className={`font-bold ${statusConfig.color}`}>
                            {Math.round(task.progress)}%
                          </span>
                        </div>
                        <div className="relative">
                          <Progress 
                            value={task.progress} 
                            className="h-3"
                          />
                          {task.status === 'RUNNING' && (
                            <div className="absolute inset-0 overflow-hidden rounded-full">
                              <div className="h-full w-full bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse" />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 统计信息 */}
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div className="text-center p-2 rounded-lg bg-muted/50">
                          <div className="text-lg font-bold">{task.totalFiles}</div>
                          <div className="text-xs text-muted-foreground">总文件</div>
                        </div>
                        <div className="text-center p-2 rounded-lg bg-green-500/10">
                          <div className="text-lg font-bold text-green-600">{task.completedFiles}</div>
                          <div className="text-xs text-muted-foreground">已完成</div>
                        </div>
                        <div className="text-center p-2 rounded-lg bg-red-500/10">
                          <div className="text-lg font-bold text-red-600">{task.failedFiles}</div>
                          <div className="text-xs text-muted-foreground">失败</div>
                        </div>
                      </div>

                      {/* 时间和操作 */}
                      <div className="flex items-center justify-between pt-2 border-t">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          {new Date(task.createdAt).toLocaleString("zh-CN", {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                        {task.pullRequestUrl && (
                          <a 
                            href={task.pullRequestUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                          >
                            <Button variant="outline" size="sm" className="h-8">
                              <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                              查看 PR
                            </Button>
                          </a>
                        )}
                      </div>

                      {/* 失败任务的错误提示 */}
                      {task.status === 'FAILED' && (
                        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                          <p className="text-xs text-red-600 flex items-center gap-1.5">
                            <XCircle className="h-3.5 w-3.5 flex-shrink-0" />
                            翻译任务执行失败，请检查配置后重试
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {tasks.length === 0 && (
              <Card className="text-center py-12">
                <CardContent>
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">还没有翻译任务</h3>
                  <p className="text-muted-foreground mb-4">
                    配置好翻译语言后，点击上方按钮创建第一个翻译任务
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
