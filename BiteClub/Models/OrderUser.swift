import Foundation

struct OrderUser: Codable, Hashable, Identifiable {
    var id: UUID
    var userId: UUID
    var orderId: UUID
    var createdAt: Date
    var updatedAt: Date
    
    var order: Order?
    var user: User?
    
    enum CodingKeys: String, CodingKey {
        case id = "id"
        case userId = "user_id"
        case orderId = "order_id"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
        case order = "order"
        case user = "user"
    }
}
