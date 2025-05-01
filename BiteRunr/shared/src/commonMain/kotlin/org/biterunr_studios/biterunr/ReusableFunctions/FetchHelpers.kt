package org.biterunr_studios.biterunr.ReusableFunctions

import org.biterunr_studios.biterunr.Models.Location
import io.ktor.http.*
import org.biterunr_studios.biterunr.DTO.FriendRequestUser
import org.biterunr_studios.biterunr.DTO.FriendUser
import org.biterunr_studios.biterunr.Models.FriendRequest
import org.biterunr_studios.biterunr.Models.UserProfile

suspend fun getLocations(url: String): List<Location> {
    val result = fetch<Unit, List<Location>>(url = url, method = HttpMethod.Get, body = null)
    return result.getOrThrow()
}

suspend fun getFriends(baseUrl: String, user_id: String): List<FriendUser> {
    val url = "$baseUrl/users/$user_id/friends"
    val result = fetch<Unit, List<FriendUser>>(url = url, method = HttpMethod.Get, body = null)
    return result.getOrThrow()
}

suspend fun getFriendRequests(baseUrl: String, user_id: String): List<FriendRequestUser> {
    val url = "$baseUrl/users/$user_id/friend-requests"
    val result = fetch<Unit, List<FriendRequestUser>>(url = url, method = HttpMethod.Get, body = null)
    return result.getOrThrow()
}

suspend fun getAllUsersExceptAuthenticated(baseUrl: String, user_id: String): List<FriendUser> {
    val url = "$baseUrl/users/all-except/$user_id"
    val result = fetch<Unit, List<FriendUser>>(url = url, method = HttpMethod.Get, body = null)
    return result.getOrThrow()
}

suspend fun getUserProfile(baseUrl: String, user_id: String): UserProfile {
    val url = "$baseUrl/users/$user_id"
    val result = fetch<Unit, UserProfile>(url = url, method = HttpMethod.Get, body = null)
    return result.getOrThrow()
}

suspend fun deleteFriend(baseUrl: String, user_id: String): Unit {
    val url = "$baseUrl/friends/$user_id"
    val result = fetch<Unit, Unit>(url = url, method = HttpMethod.Delete, body = null)
    return result.getOrThrow()
}

suspend fun deleteFriendRequest(baseUrl: String, sender_id: String, receiver_id: String): Unit {
    val url = "$baseUrl/friend-requests?sender_id=$sender_id&receiver_id=$receiver_id"
    val result = fetch<Unit, Unit>(url = url, method = HttpMethod.Delete, body = null)
    return result.getOrThrow()
}

suspend fun acceptFriendRequest(baseUrl: String, sender_id: String, receiver_id: String): Unit {
    val url = "$baseUrl/friend-requests?sender_id=$sender_id&receiver_id=$receiver_id"
    val result = fetch<Unit, Unit>(url = url, method = HttpMethod.Post, body = null)
    return result.getOrThrow()

}


