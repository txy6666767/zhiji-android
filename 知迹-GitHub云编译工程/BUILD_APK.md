# 构建安卓 APK

当前目录是 Android Studio 工程源码。应用名为“知迹”，包名为 `com.zhiji.quest`。

## 环境要求

- Android Studio
- Android SDK 35
- JDK 17 或 Android Studio 自带 JDK
- 可访问 Google Maven 的网络环境

## 构建

1. 先把网页最新版同步到 assets：

```powershell
powershell -ExecutionPolicy Bypass -File .\sync-assets.ps1
```

2. 用 Android Studio 打开此 `android-app` 目录。
3. 等待 Gradle Sync 完成。
4. 连接手机，开启开发者模式和 USB 调试。
5. 点击 Run，或使用 Build → Generate Signed App Bundle / APK。

## 已包含的原生能力

- WebView 本地离线运行
- DeepSeek 原生网络请求，不受浏览器 CORS 限制
- DeepSeek 余额查询
- Android 通知权限
- 每天 20:00 和 23:00 系统提醒
- 专注计时常驻通知
- 系统语音识别
- 图片和文件选择

## 说明

当前工作环境缺少 Android SDK 和 Gradle，无法在本机生成 APK。工程代码已写入，但仍需在 Android Studio 中实际编译和真机测试。
