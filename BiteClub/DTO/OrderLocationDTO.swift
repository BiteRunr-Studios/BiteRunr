import Foundation

struct OrderLocationDTO {
    var orderLocationId: String
    
    enum CodingKeys: String, CodingKey {
        case orderLocationId = "order_location_id"
    }
}
