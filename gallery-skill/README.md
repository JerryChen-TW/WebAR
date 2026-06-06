# Language Lens — Google AI Edge Gallery Skill

把 **Gemma 3n** 變成一個「拍照學語言」的視覺家教。對著任何物件拍一張照片，
它就辨識出物件並教你目標語言的單字、發音和例句。**完全離線、辨識任何物件、支援任意語言。**

---

## 為什麼用這個方案

| | 網頁版 (MediaPipe) | Language Lens (Gemma 3n) |
|--|--|--|
| 辨識種類 | 固定 80 種 | **無限**（任何物件） |
| 翻譯 | 內嵌字典 | **Gemma 即時生成** |
| 語言 | 預先寫死 8 種 | **任意語言** |
| 發音/例句 | 無 | **有** |
| 執行環境 | 瀏覽器（iOS 易崩潰） | **原生 LiteRT-LM，穩定** |

---

## 安裝步驟

### 1. 準備 Gemma 3n 視覺模型
在 Google AI Edge Gallery App 中：
- 進入 **Models**
- 下載 **Gemma-3n-E2B-it**（3.39 GB，支援 text + **vision** + audio）
  > ⚠️ 一定要選 **3n** 系列，因為只有它支援影像輸入。Gemma-4 系列只支援文字。

### 2. 安裝這個 Skill
把 `language-lens/` 這個資料夾（含 `SKILL.md`）依照 Gallery App 的
「Add Skill / Import Skill」流程匯入。

> Gallery 的 skill 是一個 kebab-case 命名的資料夾，至少包含一個 `SKILL.md`。
> 本 skill 是 **text-only（純人格）skill**，不需要任何 JavaScript。

---

## 使用方式

1. 在 Gallery 開啟 **Gemma-3n-E2B-it** 的對話
2. 啟用 **Language Lens** skill
3. 先告訴它要學的語言，例如：「我想學日文」
4. 點對話框的 **相機 / 圖片** 按鈕（Ask Image），對著物件拍照
5. Gemma 會回覆類似：

```
🍎 蘋果
- 目標單字：りんご
- 發音：ringo
- 例句：りんごを食べます。（我吃蘋果。）

點下一個物件繼續學習！📸
```

---

## 技術限制說明（誠實揭露）

- Gallery 的 skill 資料流是**單向**的（LLM → skill → 回傳聊天），
  webview 無法把使用者拍的照片回傳給 skill 再轉給模型。
- 因此本方案**不使用自訂相機 webview**，而是直接利用 Gemma-3n 內建的
  **Ask Image 拍照輸入**。這是最穩定、最簡單、且能力最強的做法。
- 體驗是「**拍一張 → 辨識翻譯**」，而非「即時連續 AR 框選」。
  若你需要即時 AR 框選，請改用本 repo 根目錄的 MediaPipe 網頁版（限 80 種物件）。

---

## 兩個版本的定位

| 版本 | 路徑 | 適合場景 |
|------|------|---------|
| **網頁 AR 版** | `/`（repo 根目錄） | 即時掃描常見日用品，部署成網頁連結 |
| **Language Lens** | `/gallery-skill/` | 拍照辨識任何物件、任意語言、附發音例句 |
