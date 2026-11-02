# カルーセル作成ツール

`deck.json` に文章と数値を書くだけで、Instagram用(1080×1350)の画像を一括生成します。

```bash
node carousel/render.cjs carousel/samples/sample.json carousel/samples/out
```

(Playwright が必要です。`NODE_PATH=$(npm root -g)` を付けて実行してください)

明朝体スタイル(`"style": "editorial"`)を使うときは、先に `cd carousel && npm install` で明朝体フォントを入れてください。

## deck.json の書き方
- `brand`: 各スライド左下に出す名前 / `note`: 最終スライドの注意書き / `theme`: 色(`bg` `fg` `accent` `line` `muted`)
- `slides[].type` は次のいずれか。文中の `**語**` は強調色になります。
  - `cover` … 表紙(`tag` `title` `subtitle`)
  - `text` … 文章(`title` `body`)
  - `bullets` … 箇条書き(`items: [{text, note}]`)
  - `curve` … 曲線グラフ(`points: [[x,y]...]` は0〜100、`marks`、`xLabel` `yLabel` `caption`。複数線は `series`)
  - `load` … 荷物を積んだ図(`items: [{label, weight}]`、`limit`、`limitLabel`)

`samples/sample.json` はレイアウト確認用の仮の文言です。

## editorial スタイル(細い明朝体・罫線・淡い背景)
`decks/giltsuri.json` が見本です。`"style": "editorial"` を付け、各スライドを次のように書きます。
- `variant`: `cover`(表紙)/ `end`(最後。院名と所在地を表示)/ 省略(本文)
- `label`: 左上の小見出し
- `lines`: 文章の行。先頭の記号で見た目が変わります。`#` 大見出し / `^` 導入 / `~` 薄い文字 / `!` 強調色 / 記号なしは通常 / `""` は空き
- `figure`: 図(`kind` が `load` か `curve`。中身は上の `load` / `curve` と同じ)。`after` に図の下の行を書けます
- `note`: そのスライドだけ脚注を変えたいとき
- 全体: `brand`、`location`、`note`(脚注)、`palette`(`coverBg` `bg` `ink` `mid` `dim` `accent` で色を変更)
