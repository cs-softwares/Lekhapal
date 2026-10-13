package com.lekhpal.workfiles

import android.content.Context
import android.content.ContentValues
import android.graphics.pdf.PdfRenderer
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import android.graphics.BitmapFactory
import android.os.CancellationSignal
import android.os.ParcelFileDescriptor
import android.print.*
import android.util.Base64
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.*
import com.facebook.react.uimanager.ViewManager
import java.io.File
import java.io.FileOutputStream
import java.util.concurrent.Executors
import java.util.zip.ZipEntry
import java.util.zip.ZipOutputStream

class WorkFilesPackage : ReactPackage {
  override fun createNativeModules(context: ReactApplicationContext): List<NativeModule> = listOf(WorkFilesModule(context))
  override fun createViewManagers(context: ReactApplicationContext): List<ViewManager<*, *>> = emptyList()
}
class WorkFilesModule(context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
  private val executor = Executors.newSingleThreadExecutor()
  override fun getName() = "WorkFiles"
  @ReactMethod fun saveKhasraCsv(name: String, csv: String, promise: Promise) {
    executor.execute {
      try {
        require(name.matches(Regex("Lekhpal-Khasra-[A-Za-z0-9_-]{1,80}\\.csv")) && csv.length in 10..8_000_000 && csv.startsWith("\uFEFF\"State\",")) { "Invalid Khasra CSV report" }
        require(Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) { "CSV Downloads requires Android 10 or newer." }
        val resolver = reactApplicationContext.contentResolver
        val values = ContentValues().apply {
          put(MediaStore.Downloads.DISPLAY_NAME, name)
          put(MediaStore.Downloads.MIME_TYPE, "text/csv")
          put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/Lekhpal")
          put(MediaStore.Downloads.IS_PENDING, 1)
        }
        val uri = checkNotNull(resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values))
        try {
          checkNotNull(resolver.openOutputStream(uri)).use { it.write(csv.toByteArray(Charsets.UTF_8)) }
          check(resolver.update(uri, ContentValues().apply { put(MediaStore.Downloads.IS_PENDING, 0) }, null, null) > 0)
          promise.resolve(uri.toString())
        } catch (e: Exception) { resolver.delete(uri, null, null); throw e }
      } catch (e: Exception) { promise.reject("KHASRA_CSV_FAILED", e.message, e) }
    }
  }
  @ReactMethod fun savePdf(name: String, base64: String, promise: Promise) {
    executor.execute {
      var temporary: File? = null
      try {
        require(name.matches(Regex("[A-Za-z0-9_-]{1,100}\\.pdf")) && base64.length<=28_000_000) { "Invalid PDF filename or size" }
        val bytes=Base64.decode(base64,Base64.DEFAULT)
        require(bytes.size in 8..20_000_000 && String(bytes,0,5,Charsets.US_ASCII)=="%PDF-") { "The download is not a PDF" }
        val dir=File(reactApplicationContext.filesDir,"ero-pdfs");check(dir.exists()||dir.mkdirs())
        val file=File(dir,name); require(!file.exists()) { "This PDF has already been saved" }
        val temp=File(dir,name+".part");temporary=temp;temp.writeBytes(bytes)
        PdfRenderer(ParcelFileDescriptor.open(temp,ParcelFileDescriptor.MODE_READ_ONLY)).use { require(it.pageCount>0) { "The PDF has no readable pages" } }
        check(temp.renameTo(file)) { "Could not save the PDF" }
        promise.resolve(file.absolutePath)
      } catch(e:Exception){temporary?.delete();promise.reject("PDF_SAVE_FAILED",e.message,e)} finally {temporary?.delete()}
    }
  }
  @ReactMethod fun exportPdf(path: String, promise: Promise) {
    executor.execute {
      try {
        val file=File(path.removePrefix("file://")).canonicalFile
        val dir=File(reactApplicationContext.filesDir,"ero-pdfs").canonicalFile
        require(file.isFile && file.extension=="pdf" && file.parentFile==dir) { "Choose a saved ERO PDF" }
        require(Build.VERSION.SDK_INT>=Build.VERSION_CODES.Q) { "On this Android version, use Share to save the PDF in your files app." }
        val resolver=reactApplicationContext.contentResolver
        val values=ContentValues().apply { put(MediaStore.Downloads.DISPLAY_NAME,file.name);put(MediaStore.Downloads.MIME_TYPE,"application/pdf");put(MediaStore.Downloads.RELATIVE_PATH,Environment.DIRECTORY_DOWNLOADS+"/Lekhpal");put(MediaStore.Downloads.IS_PENDING,1) }
        val uri=checkNotNull(resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI,values)) { "Could not create the download" }
        try {
          checkNotNull(resolver.openOutputStream(uri)).use { output->file.inputStream().use{it.copyTo(output)} }
          resolver.update(uri,ContentValues().apply{put(MediaStore.Downloads.IS_PENDING,0)},null,null)
          promise.resolve(uri.toString())
        }catch(e:Exception){resolver.delete(uri,null,null);throw e}
      }catch(e:Exception){promise.reject("PDF_EXPORT_FAILED",e.message,e)}
    }
  }
  @ReactMethod fun generateDocumentPdf(name: String, html: String, promise: Promise) {
    android.print.LekhpalDocumentRenderer.render(reactApplicationContext, name, html, promise)
  }
  private fun documentFile(path: String): File {
    val file = File(path.removePrefix("file://")).canonicalFile
    val dirs = listOfNotNull(File(reactApplicationContext.filesDir,"Documents"), reactApplicationContext.getExternalFilesDir(null)?.let { File(it,"Documents") }).map { it.canonicalFile }
    require(file.isFile && file.extension == "pdf" && file.name.startsWith("Lekhpal-") && dirs.contains(file.parentFile) && file.length() in 8..20_000_000) { "Choose a saved Lekhpal document PDF" }
    PdfRenderer(ParcelFileDescriptor.open(file,ParcelFileDescriptor.MODE_READ_ONLY)).use { require(it.pageCount>0) { "The PDF has no readable pages" } }
    return file
  }
  @ReactMethod fun validateDocumentPdf(path: String, promise: Promise) {
    executor.execute { try { promise.resolve(documentFile(path).absolutePath) } catch(e:Exception) { promise.reject("DOCUMENT_INVALID",e.message,e) } }
  }
  @ReactMethod fun exportDocumentPdf(path: String, promise: Promise) {
    executor.execute {
      try {
        val file=documentFile(path)
        require(Build.VERSION.SDK_INT>=Build.VERSION_CODES.Q) { "Use Share to save this PDF in your files app." }
        val resolver=reactApplicationContext.contentResolver
        val values=ContentValues().apply { put(MediaStore.Downloads.DISPLAY_NAME,file.name);put(MediaStore.Downloads.MIME_TYPE,"application/pdf");put(MediaStore.Downloads.RELATIVE_PATH,Environment.DIRECTORY_DOWNLOADS+"/Lekhpal");put(MediaStore.Downloads.IS_PENDING,1) }
        val uri=checkNotNull(resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI,values))
        try {
          checkNotNull(resolver.openOutputStream(uri)).use { output->file.inputStream().use{it.copyTo(output)} }
          check(resolver.update(uri,ContentValues().apply{put(MediaStore.Downloads.IS_PENDING,0)},null,null)>0)
          promise.resolve(uri.toString())
        }catch(e:Exception){resolver.delete(uri,null,null);throw e}
      }catch(e:Exception){promise.reject("DOCUMENT_EXPORT_FAILED",e.message,e)}
    }
  }
  private fun destination(name: String): File {
    require(name.matches(Regex("[A-Za-z0-9_-]{1,100}\\.(?:kml|kmz|png)"))) { "Invalid filename" }
    val dir = File(reactApplicationContext.filesDir, "official-work"); check(dir.exists() || dir.mkdirs())
    return File(dir, name)
  }
  @ReactMethod fun saveMap(name: String, kml: String, pngBase64: String?, promise: Promise) {
    executor.execute {
      try {
        require(kml.length <= 2_000_000 && (name.endsWith(".png") || kml.contains("<kml "))) { "Invalid KML" }
        val file = destination(name)
        val temp = File(file.parentFile, file.name + ".part")
        try {
          if (name.endsWith(".kml")) temp.writeText(kml, Charsets.UTF_8)
          else {
            require((name.endsWith(".kmz") || name.endsWith(".png")) && pngBase64 != null && pngBase64.length <= 40_000_000) { "Invalid map image" }
            val bytes = Base64.decode(pngBase64, Base64.DEFAULT)
            require(bytes.size >= 24 && bytes.take(8) == listOf(137,80,78,71,13,10,26,10).map { it.toByte() }) { "Expected a PNG image" }
            val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
            BitmapFactory.decodeByteArray(bytes, 0, bytes.size, bounds)
            require(bounds.outWidth in 1..4096 && bounds.outHeight in 1..4096) { "Invalid map dimensions" }
            if (name.endsWith(".png")) temp.writeBytes(bytes) else ZipOutputStream(FileOutputStream(temp)).use { zip ->
              zip.putNextEntry(ZipEntry("doc.kml")); zip.write(kml.toByteArray(Charsets.UTF_8)); zip.closeEntry()
              zip.putNextEntry(ZipEntry("files/village_map.png")); zip.write(bytes); zip.closeEntry()
            }
          }
          check(temp.renameTo(file)) { "Could not save map" }
          promise.resolve(file.absolutePath)
        } finally { temp.delete() }
      } catch (error: Exception) { promise.reject("MAP_EXPORT_FAILED", error.message, error) }
    }
  }
  @ReactMethod fun printPdf(path: String, title: String, promise: Promise) = printFile(path,title,promise,false)
  @ReactMethod fun printDocumentPdf(path: String, title: String, promise: Promise) {
    try { printFile(documentFile(path).path,title,promise,true) } catch(e:Exception) { promise.reject("DOCUMENT_INVALID",e.message,e) }
  }
  private fun printFile(path: String, title: String, promise: Promise, a4: Boolean) {
    val activity = reactApplicationContext.currentActivity
    if (activity == null) { promise.reject("PRINT_UNAVAILABLE", "No active screen"); return }
    try {
      val file = File(path.removePrefix("file://")).canonicalFile
      val roots = listOfNotNull(reactApplicationContext.filesDir, reactApplicationContext.cacheDir, reactApplicationContext.getExternalFilesDir(null))
      require(file.isFile && file.extension.lowercase() == "pdf" && roots.any { file.path.startsWith(it.canonicalPath + File.separator) }) { "PDF is outside app storage" }
      activity.runOnUiThread {
        try {
          val manager = activity.getSystemService(Context.PRINT_SERVICE) as PrintManager
          manager.print(title.take(100), object : PrintDocumentAdapter() {
            override fun onLayout(oldAttributes: PrintAttributes?, newAttributes: PrintAttributes?, cancellationSignal: CancellationSignal, callback: LayoutResultCallback, extras: android.os.Bundle?) {
              if (cancellationSignal.isCanceled) callback.onLayoutCancelled()
              else callback.onLayoutFinished(PrintDocumentInfo.Builder(file.name).setContentType(PrintDocumentInfo.CONTENT_TYPE_DOCUMENT).build(), true)
            }
            override fun onWrite(pages: Array<PageRange>, destination: ParcelFileDescriptor, cancellationSignal: CancellationSignal, callback: WriteResultCallback) {
              executor.execute {
                try {
                  if (cancellationSignal.isCanceled) { callback.onWriteCancelled(); return@execute }
                  file.inputStream().use { input -> FileOutputStream(destination.fileDescriptor).use { output -> input.copyTo(output) } }
                  if (cancellationSignal.isCanceled) callback.onWriteCancelled() else callback.onWriteFinished(arrayOf(PageRange.ALL_PAGES))
                } catch (e: Exception) { callback.onWriteFailed(e.message) }
              }
            }
          }, if(a4) PrintAttributes.Builder().setMediaSize(PrintAttributes.MediaSize.ISO_A4).build() else null)
          promise.resolve(null)
        } catch (e: Exception) { promise.reject("PRINT_FAILED", e.message, e) }
      }
    } catch (e: Exception) { promise.reject("PRINT_FAILED", e.message, e) }
  }
}
