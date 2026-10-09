package com.azureconnect.piyu

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class SleepReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        nm.createNotificationChannel(
            NotificationChannel(CHANNEL, "Goodnight", NotificationManager.IMPORTANCE_DEFAULT).apply {
                description = "A soft goodnight from your bestie"
            }
        )
        val open = PendingIntent.getActivity(
            context, 101,
            Intent(context, MainActivity::class.java).putExtra(MainActivity.EXTRA_SLEEP, true)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        val text = "You are loved.\nYou are important.\nYou don't have to figure everything out tonight.\n" +
            "Tomorrow is another page.\n\nGoodnight, Piyu."
        val n = Notification.Builder(context, CHANNEL)
            .setSmallIcon(R.drawable.ic_stat_moon)
            .setContentTitle("Time to rest")
            .setContentText("You don't have to figure everything out tonight.")
            .setStyle(Notification.BigTextStyle().bigText(text))
            .setColor(0xFF7692FF.toInt())
            .setCategory(Notification.CATEGORY_REMINDER)
            .setAutoCancel(true)
            .setContentIntent(open)
            .build()
        nm.notify(1, n)
        SleepScheduler.schedule(context) // arm tomorrow night
    }

    companion object { const val CHANNEL = "goodnight" }
}
