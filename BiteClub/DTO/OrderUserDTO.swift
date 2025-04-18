import Foundation

struct OrderUserDTO: Codable, Hashable {
    var orderUserId: UUID
    var orderId: UUID?
    
    enum CodingKeys: String, CodingKey {
        case orderUserId = "user_id"
        case orderId = "order_id"
    }
    
    init(orderUserId: UUID) {
        self.orderUserId = orderUserId
    }
}
