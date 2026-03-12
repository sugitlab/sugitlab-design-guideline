# sugitlab Design Guideline

**sugitlab デザインガイドライン** — Design token system for multi-platform use.

[Design Guideline を見る / View Design Guideline](https://sugitlab.github.io/sugitlab-design-guideline/)

---

## 構成 / Structure

```
tokens/          ← デザイントークン定義 (JSON, source of truth)
dist/css/        ← CSS カスタムプロパティ
dist/scss/       ← SCSS 変数
dist/json/       ← JSON (flat / nested)
dist/ios/        ← Swift enum
dist/android/    ← Android XML resources
docs/            ← GitHub Pages (ショーケース)
```

## 使い方 / Usage

### CSS

```html
<link rel="stylesheet" href="dist/css/variables.css">
<link rel="stylesheet" href="dist/css/variables-dark.css">
```

```css
.card {
  background: var(--color-bg-surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
}
```

### SCSS

```scss
@import 'dist/scss/variables';
@import 'dist/scss/variables-dark';

.button {
  height: $btn-height-md;
  font-family: $font-mono;
}
```

### JSON

```js
import tokens from './dist/json/tokens.json';
console.log(tokens['color-bg-base']); // "#F5F7F9"
```

### iOS (Swift)

```swift
import Foundation
let bg = DesignTokens.color_bg_base // "#F5F7F9"
```

### Android (XML)

```xml
<TextView android:textColor="@string/color_text_primary" />
```

## ビルド / Build

```bash
npm install
npm run build
```

`dist/` 以下にすべてのプラットフォーム向けファイルが生成されます。

All platform outputs are generated under `dist/`.

## ダークモード / Dark Mode

`dist/css/variables-dark.css` は `@media (prefers-color-scheme: dark)` でラップされたダークモードオーバーライドです。ライトモード CSS と併せて読み込んでください。

`dist/css/variables-dark.css` contains dark mode overrides wrapped in `@media (prefers-color-scheme: dark)`. Load it alongside the light mode CSS.

## ライセンス / License

MIT
