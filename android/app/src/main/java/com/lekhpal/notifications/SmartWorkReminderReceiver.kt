package com.lekhpal.notifications

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class SmartWorkReminderReceiver : BroadcastReceiver() {

  override fun onReceive(context: Context, intent: Intent) {
    val title =
      intent.getStringExtra(EXTRA_TITLE) ?: "Smart Work reminder"
    val message =
      intent.getStringExtra(EXTRA_MESSAGE)
        ?: "Review pending field work, saved records, and portal follow-up."

    SmartWorkNotificationHelper.postInstantNotification(
      context,
      title,
      message,
    )
  }

  companion object {
    const val EXTRA_MESSAGE = "smart_work_extra_message"
    const val EXTRA_TITLE = "smart_work_extra_title"
  }
}
