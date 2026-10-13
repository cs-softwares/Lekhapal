package com.lekhpal.ero

import android.annotation.SuppressLint
import android.graphics.Bitmap
import android.net.Uri
import android.view.MotionEvent
import android.webkit.*
import android.widget.FrameLayout
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.*
import com.facebook.react.uimanager.*
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.uimanager.events.RCTEventEmitter
import org.json.JSONObject

class EroPortalPackage : ReactPackage {
  override fun createNativeModules(context: ReactApplicationContext) = emptyList<NativeModule>()
  override fun createViewManagers(context: ReactApplicationContext): List<ViewManager<*, *>> = listOf(EroPortalManager())
}
@SuppressLint("SetJavaScriptEnabled", "ViewConstructor")
class EroPortalView(private val reactContext: ThemedReactContext) : FrameLayout(reactContext) {
  private val web = WebView(reactContext)
  var sourceUrl = ""
  var script = ""
  var userAgent = ""
  private var loadedSource = ""
  private fun allowed(value: String?) = try {
    val u=Uri.parse(value ?: "")
    u.scheme=="https" && u.host=="officials.eci.gov.in" && u.port == -1 && u.userInfo == null
  } catch (_: Exception) { false }
  // ECINet is the current official SSO destination. Automation is injected only on officials.eci.gov.in.
  private fun browserAllowed(value: String?) = try {
    val u=Uri.parse(value ?: "")
    u.scheme=="https" && u.host in setOf("officials.eci.gov.in","ecinet.eci.gov.in") && u.port == -1 && u.userInfo == null
  } catch (_: Exception) { false }
  private fun emit(kind: String, data: String = "") {
    val payload=Arguments.createMap().apply { putString("kind",kind); putString("data",data); putString("url",web.url ?: loadedSource); putBoolean("canGoBack",web.canGoBack()) }
    reactContext.getJSModule(RCTEventEmitter::class.java).receiveEvent(id,"topEroEvent",payload)
  }
  private fun inject() {
    if(allowed(web.url)) web.evaluateJavascript("window.ReactNativeWebView={postMessage:function(s){window.LekhpalEro.postMessage(String(s));}};"+script,null)
  }
  private fun download(url: String) {
    if(!allowed(web.url)) return
    web.evaluateJavascript("window.__lekhpalEro&&window.__lekhpalEro.download("+JSONObject.quote(url)+");true;",null)
  }
  init {
    addView(web,LayoutParams(LayoutParams.MATCH_PARENT,LayoutParams.MATCH_PARENT))
    web.settings.apply {
      javaScriptEnabled=true; domStorageEnabled=true
      allowFileAccess=false; allowContentAccess=false
      mixedContentMode=WebSettings.MIXED_CONTENT_NEVER_ALLOW
      setSupportMultipleWindows(false); javaScriptCanOpenWindowsAutomatically=true
      useWideViewPort=true; loadWithOverviewMode=true
      builtInZoomControls=true; displayZoomControls=false
    }
    if(WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) {
      WebViewCompat.addWebMessageListener(web,"LekhpalEro",setOf("https://officials.eci.gov.in")) { view,message,origin,mainFrame,_ ->
        if(mainFrame && allowed(origin.toString()) && allowed(view.url)) {
          val raw=message.data ?: ""
          if(raw.length<=29_000_000) emit("message",raw)
        }
      }
    }
    web.setOnTouchListener { _,event -> if(event.actionMasked==MotionEvent.ACTION_DOWN) emit("touch"); false }
    web.setDownloadListener { url,_,_,_,_ -> download(url) }
    web.webChromeClient=WebChromeClient()
    web.webViewClient=object:WebViewClient() {
      override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
        val url=request.url.toString()
        if(url.startsWith("blob:https://officials.eci.gov.in/") || url.startsWith("data:application/pdf;base64,")) { download(url); return true }
        if(!browserAllowed(url)) { if(request.isForMainFrame)emit("error","Only the official ERO website can open here."); return true }
        return false
      }
      override fun onPageStarted(view: WebView,url: String,icon: Bitmap?) { emit("start") }
      override fun onPageFinished(view: WebView,url: String) { if(browserAllowed(url)){if(allowed(url))inject();emit("navigation")} }
      override fun doUpdateVisitedHistory(view: WebView,url: String,reload: Boolean) { if(browserAllowed(url)){if(allowed(url))inject();emit("navigation")} }
      override fun onReceivedError(view: WebView,request: WebResourceRequest,error: WebResourceError) { if(request.isForMainFrame)emit("error",error.description.toString()) }
      override fun onReceivedHttpError(view: WebView,request: WebResourceRequest,response: WebResourceResponse) { if(request.isForMainFrame)emit("error","ERO returned HTTP "+response.statusCode) }
    }
  }
  fun update() {
    if(userAgent.isNotEmpty())web.settings.userAgentString=userAgent
    if(allowed(sourceUrl)&&loadedSource!=sourceUrl){loadedSource=sourceUrl;web.loadUrl(sourceUrl)}
  }
  fun command(name: String,args: ReadableArray?) { when(name) {
    "inject" -> if(allowed(web.url))web.evaluateJavascript(args?.getString(0) ?: "",null)
    "back" -> if(web.canGoBack())web.goBack()
    "reload" -> web.reload()
  } }
  fun dispose(){web.stopLoading();removeView(web);web.destroy()}
}
class EroPortalManager:SimpleViewManager<EroPortalView>() {
  override fun getName()="LekhpalEroPortal"
  override fun createViewInstance(context:ThemedReactContext)=EroPortalView(context)
  @ReactProp(name="sourceUrl")fun source(view:EroPortalView,value:String){view.sourceUrl=value}
  @ReactProp(name="script")fun script(view:EroPortalView,value:String){view.script=value}
  @ReactProp(name="userAgent")fun agent(view:EroPortalView,value:String){view.userAgent=value}
  override fun onAfterUpdateTransaction(view:EroPortalView){super.onAfterUpdateTransaction(view);view.update()}
  override fun getExportedCustomDirectEventTypeConstants():MutableMap<String,Any> = mutableMapOf("topEroEvent" to mapOf("registrationName" to "onEroEvent"))
  override fun receiveCommand(view:EroPortalView,command:String,args:ReadableArray?){view.command(command,args)}
  override fun onDropViewInstance(view:EroPortalView){view.dispose();super.onDropViewInstance(view)}
}
