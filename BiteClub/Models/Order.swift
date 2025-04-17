import Foundation

enum Status: String, Codable {
    case created, active, cancelled, completed
}

struct Order: Codable, Hashable, Identifiable {
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
    
    var clerkId: String?
    
    init(
        id: UUID?,
        name: String,
        creatorId: UUID,
        comments: String?,
        status: Status,
        paused: Bool,
        createdAt: Date?,
        updatedAt: Date?,
        orderUsers: [OrderUser]?,
        orderLocations: [OrderLocation]?,
        creator: User?,
        clerkId: String?
    ) {
        self.id = id ?? UUID()
        self.name = name
        self.creatorId = creatorId
        self.comments = comments
        self.status = status
        self.paused = paused
        self.createdAt = createdAt ?? Date()
        self.updatedAt = updatedAt ?? Date()
        self.orderUsers = orderUsers
        self.orderLocations = orderLocations
        self.creator = creator
        self.clerkId = clerkId
    }
    
    enum CodingKeys: String, CodingKey {
        case id = "id"
        case name = "name"
        case creatorId = "creator_id"
        case comments = "comments"
        case status = "status"
        case paused = "paused"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
        case orderUsers = "order_users"
        case orderLocations = "order_locations"
        case creator = "creator"
        case clerkId = "clerk_id"
    }
}
