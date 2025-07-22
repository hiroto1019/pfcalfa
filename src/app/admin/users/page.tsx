"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { deleteUserAccount } from "@/app/auth/actions";

interface User {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  user_metadata: any;
}

interface Profile {
  id: string;
  username: string;
  onboarding_completed: boolean;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    checkAdminAndLoadUsers();
  }, []);

  const checkAdminAndLoadUsers = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      setCurrentUser(user);

      // 管理者かどうかチェック（ここで管理者のメールアドレスを設定）
      const adminEmails = [
        'your-admin-email@example.com', // 管理者のメールアドレスをここに設定
        'hiroto.mukai@example.com' // 追加の管理者メールアドレス
      ];

      if (!adminEmails.includes(user.email || '')) {
        setError('管理者権限がありません');
        return;
      }

      await loadUsers();
    } catch (error) {
      console.error('管理者チェックエラー:', error);
      setError('管理者権限の確認に失敗しました');
    }
  };

  const loadUsers = async () => {
    try {
      setIsLoading(true);

      // ユーザー一覧を取得（サービスロールキーが必要）
      const { data: usersData, error: usersError } = await supabase
        .from('auth.users')
        .select('*');

      if (usersError) {
        console.error('ユーザー取得エラー:', usersError);
        // 代替方法: プロフィールからユーザー情報を取得
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('*');

        if (profilesError) {
          throw profilesError;
        }

        setProfiles(profilesData || []);
      } else {
        setUsers(usersData || []);
      }
    } catch (error) {
      console.error('ユーザー読み込みエラー:', error);
      setError('ユーザー一覧の取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUserSelection = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSelectAll = () => {
    const allUserIds = users.map(user => user.id);
    setSelectedUsers(prev => 
      prev.length === allUserIds.length ? [] : allUserIds
    );
  };

  const handleDeleteUsers = async () => {
    if (selectedUsers.length === 0) return;

    setIsDeleting(true);
    setError("");

    try {
      const results = await Promise.allSettled(
        selectedUsers.map(userId => deleteUserAccount(userId))
      );

      const successful = results.filter(
        result => result.status === 'fulfilled' && result.value.success
      ).length;

      const failed = results.length - successful;

      if (failed > 0) {
        setError(`${successful}人のユーザーを削除しましたが、${failed}人の削除に失敗しました`);
      } else {
        alert(`${successful}人のユーザーを正常に削除しました`);
        setSelectedUsers([]);
        setShowDeleteConfirm(false);
        await loadUsers(); // ユーザー一覧を再読み込み
      }
    } catch (error) {
      console.error('ユーザー削除エラー:', error);
      setError('ユーザーの削除に失敗しました');
    } finally {
      setIsDeleting(false);
    }
  };

  if (error && error.includes('管理者権限')) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">アクセス拒否</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/')} className="w-full">
              ホームに戻る
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-6xl space-y-6">
      {/* ヘッダー */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">ユーザー管理</h1>
          <p className="text-gray-600">管理者: {currentUser?.email}</p>
        </div>
        <Button variant="outline" onClick={() => router.push('/')} className="w-full sm:w-auto">
          ダッシュボードに戻る
        </Button>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-600">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* ユーザー一覧 */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>ユーザー一覧</CardTitle>
              <CardDescription>
                {selectedUsers.length > 0 && `${selectedUsers.length}人のユーザーが選択されています`}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleSelectAll}>
                {selectedUsers.length === users.length ? '選択解除' : '全選択'}
              </Button>
              {selectedUsers.length > 0 && (
                <Button 
                  variant="destructive" 
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  選択したユーザーを削除 ({selectedUsers.length})
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <p>ユーザー一覧を読み込み中...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <p>ユーザーが見つかりません</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">
                      <input
                        type="checkbox"
                        checked={selectedUsers.length === users.length && users.length > 0}
                        onChange={handleSelectAll}
                        className="rounded"
                      />
                    </th>
                    <th className="text-left p-2">メールアドレス</th>
                    <th className="text-left p-2">作成日</th>
                    <th className="text-left p-2">最終ログイン</th>
                    <th className="text-left p-2">プロバイダー</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b hover:bg-gray-50">
                      <td className="p-2">
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(user.id)}
                          onChange={() => handleUserSelection(user.id)}
                          className="rounded"
                        />
                      </td>
                      <td className="p-2">{user.email}</td>
                      <td className="p-2">
                        {new Date(user.created_at).toLocaleDateString('ja-JP')}
                      </td>
                      <td className="p-2">
                        {user.last_sign_in_at 
                          ? new Date(user.last_sign_in_at).toLocaleDateString('ja-JP')
                          : '未ログイン'
                        }
                      </td>
                      <td className="p-2">
                        {user.user_metadata?.provider || 'email'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 削除確認モーダル */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md mx-4 shadow-2xl">
            <CardHeader>
              <CardTitle className="text-red-600">
                {selectedUsers.length}人のユーザーを削除
              </CardTitle>
              <CardDescription>
                この操作は元に戻すことができません。選択されたユーザーとその関連データが完全に削除されます。
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-end gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                >
                  キャンセル
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={handleDeleteUsers}
                  disabled={isDeleting}
                >
                  {isDeleting ? '削除中...' : '削除'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
} 