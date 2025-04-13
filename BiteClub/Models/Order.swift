import Foundation

enum Status: String, Codable {
    case created, active, cancelled, completed
}

struct Order: Codable, Identifiable {
    var id: UUID
    var name: String
    var creatorId: UUID
    var comments: String?
    var status: Status
    var paused: Bool
    var createdAt: Date
    var updatedAt: Date
    
    var orderUsers: [OrderUser]?
    var orderLocations: [OrderLocation]?
    var creator: User?
    
    enum CodingKeys: String, CodingKey {
        case id = "id"
        case name = "name"
        case creatorId = "creator_id"
        case comments = "comments"
        case status = "status"
        case paused = "paused"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
        case orderUsers = "OrderUsers"
        case orderLocations = "OrderLocations"
        case creator = "creator"
    }
}

