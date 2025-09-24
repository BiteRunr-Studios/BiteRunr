package org.biterunr_studios.biterunr.ReusableFunctions

import io.ktor.http.HttpMethod
import org.biterunr_studios.biterunr.DTO.AcceptFriendRequestBody
import org.biterunr_studios.biterunr.DTO.AwaitingOrderRequest
import org.biterunr_studios.biterunr.DTO.AwaitingOrdersDTO
import org.biterunr_studios.biterunr.DTO.CreateFriendRequestBody
import org.biterunr_studios.biterunr.DTO.CreateUserSSOBody
import org.biterunr_studios.biterunr.DTO.FriendRequestResponse
import org.biterunr_studios.biterunr.DTO.FriendRequestUser
import org.biterunr_studios.biterunr.DTO.FriendUser
import org.biterunr_studios.biterunr.DTO.OrderDTO
import org.biterunr_studios.biterunr.DTO.PickupItemDTO
import org.biterunr_studios.biterunr.DTO.ReceiptDetails
import org.biterunr_studios.biterunr.DTO.SelectItemsAddExistingItemDTO
import org.biterunr_studios.biterunr.DTO.SelectItemsAddNewItemDTO
import org.biterunr_studios.biterunr.DTO.SelectItemsEditItemDTO
import org.biterunr_studios.biterunr.DTO.SelectItemsItemDTO
import org.biterunr_studios.biterunr.DTO.SelectItemsOrderLocationDTO
import org.biterunr_studios.biterunr.DTO.SelectItemsOrderLocationRequest
import org.biterunr_studios.biterunr.DTO.SelectItemsOrderUserLocationItemDTO
import org.biterunr_studios.biterunr.DTO.SentFriendRequest
import org.biterunr_studios.biterunr.DTO.UpdateOrderDTO
import org.biterunr_studios.biterunr.Models.FetchResponse
import org.biterunr_studios.biterunr.Models.Location
import org.biterunr_studios.biterunr.Models.Order
import org.biterunr_studios.biterunr.Models.OrderItem
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

//suspend fun getOrderUsers(baseUrl: String, orderId: String): FetchResponse<List<OrderUser>> {
//    val url = "$baseUrl/orders/$orderId/users"
//    val result =
//        fetch<Unit, List<OrderUser>>(url = url, method = HttpMethod.Get, body = null)
//    return result
//}

suspend fun getOrderItems(baseUrl: String, orderId: String): FetchResponse<List<OrderItem>> {
    val url = "$baseUrl/orders/$orderId/items"
    val result = fetch<Unit, List<OrderItem>>(url = url, method = HttpMethod.Get, body = null)
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

suspend fun updateOrder(baseUrl: String, orderId: String, order: UpdateOrderDTO): FetchResponse<Order> {
    val url = "$baseUrl/orders/$orderId"

    val result = fetch<UpdateOrderDTO, Order>(
        url = url,
        method = HttpMethod.Patch,
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

//suspend fun getOrderItemCount(baseUrl: String, orderId: String): FetchResponse<OrderItemCountDTO> {
//    var url = "$baseUrl/orders/$orderId/items/count";
//
//    val result = fetch<Unit, OrderItemCountDTO>(
//        url = url,
//        method = HttpMethod.Get,
//    )
//
//    return result;
//}

suspend fun getAwaitingOrdersData(baseUrl: String, orderId: String): FetchResponse<AwaitingOrdersDTO> {
    var url = "$baseUrl/orders/awaiting_order"

    val result = fetch<AwaitingOrderRequest, AwaitingOrdersDTO>(
        url = url,
        method = HttpMethod.Post,
        body = AwaitingOrderRequest(orderId)
    )

    return result
}

suspend fun getOrderLocationsForItemSelection(baseUrl: String, orderId: String): FetchResponse<List<SelectItemsOrderLocationDTO>> {
    var url = "$baseUrl/orders/$orderId/locations"

    val result = fetch<SelectItemsOrderLocationRequest, List<SelectItemsOrderLocationDTO>>(
        url = url,
        method = HttpMethod.Get,
        body = SelectItemsOrderLocationRequest(orderId)
    )

    return result
}

suspend fun getOrderUserLocationItems(baseUrl: String, orderUserId: String, orderLocationId: String): FetchResponse<List<SelectItemsOrderUserLocationItemDTO>> {
    var url = "$baseUrl/orders/locations/$orderLocationId/users/$orderUserId/items"

    val result = fetch<Unit, List<SelectItemsOrderUserLocationItemDTO>>(
        url = url,
        method = HttpMethod.Get
    )

    return result
}

suspend fun getLocationItems(baseUrl: String, locationId: String, searchQuery: String): FetchResponse<List<SelectItemsItemDTO>> {
    var url = "$baseUrl/items/$locationId?searchQuery=$searchQuery"

    val result = fetch<Unit, List<SelectItemsItemDTO>>(
        url=url,
        method = HttpMethod.Get
    )

    return result
}

suspend fun getOrderItemsFromOrderLocation(baseUrl: String, order_location_id: String): FetchResponse<List<PickupItemDTO>> {
    val url = "$baseUrl/order-items/order-location/$order_location_id"
    val result = fetch<Unit, List<PickupItemDTO>>(url = url, method = HttpMethod.Get, body = null)
    return result
}

suspend fun addNewItemToLocation(baseUrl: String, order_id: String, order_location_id: String, newItem: SelectItemsAddNewItemDTO): FetchResponse<SelectItemsAddExistingItemDTO> {
    val url = "$baseUrl/orders/$order_id/locations/$order_location_id/items";

    val result = fetch<SelectItemsAddNewItemDTO, SelectItemsAddExistingItemDTO>(url=url, method = HttpMethod.Post, body = newItem)
    return result
}

suspend fun addItemsToOrderUser(baseUrl: String, existingItemReference: SelectItemsAddExistingItemDTO): FetchResponse<SelectItemsAddExistingItemDTO> {
    val url = "$baseUrl/orders/add_items_to_order_user";

    val result = fetch<SelectItemsAddExistingItemDTO, SelectItemsAddExistingItemDTO>(url=url, method = HttpMethod.Post, body = existingItemReference)
    return result
}

suspend fun deleteItemReferenceToUserOrder(baseUrl: String, orderItemId: String): FetchResponse<SelectItemsAddExistingItemDTO> {
    val url = "$baseUrl/orders/order-items/$orderItemId"

    val result = fetch<Unit, SelectItemsAddExistingItemDTO>(url=url, method = HttpMethod.Delete, body = null)
    return result
}

suspend fun editItemReferenceToUserOrder(baseUrl: String, orderItemId: String, editedItem: SelectItemsEditItemDTO): FetchResponse<SelectItemsAddExistingItemDTO> {
    val url = "$baseUrl/orders/order-items/$orderItemId"

    val result = fetch<SelectItemsEditItemDTO, SelectItemsAddExistingItemDTO>(url=url, method = HttpMethod.Patch, body = editedItem)
    return result
}