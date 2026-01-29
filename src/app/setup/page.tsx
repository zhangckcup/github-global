"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Navbar, Footer } from "@/components/layout";
import { CheckCircle2, AlertCircle, Loader2, ExternalLink, RefreshCw } from "lucide-react";

export default function SetupPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [hasInstallation, setHasInstallation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [installUrl, setInstallUrl] = useState<string>('');
  const [isLoadingUrl, setIsLoadingUrl] = useState(true);
  
  // 新窗口打开和轮询相关状态
  const [isWaitingForInstall, setIsWaitingForInstall] = useState(false);
  const [pollCount, setPollCount] = useState(0);
  const [hasAutoOpened, setHasAutoOpened] = useState(false); // 防止重复自动打开
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const installWindowRef = useRef<Window | null>(null);

  // 检查是否已安装 GitHub App（静默模式，不显示加载状态）
  const checkInstallationSilent = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch('/api/github/installations');
      
      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login');
          return false;
        }
        return false;
      }

      const data = await response.json();
      return data.totalCount > 0;
    } catch (err) {
      console.error('Check installation error:', err);
      return false;
    }
  }, [router]);

  // 检查是否已安装 GitHub App（带加载状态）
  const checkInstallation = useCallback(async () => {
    try {
      setIsChecking(true);
      setError(null);

      const response = await fetch('/api/github/installations');
      
      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login');
          return;
        }
        throw new Error('检查安装状态失败');
      }

      const data = await response.json();
      
      if (data.totalCount > 0) {
        setHasInstallation(true);
        // 停止轮询
        stopPolling();
        // 安装成功，跳转到控制台
        setTimeout(() => {
          router.push('/dashboard');
        }, 1500);
      } else {
        setHasInstallation(false);
      }
    } catch (err: any) {
      console.error('Check installation error:', err);
      setError(err.message || '检查安装状态失败');
    } finally {
      setIsChecking(false);
    }
  }, [router]);

  // 停止轮询
  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    setIsWaitingForInstall(false);
    setPollCount(0);
  }, []);

  // 开始轮询检查安装状态
  const startPolling = useCallback(() => {
    // 如果已经在轮询，先停止
    stopPolling();
    
    setIsWaitingForInstall(true);
    setPollCount(0);

    // 每 3 秒检查一次安装状态
    pollIntervalRef.current = setInterval(async () => {
      setPollCount(prev => prev + 1);
      
      const installed = await checkInstallationSilent();
      
      if (installed) {
        // 安装成功！
        stopPolling();
        setHasInstallation(true);
        
        // 尝试关闭安装窗口（可能因为跨域被阻止）
        try {
          if (installWindowRef.current && !installWindowRef.current.closed) {
            installWindowRef.current.close();
          }
        } catch (e) {
          // 忽略跨域错误
        }
        
        // 跳转到控制台
        setTimeout(() => {
          router.push('/dashboard');
        }, 1500);
      }
    }, 3000);

    // 最多轮询 2 分钟（40 次）
    setTimeout(() => {
      if (pollIntervalRef.current) {
        stopPolling();
      }
    }, 120000);
  }, [checkInstallationSilent, stopPolling, router]);

  // 在新窗口打开 GitHub App 安装页面
  const openInstallWindow = useCallback(() => {
    if (!installUrl) return;

    // 在新窗口打开 GitHub App 安装页面
    const width = 1000;
    const height = 700;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;
    
    installWindowRef.current = window.open(
      installUrl,
      'github-app-install',
      `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=yes,status=no`
    );

    // 开始轮询检查安装状态
    startPolling();
  }, [installUrl, startPolling]);

  // 获取安装 URL
  useEffect(() => {
    const fetchInstallUrl = async () => {
      try {
        const response = await fetch('/api/github/install-url');
        const data = await response.json();
        
        if (data.installUrl) {
          setInstallUrl(data.installUrl);
        } else {
          setError(data.error || '无法获取安装链接');
        }
      } catch (err: any) {
        console.error('Fetch install URL error:', err);
        setError('获取安装链接失败');
      } finally {
        setIsLoadingUrl(false);
      }
    };

    fetchInstallUrl();
  }, []);

  // 检查 URL 中是否有 installation_id 参数（从 GitHub 回调，用于新窗口关闭后的情况）
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const installationId = params.get('installation_id');
    
    if (installationId) {
      // 用户刚完成安装，先保存 installationId，再检查
      const saveAndCheck = async () => {
        try {
          // 调用 callback API 保存 installationId
          const response = await fetch('/api/github/callback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ installationId }),
          });
          
          if (!response.ok) {
            console.error('Failed to save installation ID');
          } else {
            console.log('Installation ID saved successfully');
          }
        } catch (err) {
          console.error('Save installation ID error:', err);
        }
        
        // 无论保存是否成功，都检查安装状态
        checkInstallation();
      };
      
      saveAndCheck();
    }
  }, [checkInstallation]);

  // 初始检查安装状态
  useEffect(() => {
    if (sessionStatus === 'authenticated') {
      checkInstallation();
    } else if (sessionStatus === 'unauthenticated') {
      router.push('/login');
    }
  }, [sessionStatus, checkInstallation, router]);

  // 自动打开 GitHub App 安装窗口
  // 条件：初始检查完成、用户未安装、有安装 URL、还没有自动打开过、不是从 GitHub 回调回来的
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const installationId = params.get('installation_id');
    
    if (
      !isChecking && 
      !hasInstallation && 
      installUrl && 
      !hasAutoOpened && 
      !installationId &&
      !isWaitingForInstall
    ) {
      setHasAutoOpened(true);
      // 短暂延迟后自动打开，让用户有时间看到页面
      setTimeout(() => {
        openInstallWindow();
      }, 500);
    }
  }, [isChecking, hasInstallation, installUrl, hasAutoOpened, isWaitingForInstall, openInstallWindow]);

  // 组件卸载时清理轮询
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

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

  // 检查安装状态中（初始加载）
  if (isChecking && !isWaitingForInstall) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar user={session?.user} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-12 w-12 text-primary mx-auto mb-4 animate-spin" />
            <p className="text-muted-foreground">检查安装状态...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // 已安装，显示成功信息
  if (hasInstallation) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar user={session?.user} />
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="max-w-md text-center">
            <CardContent className="pt-12 pb-8">
              <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">设置完成！</h2>
              <p className="text-muted-foreground mb-4">
                GitHub App 安装成功，正在跳转到控制台...
              </p>
              <Loader2 className="h-6 w-6 text-primary mx-auto animate-spin" />
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  // 未安装，显示安装页面
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={session?.user} />
      
      <main className="flex-1">
        <div className="container mx-auto px-4 py-16 max-w-3xl">
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">完成最后一步设置</h1>
            <p className="text-lg md:text-xl text-muted-foreground">
              安装 GitHub App 以授权访问你的仓库
            </p>
          </div>

          {/* 等待安装中的状态卡片 */}
          {isWaitingForInstall && (
            <Card className="mb-8 border-primary/50 bg-primary/5">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center">
                  <div className="relative mb-4">
                    <Loader2 className="h-12 w-12 text-primary animate-spin" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">等待安装完成...</h3>
                  <p className="text-muted-foreground mb-4">
                    请在新打开的窗口中完成 GitHub App 的安装授权
                  </p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>正在检查安装状态 ({pollCount} 次)</span>
                  </div>
                  <div className="mt-4 flex gap-3">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={openInstallWindow}
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      重新打开安装窗口
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={stopPolling}
                    >
                      取消等待
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-500" />
                为什么需要安装 GitHub App？
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                GitHub Global 使用 GitHub App 来访问你的仓库。相比传统的 OAuth 授权，GitHub App 提供：
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong>更细粒度的权限控制</strong> - 只请求必要的权限
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong>更高的安全性</strong> - Token 自动过期，降低泄露风险
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong>选择性授权</strong> - 你可以选择授权哪些仓库
                  </div>
                </li>
              </ul>
            </CardContent>
          </Card>

          <div className="flex flex-col items-center gap-4">
            {isLoadingUrl ? (
              <Button size="lg" disabled className="w-full max-w-md">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                加载中...
              </Button>
            ) : installUrl ? (
              <Button 
                size="lg" 
                className="w-full max-w-md"
                onClick={openInstallWindow}
                disabled={isWaitingForInstall}
              >
                <ExternalLink className="mr-2 h-5 w-5" />
                {isWaitingForInstall ? '等待安装中...' : '安装 GitHub App'}
              </Button>
            ) : (
              <div className="w-full max-w-md p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  <AlertCircle className="h-4 w-4 inline mr-2" />
                  请在 .env 文件中配置 <code className="bg-amber-100 dark:bg-amber-900 px-1 py-0.5 rounded">GITHUB_APP_SLUG</code>
                </p>
              </div>
            )}

            <Button 
              variant="outline"
              size="lg"
              onClick={checkInstallation}
              disabled={isChecking}
              className="w-full max-w-md"
            >
              {isChecking ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  检查中...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  手动检查安装状态
                </>
              )}
            </Button>

            {error && (
              <div className="mt-4 p-4 bg-destructive/10 border border-destructive rounded-lg text-destructive text-sm max-w-md w-full">
                <AlertCircle className="h-4 w-4 inline mr-2" />
                {error}
              </div>
            )}
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
