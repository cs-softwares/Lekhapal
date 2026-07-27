package com.lekhpal.notifications

import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.lekhpal.R
import java.util.Calendar

object SmartWorkNotificationHelper {
  private const val CHANNEL_ID = "smart_work_daily_reminders"
  private const val CHANNEL_NAME = "Smart Work reminders"
  private const val CHANNEL_DESCRIPTION =
    "Daily reminders for pending field work and record follow-up."
  private const val DAILY_REMINDER_REQUEST_CODE = 9011

  fun areNotificationsEnabled(context: Context): Boolean =
    NotificationManagerCompat.from(context).areNotificationsEnabled()

  fun ensureChannel(context: Context) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
      return
    }

    val notificationManager =
      context.getSystemService(NotificationManager::class.java)
        ?: return

    val channel = NotificationChannel(
      CHANNEL_ID,
      CHANNEL_NAME,
      NotificationManager.IMPORTANCE_DEFAULT,
    ).apply {
      description = CHANNEL_DESCRIPTION
    }

    notificationManager.createNotificationChannel(channel)
  }

  fun postInstantNotification(
    context: Context,
    title: String,
    message: String,
  ) {
    ensureChannel(context)

    val notification =
      NotificationCompat.Builder(context, CHANNEL_ID)
        .setSmallIcon(R.mipmap.ic_launcher)
        .setContentTitle(title)
        .setContentText(message)
        .setStyle(
          NotificationCompat.BigTextStyle().bigText(message),
        )
        .setPriority(NotificationCompat.PRIORITY_DEFAULT)
        .setAutoCancel(true)
        .build()

    NotificationManagerCompat.from(context).notify(
      ((System.currentTimeMillis() / 1000L) % Int.MAX_VALUE).toInt(),
      notification,
    )
  }

  fun scheduleDailyReminder(
    context: Context,
    hour: Int,
    minute: Int,
    title: String,
    message: String,
  ) = scheduleReminder(
    context,
    DAILY_REMINDER_REQUEST_CODE,
    hour,
    minute,
    title,
    message,
  )

  fun scheduleReminder(
    context: Context,
    requestCode: Int,
    hour: Int,
    minute: Int,
    title: String,
    message: String,
  ) {
    ensureChannel(context)

    val alarmManager =
      context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    val pendingIntent =
      buildReminderPendingIntent(
        context,
        requestCode,
        title,
        message,
      )

    val now = Calendar.getInstance()
    val triggerTime = Calendar.getInstance().apply {
      set(Calendar.HOUR_OF_DAY, hour)
      set(Calendar.MINUTE, minute)
      set(Calendar.SECOND, 0)
      set(Calendar.MILLISECOND, 0)

      if (before(now)) {
        add(Calendar.DAY_OF_YEAR, 1)
      }
    }

    alarmManager.cancel(pendingIntent)
    alarmManager.setInexactRepeating(
      AlarmManager.RTC_WAKEUP,
      triggerTime.timeInMillis,
      AlarmManager.INTERVAL_DAY,
      pendingIntent,
    )
  }

  fun cancelDailyReminder(context: Context) =
    cancelReminder(context, DAILY_REMINDER_REQUEST_CODE)

  fun cancelReminder(
    context: Context,
    requestCode: Int,
  ) {
    val alarmManager =
      context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    val pendingIntent =
      buildReminderPendingIntent(
        context,
        requestCode,
        "",
        "",
      )

    alarmManager.cancel(pendingIntent)
    pendingIntent.cancel()
  }

  private fun buildReminderPendingIntent(
    context: Context,
    requestCode: Int,
    title: String,
    message: String,
  ): PendingIntent {
    val intent =
      Intent(context, SmartWorkReminderReceiver::class.java).apply {
        putExtra(SmartWorkReminderReceiver.EXTRA_TITLE, title)
        putExtra(SmartWorkReminderReceiver.EXTRA_MESSAGE, message)
      }

    return PendingIntent.getBroadcast(
      context,
      requestCode,
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
  }
}
