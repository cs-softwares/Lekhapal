package com.lekhpal.notifications

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class SmartWorkNotificationModule(
  reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "SmartWorkNotifications"

  @ReactMethod
  fun areNotificationsEnabled(promise: Promise) {
    promise.resolve(
      SmartWorkNotificationHelper.areNotificationsEnabled(
        reactApplicationContext,
      ),
    )
  }

  @ReactMethod
  fun showInstantNotification(
    title: String,
    message: String,
    promise: Promise,
  ) {
    try {
      SmartWorkNotificationHelper.postInstantNotification(
        reactApplicationContext,
        title,
        message,
      )
      promise.resolve(true)
    } catch (error: Throwable) {
      promise.reject(
        "smart_work_notification_error",
        error.message,
        error,
      )
    }
  }

  @ReactMethod
  fun scheduleDailyReminder(
    hour: Int,
    minute: Int,
    title: String,
    message: String,
    promise: Promise,
  ) {
    try {
      SmartWorkNotificationHelper.scheduleDailyReminder(
        reactApplicationContext,
        hour,
        minute,
        title,
        message,
      )
      promise.resolve(true)
    } catch (error: Throwable) {
      promise.reject(
        "smart_work_notification_schedule_error",
        error.message,
        error,
      )
    }
  }

  @ReactMethod
  fun cancelDailyReminder(promise: Promise) {
    try {
      SmartWorkNotificationHelper.cancelDailyReminder(
        reactApplicationContext,
      )
      promise.resolve(true)
    } catch (error: Throwable) {
      promise.reject(
        "smart_work_notification_cancel_error",
        error.message,
        error,
      )
    }
  }

  @ReactMethod
  fun scheduleReminder(
    requestCode: Int,
    hour: Int,
    minute: Int,
    title: String,
    message: String,
    promise: Promise,
  ) {
    try {
      SmartWorkNotificationHelper.scheduleReminder(
        reactApplicationContext,
        requestCode,
        hour,
        minute,
        title,
        message,
      )
      promise.resolve(true)
    } catch (error: Throwable) {
      promise.reject(
        "smart_work_notification_schedule_error",
        error.message,
        error,
      )
    }
  }

  @ReactMethod
  fun cancelReminder(
    requestCode: Int,
    promise: Promise,
  ) {
    try {
      SmartWorkNotificationHelper.cancelReminder(
        reactApplicationContext,
        requestCode,
      )
      promise.resolve(true)
    } catch (error: Throwable) {
      promise.reject(
        "smart_work_notification_cancel_error",
        error.message,
        error,
      )
    }
  }
}
