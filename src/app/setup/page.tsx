"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Navbar, Footer } from "@/components/layout";
import { Globe, CheckCircle2, AlertCircle, Loader2, ExternalLink } from "lucide-react";

export default function SetupPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [hasInstallation, setHasInstallation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [installUrl, setInstallUrl] = useState<string>('');
  const [isLoadingUrl, setIsLoadingUrl] = useState(true);
  const [autoRedirecting, setAutoRedirecting] = useState(false);

  // 检查是否已安装 GitHub App
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

  // 获取安装 URL 并自动跳转
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

  // 检查 URL 中是否有 installation_id 参数（从 GitHub 回调）
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

  // 如果未安装且获取到安装 URL，自动跳转到 GitHub 安装页面
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const installationId = params.get('installation_id');
    
    // 只有在以下条件满足时才自动跳转：
    // 1. 不在检查中
    // 2. 没有已安装
    // 3. 有安装 URL
    // 4. 不是从 GitHub 回调回来的（没有 installation_id）
    // 5. 还没有开始自动跳转
    if (!isChecking && !hasInstallation && installUrl && !installationId && !autoRedirecting) {
      setAutoRedirecting(true);
      // 自动跳转到 GitHub App 安装页面
      setTimeout(() => {
        window.location.href = installUrl;
      }, 1000);
    }
  }, [isChecking, hasInstallation, installUrl, autoRedirecting]);

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

  // 检查安装状态中
  if (isChecking) {
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
                正在跳转到控制台...
              </p>
              <Loader2 className="h-6 w-6 text-primary mx-auto animate-spin" />
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  // 正在自动跳转到 GitHub
  if (autoRedirecting) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar user={session?.user} />
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="max-w-md text-center">
            <CardContent className="pt-12 pb-8">
              <Loader2 className="h-16 w-16 text-primary mx-auto mb-4 animate-spin" />
              <h2 className="text-2xl font-bold mb-2">正在跳转到 GitHub</h2>
              <p className="text-muted-foreground mb-4">
                请在 GitHub 页面完成 App 安装授权...
              </p>
              <p className="text-sm text-muted-foreground">
                如果没有自动跳转，
                <a href={installUrl} className="text-primary hover:underline">
                  请点击这里
                </a>
              </p>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  // 未安装，显示手动安装页面（备用）
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
              <a href={installUrl} className="w-full max-w-md">
                <Button size="lg" className="w-full">
                  <ExternalLink className="mr-2 h-5 w-5" />
                  安装 GitHub App
                </Button>
              </a>
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
                  重新检查安装状态
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
