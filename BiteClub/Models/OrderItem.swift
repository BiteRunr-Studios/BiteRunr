import Foundation

struct OrderItem: Codable, Identifiable {
    var id: UUID
    var orderLocationId: UUID
    var userId: UUID
    var name: String
    var comments: String?
    var quantity: Int
    var createdAt: Date
    var updatedAt: Date
    
    var orderLocation: OrderLocation?
    var user: User?
    
    enum CodingKeys: String, CodingKey {
        case id = "id"
        case orderLocationId = "order_location_id"
        case userId = "user_id"
        case name = "name"
        case comments = "comments"
        case quantity = "quantity"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
        case orderLocation = "order_location"
        case user = "user"
    }
}
