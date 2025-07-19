# Supabase 認証セキュリティ設定ガイド

## 🎯 概要

このガイドでは、TaskShoot Calendar プロジェクトのSupabase認証セキュリティ警告を解決するための手順を説明します。

## 🚨 対応必要な警告

### 1. Auth OTP Long Expiry (OTP有効期限)
- **警告レベル**: WARN
- **カテゴリ**: SECURITY
- **問題**: OTPの有効期限が1時間を超えている

### 2. Leaked Password Protection Disabled (漏洩パスワード保護無効)
- **警告レベル**: WARN  
- **カテゴリ**: SECURITY
- **問題**: HaveIBeenPwned.org連携による漏洩パスワードチェックが無効

## 🔧 修正手順

### 🕒 OTP有効期限の設定

#### 手順
1. **Supabase Dashboard**にアクセス
   ```
   https://supabase.com/dashboard/project/tlfaicwciyiqwesfdvhl
   ```

2. **Authentication** → **Settings**に移動

3. **Email Auth Settings**セクションを確認

4. **OTP Expiry**の値を変更
   - **現在**: 1時間超（3600秒以上）
   - **推奨**: 30分（1800秒）以下
   - **最適**: 15分（900秒）

5. **Save**をクリック

#### 推奨設定値
```
OTP Expiry: 1800 (30分)
```

### 🛡️ 漏洩パスワード保護の有効化

#### 手順
1. **Supabase Dashboard**にアクセス
   ```
   https://supabase.com/dashboard/project/tlfaicwciyiqwesfdvhl
   ```

2. **Authentication** → **Settings**に移動

3. **Password Settings**セクションを確認

4. **Leaked Password Protection**を有効化
   - チェックボックスをONにする
   - HaveIBeenPwned.org APIとの連携が自動設定される

5. **Save**をクリック

#### 効果
- ユーザーが漏洩済みパスワードを使用しようとした場合、自動的に拒否
- パスワード強度の向上
- セキュリティインシデントリスクの削減

## 📋 設定完了チェックリスト

### ✅ OTP設定確認
- [ ] OTP Expiry: 1800秒（30分）以下に設定
- [ ] Email OTP有効化確認
- [ ] SMS OTP設定（必要に応じて）

### ✅ パスワードセキュリティ確認  
- [ ] Leaked Password Protection: 有効
- [ ] Password Minimum Length: 8文字以上推奨
- [ ] Password Complexity: 英数字・記号組み合わせ推奨

## 🔍 設定後の確認

### Supabase Linter再実行
設定変更後、Supabase Dashboard の**Database** → **Reports**で：

1. **Security & Performance**タブを確認
2. **Run Analysis**を実行
3. 警告が解消されているか確認

### 期待結果
```
✅ auth_otp_long_expiry: 解決済み
✅ auth_leaked_password_protection: 解決済み
```

## 🚀 本番環境への適用

### 注意事項
- **OTP有効期限短縮**: 既存ユーザーの認証フローに影響なし
- **漏洩パスワード保護**: 新規登録時のみ影響、既存ユーザーには適用されない
- **変更即座反映**: 設定変更は即座に有効

### ユーザーへの影響
- **OTP**: より短い有効期限でセキュリティ向上
- **パスワード**: より安全なパスワード選択の強制

## 📊 セキュリティ向上効果

| 設定項目 | 変更前 | 変更後 | セキュリティ向上 |
|----------|--------|--------|------------------|
| OTP有効期限 | 1時間+ | 30分 | フィッシング攻撃耐性向上 |
| 漏洩パスワード | 無制限 | 自動拒否 | データ漏洩リスク削減 |

## 🔗 関連リンク

- [Supabase Auth Security](https://supabase.com/docs/guides/platform/going-into-prod#security)
- [Password Security Documentation](https://supabase.com/docs/guides/auth/password-security)
- [HaveIBeenPwned API](https://haveibeenpwned.com/API/v3)

---

**作成日**: 2025-01-19  
**プロジェクト**: TaskShoot Calendar  
**対象**: Supabase 認証セキュリティ強化