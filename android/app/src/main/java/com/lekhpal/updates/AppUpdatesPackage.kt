package com.lekhpal.updates

import android.app.Activity
import android.content.Intent
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.*
import com.facebook.react.uimanager.ViewManager
import com.google.android.play.core.appupdate.AppUpdateManagerFactory
import com.google.android.play.core.appupdate.AppUpdateOptions
import com.google.android.play.core.install.model.AppUpdateType
import com.google.android.play.core.install.model.UpdateAvailability
import com.lekhpal.BuildConfig

class AppUpdatesPackage : ReactPackage {
  override fun createNativeModules(context: ReactApplicationContext): List<NativeModule> = listOf(AppUpdatesModule(context))
  override fun createViewManagers(context: ReactApplicationContext): List<ViewManager<*, *>> = emptyList()
}

class AppUpdatesModule(context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
  private val manager = AppUpdateManagerFactory.create(context)
  private var pending: Promise? = null
  private val requestCode = 8412
  private val listener = object : BaseActivityEventListener() {
    override fun onActivityResult(activity: Activity, code: Int, result: Int, data: Intent?) {
      if (code != requestCode) return
      pending?.resolve(if (result == Activity.RESULT_OK) "completed" else "cancelled")
      pending = null
    }
  }

  init { context.addActivityEventListener(listener) }
  override fun getName() = "AppUpdates"

  @ReactMethod
  fun check(promise: Promise) {
    // QA packages are not Play listings. Do not report a fabricated update.
    if (BuildConfig.APPLICATION_ID != "com.lekhpal") {
      promise.reject("UPDATE_UNSUPPORTED", "Install Lekhpal from Google Play to check for updates.")
      return
    }
    manager.appUpdateInfo.addOnSuccessListener { info ->
      if (info.updateAvailability() == UpdateAvailability.UNKNOWN) {
        promise.reject("UPDATE_CHECK_UNKNOWN", "Google Play could not determine the installed app's update status.")
        return@addOnSuccessListener
      }
      val progress = info.updateAvailability() == UpdateAvailability.DEVELOPER_TRIGGERED_UPDATE_IN_PROGRESS
      promise.resolve(Arguments.createMap().apply {
        putBoolean("available", progress || (info.updateAvailability() == UpdateAvailability.UPDATE_AVAILABLE && info.availableVersionCode() > BuildConfig.VERSION_CODE))
        putBoolean("inProgress", progress)
        putInt("versionCode", info.availableVersionCode())
      })
    }.addOnFailureListener { promise.reject("UPDATE_CHECK_FAILED", "Google Play could not check for updates.", it) }
  }

  @ReactMethod
  fun start(promise: Promise) {
    if (pending != null) { promise.reject("UPDATE_BUSY", "An update is already open."); return }
    val activity = reactApplicationContext.currentActivity
    if (activity == null) { promise.reject("UPDATE_NO_ACTIVITY", "Open the app to update."); return }
    pending = promise
    // AppUpdateInfo can be used only once; always fetch a fresh instance.
    manager.appUpdateInfo.addOnSuccessListener { info ->
      if (!info.isUpdateTypeAllowed(AppUpdateType.IMMEDIATE)) {
        pending = null
        promise.resolve("store")
        return@addOnSuccessListener
      }
      try {
        val launched = manager.startUpdateFlowForResult(info, activity, AppUpdateOptions.newBuilder(AppUpdateType.IMMEDIATE).build(), requestCode)
        if (!launched) { pending = null; promise.resolve("store") }
      } catch (error: Exception) {
        pending = null
        promise.reject("UPDATE_START_FAILED", "Google Play could not open the update.", error)
      }
    }.addOnFailureListener {
      pending = null
      promise.reject("UPDATE_START_FAILED", "Google Play could not open the update.", it)
    }
  }

  override fun invalidate() {
    reactApplicationContext.removeActivityEventListener(listener)
    pending?.reject("UPDATE_CLOSED", "The app closed.")
    pending = null
    super.invalidate()
  }
}
