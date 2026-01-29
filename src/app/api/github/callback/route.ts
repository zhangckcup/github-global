// GitHub App Installation Callback API

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

/**
 * POST /api/github/callback - 处理 GitHub App 安装回调
 * 当用户完成 GitHub App 安装后，GitHub 会重定向回我们的应用并带上 installation_id
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { installationId } = body;

    if (!installationId) {
      return NextResponse.json({ error: 'Missing installation_id' }, { status: 400 });
    }

    // 将 installationId 转换为数字
    const installationIdNum = parseInt(installationId, 10);
    
    if (isNaN(installationIdNum)) {
      return NextResponse.json({ error: 'Invalid installation_id' }, { status: 400 });
    }

    // 更新用户的 installationId
    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: { installationId: installationIdNum },
    });

    console.log(`[GitHub Callback] Updated user ${user.login} with installation ID: ${installationIdNum}`);

    return NextResponse.json({ 
      success: true, 
      installationId: installationIdNum,
      message: 'Installation ID updated successfully'
    });
  } catch (error: any) {
    console.error('GitHub callback error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
