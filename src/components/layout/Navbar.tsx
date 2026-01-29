"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Globe, Menu, X, LogOut, Settings, LayoutDashboard, User } from "lucide-react";

interface NavbarProps {
  user?: {
    name?: string | null;
    image?: string | null;
  } | null;
}

export function Navbar({ user }: NavbarProps) {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      const response = await fetch('/api/auth/signout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        router.push('/');
        router.refresh();
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <Globe className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">GitHub Global</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <>
                <Link href="/dashboard">
                  <Button variant="ghost" size="sm">
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    控制台
                  </Button>
                </Link>
                <Link href="/settings">
                  <Button variant="ghost" size="sm">
                    <Settings className="mr-2 h-4 w-4" />
                    设置
                  </Button>
                </Link>
                <div className="flex items-center gap-3 ml-2 pl-4 border-l">
                  {user.image && (
                    <img
                      src={user.image}
                      alt={user.name || 'User'}
                      className="h-8 w-8 rounded-full"
                    />
                  )}
                  {user.name && (
                    <span className="text-sm font-medium hidden lg:block">{user.name}</span>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                  >
                    <LogOut className="h-4 w-4" />
                    <span className="ml-2 hidden lg:inline">退出</span>
                  </Button>
                </div>
              </>
            ) : (
              <Link href="/login">
                <Button>
                  <User className="mr-2 h-4 w-4" />
                  登录
                </Button>
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden pt-4 pb-2 border-t mt-4">
            {user ? (
              <div className="space-y-2">
                <div className="flex items-center gap-3 py-2">
                  {user.image && (
                    <img
                      src={user.image}
                      alt={user.name || 'User'}
                      className="h-10 w-10 rounded-full"
                    />
                  )}
                  <span className="font-medium">{user.name}</span>
                </div>
                <Link href="/dashboard" onClick={() => setIsMenuOpen(false)}>
                  <Button variant="ghost" className="w-full justify-start">
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    控制台
                  </Button>
                </Link>
                <Link href="/settings" onClick={() => setIsMenuOpen(false)}>
                  <Button variant="ghost" className="w-full justify-start">
                    <Settings className="mr-2 h-4 w-4" />
                    设置
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-destructive"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  退出登录
                </Button>
              </div>
            ) : (
              <Link href="/login" onClick={() => setIsMenuOpen(false)}>
                <Button className="w-full">
                  <User className="mr-2 h-4 w-4" />
                  登录
                </Button>
              </Link>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
