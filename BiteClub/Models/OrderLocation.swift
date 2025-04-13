import Foundation

struct OrderLocation: Codable, Identifiable {
    var id: UUID
    var orderId: UUID
    var locationId: UUID
    var createdAt: Date
    var updatedAt: Date
    
    var order: Order?
    var location: Location?
    var orderItems: [OrderItem]?
    
    enum CodingKeys: String, CodingKey {
        case id = "id"
        case orderId = "order_id"
        case locationId = "location_id"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
        case order = "order"
        case location = "location"
        case orderItems = "orderItems"
    }
}
