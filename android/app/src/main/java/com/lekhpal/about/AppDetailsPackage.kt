package com.lekhpal.about

import android.content.ActivityNotFoundException
import android.content.Intent
import android.net.Uri
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.*
import com.facebook.react.uimanager.ViewManager
import com.lekhpal.BuildConfig

class AppDetailsPackage : ReactPackage {
  override fun createNativeModules(context: ReactApplicationContext): List<NativeModule> = listOf(AppDetailsModule(context))
  override fun createViewManagers(context: ReactApplicationContext): List<ViewManager<*, *>> = emptyList()
}

class AppDetailsModule(context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
  override fun getName() = "AppDetails"
  override fun getConstants(): Map<String, Any> = mapOf(
    "version" to BuildConfig.VERSION_NAME,
    "build" to BuildConfig.VERSION_CODE.toString(),
    "packageId" to BuildConfig.APPLICATION_ID
  )

  @ReactMethod
  fun openSupportEmail(promise: Promise) {
    val intent = Intent(Intent.ACTION_SENDTO, Uri.parse("mailto:creativesoftwares96@gmail.com"))
      .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    try {
      try {
        reactApplicationContext.startActivity(Intent(intent).setPackage("com.google.android.gm"))
      } catch (_: ActivityNotFoundException) {
        reactApplicationContext.startActivity(intent)
      }
      promise.resolve(null)
    } catch (error: Exception) {
      promise.reject("EMAIL_UNAVAILABLE", "No email app is available.", error)
    }
  }
}
