import Foundation

struct OrderLocationDTO: Codable, Hashable {
    var orderLocationId: UUID
    
    enum CodingKeys: String, CodingKey {
        case orderLocationId = "order_location_id"
    }
    
    init(orderLocationId: UUID) {
        self.orderLocationId = orderLocationId
    }
}
