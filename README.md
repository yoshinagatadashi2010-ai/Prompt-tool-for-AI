# PromptWeaver

画像・動画生成用のプロンプトを項目ごとに構造化し、優先順位付きのMarkdownとして書き出すWebアプリです。

## PCが起動していなくてもスマホで使う

PCが起動していない状態でスマホから使うには、アプリをインターネット上に公開します。このリポジトリにはGitHub Pages用の自動公開設定を追加済みです。

公開後のURLは通常、次の形になります。

```text
https://yoshinagatadashi2010-ai.github.io/Prompt-tool-for-AI/
```

このURLをスマホで開けば、PCの電源が入っていなくても使えます。

### iPhone / iPadでホーム画面に追加

Safariで公開URLを開き、共有ボタンから「ホーム画面に追加」を選ぶと、PromptWeaverをアプリのように起動できます。入力内容は端末のブラウザ内に保存されるため、オフラインでも前回の内容を開けます。

## GitHub Pagesの有効化

GitHubで次の設定を行います。

1. GitHubのリポジトリ `Prompt-tool-for-AI` を開く
2. `Settings` を開く
3. `Pages` を開く
4. `Build and deployment` の `Source` を `GitHub Actions` にする
5. このリポジトリの変更をGitHubへpushする

push後、`Actions` タブで `Deploy PromptWeaver to GitHub Pages` が成功すると公開されます。

## PC内だけで使う

PowerShellを開きっぱなしにせずPC内と同じWi-Fiのスマホで使う場合は、次のファイルをダブルクリックします。

```text
start-promptweaver.vbs
```

終了する場合は次をダブルクリックします。

```text
stop-promptweaver.vbs
```

Windowsログイン時に自動起動したい場合は、次を一度だけダブルクリックします。

```text
install-startup.vbs
```

自動起動を解除する場合は、次をダブルクリックします。

```text
uninstall-startup.vbs
```

## 主な機能

- 画像生成・動画生成テンプレートの切り替え
- 項目名と内容の編集
- ドラッグまたは上下ボタンによる優先順位変更
- 項目の追加、複製、削除、出力オン・オフ
- Markdownの自動生成、コピー、ダウンロード
- スマホアクセス用QRコードの表示
- 入力内容のローカル保存
