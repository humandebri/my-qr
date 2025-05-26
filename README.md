# ICP QR決済デモアプリ

```sh
npm create juno@latest -- --template nextjs-starter
```

![デモアプリのスクリーンショット](https://github.com/humandebri/my-qr/blob/main/public/ss.png)

ICPブロックチェーン上でQRコードを使った決済機能を実装したデモアプリケーションです。[Juno](https://juno.build)と[Next.js](https://nextjs.org/docs)を使用して開発されています。

## 🎯 主な機能

### 💳 ウォレット機能
- **残高表示**: ICP残高をリアルタイムで確認
- **Principal管理**: ユーザーのPrincipalアドレスを表示・コピー
- **QRコード生成**: PrincipalアドレスのQRコードを自動生成

### 💸 決済機能
- **ICP送金**: 他のPrincipalアドレスへICP送金
- **QRスキャン**: カメラでQRコードをスキャンして送金先を自動入力
- **トランザクション履歴**: 送受信履歴を確認

### 🔐 セキュリティ
- **Internet Identity**: ICPネットワークの分散認証システム
- **Juno認証**: セキュアなログイン・ログアウト機能

## 🚀 使い方

1. **ログイン**: Internet Identityでログイン
2. **残高確認**: ICP残高とPrincipalアドレスを確認
3. **QR表示**: 自分のPrincipalのQRコードを表示
4. **送金**: 
   - 手動入力またはQRスキャンで送金先を指定
   - 送金額を入力して実行
5. **履歴確認**: トランザクション履歴を確認

## 💻 技術スタック

- **フロントエンド**: Next.js 14, React, TypeScript
- **ブロックチェーン**: Internet Computer Protocol (ICP)
- **認証**: Juno, Internet Identity
- **QRコード**: qrcode, qr-scanner
- **スタイリング**: Tailwind CSS

## ✨ リンク・リソース

- [Juno ドキュメント](https://juno.build)
- [Next.js ドキュメント](https://nextjs.org/docs)
- [ICP Developer Docs](https://internetcomputer.org/docs/current/developer-docs/)
- [Discord コミュニティ](https://discord.gg/wHZ57Z2RAG)
- [OpenChat](https://oc.app/community/vxgpi-nqaaa-aaaar-ar4lq-cai/?ref=xanzv-uaaaa-aaaaf-aneba-cai)

## 🧞 コマンド

プロジェクトのルートディレクトリで以下のコマンドを実行：

| コマンド          | 説明                                                    |
| :--------------- | :------------------------------------------------------ |
| `npm install`    | 依存関係をインストール                                       |
| `npm run dev`    | `localhost:3000`で開発サーバーを起動                        |
| `juno dev start` | ローカル開発エミュレーターを起動（Dockerが必要）                 |
| `npm run build`  | プロダクション用ビルドを`./out/`に生成                       |
| `juno deploy`    | Satelliteにプロジェクトをデプロイ                           |

## 🚀 デプロイ

Junoの[管理コンソール](https://console.juno.build)を通じてSatelliteを作成し、アプリをデプロイするには、この[ガイド](https://juno.build/docs/add-juno-to-an-app/create-a-satellite)をご覧ください。

## 📱 デモ操作手順

1. **初回セットアップ**
   ```sh
   npm install
   npm run dev
   ```

2. **ブラウザで http://localhost:3000 にアクセス**

3. **Internet Identityでログイン**

4. **QR決済を試す**
   - 自分のQRコードを表示
   - カメラでQRコードをスキャン
   - テストネットでICP送金を実行

## ⚠️ 注意事項

- このアプリはデモ用途です
- 実際のICP送金が発生するため、テストネットでの使用を推奨
- カメラアクセス許可が必要です（QRスキャン機能）
- HTTPS環境または localhost での動作が必要です
