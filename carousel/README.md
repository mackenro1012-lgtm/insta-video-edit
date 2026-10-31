# カルーセル作成ツール

`deck.json` に文章と数値を書くだけで、Instagram用(1080×1350)の画像を一括生成します。

```bash
node carousel/render.cjs carousel/samples/sample.json carousel/samples/out
```

(Playwright が必要です。`NODE_PATH=$(npm root -g)` を付けて実行してください)

## deck.json の書き方
- `brand`: 各スライド左下に出す名前 / `note`: 最終スライドの注意書き / `theme`: 色(`bg` `fg` `accent` `line` `muted`)
- `slides[].type` は次のいずれか。文中の `**語**` は強調色になります。
  - `cover` … 表紙(`tag` `title` `subtitle`)
  - `text` … 文章(`title` `body`)
  - `bullets` … 箇条書き(`items: [{text, note}]`)
  - `curve` … 曲線グラフ(`points: [[x,y]...]` は0〜100、`marks`、`xLabel` `yLabel` `caption`。複数線は `series`)
  - `load` … 荷物を積んだ図(`items: [{label, weight}]`、`limit`、`limitLabel`)

`samples/sample.json` はレイアウト確認用の仮の文言です。
