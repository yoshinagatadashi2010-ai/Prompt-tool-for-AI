# PromptWeaver

画像・動画生成用のプロンプトを項目ごとに構造化し、優先順位付きのMarkdownとして書き出すWebアプリです。

## PrivateリポジトリのままiPhoneで使う

GitHub Pagesを使わず、PCを同じWi-Fi内のiPhoneから開く方法です。リポジトリを公開したくない場合はこちらを使います。

1. PCで次のファイルをダブルクリックします。

```text
start-promptweaver.vbs
```

2. PCブラウザでPromptWeaverが開きます。
3. 画面右側の「スマホで開く」に表示されるQRコードをiPhoneで読み取ります。

直接URLを入力する場合は、通常は次の形です。IPアドレスはPCのWi-Fi環境によって変わります。

```text
http://192.168.x.x:8765/index.html
```

iPhoneで開けない場合は、iPhoneとPCが同じWi-Fiにいること、WindowsのファイアウォールでPythonのプライベートネットワーク通信が許可されていることを確認してください。

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

## PCが起動していなくてもスマホで使う

PCが起動していない状態でスマホから使うには、アプリをインターネット上に公開します。このリポジトリにはGitHub Pages用の自動公開設定を追加済みです。

ただし、無料プランのPrivateリポジトリではGitHub Pagesを公開できません。この方法を使う場合は、リポジトリをPublicに変更する必要があります。

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

## 主な機能

- 画像生成・動画生成テンプレートの切り替え
- 項目名と内容の編集
- ドラッグまたは上下ボタンによる優先順位変更
- 項目の追加、複製、削除、出力オン・オフ
- Markdownの自動生成、コピー、ダウンロード
- スマホアクセス用QRコードの表示
- 入力内容のローカル保存
