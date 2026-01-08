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
