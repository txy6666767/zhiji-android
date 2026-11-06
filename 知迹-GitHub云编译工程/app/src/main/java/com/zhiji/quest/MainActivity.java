package com.zhiji.quest;

import android.Manifest;
import android.app.Activity;
import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.speech.RecognizerIntent;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class MainActivity extends Activity {
    private static final int REQUEST_NOTIFICATIONS = 301;
    private static final int REQUEST_FILE = 302;
    private static final int REQUEST_SPEECH = 303;
    private static final String FOCUS_CHANNEL = "zhiji_focus";
    private static final String REMINDER_CHANNEL = "zhiji_reminders";
    private static final int FOCUS_NOTIFICATION_ID = 77;

    private WebView webView;
    private ValueCallback<Uri[]> fileCallback;
    private final ExecutorService networkExecutor = Executors.newCachedThreadPool();

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        createNotificationChannels();
        requestNotificationPermission();
        scheduleDailyReminders(this);

        webView = new WebView(this);
        setContentView(webView);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);

        webView.addJavascriptInterface(new AndroidBridge(), "ZhijiAndroid");
        webView.setWebViewClient(new WebViewClient());
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(
                    WebView view,
                    ValueCallback<Uri[]> callback,
                    FileChooserParams params
            ) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;
                Intent intent = new Intent(Intent.ACTION_GET_CONTENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
                String[] acceptTypes = params.getAcceptTypes();
                if (acceptTypes != null && acceptTypes.length > 0 && !acceptTypes[0].isEmpty()) {
                    intent.setType(acceptTypes[0]);
                } else {
                    intent.setType("*/*");
                }
                startActivityForResult(Intent.createChooser(intent, "选择图片或文件"), REQUEST_FILE);
                return true;
            }
        });
        webView.loadUrl("file:///android_asset/index.html");
    }

    private void requestNotificationPermission() {
        if (Build.VERSION.SDK_INT >= 33 &&
                checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, REQUEST_NOTIFICATIONS);
        }
    }

    private void createNotificationChannels() {
        if (Build.VERSION.SDK_INT < 26) return;
        NotificationManager manager = getSystemService(NotificationManager.class);
        NotificationChannel focus = new NotificationChannel(
                FOCUS_CHANNEL,
                "专注计时",
                NotificationManager.IMPORTANCE_LOW
        );
        focus.setDescription("显示当前专注事项和剩余时间");
        NotificationChannel reminders = new NotificationChannel(
                REMINDER_CHANNEL,
                "每日任务提醒",
                NotificationManager.IMPORTANCE_DEFAULT
        );
        reminders.setDescription("每天 20:00 和 23:00 检查任务");
        manager.createNotificationChannel(focus);
        manager.createNotificationChannel(reminders);
    }

    static void scheduleDailyReminders(Context context) {
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        scheduleAt(alarmManager, context, 0, 1, 1);
        scheduleAt(alarmManager, context, 20, 0, 20);
        scheduleAt(alarmManager, context, 23, 0, 23);
    }

    private static void scheduleAt(AlarmManager manager, Context context, int hour, int minute, int requestCode) {
        Calendar calendar = Calendar.getInstance();
        calendar.set(Calendar.HOUR_OF_DAY, hour);
        calendar.set(Calendar.MINUTE, minute);
        calendar.set(Calendar.SECOND, 0);
        if (calendar.getTimeInMillis() <= System.currentTimeMillis()) {
            calendar.add(Calendar.DAY_OF_YEAR, 1);
        }
        Intent intent = new Intent(context, AlarmReceiver.class);
        intent.setAction("com.zhiji.quest.DAILY_REMINDER");
        PendingIntent pendingIntent = PendingIntent.getBroadcast(
                context,
                requestCode,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        manager.setInexactRepeating(
                AlarmManager.RTC_WAKEUP,
                calendar.getTimeInMillis(),
                AlarmManager.INTERVAL_DAY,
                pendingIntent
        );
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == REQUEST_FILE) {
            if (fileCallback == null) return;
            Uri[] results = null;
            if (resultCode == RESULT_OK && data != null) {
                if (data.getClipData() != null) {
                    int count = data.getClipData().getItemCount();
                    results = new Uri[count];
                    for (int i = 0; i < count; i++) {
                        results[i] = data.getClipData().getItemAt(i).getUri();
                    }
                } else if (data.getData() != null) {
                    results = new Uri[]{data.getData()};
                }
            }
            fileCallback.onReceiveValue(results);
            fileCallback = null;
            return;
        }
        if (requestCode == REQUEST_SPEECH) {
            if (resultCode == RESULT_OK && data != null) {
                ArrayList<String> text = data.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS);
                if (text != null && !text.isEmpty()) {
                    runJs("window.onAndroidSpeechResult(" + JSONObject.quote(text.get(0)) + ")");
                }
            }
            return;
        }
        super.onActivityResult(requestCode, resultCode, data);
    }

    private void runJs(String js) {
        runOnUiThread(() -> webView.evaluateJavascript(js, null));
    }

    private class AndroidBridge {
        @JavascriptInterface
        public void requestNotificationPermission() {
            runOnUiThread(MainActivity.this::requestNotificationPermission);
        }

        @JavascriptInterface
        public void showNotification(String title, String body) {
            MainActivity.this.showNotification(title, body);
        }

        @JavascriptInterface
        public void updateFocusNotification(String title, String body, boolean running) {
            if (!running) {
                Intent stop = new Intent(MainActivity.this, FocusService.class);
                stop.setAction("STOP");
                stopService(stop);
                NotificationManager manager = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
                manager.cancel(FOCUS_NOTIFICATION_ID);
                return;
            }
            Intent service = new Intent(MainActivity.this, FocusService.class);
            service.putExtra("title", title);
            service.putExtra("body", body);
            if (Build.VERSION.SDK_INT >= 26) startForegroundService(service);
            else startService(service);
        }

        @JavascriptInterface
        public void startVoiceInput() {
            runOnUiThread(() -> {
                Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
                intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
                intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, "zh-CN");
                intent.putExtra(RecognizerIntent.EXTRA_PROMPT, "说出你的学习问题");
                startActivityForResult(intent, REQUEST_SPEECH);
            });
        }

        @JavascriptInterface
        public void openExternal(String url) {
            runOnUiThread(() -> startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url))));
        }

        @JavascriptInterface
        public void syncTaskSummary(int pendingCount, String sampleText) {
            getSharedPreferences("zhiji_task_state", MODE_PRIVATE)
                    .edit()
                    .putInt("pending_count", pendingCount)
                    .putString("pending_text", sampleText)
                    .putLong("updated_at", System.currentTimeMillis())
                    .apply();
        }

        @JavascriptInterface
        public void fetchDeepSeekBalance(String apiKey) {
            networkExecutor.execute(() -> {
                HttpResult result = request(
                        "GET",
                        "https://api.deepseek.com/user/balance",
                        apiKey,
                        null
                );
                runJs("window.onNativeDeepSeekBalance(" + result.status + "," + JSONObject.quote(result.body) + ")");
            });
        }

        @JavascriptInterface
        public void aiRequest(String requestId, String endpoint, String apiKey, String body) {
            networkExecutor.execute(() -> {
                HttpResult result = request("POST", endpoint, apiKey, body);
                runJs("window.onNativeAIResponse(" +
                        JSONObject.quote(requestId) + "," +
                        result.status + "," +
                        JSONObject.quote(result.body) + ")");
            });
        }
    }

    private void showNotification(String title, String body) {
        Notification.Builder builder = Build.VERSION.SDK_INT >= 26
                ? new Notification.Builder(this, REMINDER_CHANNEL)
                : new Notification.Builder(this);
        builder.setSmallIcon(R.drawable.ic_notification)
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(new Notification.BigTextStyle().bigText(body))
                .setAutoCancel(true);
        NotificationManager manager = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        manager.notify((int) (System.currentTimeMillis() % 100000), builder.build());
    }

    private static class HttpResult {
        final int status;
        final String body;
        HttpResult(int status, String body) {
            this.status = status;
            this.body = body;
        }
    }

    private static HttpResult request(String method, String endpoint, String apiKey, String body) {
        HttpURLConnection connection = null;
        try {
            URL url = new URL(endpoint);
            connection = (HttpURLConnection) url.openConnection();
            connection.setRequestMethod(method);
            connection.setConnectTimeout(20000);
            connection.setReadTimeout(70000);
            connection.setRequestProperty("Authorization", "Bearer " + apiKey);
            connection.setRequestProperty("Content-Type", "application/json; charset=utf-8");
            if (body != null) {
                connection.setDoOutput(true);
                try (OutputStream output = connection.getOutputStream()) {
                    output.write(body.getBytes(StandardCharsets.UTF_8));
                }
            }
            int status = connection.getResponseCode();
            InputStream stream = status >= 200 && status < 300
                    ? connection.getInputStream()
                    : connection.getErrorStream();
            StringBuilder response = new StringBuilder();
            if (stream != null) {
                try (BufferedReader reader = new BufferedReader(
                        new InputStreamReader(stream, StandardCharsets.UTF_8))) {
                    String line;
                    while ((line = reader.readLine()) != null) response.append(line);
                }
            }
            return new HttpResult(status, response.toString());
        } catch (Exception error) {
            return new HttpResult(0, "请求失败：" + error.getMessage());
        } finally {
            if (connection != null) connection.disconnect();
        }
    }
}
