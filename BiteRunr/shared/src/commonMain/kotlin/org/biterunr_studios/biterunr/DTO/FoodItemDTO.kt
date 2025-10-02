package org.biterunr_studios.biterunr.DTO

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class FoodItemDTO(
    @SerialName("id")
    val id: String,
    @SerialName("name")
    val name: String,
    @SerialName("location_id")
    val locationId: String,
    @SerialName("created_at")
    val createdAt: String,
    @SerialName("updated_at")
    val updatedAt: String,
    @SerialName("location")
    val location: FoodItemLocationDTO,
    @SerialName("restaurant_name")
    val restaurantName: String
)

@Serializable
data class FoodItemLocationDTO(
    @SerialName("name")
    val name: String
)
