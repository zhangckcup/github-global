"use client";

import { Globe, Heart, ExternalLink } from "lucide-react";

const footerLinks = [
  {
    title: "相关链接",
    links: [
      { name: "鱼皮的网站", url: "https://dogyupi.com" },
      { name: "编程导航", url: "https://www.codefather.cn" },
      { name: "面试刷题", url: "https://mianshiya.com" },
      { name: "老鱼简历", url: "https://laoyujianli.com" },
    ],
  },
  {
    title: "开源项目",
    links: [
      { name: "GitHub", url: "https://github.com/liyupi" },
      { name: "代码小抄", url: "https://www.codecopy.cn" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t bg-muted/30 mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 sm:col-span-2 lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <Globe className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold">GitHub Global</span>
            </div>
            <p className="text-sm text-muted-foreground mb-4 max-w-md">
              一站式 GitHub 仓库多语言翻译 SaaS 平台，帮助开源项目作者将文档自动翻译成多种语言，扩大国际影响力。
            </p>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              Made with <Heart className="h-4 w-4 text-red-500 fill-red-500" /> by{" "}
              <a
                href="https://dogyupi.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline font-medium"
              >
                程序员鱼皮
              </a>
            </p>
          </div>

          {/* Links */}
          {footerLinks.map((section) => (
            <div key={section.title}>
              <h3 className="font-semibold mb-3">{section.title}</h3>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.name}>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 group"
                    >
                      {link.name}
                      <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Copyright */}
        <div className="border-t mt-8 pt-6 text-center">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} GitHub Global. Powered by Next.js + OpenRouter + GitHub App
          </p>
        </div>
      </div>
    </footer>
  );
}
