import Foundation


struct OrderDTO: Codable, Hashable, Identifiable {
    var id: UUID
    var name: String
    var creatorId: UUID?
    var comments: String?
    var status: Status
    var paused: Bool
    var createdAt: Date
    var updatedAt: Date

    var orderUsers: [OrderUserDTO]?
    var orderLocations: [OrderLocationDTO]?
    var creator: User?
    
    var clerkId: String?
    
    //    {
    //      "name": "",
    //      "comments": null,
    //      "status": "created",
    //      "paused": true,
    //      "creator_id?": "",
    //      "clerk_id": "",
    //      "order_locations": [
    //        {
    //          "order_id?": "",
    //          "location_id": ""
    //        }
    //      ],
    //      "order_users": [
    //        {
    //          "order_id?": "",
    //          "user_id": ""
    //        }
    //      ]
    //    }
    
    init(
        id: UUID?,
        name: String,
        creatorId: UUID?,
        comments: String?,
        status: Status,
        paused: Bool,
        createdAt: Date?,
        updatedAt: Date?,
        orderUsers: [OrderUserDTO]?,
        orderLocations: [OrderLocationDTO]?,
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

