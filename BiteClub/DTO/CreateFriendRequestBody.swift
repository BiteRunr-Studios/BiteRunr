//
//  CreateFriendRequestBody.swift
//  BiteClub
//
//  Created by Ryan Somers on 4/17/25.
//

import Foundation

struct CreateFriendRequestBody: Codable {
    let sender_id: UUID
    let receiver_id: UUID
    let status: String
}

struct FriendRequestResponse: Codable {
    let id: String
    let sender_id: String
    let receiver_id: String
    let status: String
    let created_at: String
    let updated_at: String
}
