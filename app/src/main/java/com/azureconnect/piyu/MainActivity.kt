package com.azureconnect.piyu

import android.Manifest
import android.annotation.SuppressLint
import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.webkit.JavascriptInterface
import android.webkit.PermissionRequest
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Notification
import android.view.View
import android.widget.FrameLayout
import androidx.webkit.WebViewAssetLoader

class MainActivity : Activity() {
    private lateinit var web: WebView
    private var fileCallback: ValueCallback<Array<Uri>>? = null
    private var pendingMic: PermissionRequest? = null
    private var sleepFromNotification = false

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val midnight = Color.parseColor("#091540")
        val root = FrameLayout(this).apply { setBackgroundColor(midnight) }

        // Serve bundled assets from a real https origin so localStorage and getUserMedia behave.
        val assets = WebViewAssetLoader.Builder()
            .setDomain("appassets.androidplatform.net")
            .addPathHandler("/www/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()

        web = WebView(this).apply {
            setBackgroundColor(midnight)
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.allowFileAccess = false
            addJavascriptInterface(Bridge(), "Android")
            webViewClient = object : WebViewClient() {
                override fun shouldInterceptRequest(v: WebView, r: WebResourceRequest): WebResourceResponse? =
                    assets.shouldInterceptRequest(r.url)

                override fun onPageFinished(v: WebView, url: String) {
                    if (sleepFromNotification) {
                        sleepFromNotification = false
                        v.evaluateJavascript("window.onNativeSleep&&window.onNativeSleep()", null)
                    }
                }
            }
            webChromeClient = object : WebChromeClient() {
                override fun onShowFileChooser(
                    w: WebView, cb: ValueCallback<Array<Uri>>, p: FileChooserParams
                ): Boolean {
                    fileCallback?.onReceiveValue(null)
                    fileCallback = cb
                    return try {
                        startActivityForResult(p.createIntent(), REQ_FILE)
                        true
                    } catch (e: Exception) {
                        fileCallback = null
                        false
                    }
                }

                override fun onPermissionRequest(request: PermissionRequest) {
                    runOnUiThread {
                        if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) {
                            request.grant(arrayOf(PermissionRequest.RESOURCE_AUDIO_CAPTURE))
                        } else {
                            pendingMic = request
                            requestPermissions(arrayOf(Manifest.permission.RECORD_AUDIO), REQ_MIC)
                        }
                    }
                }
            }
        }
        root.addView(web, FrameLayout.LayoutParams(-1, -1))
        setContentView(root)

        if (Build.VERSION.SDK_INT >= 33 &&
            checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
        ) requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), REQ_NOTIF)

        sleepFromNotification = intent?.getBooleanExtra(EXTRA_SLEEP, false) == true
        web.loadUrl("https://appassets.androidplatform.net/www/index.html")
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        if (intent.getBooleanExtra(EXTRA_SLEEP, false)) {
            web.evaluateJavascript("window.onNativeSleep&&window.onNativeSleep()", null)
        }
    }

    @Deprecated("Deprecated in Java")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        if (requestCode == REQ_FILE) {
            fileCallback?.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(resultCode, data))
            fileCallback = null
        } else {
            super.onActivityResult(requestCode, resultCode, data)
        }
    }

    override fun onRequestPermissionsResult(code: Int, perms: Array<out String>, results: IntArray) {
        super.onRequestPermissionsResult(code, perms, results)
        if (code == REQ_MIC) {
            val ok = results.firstOrNull() == PackageManager.PERMISSION_GRANTED
            if (ok) pendingMic?.grant(arrayOf(PermissionRequest.RESOURCE_AUDIO_CAPTURE)) else pendingMic?.deny()
            pendingMic = null
        }
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        web.evaluateJavascript("window.onBack&&window.onBack()") { r -> if (r != "true") finish() }
    }

    inner class Bridge {
        @JavascriptInterface
        fun scheduleSleep(on: Boolean, hour: Int, minute: Int) =
            SleepScheduler.save(this@MainActivity, on, hour, minute)

        @JavascriptInterface
        fun setBars(top: String, bottom: String, darkNavIcons: Boolean) = runOnUiThread {
            try {
                window.statusBarColor = Color.parseColor(top)
                window.navigationBarColor = Color.parseColor(bottom)
                var f = window.decorView.systemUiVisibility
                f = if (darkNavIcons) f or View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR else f and View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR.inv()
                f = f and View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR.inv()
                window.decorView.systemUiVisibility = f
                (window.decorView.findViewById<View>(android.R.id.content)).setBackgroundColor(Color.parseColor(top))
            } catch (e: Exception) { }
        }

        @JavascriptInterface
        fun openLink(url: String) {
            try { startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url))) } catch (e: Exception) { }
        }

        @JavascriptInterface
        fun shareText(text: String) {
            val send = Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_TEXT, text)
            startActivity(Intent.createChooser(send, "Share code"))
        }

        @JavascriptInterface
        fun notify(title: String, text: String) {
            val nm = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
            nm.createNotificationChannel(NotificationChannel("messages", "Messages", NotificationManager.IMPORTANCE_DEFAULT))
            val open = android.app.PendingIntent.getActivity(
                this@MainActivity, 5, Intent(this@MainActivity, MainActivity::class.java),
                android.app.PendingIntent.FLAG_UPDATE_CURRENT or android.app.PendingIntent.FLAG_IMMUTABLE)
            nm.notify(System.currentTimeMillis().toInt(), Notification.Builder(this@MainActivity, "messages")
                .setSmallIcon(R.drawable.ic_stat_moon).setContentTitle(title).setContentText(text)
                .setAutoCancel(true).setContentIntent(open).build())
        }
    }

    companion object {
        const val EXTRA_SLEEP = "open_sleep"
        private const val REQ_FILE = 1
        private const val REQ_MIC = 2
        private const val REQ_NOTIF = 3
    }
}
