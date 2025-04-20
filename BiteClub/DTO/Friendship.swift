//
//  Friendship.swift
//  BiteClub
//
//  Created by Ryan Somers on 4/18/25.
//

import Foundation

struct Friendship: Decodable {
    let id: String
    let user_id: String
    let friend_id: String
    let created_at: String
    let updated_at: String
}

