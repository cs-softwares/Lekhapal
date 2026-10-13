package android.print

import android.content.Context
import android.graphics.pdf.PdfRenderer
import android.os.CancellationSignal
import android.os.Handler
import android.os.Looper
import android.os.ParcelFileDescriptor
import android.webkit.WebView
import android.webkit.WebViewClient
import com.facebook.react.bridge.Promise
import java.io.File

/** Serial document renderer. Writing starts only after Android finishes print layout. */
object LekhpalDocumentRenderer {
  private var busy = false
  fun render(context: Context, name: String, html: String, promise: Promise) {
    val handler = Handler(Looper.getMainLooper())
    handler.post {
      if (busy) { promise.reject("DOCUMENT_BUSY", "A document is already being generated. Please wait."); return@post }
      busy = true
      var web: WebView? = null
      var descriptor: ParcelFileDescriptor? = null
      var temporary: File? = null
      var finished = false
      val cancellation = CancellationSignal()
      var timeout: Runnable? = null
      fun finish(path: String?, error: String?) {
        if (finished) return
        finished = true
        timeout?.let { handler.removeCallbacks(it) }
        cancellation.cancel()
        try { descriptor?.close() } catch (_: Exception) {}
        try { web?.stopLoading(); web?.destroy() } catch (_: Exception) {}
        temporary?.delete()
        busy = false
        if (path != null) promise.resolve(path) else promise.reject("DOCUMENT_RENDER_FAILED", error ?: "Document generation failed")
      }
      try {
        require(name.matches(Regex("Lekhpal-[A-Za-z0-9_-]{1,100}")) && html.length in 1..200000) { "Invalid document filename or size" }
        val dir=File(context.getExternalFilesDir(null) ?: context.filesDir,"Documents")
        check(dir.exists() || dir.mkdirs()) { "Could not create document storage" }
        val destination=File(dir,"$name.pdf")
        val temp=File(dir,"$name.part.pdf"); temporary=temp
        val attributes=PrintAttributes.Builder().setMediaSize(PrintAttributes.MediaSize.ISO_A4).setResolution(PrintAttributes.Resolution("LEKHPAL","Lekhpal",600,600)).setMinMargins(PrintAttributes.Margins.NO_MARGINS).build()
        var started=false
        web=WebView(context).apply {
          settings.javaScriptEnabled=false
          settings.allowFileAccess=false
          settings.blockNetworkLoads=true
          settings.defaultTextEncodingName="utf-8"
          settings.textZoom=100
          webViewClient=object:WebViewClient() {
            override fun onPageFinished(view:WebView,url:String?) {
              if (started || finished) return
              started=true
              try {
                val adapter=view.createPrintDocumentAdapter(name)
                adapter.onLayout(null,attributes,cancellation,object:PrintDocumentAdapter.LayoutResultCallback() {
                  override fun onLayoutFinished(info:PrintDocumentInfo,changed:Boolean) {
                    if(finished)return
                    try {
                      descriptor=ParcelFileDescriptor.open(temp,ParcelFileDescriptor.MODE_CREATE or ParcelFileDescriptor.MODE_TRUNCATE or ParcelFileDescriptor.MODE_READ_WRITE)
                      adapter.onWrite(arrayOf(PageRange.ALL_PAGES),descriptor!!,cancellation,object:PrintDocumentAdapter.WriteResultCallback() {
                        override fun onWriteFinished(pages:Array<PageRange>) {
                          if(finished)return
                          try {
                            descriptor?.close(); descriptor=null
                            require(temp.length() in 8..20_000_000) { "The generated PDF is empty or too large" }
                            PdfRenderer(ParcelFileDescriptor.open(temp,ParcelFileDescriptor.MODE_READ_ONLY)).use { require(it.pageCount>0) { "The generated PDF has no pages" } }
                            check(temp.renameTo(destination)) { "Could not save the generated PDF" }
                            adapter.onFinish()
                            finish(destination.absolutePath,null)
                          } catch(e:Exception) { finish(null,e.message) }
                        }
                        override fun onWriteFailed(error:CharSequence?) { finish(null,error?.toString()) }
                        override fun onWriteCancelled() { finish(null,"Document generation was cancelled") }
                      })
                    }catch(e:Exception){finish(null,e.message)}
                  }
                  override fun onLayoutFailed(error:CharSequence?) { finish(null,error?.toString()) }
                  override fun onLayoutCancelled() { finish(null,"Document layout was cancelled") }
                },null)
              }catch(e:Exception){finish(null,e.message)}
            }
          }
        }
        timeout=Runnable { finish(null,"Document generation timed out. Your saved batch can be resumed.") }
        handler.postDelayed(timeout!!,45000)
        web!!.loadDataWithBaseURL(null,html,"text/html","utf-8",null)
      }catch(e:Exception){finish(null,e.message)}
    }
  }
}
