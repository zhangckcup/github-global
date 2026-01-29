import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    // 清除 session cookie
    const cookieStore = await cookies();
    
    // NextAuth.js v5 使用 authjs.session-token 或 __Secure-authjs.session-token
    cookieStore.delete('authjs.session-token');
    cookieStore.delete('__Secure-authjs.session-token');
    
    // 兼容旧版本的 cookie 名称
    cookieStore.delete('next-auth.session-token');
    cookieStore.delete('__Secure-next-auth.session-token');
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Signout error:', error);
    return NextResponse.json({ error: 'Failed to sign out' }, { status: 500 });
  }
}
