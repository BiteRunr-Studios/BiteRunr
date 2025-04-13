import Foundation

struct Friend: Codable, Identifiable {
    var id: UUID
    var userId: UUID
    var friendId: UUID
    var createdAt: Date
    var updatedAt: Date
    
    var user: User?
    var friend: User?
    
    enum CodingKeys: String, CodingKey {
        case id = "id"
        case userId = "user_id"
        case friendId = "friend_id"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
        case user = "user"
        case friend = "friend"
    }
}
