package com.lekhpal

import android.app.Application
import com.lekhpal.workfiles.WorkFilesPackage
import com.lekhpal.census.CensusPortalPackage
import com.lekhpal.ero.EroPortalPackage
import com.lekhpal.about.AppDetailsPackage
import com.lekhpal.updates.AppUpdatesPackage
import com.lekhpal.browser.PortalBrowserPackage
import com.lekhpal.notifications.SmartWorkNotificationPackage
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          add(SmartWorkNotificationPackage())
          add(PortalBrowserPackage())
          add(AppDetailsPackage())
          add(WorkFilesPackage())
          add(CensusPortalPackage())
          add(EroPortalPackage())
          add(AppUpdatesPackage())
        },
    )
  }

  override fun onCreate() {
    super.onCreate()
    loadReactNative(this)
  }
}
