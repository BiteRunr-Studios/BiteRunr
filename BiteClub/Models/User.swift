import Foundation

struct User: Codable, Hashable, Identifiable {
    var id: UUID
    var firstName: String
    var lastName: String
    var email: String
    var clerkId: String
    var createdAt: Date
    var updatedAt: Date
    var imageUrl: String?
    
    var createdOrders: [Order]?
    var orderUsers: [OrderUser]?
    var orderItems: [OrderItem]?
    var friends: [User]?
    var sentFriendRequests: [FriendRequest]?
    var receivedFriendRequests: [FriendRequest]?
    
    enum CodingKeys: String, CodingKey {
        case id = "id"
        case firstName = "first_name"
        case lastName = "last_name"
        case email = "email"
        case clerkId = "clerk_id"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
        case imageUrl = "image_url"
        case createdOrders = "created_orders"
        case orderUsers = "order_users"
        case orderItems = "order_items"
        case friends = "friends"
        case sentFriendRequests = "sent_friend_requests"
        case receivedFriendRequests = "received_friend_requests"
    }
}
