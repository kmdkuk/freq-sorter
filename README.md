# Bookmark Sorter

A Chrome extension that automatically sorts your bookmarks based on usage frequency.

- [日本語](README.md#bookmark-sorter-日本語)

## Features

### 1. Automatic Usage Tracking
*   Checks if the URL is bookmarked every time you visit a page.
*   If bookmarked, it increments an internal counter to track usage frequency.
*   Data is stored in `chrome.storage.local`.

### 2. Sort Bookmarks
You can sort your bookmarks by clicking the "Sort Now" button in the popup. Bookmarks will be sorted by usage frequency (descending order).

#### Sort Options
You can fine-tune what to sort by toggling the following options:

*   **Sort Favicon Bookmarks**: Includes bookmarks with empty titles (icon only) in the sort.
*   **Sort Folders**: Includes folders in the sort. A folder's score is calculated based on the total visits of all bookmarks inside it.
*   **Sort Folder Contents**: Recursively sorts the contents within folders.
*   **Sort Normal Bookmarks**: Includes normal bookmarks (with titles) in the sort.

## Installation

> This extension modifies your bookmarks. While I strive for reliability, I cannot guarantee that no data loss will occur. **Please export and backup your bookmarks before installing or using this extension.** The author assumes no responsibility for any damage to your bookmarks.

1.  Download the latest `bookmark-sorter-extension.zip` from [Releases](https://github.com/kmdkuk/bookmark-sorter/releases).
2.  Unzip the file.
3.  Open `chrome://extensions/` in Chrome.
4.  Turn on **"Developer mode"** in the top right corner.
5.  Click **"Load unpacked"** and select the unzipped directory.

    > [!NOTE]
    > Do not delete the unzipped folder. Chrome loads the extension directly from this directory.

## Development & Build

### Install Dependencies
```bash
npm install
```

### Build
```bash
npm run build
```
The build artifacts will be output to the `dist` directory.

### Load into Chrome
1.  Open `chrome://extensions/` in Chrome.
2.  Turn on "Developer mode" in the top right corner.
3.  Click "Load unpacked" and select the `dist` directory of this project.

---

# Bookmark Sorter (日本語)

ブックマークを使用頻度に基づいて自動的にソートするChrome拡張機能です。

## 機能

### 1. 使用頻度の自動追跡
*   ブラウザでページを開くたびに、そのURLがブックマークされているか確認します。
*   ブックマークされている場合、内部カウンターをインクリメントして使用頻度を記録します。
*   データは `chrome.storage.local` に保存されます。

### 2. ブックマークのソート
ポップアップ画面から「Sort Now」ボタンを押すことで、以下のルールに従ってブックマークを並え替えます。使用頻度が高い（訪問回数が多い）順にソートされます。

#### ソートオプション
以下のオプションを有効/無効に切り替えることで、ソート対象を細かく制御できます。

*   **Sort Favicon Bookmarks**: タイトルが空（アイコンのみ）のブックマークをソート対象にします。
*   **Sort Folders**: フォルダ自体をソート対象にします。フォルダのスコアは、そのフォルダに含まれる全ブックマークの合計アクセス数で計算されます。
*   **Sort Folder Contents**: フォルダの中身も再帰的にソートします。
*   **Sort Normal Bookmarks**: 通常の（タイトルがある）ブックマークをソート対象にします。

## インストール方法

本拡張機能はブックマークを変更します。信頼性の向上には努めていますが、データの消失が起きないことを保証するものではありません。**インストールや使用の前に、必ずブックマークをエクスポートしてバックアップを作成してください。** 作者は、本拡張機能の使用によって生じたブックマークの破損や消失について一切の責任を負いません。ご利用は自己責任でお願いします。

1.  [Releases](https://github.com/kmdkuk/bookmark-sorter/releases) ページから最新の `bookmark-sorter-extension.zip` をダウンロードします。
2.  ダウンロードした zip ファイルを解凍します。
3.  Chromeで `chrome://extensions/` を開きます。
4.  右上の **「デベロッパーモード」** をオンにします。
5.  **「パッケージ化されていない拡張機能を読み込む」** をクリックし、解凍したフォルダを選択します。

    > [!NOTE]
    > 解凍したフォルダは削除しないでください。Chromeはこのディレクトリから直接拡張機能を読み込みます。削除すると拡張機能が機能しなくなります。

## 開発・ビルド方法

### 依存関係のインストール
```bash
npm install
```

### ビルド
```bash
npm run build
```
ビルド成果物は `dist` ディレクトリに出力されます。

### Chromeへの読み込み
1.  Chromeで `chrome://extensions/` を開きます。
2.  右上の「デベロッパーモード」をオンにします。
3.  「パッケージ化されていない拡張機能を読み込む」をクリックし、このプロジェクトの `dist` ディレクトリを選択します。
