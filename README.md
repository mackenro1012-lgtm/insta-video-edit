# Reel Studio

Instagramのリール風の縦型動画を、ブラウザだけで編集できるWebアプリです。

## 機能

- 動画のアップロード(ドラッグ&ドロップ対応)
- トリミング(開始・終了ポイントの調整、タイムラインのシークバー)
- テキストオーバーレイ(ドラッグで位置調整、色・サイズ・表示時間の指定、日本語対応)
- Instagram風フィルタープリセット + 明るさ/コントラスト/彩度の個別調整
- MP4形式での書き出し(ブラウザ内蔵のffmpeg.wasmによる処理。サーバー送信なし)

## 開発

```bash
npm install
npm run dev
```

## ビルド

```bash
npm run build
```

## 技術スタック

- Vite + React + TypeScript
- Tailwind CSS
- [@ffmpeg/ffmpeg](https://github.com/ffmpegwasm/ffmpeg.wasm)(クライアントサイドでの動画書き出し。コアファイルはCDNではなくアプリにバンドル)
