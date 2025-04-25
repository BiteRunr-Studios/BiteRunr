package org.biterunr_studios.biterunr.ReusableFunctions

import org.biterunr_studios.biterunr.Models.Location
import io.ktor.http.*

suspend fun getLocations(url: String): Result<List<Location>> {
    return fetch<Unit, List<Location>>(url = url, method = HttpMethod.Get, body = null)
}



