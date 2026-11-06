package com.zhiji.quest;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

import java.util.Calendar;

public class AlarmReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction())) {
            MainActivity.scheduleDailyReminders(context);
            return;
        }
        NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationChannel channel = new NotificationChannel(
                    "zhiji_reminders",
                    "每日任务提醒",
                    NotificationManager.IMPORTANCE_DEFAULT
            );
            manager.createNotificationChannel(channel);
        }
        Notification.Builder builder = Build.VERSION.SDK_INT >= 26
                ? new Notification.Builder(context, "zhiji_reminders")
                : new Notification.Builder(context);
        int hour = Calendar.getInstance().get(Calendar.HOUR_OF_DAY);
        boolean refreshNotice = hour < 2;
        android.content.SharedPreferences state = context.getSharedPreferences("zhiji_task_state", Context.MODE_PRIVATE);
        int pendingCount = state.getInt("pending_count", 0);
        String pendingText = state.getString("pending_text", "");
        if (!refreshNotice && pendingCount <= 0) return;
        String reminderTitle = pendingCount > 0
                ? "还有 " + pendingCount + " 项任务未完成"
                : "检查今日任务";
        String reminderBody = pendingCount > 0 && !pendingText.isEmpty()
                ? pendingText
                : "打开知迹检查今天的任务。";
        builder.setSmallIcon(R.drawable.ic_notification)
                .setContentTitle(refreshNotice ? "知迹 · 今日任务已刷新" : reminderTitle)
                .setContentText(refreshNotice
                        ? "打开知迹查看今天的任务图，昨日未完成项会置顶。"
                        : reminderBody)
                .setStyle(new Notification.BigTextStyle()
                        .bigText(refreshNotice
                                ? "打开知迹后会自动刷新今日任务，昨天未完成的项目会置顶到任务地图。"
                                : reminderBody))
                .setAutoCancel(true);
        manager.notify(801, builder.build());
    }
}
