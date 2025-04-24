package org.biterunr_studios.biterunr

interface Platform {
    val name: String
}

expect fun getPlatform(): Platform