import Foundation

struct Location: Codable, Identifiable {
    var id: UUID
    var name: String
    var address: String
    
    var orderLocations: [OrderLocation]?
    
    enum CodingKeys: String, CodingKey {
        case id = "id"
        case name = "name"
        case address = "address"
        case orderLocations = "order_locations"
    }
}
