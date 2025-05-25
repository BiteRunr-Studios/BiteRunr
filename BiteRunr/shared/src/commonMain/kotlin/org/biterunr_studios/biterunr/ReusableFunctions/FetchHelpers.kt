package org.biterunr_studios.biterunr.ReusableFunctions

import io.ktor.client.request.forms.MultiPartFormDataContent
import io.ktor.client.request.forms.formData
import org.biterunr_studios.biterunr.Models.Location
import io.ktor.http.*
import io.ktor.util.reflect.instanceOf
import org.biterunr_studios.biterunr.DTO.AcceptFriendRequestBody
import org.biterunr_studios.biterunr.DTO.CreateFriendRequestBody
import org.biterunr_studios.biterunr.DTO.CreateUserBody
import org.biterunr_studios.biterunr.DTO.CreateUserSSOBody
import org.biterunr_studios.biterunr.DTO.FriendRequestResponse
import org.biterunr_studios.biterunr.DTO.FriendRequestUser
import org.biterunr_studios.biterunr.DTO.FriendUser
import org.biterunr_studios.biterunr.DTO.OrderDTO
import org.biterunr_studios.biterunr.DTO.ReceiptDetails
import org.biterunr_studios.biterunr.DTO.SentFriendRequest
import org.biterunr_studios.biterunr.Models.FetchResponse
import org.biterunr_studios.biterunr.Models.Friend
import org.biterunr_studios.biterunr.Models.Order
import org.biterunr_studios.biterunr.Models.OrderUser
import org.biterunr_studios.biterunr.Models.UpdateProfile
import org.biterunr_studios.biterunr.Models.UpdateUserProfileRequest
import org.biterunr_studios.biterunr.Models.UserProfile

suspend fun getLocations(baseUrl: String): FetchResponse<List<Location>> {
    val url = "$baseUrl/locations"
    val result = fetch<Unit, List<Location>>(url = url, method = HttpMethod.Get, body = null)
    return result
}

suspend fun getFriends(baseUrl: String, user_id: String): FetchResponse<List<FriendUser>> {
    val url = "$baseUrl/users/$user_id/friends"
    val result = fetch<Unit, List<FriendUser>>(url = url, method = HttpMethod.Get, body = null)
    return result
}

suspend fun getFriendRequests(baseUrl: String, user_id: String): FetchResponse<List<FriendRequestUser>> {
    val url = "$baseUrl/users/$user_id/friend-requests"
    val result =
        fetch<Unit, List<FriendRequestUser>>(url = url, method = HttpMethod.Get, body = null)
    return result
}

suspend fun getAllUsersExceptAuthenticated(baseUrl: String, user_id: String): FetchResponse<List<FriendUser>> {
    val url = "$baseUrl/users/all-except/$user_id"
    val result = fetch<Unit, List<FriendUser>>(url = url, method = HttpMethod.Get, body = null)
    return result
}

suspend fun getUserProfile(baseUrl: String, user_id: String): FetchResponse<UserProfile> {
    val url = "$baseUrl/users/$user_id"
    val result = fetch<Unit, UserProfile>(url = url, method = HttpMethod.Get, body = null)
    return result
}

suspend fun getSentFriendRequests(baseUrl: String, user_id: String): FetchResponse<List<SentFriendRequest>> {
    val url = "$baseUrl/sent-friend-requests?userId=$user_id&status=pending"
    val result =
        fetch<Unit, List<SentFriendRequest>>(url = url, method = HttpMethod.Get, body = null)
    return result
}

suspend fun getOrders(baseUrl: String, userId: String): FetchResponse<List<Order>> {
    val url = "$baseUrl/orders/user/$userId"
    val result =
        fetch<Unit, List<Order>>(url = url, method = HttpMethod.Get, body = null)
    return result
}

suspend fun getOrderUsers(baseUrl: String, orderId: String): FetchResponse<List<OrderUser>> {
    val url = "$baseUrl/orders/$orderId/users"
    val result =
        fetch<Unit, List<OrderUser>>(url = url, method = HttpMethod.Get, body = null)
    return result
}

suspend fun deleteFriend(baseUrl: String, user_id: String): FetchResponse<Unit> {
    val url = "$baseUrl/friends/$user_id"
    val result = fetch<Unit, Unit>(url = url, method = HttpMethod.Delete, body = null)
    return result
}

suspend fun deleteFriendRequest(baseUrl: String, sender_id: String, receiver_id: String): FetchResponse<Unit> {
    val url = "$baseUrl/friend-requests?sender_id=$sender_id&receiver_id=$receiver_id"
    val result = fetch<Unit, Unit>(url = url, method = HttpMethod.Delete, body = null)
    return result
}

suspend fun acceptFriendRequest(baseUrl: String, user_id: String, friend_id: String): FetchResponse<Unit> {
    val url = "$baseUrl/friends"
    val body = AcceptFriendRequestBody(user_id, friend_id)
    val result = fetch<AcceptFriendRequestBody, Unit>(
        url = url,
        method = HttpMethod.Post,
        body = body
    )
    return result
}

suspend fun sendFriendRequest(
    baseUrl: String,
    senderId: String,
    receiverId: String,
    status: String = "pending"
): FetchResponse<FriendRequestResponse> {
    val url = "$baseUrl/friend-requests"
    val body = CreateFriendRequestBody(
        senderId = senderId,
        receiverId = receiverId,
        status = status
    )
    val result = fetch<CreateFriendRequestBody, FriendRequestResponse>(
        url = url,
        method = HttpMethod.Post,
        body = body
    )
    return result
}

suspend fun createUserProfile(baseUrl: String, authUserId: String, firstName: String, lastName: String, avatarUrl: String): FetchResponse<UserProfile> {
    val url = "$baseUrl/users/sso"
    val body = CreateUserSSOBody(
        id = authUserId,
        firstName = firstName,
        lastName = lastName,
        avatar_url = avatarUrl,
    )
    val result = fetch<CreateUserSSOBody, UserProfile>(url = url, method = HttpMethod.Post, body = body)
    
    return result
}

suspend fun updateUserProfile(
    baseUrl: String,
    userId: String,
    firstName: String,
    lastName: String,
    accessToken: String,
    refreshToken: String
): FetchResponse<UserProfile> {
    val url = "$baseUrl/users/$userId"
    val body = UpdateUserProfileRequest(
        profile = UpdateProfile(
            firstName = firstName,
            lastName = lastName
        ),
        accessToken = accessToken,
        refreshToken = refreshToken
    )
    val result = fetch<UpdateUserProfileRequest, UserProfile>(
        url = url,
        method = HttpMethod.Patch,
        body = body
    )
    return result
}

suspend fun createOrder(baseUrl: String, order: OrderDTO): FetchResponse<Order> {
    val url = "$baseUrl/orders"

    val result = fetch<OrderDTO, Order>(
        url = url,
        method = HttpMethod.Post,
        body = order
    )

    return result
}

suspend fun checkUserInActiveOrder(baseUrl: String, userId: String): FetchResponse<Boolean> {
    val url = "$baseUrl/users/$userId/active-orders"

    val result = fetch<Unit, Boolean>(
        url = url,
        method = HttpMethod.Get,
    )

    return result
}

suspend fun scanReceipt(
    baseUrl: String,
    imageData: ByteArray,
): FetchResponse<ReceiptDetails> {
    val url = "$baseUrl/scan-receipt"

    return fetchMultipart<ReceiptDetails>(
        url = url,
        fileData = imageData,
        fileName = "receipt.jpg",
        fileFieldName = "file",
        fileContentType = "image/jpeg",
        additionalFields = mapOf(
            "description" to "Receipt upload",
            "date" to "2025-05-14"
        )
    )
}