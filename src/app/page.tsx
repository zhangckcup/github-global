"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Navbar, Footer } from "@/components/layout";
import { 
  Globe, 
  Zap, 
  Shield, 
  RefreshCw, 
  Languages, 
  GitPullRequest,
  ArrowRight,
  CheckCircle2,
  Loader2
} from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "即开即用",
    description: "无需配置 GitHub Actions，在线操作一键完成翻译",
  },
  {
    icon: Languages,
    title: "多语言支持",
    description: "支持 20+ 种语言，覆盖全球主流语种",
  },
  {
    icon: RefreshCw,
    title: "智能同步",
    description: "自动检测变更，增量翻译节省时间和成本",
  },
  {
    icon: Shield,
    title: "安全可靠",
    description: "细粒度权限控制，Token 自动过期更安全",
  },
  {
    icon: GitPullRequest,
    title: "PR 自动创建",
    description: "翻译结果自动提交 PR，方便审阅和合并",
  },
  {
    icon: Globe,
    title: "多模型选择",
    description: "通过 OpenRouter 统一接入多种 AI 模型",
  },
];

export default function Home() {
  const { data: session, status } = useSession();
  const isLoading = status === "loading";

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={session?.user} />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-16 md:py-24 lg:py-32 px-4">
          <div className="container mx-auto text-center max-w-4xl">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <Globe className="h-4 w-4" />
              让你的开源项目走向全球
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              一站式 GitHub 仓库
              <span className="text-primary block md:inline"> 多语言翻译平台</span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              帮助开源项目作者将文档自动翻译成多种语言，扩大国际影响力。
              零配置，一键翻译，AI 驱动。
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {isLoading ? (
                <Button size="lg" disabled>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  加载中...
                </Button>
              ) : session?.user ? (
                <Link href="/dashboard">
                  <Button size="lg" className="w-full sm:w-auto">
                    进入控制台
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              ) : (
                <Link href="/login">
                  <Button size="lg" className="w-full sm:w-auto">
                    使用 GitHub 登录
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              )}
              <a 
                href="https://github.com/liyupi/github-global" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  查看源码
                </Button>
              </a>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16 md:py-24 px-4 bg-muted/30">
          <div className="container mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">核心特性</h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                相比现有方案，我们提供更简单、更高效的翻译体验
              </p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="bg-background rounded-xl p-6 border hover:border-primary/50 hover:shadow-lg transition-all"
                >
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 text-primary mb-4">
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="py-16 md:py-24 px-4">
          <div className="container mx-auto max-w-4xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">三步完成翻译</h2>
              <p className="text-muted-foreground text-lg">
                简单几步，让你的项目支持多语言
              </p>
            </div>
            
            <div className="space-y-8">
              {[
                {
                  step: "1",
                  title: "导入仓库",
                  description: "输入 GitHub 仓库 URL，一键导入到平台",
                },
                {
                  step: "2",
                  title: "配置翻译",
                  description: "选择基准语言和目标语言，配置翻译范围",
                },
                {
                  step: "3",
                  title: "开始翻译",
                  description: "点击翻译按钮，AI 自动完成翻译并创建 PR",
                },
              ].map((item) => (
                <div key={item.step} className="flex gap-6 items-start">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold">
                    {item.step}
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                    <p className="text-muted-foreground">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 md:py-24 px-4 bg-primary text-primary-foreground">
          <div className="container mx-auto text-center max-w-2xl">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              准备好让项目走向全球了吗？
            </h2>
            <p className="text-lg opacity-90 mb-8">
              立即开始，让全世界的开发者都能阅读你的文档
            </p>
            {isLoading ? (
              <Button size="lg" variant="secondary" disabled>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                加载中...
              </Button>
            ) : session?.user ? (
              <Link href="/dashboard">
                <Button size="lg" variant="secondary">
                  进入控制台
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            ) : (
              <Link href="/login">
                <Button size="lg" variant="secondary">
                  免费开始使用
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
