import Foundation

enum RequestStatus: String, Codable {
    case pending, accepted, rejected
}

struct FriendRequest: Codable, Hashable, Identifiable {
    var id: UUID
    var senderId: UUID
    var receiverId: UUID
    var status: RequestStatus
    var createdAt: Date
    var updatedAt: Date
    
    var sender: User?
    var receiver: User?
    
    enum CodingKeys: String, CodingKey {
        case id = "id"
        case senderId = "sender_id"
        case receiverId = "receiver_id"
        case status = "status"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
        case sender = "sender"
        case receiver = "receiver"
    }
}
