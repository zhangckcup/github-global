// GitHub Webhook 管理模块

import { Octokit } from 'octokit';
import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Webhook 配置
 */
export interface WebhookConfig {
  url: string;
  secret: string;
  events: string[];
}

/**
 * 创建 GitHub Webhook
 * @returns Webhook ID
 */
export async function createWebhook(
  octokit: Octokit,
  owner: string,
  repo: string,
  config: WebhookConfig
): Promise<number> {
  const { data } = await octokit.rest.repos.createWebhook({
    owner,
    repo,
    config: {
      url: config.url,
      content_type: 'json',
      secret: config.secret,
      insecure_ssl: '0',
    },
    events: config.events,
    active: true,
  });

  console.log(`[Webhook] Created webhook ${data.id} for ${owner}/${repo}`);
  return data.id;
}

/**
 * 删除 GitHub Webhook
 */
export async function deleteWebhook(
  octokit: Octokit,
  owner: string,
  repo: string,
  hookId: number
): Promise<void> {
  try {
    await octokit.rest.repos.deleteWebhook({
      owner,
      repo,
      hook_id: hookId,
    });
    console.log(`[Webhook] Deleted webhook ${hookId} for ${owner}/${repo}`);
  } catch (error: any) {
    // 如果 webhook 不存在（404），忽略错误
    if (error.status === 404) {
      console.log(`[Webhook] Webhook ${hookId} not found, skipping delete`);
      return;
    }
    throw error;
  }
}

/**
 * 检查 Webhook 是否存在
 */
export async function webhookExists(
  octokit: Octokit,
  owner: string,
  repo: string,
  hookId: number
): Promise<boolean> {
  try {
    await octokit.rest.repos.getWebhook({
      owner,
      repo,
      hook_id: hookId,
    });
    return true;
  } catch (error: any) {
    if (error.status === 404) {
      return false;
    }
    throw error;
  }
}

/**
 * 验证 Webhook 签名
 * @param payload 原始请求体字符串
 * @param signature 请求头中的签名 (x-hub-signature-256)
 * @param secret Webhook 密钥
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  if (!signature || !signature.startsWith('sha256=')) {
    return false;
  }

  const hmac = createHmac('sha256', secret);
  const digest = 'sha256=' + hmac.update(payload).digest('hex');

  // 使用 timing-safe comparison 防止时序攻击
  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
  } catch {
    return false;
  }
}

/**
 * 获取 Webhook URL（基于当前环境）
 */
export function getWebhookUrl(): string {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3123';
  return `${baseUrl}/api/webhooks/github`;
}

/**
 * 获取 Webhook Secret
 */
export function getWebhookSecret(): string {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error('GITHUB_WEBHOOK_SECRET not configured');
  }
  return secret;
}
