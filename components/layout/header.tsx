'use client';

import { useCallback, memo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuthContext } from '@/components/auth/auth-provider';
import { useToastEnhanced } from '@/hooks/use-toast-enhanced';
import { LogOut, Settings, User, Calendar } from 'lucide-react';
import { GoogleCalendarSettings } from '@/components/google-calendar/google-calendar-settings';

export const Header = memo(function Header() {
  const { user, signOut } = useAuthContext();
  const { showSuccess, showError } = useToastEnhanced();
  const [isGoogleCalendarDialogOpen, setIsGoogleCalendarDialogOpen] = useState(false);

  const handleSignOut = useCallback(async () => {
    try {
      await signOut();
      showSuccess('ログアウトしました');
    } catch (error) {
      showError(
        'ログアウトに失敗しました。時間をおいて再度お試しください。',
        error instanceof Error ? error : undefined
      );
    }
  }, [signOut, showSuccess, showError]);

  const getUserInitials = useCallback(
    (email: string | undefined, fullName: string | undefined) => {
      if (fullName) {
        return fullName.charAt(0).toUpperCase();
      }
      if (email) {
        return email.charAt(0).toUpperCase();
      }
      return 'U';
    },
    []
  );

  const userDisplayName =
    user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'ユーザー';
  const userInitials = getUserInitials(
    user?.email,
    user?.user_metadata?.full_name
  );

  return (
    <header className="border-b bg-white shadow-sm" role="banner">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-bold text-gray-900">
            TaskShoot Calendar
          </h1>
        </div>

        <nav
          className="flex items-center space-x-4"
          role="navigation"
          aria-label="ユーザーメニュー"
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="relative h-8 w-8 rounded-full focus:ring-2 focus:ring-blue-500"
                aria-label={`${userDisplayName}のメニューを開く`}
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage
                    src={user?.user_metadata?.avatar_url}
                    alt={`${userDisplayName}のアバター`}
                  />
                  <AvatarFallback className="bg-blue-100 text-blue-600">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <div className="flex items-center justify-start gap-2 p-2">
                <div className="flex flex-col space-y-1 leading-none">
                  {user?.user_metadata?.full_name && (
                    <p className="font-medium">
                      {user.user_metadata.full_name}
                    </p>
                  )}
                  <p className="w-[200px] truncate text-sm text-muted-foreground">
                    {user?.email}
                  </p>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled>
                <User className="mr-2 h-4 w-4" aria-hidden="true" />
                プロファイル
                <span className="ml-auto text-xs text-muted-foreground">
                  開発中
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setIsGoogleCalendarDialogOpen(true)}
              >
                <Calendar className="mr-2 h-4 w-4" aria-hidden="true" />
                Google Calendar 連携
              </DropdownMenuItem>
              <DropdownMenuItem disabled>
                <Settings className="mr-2 h-4 w-4" aria-hidden="true" />
                設定
                <span className="ml-auto text-xs text-muted-foreground">
                  開発中
                </span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
                ログアウト
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>
      </div>

      {/* Google Calendar 連携ダイアログ */}
      <Dialog open={isGoogleCalendarDialogOpen} onOpenChange={setIsGoogleCalendarDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Google Calendar 連携設定
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <GoogleCalendarSettings />
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
});
