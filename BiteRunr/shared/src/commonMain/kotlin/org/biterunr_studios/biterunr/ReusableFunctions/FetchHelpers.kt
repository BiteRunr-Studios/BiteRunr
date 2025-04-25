package org.biterunr_studios.biterunr.ReusableFunctions

import org.biterunr_studios.biterunr.Models.Location
import io.ktor.http.*

suspend fun getLocations(url: String): List<Location> {
    val result = fetch<Unit, List<Location>>(url = url, method = HttpMethod.Get, body = null)
    return result.getOrThrow()
}

