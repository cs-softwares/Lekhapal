package com.lekhpal.ero

import android.app.Activity
import android.app.Instrumentation
import android.graphics.Paint
import android.graphics.pdf.PdfDocument
import android.net.Uri
import android.os.Bundle
import android.util.Base64
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.BridgeReactContext
import com.lekhpal.workfiles.WorkFilesModule
import java.io.ByteArrayOutputStream
import java.io.File
import java.lang.reflect.Proxy
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

/** Synthetic PDF only: tests the real native saver/exporter without a government account. */
class EroPdfInstrumentation : Instrumentation() {
  private var options:Bundle?=null
  override fun onCreate(arguments: Bundle?) { options=arguments;super.onCreate(arguments); start() }
  override fun onStart() {
    val results=Bundle()
    var resultCode=Activity.RESULT_OK
    val cleanup=mutableListOf<File>()
    var exported:Uri?=null
    try {
      val context=targetContext
      val module=WorkFilesModule(BridgeReactContext(context))
      fun call(run:(Promise)->Unit):Pair<Boolean,String> {
        val latch=CountDownLatch(1);var success=false;var value=""
        val promise=Proxy.newProxyInstance(Promise::class.java.classLoader,arrayOf(Promise::class.java)) { _,method,args ->
          if(method.name=="resolve"||method.name=="reject") {
            success=method.name=="resolve";value=args?.firstOrNull()?.toString() ?: "";latch.countDown()
          };null
        } as Promise
        run(promise);check(latch.await(20,TimeUnit.SECONDS)){"Native PDF operation timed out"}
        return Pair(success,value)
      }
      val output=ByteArrayOutputStream()
      val doc=PdfDocument()
      try {
        val page=doc.startPage(PdfDocument.PageInfo.Builder(595,842,1).create())
        page.canvas.drawText("LEKHPAL ERO PDF TEST - synthetic record",40f,80f,Paint().apply{textSize=16f})
        doc.finishPage(page);doc.writeTo(output)
      } finally {doc.close()}
      val bytes=output.toByteArray();val encoded=Base64.encodeToString(bytes,Base64.NO_WRAP)
      val name="ERO-QA-${System.currentTimeMillis()}.pdf"
      val saved=call{module.savePdf(name,encoded,it)};check(saved.first){"Valid PDF was rejected: $saved"}
      val file=File(saved.second);cleanup.add(file)
      check(file.readBytes().contentEquals(bytes)){"Saved PDF bytes changed"}
      val shareUri=androidx.core.content.FileProvider.getUriForFile(context,context.packageName+".rnshare.fileprovider",file)
      check(context.contentResolver.openInputStream(shareUri)?.use{it.readBytes().contentEquals(bytes)}==true){"Share provider cannot read the PDF"}
      check(!call{module.savePdf(name,encoded,it)}.first){"Duplicate file overwritten"}
      check(!call{module.savePdf("../outside.pdf",encoded,it)}.first){"Path traversal accepted"}
      val broken="ERO-QA-broken.pdf"
      check(!call{module.savePdf(broken,Base64.encodeToString("%PDF-1.7 corrupt".toByteArray(),Base64.NO_WRAP),it)}.first){"Corrupt PDF accepted"}
      check(!File(file.parentFile,broken).exists()&&!File(file.parentFile,"$broken.part").exists()) {"Corrupt PDF left on disk"}
      check(!call{module.exportPdf(File(context.filesDir,"../outside.pdf").path,it)}.first){"Outside export accepted"}
      val copied=call{module.exportPdf(file.path,it)};check(copied.first){"Downloads export failed: $copied"}
      exported=Uri.parse(copied.second)
      check(context.contentResolver.openInputStream(exported!!)?.use{it.readBytes().contentEquals(bytes)}==true){"Export bytes changed"}
      context.contentResolver.delete(exported!!,null,null);exported=null
      val documentDir=File(context.getExternalFilesDir(null),"Documents");documentDir.mkdirs()
      val document=File(documentDir,"Lekhpal-native-QA-${System.currentTimeMillis()}.pdf");cleanup.add(document);document.writeBytes(bytes)
      check(call{module.validateDocumentPdf(document.path,it)}.first){"Generated document validation failed"}
      check(!call{module.validateDocumentPdf(file.path,it)}.first){"ERO file accepted as a generated document"}
      check(!call{module.exportPdf(document.path,it)}.first){"Document accepted by ERO-only exporter"}
      val documentShare=androidx.core.content.FileProvider.getUriForFile(context,context.packageName+".rnshare.fileprovider",document)
      check(context.contentResolver.openInputStream(documentShare)?.use{it.readBytes().contentEquals(bytes)}==true){"Document sharing cannot read the file"}
      val documentExport=call{module.exportDocumentPdf(document.path,it)};check(documentExport.first){"Document export failed"}
      exported=Uri.parse(documentExport.second)
      check(context.contentResolver.openInputStream(exported!!)?.use{it.readBytes().contentEquals(bytes)}==true){"Document export bytes changed"}
      document.writeText("%PDF-corrupt")
      check(!call{module.validateDocumentPdf(document.path,it)}.first){"Corrupt document accepted"}
      results.putString("stream","PASS: valid PDF renderer/save, unchanged bytes, duplicate protection, traversal rejection, corrupt PDF cleanup, scoped export and Downloads byte equality and scoped share URI, document validation, separate export scopes, document share/export byte equality and corrupt document rejection (14 checks).\n")
      exported?.let{context.contentResolver.delete(it,null,null)};exported=null
      val csv="\uFEFF\"State\",\"Village\",\"Crop\"\r\n\"UP\",\"परीक्षण गांव\",\"धान\""
      val csvSaved=call{module.saveKhasraCsv("Lekhpal-Khasra-Native-QA-${System.currentTimeMillis()}.csv",csv,it)}
      check(csvSaved.first){"Khasra CSV export failed: $csvSaved"}
      exported=Uri.parse(csvSaved.second)
      check(context.contentResolver.openInputStream(exported!!)?.use{it.readBytes().contentEquals(csv.toByteArray(Charsets.UTF_8))}==true){"CSV Unicode/BOM bytes changed"}
      check(!call{module.saveKhasraCsv("../outside.csv",csv,it)}.first){"CSV traversal accepted"}
      check(!call{module.saveKhasraCsv("wrong.csv",csv,it)}.first){"Unscoped CSV filename accepted"}
      check(!call{module.saveKhasraCsv("Lekhpal-Khasra-empty.csv","",it)}.first){"Empty CSV accepted"}
      check(!call{module.saveKhasraCsv("Lekhpal-Khasra-invalid.csv","not a report header",it)}.first){"Malformed CSV accepted"}
      results.putString("stream",results.getString("stream")+"PASS: Khasra CSV Downloads, exact Hindi UTF-8/BOM bytes, traversal/name/empty/header rejection (6 checks).\n")
      if(options?.getString("khasraReportFixture")=="true") {
        val html=this.context.assets.open("khasra-report-fixtures/report.html").bufferedReader().use{it.readText()}
        val rendered=call{module.generateDocumentPdf("Lekhpal-Khasra-QA-30-plots",html,it)}
        check(rendered.first){"Khasra report rendering failed: $rendered"}
        waitForIdleSync()
        check(call{module.validateDocumentPdf(rendered.second,it)}.first){"Khasra report invalid"}
        results.putString("stream",results.getString("stream")+"PASS: actual Android 30-plot bilingual Khasra report rendered for visual QA: ${rendered.second}\n")
      }
      if(options?.getString("documentFixtures")=="true") {
        val fixtures=org.json.JSONArray(this.context.assets.open("document-fixtures/drafts.json").bufferedReader().use{it.readText()})
        val generated=org.json.JSONArray()
        for(i in 0 until fixtures.length()) {
          val draft=fixtures.getJSONObject(i);val id=draft.getString("id")
          require(id.startsWith("DOC-QA-20261012-"))
          val html=this.context.assets.open("document-fixtures/$id.html").bufferedReader().use{it.readText()}
          val destination=File(documentDir,"Lekhpal-$id.pdf")
          val rendered=call{module.generateDocumentPdf("Lekhpal-$id",html,it)}
          check(rendered.first){"Template render failed: $id / $rendered"}
          waitForIdleSync()
          check(call{module.validateDocumentPdf(destination.path,it)}.first){"Rendered PDF invalid: $id"}
          generated.put(org.json.JSONObject().put("id",id).put("draft",draft).put("path",destination.path).put("name",destination.name).put("at","2026-10-12T00:00:00Z"))
        }
        val db=android.database.sqlite.SQLiteDatabase.openDatabase(context.getDatabasePath("AsyncStorage").path,null,android.database.sqlite.SQLiteDatabase.OPEN_READWRITE)
        db.use {
          val key="lekhpal-document-automation-v1-MH"
          val raw=db.rawQuery("SELECT value FROM Storage WHERE key=?",arrayOf(key)).use{c->if(c.moveToFirst())c.getString(0)else null}
          val store=if(raw==null)org.json.JSONObject("{\"drafts\":[],\"files\":[],\"profiles\":[],\"batch\":null}")else org.json.JSONObject(raw)
          val oldFiles=store.getJSONArray("files");val oldDrafts=store.getJSONArray("drafts")
          for(i in 0 until oldFiles.length()) { val f=oldFiles.getJSONObject(i);if(!f.getString("id").startsWith("DOC-QA-20261012-"))generated.put(f) }
          val drafts=org.json.JSONArray().put(fixtures.getJSONObject(0)).put(fixtures.getJSONObject(7))
          for(i in 0 until oldDrafts.length()){val d=oldDrafts.getJSONObject(i);if(!d.getString("id").startsWith("DOC-QA-20261012-"))drafts.put(d)}
          store.put("files",generated).put("drafts",drafts)
          db.execSQL("INSERT OR REPLACE INTO Storage (key,value) VALUES (?,?)",arrayOf(key,store.toString()))
        }
        results.putString("stream",results.getString("stream")+"PASS: 12 actual Android HTML-to-PDF renders (6 templates x Hindi/English); synthetic library fixtures saved for UI review.\n")
      }
      if(options?.getString("cleanupDocumentFixtures")=="true") {
        verifyAndCleanDocuments()
        results.putString("stream",results.getString("stream")+"PASS: UI batch paused/restarted/resumed to exactly two distinct files; Downloads byte equality; synthetic document cleanup only.\n")
      }
      if(options?.getString("cleanupFixture")=="true") {
        verifyAndCleanFixture(options?.getString("expectedSha256") ?: "")
        results.putString("stream",results.getString("stream")+"PASS: real browser batch journal, two original PDF hashes, Downloads copy, test-only cleanup.\n")
      }
    } catch(error:Throwable) {
      results.putString("stream","FAIL: ${error.stackTraceToString()}\n");resultCode=Activity.RESULT_CANCELED
    } finally {
      cleanup.forEach{it.delete()};exported?.let{targetContext.contentResolver.delete(it,null,null)}
    }
    finish(resultCode,results)
  }
  private fun verifyAndCleanDocuments() {
    val context=targetContext
    val db=android.database.sqlite.SQLiteDatabase.openDatabase(context.getDatabasePath("AsyncStorage").path,null,android.database.sqlite.SQLiteDatabase.OPEN_READWRITE)
    db.use {
      val key="lekhpal-document-automation-v1-MH"
      val raw=db.rawQuery("SELECT value FROM Storage WHERE key=?",arrayOf(key)).use{c->check(c.moveToFirst());c.getString(0)}
      val store=org.json.JSONObject(raw);val batch=store.getJSONObject("batch")
      val items=batch.getJSONArray("items")
      check(items.length()==2 && batch.getInt("next")==2)
      check((0..1).map{items.getJSONObject(it).getJSONObject("values").getString("person")}.toSet()==setOf("DOC UI QA 20261012 A","DOC UI QA 20261012 B"))
      val files=store.getJSONArray("files");val keep=org.json.JSONArray();val remove=mutableListOf<File>();var completed=0
      for(i in 0 until files.length()) {
        val item=files.getJSONObject(i);val values=item.getJSONObject("draft").getJSONObject("values")
        val qa=item.getString("id").startsWith("DOC-QA-20261012-") || (values.optString("office")=="तहसील कार्यालय — परीक्षण मसौदा" && values.optString("person") in setOf("राम कुमार (परीक्षण)","DOC UI QA 20261012 A","DOC UI QA 20261012 B"))
        if(!qa){keep.put(item);continue}
        val file=File(item.getString("path")).canonicalFile
        check(file.parentFile==File(context.getExternalFilesDir(null),"Documents").canonicalFile && file.name.startsWith("Lekhpal-"))
        check(file.exists());remove.add(file)
        if(item.optString("batchId")==batch.getString("id"))completed++
      }
      check(completed==2 && remove.map{it.path}.toSet().size==remove.size)
      val resolver=context.contentResolver;val downloads=android.provider.MediaStore.Downloads.EXTERNAL_CONTENT_URI;var exported=0
      for(file in remove)resolver.query(downloads,arrayOf("_id"),"_display_name=?",arrayOf(file.name),null)?.use { c->while(c.moveToNext()) {
        val uri=android.content.ContentUris.withAppendedId(downloads,c.getLong(0))
        check(resolver.openInputStream(uri)?.use{it.readBytes().contentEquals(file.readBytes())}==true)
        check(resolver.delete(uri,null,null)==1);exported++
      }}
      check(exported>=1){"No UI-exported document found"}
      val drafts=store.getJSONArray("drafts");val keepDrafts=org.json.JSONArray()
      for(i in 0 until drafts.length()){val d=drafts.getJSONObject(i);if(!d.getString("id").startsWith("DOC-QA-20261012-"))keepDrafts.put(d)}
      store.put("files",keep).put("drafts",keepDrafts).put("batch",org.json.JSONObject.NULL)
      db.execSQL("UPDATE Storage SET value=? WHERE key=?",arrayOf(store.toString(),key))
      remove.forEach{check(it.delete())}
    }
  }
  private fun verifyAndCleanFixture(expectedHash:String) {
    require(expectedHash.matches(Regex("[a-f0-9]{64}")))
    val db=android.database.sqlite.SQLiteDatabase.openDatabase(targetContext.getDatabasePath("AsyncStorage").path,null,android.database.sqlite.SQLiteDatabase.OPEN_READWRITE)
    db.use {
      val key="lekhpal-ero-pdfs-v1"
      val raw=db.rawQuery("SELECT value FROM Storage WHERE key=?",arrayOf(key)).use { c->check(c.moveToFirst());c.getString(0) }
      val state=org.json.JSONObject(raw);val files=state.getJSONArray("files");val batch=state.getJSONObject("batch")
      check(batch.getString("context")=="AC=TEST"&&batch.getInt("next")==7&&batch.getJSONArray("done").toString()=="[5,6]") {"Unexpected batch journal; refusing cleanup"}
      check(files.length()==2) {"Other ERO files exist; refusing fixture cleanup"}
      fun hash(bytes:ByteArray)=java.security.MessageDigest.getInstance("SHA-256").digest(bytes).joinToString(""){"%02x".format(it)}
      val names=mutableListOf<String>()
      for(i in 0 until files.length()) {
        val item=files.getJSONObject(i)
        check(item.getString("record") in setOf("TEST-5","TEST-6")) {"Not a test record"}
        val file=File(item.getString("path")).canonicalFile
        check(file.parentFile==File(targetContext.filesDir,"ero-pdfs").canonicalFile&&file.name.contains("-DSE_TEST_"))
        check(hash(file.readBytes())==expectedHash){"Downloaded PDF bytes changed"};names.add(file.name)
      }
      val resolver=targetContext.contentResolver;val downloads=android.provider.MediaStore.Downloads.EXTERNAL_CONTENT_URI
      var exportedCount=0
      val orphan=options?.getString("orphanName")?.takeIf{it.matches(Regex("ERO-QA-[0-9]+\\.pdf"))}
      val testNames=names+listOfNotNull(orphan)
      for(name in testNames) {
        resolver.query(downloads,arrayOf("_id"),"_display_name=?",arrayOf(name),null)?.use { c->while(c.moveToNext()) {
          val uri=android.content.ContentUris.withAppendedId(downloads,c.getLong(0))
          if(name.contains("-DSE_TEST_")){check(resolver.openInputStream(uri)?.use{hash(it.readBytes())}==expectedHash);exportedCount++}
          check(resolver.delete(uri,null,null)==1)
        }}
      }
      check(exportedCount>=1){"No UI-exported test PDF found"}
      for(name in testNames)File(targetContext.filesDir,"ero-pdfs/$name").delete()
      check(db.delete("Storage","key=?",arrayOf(key))==1)
    }
  }
}
