package com.azureconnect.piyu

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import java.util.Calendar

/** Schedules the once-a-night goodnight notification. Inexact on purpose: no exact-alarm permission needed. */
object SleepScheduler {
    private const val PREFS = "azure_prefs"

    fun save(ctx: Context, on: Boolean, hour: Int, minute: Int) {
        ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
            .putBoolean("sleep_on", on).putInt("sleep_h", hour).putInt("sleep_m", minute).apply()
        schedule(ctx)
    }

    /** Reads saved settings and (re)arms or cancels the next alarm. */
    fun schedule(ctx: Context) {
        val p = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val am = ctx.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val pi = pending(ctx)
        am.cancel(pi)
        if (!p.getBoolean("sleep_on", true)) return
        val cal = Calendar.getInstance().apply {
            set(Calendar.HOUR_OF_DAY, p.getInt("sleep_h", 1))
            set(Calendar.MINUTE, p.getInt("sleep_m", 0))
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
            if (timeInMillis <= System.currentTimeMillis()) add(Calendar.DAY_OF_YEAR, 1)
        }
        am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, cal.timeInMillis, pi)
    }

    private fun pending(ctx: Context): PendingIntent =
        PendingIntent.getBroadcast(
            ctx, 100, Intent(ctx, SleepReceiver::class.java),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
}
