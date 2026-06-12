# PromptWeaver

画像・動画生成用のプロンプトを項目ごとに構造化し、優先順位付きのMarkdownとして書き出すローカルWebアプリです。

## 起動

PowerShellを開きっぱなしにせず使う場合は、次のファイルをダブルクリックします。

```text
start-promptweaver.vbs
```

このファイルはバックグラウンドでローカルサーバーを起動し、PCのブラウザでPromptWeaverを開きます。

スマホから開くURLは、画面右側の「スマホで開く」に表示されるQRコードを読み取ります。現在のLAN IPが取得できる場合は、起動時に `server-config.js` が自動生成され、QR用URLに反映されます。

## 自動起動

Windowsにログインしたら自動でPromptWeaverサーバーを起動したい場合は、次のファイルを一度だけダブルクリックします。

```text
install-startup.vbs
```

自動起動をやめる場合は、次のファイルをダブルクリックします。

```text
uninstall-startup.vbs
```

## 終了

バックグラウンドで起動したサーバーを止めたい場合は、次のファイルをダブルクリックします。

```text
stop-promptweaver.vbs
```

## 手動起動

トラブル時は、PowerShellで次を実行して手動起動できます。

```powershell
cd "C:\Users\tada-\OneDrive\ドキュメント\生成AI用プロンプト作成ツール"
python -m http.server 8765 --bind 0.0.0.0
```

## 主な機能

- 画像生成・動画生成テンプレートの切り替え
- 項目名と内容の編集
- ドラッグまたは上下ボタンによる優先順位変更
- 項目の追加、複製、削除、出力オン・オフ
- Markdownの自動生成、コピー、ダウンロード
- スマホアクセス用QRコードの表示
- 入力内容のローカル保存
