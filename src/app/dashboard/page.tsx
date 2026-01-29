"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Navbar, Footer } from "@/components/layout";
import { 
  Plus, 
  GitBranch, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  AlertCircle,
  Languages,
  ExternalLink
} from "lucide-react";

// 仓库类型定义
interface Repository {
  id: string;
  fullName: string;
  description: string | null;
  defaultBranch: string;
  lastSyncedAt: string | null;
  config: {
    baseLanguage: string;
    targetLanguages: string[];
  } | null;
  translationTasks: Array<{
    status: string;
    progress: number;
    createdAt: string;
    pullRequestUrl?: string;
  }>;
}

export default function DashboardPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const [repos, setRepos] = useState<Repository[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [repoUrl, setRepoUrl] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  // 检查登录状态
  useEffect(() => {
    if (sessionStatus === 'unauthenticated') {
      router.push('/login');
    }
  }, [sessionStatus, router]);

  // 加载仓库列表
  const fetchRepos = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch('/api/repos');
      
      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login');
          return;
        }
        throw new Error('加载仓库列表失败，请刷新页面重试');
      }
      
      const data = await response.json();
      setRepos(data.repos || []);
    } catch (err: any) {
      console.error('Fetch repos error:', err);
      setError(err.message || '加载仓库列表失败，请刷新页面重试');
    } finally {
      setIsLoading(false);
    }
  };

  // 页面加载时获取仓库列表
  useEffect(() => {
    if (sessionStatus === 'authenticated') {
      fetchRepos();
    }
  }, [sessionStatus]);

  // 导入仓库
  const handleImport = async () => {
    if (!repoUrl.trim()) return;
    
    setIsImporting(true);
    setImportError(null);
    
    try {
      const response = await fetch('/api/repos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ repoUrl }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        // 根据错误类型给出友好提示
        if (response.status === 401) {
          // 检查是否是 installation 过期
          if (data.code === 'INSTALLATION_EXPIRED') {
            router.push('/setup');
            throw new Error('GitHub App 授权已过期，正在跳转重新安装...');
          }
          throw new Error('登录已过期，请重新登录');
        } else if (response.status === 403) {
          throw new Error('没有权限访问该仓库，请检查 GitHub App 是否已授权');
        } else if (response.status === 404) {
          throw new Error('仓库不存在，请检查 URL 是否正确');
        } else if (data.error?.includes('already exists')) {
          throw new Error('该仓库已经导入过了');
        }
        throw new Error(data.error || '导入仓库失败，请稍后重试');
      }
      
      // 导入成功，刷新列表
      setRepoUrl("");
      await fetchRepos();
    } catch (err: any) {
      console.error('Import repo error:', err);
      setImportError(err.message || '导入仓库失败，请检查 URL 是否正确');
    } finally {
      setIsImporting(false);
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return {
          icon: CheckCircle2,
          color: "text-green-500",
          bgColor: "bg-green-500/10",
          label: "已完成"
        };
      case "RUNNING":
        return {
          icon: Loader2,
          color: "text-blue-500",
          bgColor: "bg-blue-500/10",
          label: "运行中",
          animate: true
        };
      case "FAILED":
        return {
          icon: XCircle,
          color: "text-red-500",
          bgColor: "bg-red-500/10",
          label: "失败"
        };
      default:
        return {
          icon: Clock,
          color: "text-muted-foreground",
          bgColor: "bg-muted",
          label: "等待中"
        };
    }
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

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={session?.user} />

      <main className="flex-1">
        <div className="container mx-auto px-4 py-6 md:py-8">
          {/* 页面标题 */}
          <div className="mb-6 md:mb-8">
            <h1 className="text-2xl md:text-3xl font-bold mb-2">我的仓库</h1>
            <p className="text-muted-foreground">管理你的翻译项目</p>
          </div>

          {/* 导入仓库卡片 */}
          <Card className="mb-6 md:mb-8">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                <Plus className="h-5 w-5" />
                导入新仓库
              </CardTitle>
              <CardDescription>
                输入 GitHub 仓库 URL 开始翻译
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-3">
                <Input
                  placeholder="https://github.com/username/repo-name"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleImport()}
                  className="flex-1"
                />
                <Button 
                  onClick={handleImport} 
                  disabled={!repoUrl.trim() || isImporting}
                  className="w-full sm:w-auto"
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      导入中...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      导入仓库
                    </>
                  )}
                </Button>
              </div>
              {importError && (
                <div className="mt-3 flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-destructive">{importError}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 加载状态 */}
          {isLoading && (
            <Card className="text-center py-12">
              <CardContent>
                <Loader2 className="h-12 w-12 text-primary mx-auto mb-4 animate-spin" />
                <p className="text-muted-foreground">加载中...</p>
              </CardContent>
            </Card>
          )}

          {/* 错误提示 */}
          {error && !isLoading && (
            <Card className="text-center py-12 border-destructive">
              <CardContent>
                <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                <p className="text-destructive mb-4">{error}</p>
                <Button onClick={fetchRepos} variant="outline">
                  重试
                </Button>
              </CardContent>
            </Card>
          )}

          {/* 仓库列表 - 响应式网格 */}
          {!isLoading && !error && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
              {repos.map((repo) => {
                const latestTask = repo.translationTasks?.[0] || null;
                const config = repo.config;
                const statusConfig = latestTask ? getStatusConfig(latestTask.status) : null;
                
                return (
                  <Card 
                    key={repo.id} 
                    className="hover:border-primary/50 hover:shadow-md transition-all flex flex-col"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="flex items-center gap-2 text-base md:text-lg truncate">
                            <GitBranch className="h-5 w-5 text-primary flex-shrink-0" />
                            <span className="truncate">{repo.fullName}</span>
                          </CardTitle>
                          <CardDescription className="mt-1 line-clamp-2">
                            {repo.description || '暂无描述'}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col justify-between gap-4">
                      {/* 配置信息 */}
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Languages className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">目标语言:</span>
                          <span className="font-medium truncate">
                            {config?.targetLanguages?.length 
                              ? config.targetLanguages.join(", ")
                              : '未配置'}
                          </span>
                        </div>
                        
                        {/* 最新任务状态 */}
                        <div className="flex items-center gap-2">
                          {statusConfig ? (
                            <>
                              <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${statusConfig.bgColor} ${statusConfig.color}`}>
                                <statusConfig.icon className={`h-3.5 w-3.5 ${statusConfig.animate ? 'animate-spin' : ''}`} />
                                {statusConfig.label}
                              </div>
                              {latestTask?.pullRequestUrl && (
                                <a 
                                  href={latestTask.pullRequestUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-primary hover:underline flex items-center gap-1"
                                >
                                  查看 PR <ExternalLink className="h-3 w-3" />
                                </a>
                              )}
                            </>
                          ) : (
                            <span className="text-xs text-muted-foreground">暂无翻译任务</span>
                          )}
                        </div>
                      </div>

                      {/* 操作按钮 */}
                      <Link href={`/repo/${repo.id}`} className="block">
                        <Button className="w-full" variant="outline">
                          管理仓库
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                );
              })}

              {repos.length === 0 && (
                <Card className="text-center py-12 col-span-full">
                  <CardContent>
                    <GitBranch className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">还没有仓库</h3>
                    <p className="text-muted-foreground mb-4">
                      导入你的第一个 GitHub 仓库开始翻译
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
