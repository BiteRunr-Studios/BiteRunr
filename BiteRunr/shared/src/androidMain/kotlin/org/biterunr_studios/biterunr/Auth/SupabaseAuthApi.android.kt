package org.biterunr_studios.biterunr.Auth

import android.content.Intent
import io.github.jan.supabase.auth.handleDeeplinks

actual fun handleDeeplink(data: Any) {
    if (data is Intent) {
        supabase.handleDeeplinks(data)
    }

}