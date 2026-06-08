---
name: vision
description: 使用相機即時偵測畫面中的物件。iOS 需要使用者點擊按鈕啟動偵測。
metadata:
  require-secret: false
  homepage: https://github.com/JerryChen-TW/WebAR
---

# MediaPipe 物件偵測器

## Overview

這個 Skill 利用 Google MediaPipe Tasks Vision 的 EfficientDet-Lite0 模型，在裝置上即時辨識相機畫面中的物件。

**iOS 注意**: 由於 iOS Safari 的安全限制，使用者需要點擊「開始偵測」按鈕才能啟動相機。

## Instructions

Call the `run_js` tool with the following exact parameters:
- script name: index.html
- data: A JSON string with the following fields:
  - facingMode: String (optional). Camera to use. Values: "environment" (後鏡頭), "user" (前鏡頭). Default: "environment".

## Return Format

The skill returns a **webview** that displays an interactive detection interface. After user taps the detect button and detection completes, results are returned to the chat.

Response includes:
- result: String describing detected objects in Traditional Chinese
- detections: Array of detection objects with category, score, and bounding box

## Platform Differences

| Platform | Behavior |
|-----------|----------|
| **Android** | Hidden webview executes detection automatically |
| **iOS** | Returns visible webview; user must tap「開始偵測」button |

## Important Notes for iOS Users

1. **相機權限**: 首次使用時系統會詢問是否允許存取相機，請點擊「允許」
2. **使用者互動**: iOS 要求必須有點擊動作才能啟動相機
3. **網路需求**: 首次使用需下載約 3MB 模型檔案
4. **建議在 Wi-Fi 環境下初次載入**

## Tips for Best Results

- 確保環境光線充足以提高辨識準確度
- 將物件置於畫面中央並保持清晰
- 避免快速移動或模糊的影像
