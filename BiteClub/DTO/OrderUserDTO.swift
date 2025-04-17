import Foundation

struct OrderUserDTO: Codable, Hashable {
    var orderUserId: UUID
    
    enum CodingKeys: String, CodingKey {
        case orderUserId = "order_user_id"
    }
    
    init(orderUserId: UUID) {
        self.orderUserId = orderUserId
    }
}
