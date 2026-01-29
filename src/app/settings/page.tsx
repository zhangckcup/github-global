"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Navbar, Footer } from "@/components/layout";
import { 
  ArrowLeft, 
  Save, 
  Key, 
  Trash2, 
  Eye, 
  EyeOff, 
  Loader2, 
  AlertCircle, 
  CheckCircle2,
  LogOut,
  ExternalLink
} from "lucide-react";

interface Usage {
  today: {
    date: string;
    count: number;
    limit: number;
  };
  hasApiKey: boolean;
}

export default function SettingsPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [hasExistingKey, setHasExistingKey] = useState(false);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [isLoadingUsage, setIsLoadingUsage] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // 检查登录状态
  useEffect(() => {
    if (sessionStatus === 'unauthenticated') {
      router.push('/login');
    }
  }, [sessionStatus, router]);

  // 加载使用量信息
  useEffect(() => {
    const fetchUsage = async () => {
      try {
        setIsLoadingUsage(true);
        const response = await fetch('/api/settings/usage');
        if (response.ok) {
          const data = await response.json();
          setUsage(data);
          setHasExistingKey(data.hasApiKey);
        }
      } catch (err) {
        console.error('Fetch usage error:', err);
      } finally {
        setIsLoadingUsage(false);
      }
    };

    if (sessionStatus === 'authenticated') {
      fetchUsage();
    }
  }, [sessionStatus]);

  const handleSaveApiKey = async () => {
    if (!apiKey.trim()) return;
    
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    
    try {
      const response = await fetch('/api/settings/api-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider: 'openrouter',
          apiKey: apiKey.trim(),
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || '保存 API Key 失败');
      }
      
      setSaveSuccess(true);
      setHasExistingKey(true);
      setApiKey("");
      
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      console.error('Save API key error:', err);
      setSaveError(err.message || '保存 API Key 失败');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteApiKey = async () => {
    if (!confirm("确定要删除 API Key 吗？删除后将使用平台托管的 API Key（有每日限制）。")) {
      return;
    }
    
    try {
      const response = await fetch('/api/settings/api-key/current', {
        method: 'DELETE',
      });
      
      if (response.ok) {
        setHasExistingKey(false);
      }
    } catch (err) {
      console.error('Delete API key error:', err);
    }
  };

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await signOut({ callbackUrl: '/' });
    } catch (error) {
      console.error('Logout error:', error);
      setIsLoggingOut(false);
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

  const usagePercentage = usage?.today ? (usage.today.count / usage.today.limit) * 100 : 0;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={session?.user} />

      <main className="flex-1">
        <div className="container mx-auto px-4 py-6 md:py-8 max-w-4xl">
          {/* 返回按钮 */}
          <Link href="/dashboard">
            <Button variant="ghost" className="mb-4 -ml-2">
              <ArrowLeft className="mr-2 h-4 w-4" />
              返回控制台
            </Button>
          </Link>

          {/* 页面标题 */}
          <div className="mb-6 md:mb-8">
            <h1 className="text-2xl md:text-3xl font-bold mb-2">设置</h1>
            <p className="text-muted-foreground">管理你的账户和 API 配置</p>
          </div>

          {/* API Key 配置 */}
          <Card className="mb-4 md:mb-6">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                <Key className="h-5 w-5" />
                OpenRouter API Key
              </CardTitle>
              <CardDescription>
                配置你自己的 OpenRouter API Key，享受无限制翻译
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {hasExistingKey ? (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border rounded-lg bg-green-500/5 border-green-500/20">
                    <div className="flex items-start sm:items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                      <div>
                        <div className="font-medium text-green-600">API Key 已配置</div>
                        <div className="text-sm text-muted-foreground">
                          你的翻译将使用自己的 API Key
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleDeleteApiKey}
                      className="w-full sm:w-auto"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      删除
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    删除后将自动使用平台托管的 API Key（有每日限制）
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      输入你的 OpenRouter API Key
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <div className="relative flex-1">
                        <Input
                          type={showApiKey ? "text" : "password"}
                          placeholder="sk-or-v1-xxxxxxxxxxxxxxxx"
                          value={apiKey}
                          onChange={(e) => setApiKey(e.target.value)}
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowApiKey(!showApiKey)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showApiKey ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      <Button
                        onClick={handleSaveApiKey}
                        disabled={!apiKey.trim() || isSaving}
                        className="w-full sm:w-auto"
                      >
                        {isSaving ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            保存中...
                          </>
                        ) : (
                          <>
                            <Save className="mr-2 h-4 w-4" />
                            保存
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  {saveError && (
                    <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-destructive">{saveError}</p>
                    </div>
                  )}
                  
                  {saveSuccess && (
                    <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <p className="text-sm text-green-600">API Key 保存成功！</p>
                    </div>
                  )}
                  
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>
                      还没有 API Key？{" "}
                      <a
                        href="https://openrouter.ai/keys"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline inline-flex items-center gap-1"
                      >
                        前往 OpenRouter 创建
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </p>
                    <p className="font-medium">配置后的优势:</p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>无每日翻译次数限制</li>
                      <li>更快的翻译速度</li>
                      <li>完全掌控翻译成本</li>
                    </ul>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 使用量统计 */}
          <Card className="mb-4 md:mb-6">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg md:text-xl">今日使用量</CardTitle>
              <CardDescription>
                {hasExistingKey
                  ? "使用自己的 API Key，无平台限制"
                  : "免费用户每日限制"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingUsage ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 text-primary animate-spin" />
                </div>
              ) : hasExistingKey ? (
                <div className="text-center py-6 md:py-8">
                  <Key className="h-10 w-10 md:h-12 md:w-12 text-primary mx-auto mb-4" />
                  <p className="text-lg font-medium mb-2">无限制使用</p>
                  <p className="text-sm text-muted-foreground">
                    你正在使用自己的 API Key，享受无限制翻译服务
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">今日翻译次数</span>
                    <span className="text-xl md:text-2xl font-bold">
                      {usage?.today?.count || 0} / {usage?.today?.limit || 10}
                    </span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2.5">
                    <div
                      className={`h-2.5 rounded-full transition-all ${
                        usagePercentage >= 100 ? 'bg-red-500' : 
                        usagePercentage >= 80 ? 'bg-amber-500' : 'bg-primary'
                      }`}
                      style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {usage?.today?.count === usage?.today?.limit ? (
                      <span className="text-red-600 font-medium">
                        今日翻译次数已达上限，请明天再试或配置自己的 API Key
                      </span>
                    ) : (
                      `还可以进行 ${(usage?.today?.limit || 10) - (usage?.today?.count || 0)} 次翻译任务。配置自己的 API Key 解除限制。`
                    )}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 账户信息 */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg md:text-xl">账户信息</CardTitle>
              <CardDescription>你的 GitHub 账户信息</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                {session?.user?.image ? (
                  <img 
                    src={session.user.image} 
                    alt={session.user.name || 'User'} 
                    className="w-14 h-14 md:w-16 md:h-16 rounded-full"
                  />
                ) : (
                  <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-primary/10 flex items-center justify-center text-xl md:text-2xl font-bold text-primary">
                    {session?.user?.name?.charAt(0) || 'U'}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-base md:text-lg truncate">
                    {session?.user?.name || 'Unknown'}
                  </div>
                  <div className="text-sm text-muted-foreground truncate">
                    {session?.user?.email || ''}
                  </div>
                </div>
              </div>
              <div className="pt-4 border-t">
                <Button 
                  variant="outline" 
                  className="w-full text-destructive hover:text-destructive"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                >
                  {isLoggingOut ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      退出中...
                    </>
                  ) : (
                    <>
                      <LogOut className="mr-2 h-4 w-4" />
                      退出登录
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}
