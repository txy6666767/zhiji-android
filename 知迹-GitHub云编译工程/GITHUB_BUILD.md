# 不安装 Android Studio，在线生成 APK

这条路线只需要浏览器和 GitHub 账号，不需要在本机安装 Android Studio。

## 1. 新建仓库

1. 登录 GitHub。
2. 点击右上角“+” → New repository。
3. 仓库名称填写 `zhiji-android`。
4. 选择 Public 或 Private 均可。
5. 创建仓库。

## 2. 上传工程

把本目录 `android-app` 里的**所有内容**上传到仓库根目录。

注意：GitHub 仓库根目录中应直接看到：

```text
settings.gradle
build.gradle
app/
.github/
```

不要上传成：

```text
android-app/settings.gradle
```

否则自动构建无法找到 Android 工程。

## 3. 启动构建

1. 打开仓库上方的 **Actions**。
2. 左侧选择 **Build Zhiji APK**。
3. 点击 **Run workflow**。
4. 等待约 5—15 分钟。
5. 构建完成后进入本次运行。
6. 在页面底部下载 **zhiji-debug-apk**。

压缩包内是：

```text
app-debug.apk
```

## 4. 安装到手机

1. 把 `app-debug.apk` 发到安卓手机。
2. 在手机文件管理器中点击安装。
3. 如果系统阻止安装，为文件管理器或浏览器开启“允许安装未知应用”。
4. 安装后名称是“知迹”。

这是 debug APK，适合个人安装测试；如果要公开发布，需要另外生成签名 release APK。
