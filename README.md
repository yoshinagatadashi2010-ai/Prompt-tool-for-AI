# Midjourney Prompt Forge

Midjourney向けの画像生成プロンプトを、素材の優先順位とモデルパラメータに分けて作成する静的Webアプリです。V8.1を標準にしつつ、V7、V6.1、Niji 7の出力にも切り替えられます。

## 主な機能

- 商品、人物、空間、Niji向けプリセット
- プロンプト素材の追加、複製、削除、出力オン/オフ
- ドラッグまたは上下ボタンによる優先順位変更
- `--ar`、`--v`、`--raw`、`--s`、`--c`、`--w`、`--no`などのMidjourneyパラメータ出力
- Style Reference、画像URL、除外語の入力
- Midjourneyへそのまま貼れるプロンプトのコピー
- Markdown保存、スマホ用QR、PWA対応

## 公開URL

- Midjourney Prompt Forge: `https://yoshinagatadashi2010-ai.github.io/Prompt-tool-for-AI/`
- 旧PromptWeaver: `https://yoshinagatadashi2010-ai.github.io/Prompt-tool-for-AI/promptweaver/`

## PCで起動する

このフォルダーで次を実行します。

```powershell
python -m http.server 8765 --bind 127.0.0.1
```

ブラウザで開きます。

```text
http://127.0.0.1:8765/index.html
```

既存の起動スクリプトを使う場合は、次をダブルクリックします。

```text
start-promptweaver.vbs
```

終了する場合は次を使います。

```text
stop-promptweaver.vbs
```

## スマホで使う

PCとスマホが同じWi-Fi上にある場合、画面右下のQRコードから開けます。共有URLが `127.0.0.1` や `localhost` の場合、スマホからは開けないため、PCのLAN IPを使います。

例:

```text
http://192.168.x.x:8765/index.html
```

### iPhone / iPad

Safariで開いて使えます。プロンプト項目の並べ替えは、各項目左側の `☰` を押したまま上下に動かします。ドラッグがしづらい場合でも、`↑` / `↓` ボタンで同じ並べ替えができます。

LANの `http://192.168.x.x:8765/` で開く場合、iOSの仕様上、ホーム画面追加やオフラインキャッシュは制限されることがあります。ホーム画面アプリとして安定して使う場合は、GitHub Pagesなどの `https://` の公開URLで開き、Safariの共有メニューから「ホーム画面に追加」を選びます。

旧PromptWeaverも同じ手順で使えます。`/promptweaver/` のURLをSafariで一度開くと、旧版専用のService Workerが必要ファイルを保存します。その後にホーム画面へ追加しておくと、通信がない状態でも前回保存された画面と入力内容を開けます。

## PCを切っても使う

GitHub Pagesなどの静的ホスティングに公開すると、PCが起動していない状態でもスマホから使えます。このリポジトリは `.github/workflows/pages.yml` でGitHub Pagesへのデプロイに対応しています。
