import Foundation

struct OrderItem: Codable, Hashable, Identifiable {
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
    
    init(
        id: UUID?,
        orderLocationId: UUID,
        userId: UUID,
        name: String,
        comments: String? = nil,
        quantity: Int,
        createdAt: Date?,
        updatedAt: Date?,
        orderLocation: OrderLocation? = nil,
        user: User? = nil
    ) {
        self.id = id ?? UUID()
        self.orderLocationId = orderLocationId
        self.userId = userId
        self.name = name
        self.comments = comments
        self.quantity = quantity
        self.createdAt = createdAt ?? Date()
        self.updatedAt = updatedAt ?? Date()
        self.orderLocation = orderLocation
        self.user = user
    }
    
    
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
