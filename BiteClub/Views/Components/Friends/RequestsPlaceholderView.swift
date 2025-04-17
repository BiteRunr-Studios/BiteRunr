//
//  RequestsPlaceholderView.swift
//  BiteClub
//
//  Created by Ryan Somers on 4/16/25.
//

import SwiftUI
import Clerk

struct RequestsPlaceholderView: View {
    @Environment(Clerk.self) private var clerk
    @State private var errorMessage: String?
    @State var friendRequests: [FriendRequestUser]
    @State private var isLoading = false
    var body: some View {
        VStack(spacing: 20) {
            
            VStack(spacing: 16) {
                if friendRequests.isEmpty {
                    EmptyStateView(
                        icon: "person.2.slash",
                        title: "No Friend Requests Yet",
                        message: "You are very lonely right now (or maybe you just really want to make friends)."
                    )
                } else {
                    ForEach(friendRequests) { request in
                        PlaceholderRequestRow(
                            user: request.user,
                            senderId: request.senderId,
                            receiverId: request.receiverId,
                            onDelete: {
                                if let idx = friendRequests.firstIndex(where: { $0.id == request.id }) {
                                    friendRequests.remove(at: idx)
                                }
                            }
                        )
                    }

                }
                
            }
            .padding()
            .background(Color(.systemGray6))
            .cornerRadius(12)
            .padding(.horizontal)
            .padding(.top, 20)
            
            Spacer()
        }
    }
}
