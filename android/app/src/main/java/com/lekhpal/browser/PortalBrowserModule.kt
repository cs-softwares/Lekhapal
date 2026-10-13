package com.lekhpal.browser

import android.graphics.Color
import android.net.Uri
import androidx.browser.customtabs.CustomTabColorSchemeParams
import androidx.browser.customtabs.CustomTabsIntent
import androidx.core.content.ContextCompat
import androidx.core.graphics.drawable.toBitmap
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.lekhpal.R

class PortalBrowserModule(context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
  override fun getName() = "PortalBrowser"

  @ReactMethod
  fun open(url: String, promise: Promise) {
    val uri = Uri.parse(url)
    if (uri.scheme != "https" || uri.host != "ekhasra.up.gov.in") {
      promise.reject("INVALID_PORTAL", "Only the official HTTPS Khasra portal is supported.")
      return
    }
    val activity = reactApplicationContext.currentActivity
    if (activity == null) {
      promise.reject("NO_ACTIVITY", "Return to Lekhpal and try again.")
      return
    }
    activity.runOnUiThread {
      try {
        val colors = CustomTabColorSchemeParams.Builder()
          .setToolbarColor(Color.parseColor("#1E40AF"))
          .build()
        val builder = CustomTabsIntent.Builder()
          .setDefaultColorSchemeParams(colors)
          .setColorScheme(CustomTabsIntent.COLOR_SCHEME_LIGHT)
          .setShowTitle(false)
          .setShareState(CustomTabsIntent.SHARE_STATE_OFF)
        ContextCompat.getDrawable(activity, R.drawable.portal_browser_back)?.let {
          builder.setCloseButtonIcon(it.toBitmap())
        }
        // Use the real browser's phone viewport and session, without a WebView UA override.
        builder.build().launchUrl(activity, uri)
        promise.resolve(null)
      } catch (error: Exception) {
        promise.reject("BROWSER_UNAVAILABLE", "Could not open the portal browser.", error)
      }
    }
  }
}
