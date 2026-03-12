# 🛒 お使いアプリ

家族で共有できる買い物リストアプリです。
iPadでリストを作成し、iPhoneで店頭チェックできます。

## 機能
- 🎤 音声入力でリスト作成（「たまご 1パック」と話すだけ）
- ✏️ テキスト手入力でも追加可能
- ✅ 店頭でタップしてチェックオフ
- 🔄 家族間でリアルタイム同期（Firebase）

---

## セットアップ手順

### 1. Firebaseプロジェクトを作成

1. [Firebase Console](https://console.firebase.google.com) にアクセス
2. 「プロジェクトを追加」→ プロジェクト名を入力（例：otsukaiapp）
3. 「Realtime Database」を作成
   - 「テストモードで開始」を選択（開発中はOK）
4. プロジェクトの設定 → 「ウェブアプリを追加」→ 設定値をコピー

### 2. 環境変数を設定

```bash
cp .env.example .env
# .envファイルをエディタで開き、Firebaseの設定値を貼り付ける
```

### 3. ローカルで動かす

```bash
npm install
npm start
```

ブラウザで `http://localhost:3000/otsukaiapp` を開く。

---

## GitHub Pagesへのデプロイ

### 1. package.jsonを編集
```json
"homepage": "https://【あなたのGitHubユーザー名】.github.io/otsukaiapp"
```

### 2. GitHubリポジトリを作成
リポジトリ名は `otsukaiapp` にする。

### 3. GitHub Secretsを設定
GitHubリポジトリの Settings → Secrets and variables → Actions で以下を追加：

| Secret名 | 値 |
|----------|-----|
| REACT_APP_FIREBASE_API_KEY | Firebaseの値 |
| REACT_APP_FIREBASE_AUTH_DOMAIN | Firebaseの値 |
| REACT_APP_FIREBASE_DATABASE_URL | Firebaseの値 |
| REACT_APP_FIREBASE_PROJECT_ID | Firebaseの値 |
| REACT_APP_FIREBASE_STORAGE_BUCKET | Firebaseの値 |
| REACT_APP_FIREBASE_MESSAGING_SENDER_ID | Firebaseの値 |
| REACT_APP_FIREBASE_APP_ID | Firebaseの値 |

### 4. pushするだけで自動デプロイ

```bash
git add .
git commit -m "initial commit"
git push origin main
```

GitHub Actionsが自動でビルド＆デプロイします。

デプロイ後のURL：
- ホーム：`https://【ユーザー名】.github.io/otsukaiapp/`
- iPad用：`https://【ユーザー名】.github.io/otsukaiapp/create`
- iPhone用：`https://【ユーザー名】.github.io/otsukaiapp/check`

---

## 使い方

### iPad（リスト作成）
1. `/create` を開く（ブックマークに追加推奨）
2. 「押して話す」ボタンを長押し → 「たまご 1パック」と話す
3. または商品名・個数を手入力して「追加」

### iPhone（店頭チェック）
1. `/check` を開く（ホーム画面に追加推奨）
2. アイテムをタップしてチェックオフ
3. 全部チェックで完了🎉
