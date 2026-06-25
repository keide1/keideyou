# Emotion City OS

習志野市向けに、住民がスマホから問い合わせを送り、自治体管理者がPCでAI分析・優先順位・担当課・地図を確認するWebアプリ試作です。

## 開き方

`index.html` をブラウザで開くと入口選択画面が出ます。

- `resident.html`: スマホ用の住民問い合わせ画面
- `admin.html`: PC管理者用のダッシュボード

スマホ用とPC管理者用は、同じページ内の切替ではなく別HTMLとして完全に分けています。

## 注意

この版はUIと動作確認用のプロトタイプです。問い合わせデータはブラウザ内に保存され、AI判定は疑似ロジックです。本番では `architecture.md` の構成で、クラウドAIと自治体内ローカル処理を分離してください。

## 管理者画面の機能

- 案件: 問い合わせ一覧、習志野市マップ、AI要約、優先度、担当課、状態変更、対応完了ボタン
- 地図: OpenStreetMap/Leafletで問い合わせ地点を表示。通信できない場合は簡易マップを表示
- 部署共有: 担当課ごとの問い合わせボード
- 分析: カテゴリ別件数、危険度別件数、対応状況、AIタグ集計
- 同期: ローカル保存とクラウド匿名同期の状態確認、同期ログ

優先度は住民が選ぶ体感不安度ではなく、問い合わせ本文・場所・カテゴリからAI風ロジックで5段階の数字として判定します。5が最も緊急、1が最も低い優先度です。体感不安度は参考情報として保存します。

## インストール推奨

- 開発環境: Node.js LTS、Git、VS Code
- Web公開: Vercel または Cloudflare Pages
- 本番DB: PostgreSQL
- 管理者認証: 自治体SSO、Microsoft Entra ID、または Google Workspace
- AIクラウド: OpenAI API
- ローカルAI: Ollama または vLLM、庁内GPUサーバー
- 運用監視: Sentry、UptimeRobot、Cloudflare Analytics
