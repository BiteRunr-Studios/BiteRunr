package org.biterunr_studios.biterunr.DTO

import kotlinx.datetime.Instant
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class SelectItemsOrderLocationDTO(
    @SerialName("location_id")
    val locationId: String,

    @SerialName("order_location_id")
    val orderLocationId: String,

    @SerialName("location_name")
    val locationName: String,
)

@Serializable
data class SelectItemsOrderLocationRequest(
    @SerialName("order_id")
    val orderId: String
)

@Serializable
data class SelectItemsOrderUserLocationItemDTO(
    @SerialName("id")
    val id: String,

    @SerialName("order_location_id")
    val orderLocationId: String,

    @SerialName("order_user_id")
    val orderUserId: String,

    @SerialName("item_id")
    val itemId: String,

    @SerialName("comments")
    val comments: String?,

    @SerialName("quantity")
    val quantity: Int,

    @SerialName("created_at")
    val createdAt: Instant?,

    @SerialName("updated_at")
    val updatedAt: Instant?,

    @SerialName("item")
    val item: SelectItemsItemDTO
)

@Serializable
data class SelectItemsItemDTO (
    @SerialName("id")
    val id: String,

    @SerialName("name")
    val name: String,

    @SerialName("location_id")
    val locationId: String,

    @SerialName("created_at")
    val createdAt: Instant?,

    @SerialName("updated_at")
    val updatedAt: Instant?,
)

@Serializable
data class SelectItemsAddExistingItemDTO (
    @SerialName("order_location_id")
    val orderLocationId: String,

    @SerialName("order_user_id")
    val orderUserId: String,

    @SerialName("item_id")
    val itemId: String,

    @SerialName("comments")
    val comments: String? = null,

    @SerialName("quantity")
    val quantity: Int,
)

@Serializable
data class SelectItemsAddNewItemDTO (
    @SerialName("order_user_id")
    val orderUserId: String,

    @SerialName("new_item")
    val newItem: SelectItemsNewItemDTO,

    @SerialName("quantity")
    val quantity: Int,

    @SerialName("comments")
    val comments: String? = null,
)

@Serializable
data class SelectItemsNewItemDTO (
    @SerialName("name")
    val name: String,

    @SerialName("location_id")
    val locationId: String,
)

@Serializable
data class SelectItemsEditItemDTO (
    @SerialName("comments")
    val comments: String?,

    @SerialName("quantity")
    val quantity: Int
)