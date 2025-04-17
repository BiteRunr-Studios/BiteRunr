//
//  FriendRequestUser.swift
//  BiteClub
//
//  Created by Ryan Somers on 4/17/25.
//

import Foundation

struct FriendRequestUser: Identifiable, Decodable {
    let id: String
    let firstName: String
    let lastName: String
    let email: String
    let clerkId: String
    let imageUrl: String?
    let senderId: String
    let receiverId: String

    var user: User {
        User(
            id: UUID(uuidString: id) ?? UUID(),
            firstName: firstName,
            lastName: lastName,
            email: email,
            clerkId: clerkId,
            createdAt: Date(),
            updatedAt: Date(),
            imageUrl: imageUrl,
            createdOrders: nil,
            orderUsers: nil,
            orderItems: nil,
            friends: nil,
            sentFriendRequests: nil,
            receivedFriendRequests: nil
        )
    }

    enum CodingKeys: String, CodingKey {
        case id
        case firstName = "first_name"
        case lastName = "last_name"
        case email
        case clerkId = "clerk_id"
        case imageUrl = "image_url"
        case senderId = "sender_id"
        case receiverId = "receiver_id"
    }
}
