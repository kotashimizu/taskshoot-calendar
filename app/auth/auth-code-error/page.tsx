import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { AlertCircle } from 'lucide-react';

export default function AuthCodeErrorPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <AlertCircle className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle className="text-xl font-semibold text-gray-900">
            認証エラー
          </CardTitle>
          <CardDescription className="text-gray-600">
            ログイン処理中にエラーが発生しました
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="mb-6 text-sm text-gray-600">
            認証コードの処理に失敗しました。再度ログインをお試しください。
          </p>
          <Button asChild className="w-full">
            <Link href="/">ホームに戻る</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
