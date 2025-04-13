import Foundation

struct User: Codable, Identifiable {
    var id: UUID
    var firstName: String
    var lastName: String
    var email: String
    var clerkId: String
    var createdAt: Date
    var updatedAt: Date
    
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
        case email
        case clerkId = "clerk_id"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
        case createdOrders = "createdOrders"
        case orderUsers = "orderUsers"
        case orderItems = "orderItems"
        case friends = "friends"
        case sentFriendRequests = "sentFriendRequests"
        case receivedFriendRequests = "receivedFriendRequests"
    }
}
