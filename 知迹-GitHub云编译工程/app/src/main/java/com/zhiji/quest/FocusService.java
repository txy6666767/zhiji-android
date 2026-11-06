package com.zhiji.quest;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Intent;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class FocusService extends Service {
    private static final String CHANNEL = "zhiji_focus_service";
    private static final int NOTIFICATION_ID = 77;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private long endAt;
    private String title = "知迹 · 正在专注";
    private String taskLabel = "学习任务";

    private final Runnable ticker = new Runnable() {
        @Override
        public void run() {
            updateNotification();
            if (System.currentTimeMillis() < endAt) {
                handler.postDelayed(this, 1000);
            }
        }
    };

    @Override
    public void onCreate() {
        super.onCreate();
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL,
                    "专注计时",
                    NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("持续显示当前学习任务和剩余时间");
            getSystemService(NotificationManager.class).createNotificationChannel(channel);
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && "STOP".equals(intent.getAction())) {
            stopForeground(STOP_FOREGROUND_REMOVE);
            stopSelf();
            return START_NOT_STICKY;
        }
        if (intent != null) {
            title = intent.getStringExtra("title") != null
                    ? intent.getStringExtra("title")
                    : title;
            String body = intent.getStringExtra("body");
            if (body != null && !body.isEmpty()) {
                taskLabel = body;
                Matcher matcher = Pattern.compile("(\\d{1,2}):(\\d{2})").matcher(body);
                if (matcher.find()) {
                    int minutes = Integer.parseInt(matcher.group(1));
                    int seconds = Integer.parseInt(matcher.group(2));
                    endAt = System.currentTimeMillis() + (minutes * 60L + seconds) * 1000L;
                }
            }
        }
        if (endAt <= System.currentTimeMillis()) {
            endAt = System.currentTimeMillis() + 60L * 60L * 1000L;
        }
        startForeground(NOTIFICATION_ID, buildNotification());
        handler.removeCallbacks(ticker);
        handler.post(ticker);
        return START_NOT_STICKY;
    }

    private void updateNotification() {
        getSystemService(NotificationManager.class).notify(NOTIFICATION_ID, buildNotification());
    }

    private Notification buildNotification() {
        long remaining = Math.max(0, (endAt - System.currentTimeMillis()) / 1000L);
        String clock = String.format("%02d:%02d", remaining / 60, remaining % 60);
        CharSequence text = taskLabel.replaceAll("\\d{1,2}:\\d{2}", clock);
        Notification.Builder builder = Build.VERSION.SDK_INT >= 26
                ? new Notification.Builder(this, CHANNEL)
                : new Notification.Builder(this);
        return builder
                .setSmallIcon(R.drawable.ic_notification)
                .setContentTitle(title)
                .setContentText(text)
                .setOngoing(true)
                .setOnlyAlertOnce(true)
                .setCategory(Notification.CATEGORY_STOPWATCH)
                .build();
    }

    @Override
    public void onDestroy() {
        handler.removeCallbacks(ticker);
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
