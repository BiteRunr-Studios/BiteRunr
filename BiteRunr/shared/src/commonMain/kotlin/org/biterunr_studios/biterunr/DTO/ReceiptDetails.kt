package org.biterunr_studios.biterunr.DTO

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class ReceiptDetails(
    @SerialName("items")
    val items: List<Item>,
    @SerialName("subtotal")
    val subtotal: Double,
    @SerialName("tax")
    val tax: Double,
    @SerialName("total")
    val total: Double
) {
    @Serializable
    data class Item(
        @SerialName("name")
        val name: String,
        @SerialName("unit_price")
        val unitPrice: Double,
        @SerialName("quantity")
        val quantity: Double
    )
}
