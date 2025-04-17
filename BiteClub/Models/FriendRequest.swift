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

struct SentFriendRequest: Decodable, Identifiable {
    let id: UUID
    let createdAt: String
    let updatedAt: String
    let senderId: UUID
    let receiverId: UUID
    let status: String
    let receiver: FriendRequestReceiver

    enum CodingKeys: String, CodingKey {
        case id
        case createdAt = "created_at"
        case updatedAt = "updated_at"
        case senderId = "sender_id"
        case receiverId = "receiver_id"
        case status
        case receiver
    }
}

struct FriendRequestReceiver: Decodable {
    let id: UUID
    let clerkId: String
    let firstName: String
    let lastName: String
    let imageUrl: String?

    enum CodingKeys: String, CodingKey {
        case id
        case clerkId = "clerk_id"
        case firstName = "first_name"
        case lastName = "last_name"
        case imageUrl = "image_url"
    }
}

