// GitHub Webhook 接收 API
// 处理 push 事件，自动触发增量翻译

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyWebhookSignature, getWebhookSecret } from '@/lib/github/webhook';
import { translationQueue } from '@/lib/queue/local-queue';
import { executeIncrementalTranslation } from '@/lib/translation/engine';

// Webhook 事件类型
interface PushEvent {
  ref: string;
  repository: {
    id: number;
    full_name: string;
    default_branch: string;
  };
  commits: Array<{
    id: string;
    added: string[];
    modified: string[];
    removed: string[];
  }>;
  head_commit: {
    id: string;
    message: string;
  } | null;
  sender: {
    login: string;
  };
}

// 用于 Webhook 去重的缓存（存储已处理的 delivery ID）
// 使用 Map 存储 delivery ID 和过期时间，防止重复处理
const processedDeliveries = new Map<string, number>();
const DELIVERY_CACHE_TTL = 60 * 1000; // 60秒过期

// 清理过期的 delivery 缓存
function cleanupDeliveryCache() {
  const now = Date.now();
  for (const [id, expireAt] of processedDeliveries.entries()) {
    if (now > expireAt) {
      processedDeliveries.delete(id);
    }
  }
}

// 初始化队列处理器（增量翻译）
translationQueue.setProcessor(async (data) => {
  if (data.type === 'INCREMENTAL' && data.changedFiles) {
    return await executeIncrementalTranslation(data);
  }
  // 导入原有的全量翻译
  const { executeTranslation } = await import('@/lib/translation/engine');
  return await executeTranslation(data);
});

/**
 * POST /api/webhooks/github - 接收 GitHub Webhook
 */
export async function POST(request: NextRequest) {
  try {
    // 0. 请求去重 - 使用 GitHub 提供的 Delivery ID
    const deliveryId = request.headers.get('x-github-delivery');
    if (deliveryId) {
      // 清理过期缓存
      cleanupDeliveryCache();
      
      // 检查是否已处理过
      if (processedDeliveries.has(deliveryId)) {
        console.log(`[Webhook] Duplicate delivery ignored: ${deliveryId}`);
        return NextResponse.json({ message: 'Duplicate delivery ignored' });
      }
      
      // 标记为已处理
      processedDeliveries.set(deliveryId, Date.now() + DELIVERY_CACHE_TTL);
    }

    // 1. 获取原始请求体
    const payload = await request.text();

    // 2. 验证 Webhook 签名
    const signature = request.headers.get('x-hub-signature-256');
    if (!signature) {
      console.log('[Webhook] Missing signature header');
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
    }

    let secret: string;
    try {
      secret = getWebhookSecret();
    } catch {
      console.error('[Webhook] GITHUB_WEBHOOK_SECRET not configured');
      return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
    }

    if (!verifyWebhookSignature(payload, signature, secret)) {
      console.log('[Webhook] Invalid signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // 3. 获取事件类型
    const event = request.headers.get('x-github-event');
    console.log(`[Webhook] Received event: ${event}, delivery: ${deliveryId}`);

    // 4. 只处理 push 事件
    if (event !== 'push') {
      console.log(`[Webhook] Ignoring event: ${event}`);
      return NextResponse.json({ message: 'Event ignored' });
    }

    // 5. 解析事件数据
    const data: PushEvent = JSON.parse(payload);
    const { repository, commits, ref, head_commit } = data;

    // 6. 只处理默认分支的 push
    const branchName = ref.replace('refs/heads/', '');
    if (branchName !== repository.default_branch) {
      console.log(`[Webhook] Ignoring push to non-default branch: ${branchName}`);
      return NextResponse.json({ message: 'Non-default branch ignored' });
    }

    // 7. 忽略来自 GitHub Global 的提交（避免循环触发）
    if (head_commit?.message.startsWith('[GitHub Global]')) {
      console.log('[Webhook] Ignoring commit from GitHub Global');
      return NextResponse.json({ message: 'Self-commit ignored' });
    }

    console.log(`[Webhook] Processing push to ${repository.full_name}`);

    // 8. 查找仓库配置
    const repo = await prisma.repository.findFirst({
      where: { githubRepoId: repository.id },
      include: { 
        config: true,
        user: true,
      },
    });

    if (!repo) {
      console.log(`[Webhook] Repository not found: ${repository.full_name}`);
      return NextResponse.json({ message: 'Repository not imported' });
    }

    if (!repo.config) {
      console.log(`[Webhook] Repository not configured: ${repository.full_name}`);
      return NextResponse.json({ message: 'Repository not configured' });
    }

    // 9. 检查是否启用自动翻译
    if (!repo.config.autoTranslate) {
      console.log(`[Webhook] Auto-translate disabled for: ${repository.full_name}`);
      return NextResponse.json({ message: 'Auto-translate disabled' });
    }

    // 10. 提取所有变更的文件
    const changedFiles = new Set<string>();
    for (const commit of commits) {
      commit.added.forEach(file => changedFiles.add(file));
      commit.modified.forEach(file => changedFiles.add(file));
      // 注意：不处理 removed 文件（删除的文件不需要翻译）
    }

    console.log(`[Webhook] Changed files: ${Array.from(changedFiles).join(', ')}`);

    // 11. 筛选待翻译的文件
    const includePaths = repo.config.includePaths as string[] | null;
    const excludePaths = repo.config.excludePaths as string[] | null;
    
    const filesToTranslate = filterFilesToTranslate(
      Array.from(changedFiles),
      includePaths,
      excludePaths
    );

    if (filesToTranslate.length === 0) {
      console.log('[Webhook] No files to translate after filtering');
      return NextResponse.json({ message: 'No translatable files changed' });
    }

    console.log(`[Webhook] Files to translate: ${filesToTranslate.join(', ')}`);

    // 12. 获取目标语言
    const targetLanguages = repo.config.targetLanguages as string[];
    if (!targetLanguages || targetLanguages.length === 0) {
      console.log('[Webhook] No target languages configured');
      return NextResponse.json({ message: 'No target languages configured' });
    }

    // 13. 创建增量翻译任务
    const task = await prisma.translationTask.create({
      data: {
        userId: repo.userId,
        repositoryId: repo.id,
        targetLanguages,
        type: 'INCREMENTAL',
      },
    });

    console.log(`[Webhook] Created translation task: ${task.id}`);

    // 14. 添加到任务队列
    await translationQueue.add({
      taskId: task.id,
      userId: repo.userId,
      repositoryId: repo.id,
      targetLanguages,
      type: 'INCREMENTAL',
      changedFiles: filesToTranslate,
    });

    return NextResponse.json({
      success: true,
      message: 'Translation task created',
      taskId: task.id,
      files: filesToTranslate,
    });
  } catch (error) {
    console.error('[Webhook] Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * 筛选待翻译的文件
 */
function filterFilesToTranslate(
  files: string[],
  includePaths: string[] | null,
  excludePaths: string[] | null
): string[] {
  return files.filter(file => {
    // 1. 必须是 Markdown 文件
    if (!file.endsWith('.md') && !file.endsWith('.mdx')) {
      return false;
    }

    // 2. 排除 translations/ 目录下的文件（已翻译的文件）
    if (file.startsWith('translations/')) {
      return false;
    }

    // 3. 检查是否在排除路径中
    if (excludePaths && excludePaths.some(pattern => matchPath(file, pattern))) {
      return false;
    }

    // 4. 如果指定了包含路径，检查是否匹配
    if (includePaths && includePaths.length > 0) {
      return includePaths.some(pattern => matchPath(file, pattern));
    }

    return true;
  });
}

/**
 * 简单的路径匹配（支持 ** 和 * 通配符）
 */
function matchPath(path: string, pattern: string): boolean {
  // 将 ** 替换为 .*，将 * 替换为 [^/]*
  const regexPattern = pattern
    .replace(/\*\*/g, '.*')
    .replace(/\*/g, '[^/]*')
    .replace(/\./g, '\\.');
  
  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(path);
}
