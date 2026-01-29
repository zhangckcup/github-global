// GitHub App Installations API

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { decrypt } from '@/lib/crypto';
import { getUserOctokit } from '@/lib/github/client';

/**
 * GET /api/github/installations - 获取用户的 GitHub App 安装列表
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user || !user.accessToken) {
      return NextResponse.json({ error: 'No access token found' }, { status: 400 });
    }

    const accessToken = decrypt(user.accessToken);
    const octokit = getUserOctokit(accessToken);

    // 获取用户的所有 GitHub App 安装
    const { data: installations } = await octokit.rest.apps.listInstallationsForAuthenticatedUser();

    let currentInstallationId = user.installationId;

    // 如果找到安装，更新用户的 installationId
    if (installations.total_count > 0) {
      const firstInstallation = installations.installations[0];
      
      // 检查当前存储的 installationId 是否在有效安装列表中
      const isCurrentIdValid = installations.installations.some(
        inst => inst.id === user.installationId
      );
      
      // 如果没有 installationId 或当前 ID 不在有效列表中，则更新
      if (!user.installationId || !isCurrentIdValid) {
        await prisma.user.update({
          where: { id: user.id },
          data: { installationId: firstInstallation.id },
        });
        
        currentInstallationId = firstInstallation.id;
        console.log(`[GitHub] Updated user ${user.login} with installation ID: ${firstInstallation.id} (previous: ${user.installationId || 'none'})`);
      }
    } else if (user.installationId) {
      // 没有找到任何安装，但数据库中有旧的 installationId，需要清除
      await prisma.user.update({
        where: { id: user.id },
        data: { installationId: null },
      });
      currentInstallationId = null;
      console.log(`[GitHub] Cleared invalid installationId for user ${user.login}`);
    }

    return NextResponse.json({
      installations: installations.installations.map((inst: any) => ({
        id: inst.id,
        account: inst.account?.login || 'unknown',
        repositorySelection: inst.repository_selection,
        permissions: inst.permissions,
      })),
      totalCount: installations.total_count,
      currentInstallationId,
    });
  } catch (error: any) {
    console.error('Get installations error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
