package org.biterunr_studios.biterunr.Auth

import io.github.jan.supabase.auth.handleDeeplinks
import platform.Foundation.NSURL

actual fun handleDeeplink(data: Any) {
    if (data is NSURL) {
        supabase.handleDeeplinks(data)
    }
}