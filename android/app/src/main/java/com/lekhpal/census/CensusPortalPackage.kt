package com.lekhpal.census

import android.annotation.SuppressLint
import android.graphics.Bitmap
import android.net.Uri
import android.os.Message
import android.view.View
import android.webkit.*
import android.widget.FrameLayout
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.*
import com.facebook.react.uimanager.*
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.uimanager.events.RCTEventEmitter

class CensusPortalPackage : ReactPackage {
  override fun createNativeModules(context: ReactApplicationContext) = emptyList<NativeModule>()
  override fun createViewManagers(context: ReactApplicationContext): List<ViewManager<*, *>> = listOf(CensusPortalManager())
}

/** Dedicated census browser: real WebViewTransport retains window.opener. */
@SuppressLint("SetJavaScriptEnabled")
class CensusPortalView(private val reactContext: ThemedReactContext) : FrameLayout(reactContext) {
  private val windows = mutableListOf<WebView>()
  var script = ""
  var presentation = ""
  var userAgent = ""
  private var source = ""
  var pendingSource = ""
  private fun allowed(url: String?) = try {
    val uri = Uri.parse(url ?: "")
    uri.scheme == "https" && uri.host == "agcensus.gov.in" && uri.port == -1 && uri.userInfo == null
  } catch (_: Exception) { false }
  private fun emit(kind: String, web: WebView, data: String = "") {
    if (web !== windows.lastOrNull()) return
    val event = Arguments.createMap().apply {
      putString("kind", kind); putString("url", web.url ?: source); putString("data", data)
      putBoolean("canGoBack", windows.size > 1 || web.canGoBack()); putInt("popupDepth", windows.size - 1)
    }
    reactContext.getJSModule(RCTEventEmitter::class.java).receiveEvent(id, "topPortalEvent", event)
  }
  fun load(url: String) {
    if (url == source) return
    if (!allowed(url)) return
    source = url
    destroyWindows()
    newWindow().loadUrl(url)
  }
  private fun inject(web: WebView) {
    if (allowed(web.url)) web.evaluateJavascript("window.ReactNativeWebView={postMessage:function(s){window.LekhpalCensus.postMessage(String(s));}};" + presentation + ";" + script, null)
  }
  private fun newWindow(): WebView {
    val web = WebView(reactContext)
    web.layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT)
    web.settings.apply {
      javaScriptEnabled = true; domStorageEnabled = true
      setSupportMultipleWindows(true); javaScriptCanOpenWindowsAutomatically = true
      allowFileAccess = false; allowContentAccess = false
      mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
      builtInZoomControls = true; displayZoomControls = false
      useWideViewPort = true; loadWithOverviewMode = true
      if (userAgent.isNotEmpty()) userAgentString = userAgent
    }
    if (WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) {
      WebViewCompat.addWebMessageListener(web, "LekhpalCensus", setOf("https://agcensus.gov.in")) { view, message, origin, mainFrame, _ ->
        if (mainFrame && allowed(origin.toString()) && allowed(view.url)) {
          val value = message.data ?: ""
          if (value.length <= 8_000_000) emit("message", view, value)
        }
      }
    }
    web.webViewClient = object : WebViewClient() {
      override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean = !allowed(request.url.toString())
      override fun onPageStarted(view: WebView, url: String, icon: Bitmap?) {
        if (url != "about:blank" && !allowed(url)) { view.stopLoading(); emit("error", view, "Unsupported census destination"); return }
        emit("start", view)
      }
      override fun onPageFinished(view: WebView, url: String) {
        if (!allowed(url)) return
        inject(view); emit("navigation", view); emit("loaded", view)
      }
      override fun onReceivedError(view: WebView, request: WebResourceRequest, error: WebResourceError) {
        if (request.isForMainFrame) emit("error", view, error.description.toString())
      }
    }
    web.webChromeClient = object : WebChromeClient() {
      override fun onCreateWindow(view: WebView, dialog: Boolean, gesture: Boolean, result: Message): Boolean {
        if (!allowed(view.url) || windows.size >= 5) return false
        val child = newWindow()
        (result.obj as WebView.WebViewTransport).webView = child
        result.sendToTarget()
        return true
      }
      override fun onCloseWindow(window: WebView) { if (window === windows.lastOrNull() && windows.size > 1) closePopup() }
      override fun onJsAlert(view: WebView, url: String, message: String, result: JsResult): Boolean {
        if (!allowed(url)) { result.cancel(); return true }
        android.app.AlertDialog.Builder(reactContext.currentActivity ?: reactContext)
          .setTitle("Agricultural Census").setMessage(message).setPositiveButton("OK") { _, _ -> result.confirm() }
          .setOnCancelListener { result.cancel() }.show()
        return true
      }
    }
    windows.lastOrNull()?.visibility = View.GONE
    windows.add(web); addView(web)
    return web
  }
  private fun closePopup() {
    if (windows.size <= 1) return
    val child = windows.removeAt(windows.lastIndex)
    removeView(child); child.stopLoading(); child.destroy()
    val parent = windows.last(); parent.visibility = View.VISIBLE
    emit("start", parent); inject(parent); parent.evaluateJavascript("window.__lekhpalOfficialWork&&window.__lekhpalOfficialWork.scan(true);true;", null)
    emit("navigation", parent)
  }
  fun command(name: String, args: ReadableArray?) {
    val web = windows.lastOrNull() ?: return
    when (name) {
      "inject" -> if (allowed(web.url)) web.evaluateJavascript(args?.getString(0) ?: "", null)
      "back" -> if (windows.size > 1) closePopup() else if (web.canGoBack()) web.goBack()
      "closePopup" -> closePopup()
      "reload" -> web.reload()
    }
  }
  fun destroyWindows() { windows.forEach { removeView(it); it.stopLoading(); it.destroy() }; windows.clear() }
}
class CensusPortalManager : SimpleViewManager<CensusPortalView>() {
  override fun getName() = "LekhpalCensusPortal"
  override fun createViewInstance(context: ThemedReactContext) = CensusPortalView(context)
  @ReactProp(name = "sourceUrl") fun source(view: CensusPortalView, value: String) { view.pendingSource = value }
  override fun onAfterUpdateTransaction(view: CensusPortalView) { super.onAfterUpdateTransaction(view); view.load(view.pendingSource) }
  @ReactProp(name = "injectedScript") fun script(view: CensusPortalView, value: String) { view.script = value }
  @ReactProp(name = "presentationScript") fun presentation(view: CensusPortalView, value: String) { view.presentation = value }
  @ReactProp(name = "userAgent") fun userAgent(view: CensusPortalView, value: String) { view.userAgent = value }
  override fun getExportedCustomDirectEventTypeConstants(): MutableMap<String, Any> = mutableMapOf("topPortalEvent" to mapOf("registrationName" to "onPortalEvent"))
  override fun receiveCommand(view: CensusPortalView, command: String, args: ReadableArray?) { view.command(command, args) }
  override fun onDropViewInstance(view: CensusPortalView) { view.destroyWindows(); super.onDropViewInstance(view) }
}
