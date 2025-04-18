import Foundation

struct OrderLocationDTO: Codable, Hashable {
    var orderLocationId: UUID
    var orderId: UUID?
    
    enum CodingKeys: String, CodingKey {
        case orderLocationId = "location_id"
        case orderId = "order_id"
    }
    
    init(orderLocationId: UUID) {
        self.orderLocationId = orderLocationId
    }
}
