// 仓库配置 API

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { getInstallationOctokit, getUserOctokit } from '@/lib/github/client';
import { createWebhook, deleteWebhook, getWebhookUrl, getWebhookSecret } from '@/lib/github/webhook';
import { decrypt } from '@/lib/crypto';
import { UpdateRepoConfigRequest } from '@/types';

/**
 * PUT /api/repos/:id/config - 更新仓库配置
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const repository = await prisma.repository.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      include: { config: true, user: true },
    });

    if (!repository) {
      return NextResponse.json(
        { error: 'Repository not found' },
        { status: 404 }
      );
    }

    const body: UpdateRepoConfigRequest = await request.json();
    const { baseLanguage, targetLanguages, includePaths, excludePaths, aiModel, autoTranslate } = body;

    // 处理自动翻译开关变更
    let webhookId = repository.config?.webhookId;
    
    if (autoTranslate !== undefined) {
      const currentAutoTranslate = repository.config?.autoTranslate ?? false;
      
      // 获取 GitHub Octokit 客户端
      let octokit;
      if (repository.user.installationId) {
        try {
          octokit = await getInstallationOctokit(repository.user.installationId);
        } catch (error) {
          console.error('[Config] GitHub App authentication failed:', error);
          if (repository.user.accessToken) {
            const accessToken = decrypt(repository.user.accessToken);
            octokit = getUserOctokit(accessToken);
          } else {
            return NextResponse.json(
              { error: 'GitHub authentication failed. Please reinstall the GitHub App.' },
              { status: 401 }
            );
          }
        }
      } else if (repository.user.accessToken) {
        const accessToken = decrypt(repository.user.accessToken);
        octokit = getUserOctokit(accessToken);
      } else {
        return NextResponse.json(
          { error: 'No GitHub authentication available.' },
          { status: 401 }
        );
      }

      // 开启自动翻译：创建 Webhook
      if (autoTranslate && !currentAutoTranslate) {
        console.log(`[Config] Enabling auto-translate for ${repository.fullName}`);
        
        try {
          const webhookUrl = getWebhookUrl();
          const webhookSecret = getWebhookSecret();
          
          webhookId = await createWebhook(octokit, repository.owner, repository.name, {
            url: webhookUrl,
            secret: webhookSecret,
            events: ['push'],
          });
          
          console.log(`[Config] Created webhook ${webhookId} for ${repository.fullName}`);
        } catch (error: any) {
          console.error('[Config] Failed to create webhook:', error);
          
          // 如果 webhook 已存在，尝试获取错误信息
          if (error.status === 422) {
            return NextResponse.json(
              { error: 'Webhook already exists or configuration error. Please check your repository settings.' },
              { status: 422 }
            );
          }
          
          return NextResponse.json(
            { error: `Failed to create webhook: ${error.message}` },
            { status: 500 }
          );
        }
      }
      
      // 关闭自动翻译：删除 Webhook
      if (!autoTranslate && currentAutoTranslate && webhookId) {
        console.log(`[Config] Disabling auto-translate for ${repository.fullName}`);
        
        try {
          await deleteWebhook(octokit, repository.owner, repository.name, webhookId);
          webhookId = null;
          console.log(`[Config] Deleted webhook for ${repository.fullName}`);
        } catch (error: any) {
          console.error('[Config] Failed to delete webhook:', error);
          // 即使删除失败也继续，webhook 可能已被手动删除
        }
      }
    }

    // 更新或创建配置
    const config = await prisma.repoConfig.upsert({
      where: { repositoryId: id },
      update: {
        ...(baseLanguage && { baseLanguage }),
        ...(targetLanguages && { targetLanguages }),
        ...(includePaths !== undefined && { includePaths }),
        ...(excludePaths !== undefined && { excludePaths }),
        ...(aiModel !== undefined && { aiModel }),
        ...(autoTranslate !== undefined && { autoTranslate }),
        ...(webhookId !== undefined && { webhookId }),
      },
      create: {
        repositoryId: id,
        baseLanguage: baseLanguage || 'zh-CN',
        targetLanguages: targetLanguages || ['en'],
        includePaths: includePaths || null,
        excludePaths: excludePaths || null,
        aiModel: aiModel || null,
        autoTranslate: autoTranslate || false,
        webhookId: webhookId || null,
      },
    });

    return NextResponse.json({
      success: true,
      config,
    });
  } catch (error) {
    console.error('Update config error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
