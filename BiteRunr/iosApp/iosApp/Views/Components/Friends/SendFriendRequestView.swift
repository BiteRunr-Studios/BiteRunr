//
//  SendFriendRequestView.swift
//  BiteClub
//
//  Created by Ryan Somers on 4/16/25.
//

import SwiftUI
import Shared

struct SendFriendRequestView: View {
    @State private var searchText = ""
    @State private var isToggledOn = false
    @State private var users: [FriendUser] = []
    @State private var friends: [FriendUser] = []
    @State private var currentUser: UserProfile? = nil
    @State private var errorMessage: String?
    @State private var requestedUserIDs: Set<String> = []
    @State private var acceptedUserIDs: Set<String> = []
    @EnvironmentObject private var supabaseState: SupabaseState
    
    private var filteredUsers: [FriendUser] {
        if searchText.isEmpty {
            return users
        } else {
            return users.filter { user in
                let fullName = "\(user.firstName) \(user.lastName)".lowercased()
//                let email = user.email.lowercased()
                let searchQuery = searchText.lowercased()
                
                return fullName.contains(searchQuery)
            }
        }
    }
    
    var body: some View {
        VStack{
            Capsule()
                .fill(Color.secondary.opacity(0.5))
                .frame(width: 120, height: 3)
                .padding(.vertical, 10)
            
            VStack(alignment: .leading, spacing: 20) {
                Text("Add Friends")
                    .foregroundStyle(.secondary)
                    .font(.title2)
                
                HStack(spacing: 12) {
                    TextField("Search Friends", text: $searchText)
                        .autocapitalization(.none)
                        .disableAutocorrection(true)
                    
                    if !searchText.isEmpty {
                        Button(action: {
                            searchText = ""
                        }) {
                            Image(systemName: "xmark.circle.fill")
                                .foregroundStyle(Color.secondary)
                        }
                        .transition(.scale)
                        .animation(.default, value: searchText)
                    } else {
                        Image(systemName: "magnifyingglass")
                            .frame(width: 24, height: 24)
                            .foregroundStyle(Color.secondary.opacity(0.3))
                    }
                }
                .padding(.vertical, 16)
                .padding(.horizontal, 16)
                .background(Color(UIColor.systemBackground))
                .cornerRadius(12)
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(Color.secondary.opacity(0.3), lineWidth: 1)
                )
                
                if let errorMessage = errorMessage {
                    Text(errorMessage)
                        .foregroundColor(.red)
                } else if users.isEmpty && !searchText.isEmpty {
                    VStack(spacing: 10) {
                        Image(systemName: "person.fill.questionmark")
                            .font(.system(size: 40))
                            .foregroundColor(.secondary)
                            .padding(.top, 20)
                        
                        Text("No friends found matching '\(searchText)'")
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.top, 20)
                } else if !searchText.isEmpty {
                    ForEach(filteredUsers, id: \.id) { friend in
                        let isFriend = friends.contains(where: { $0.id == friend.id })
                        let isRequested = requestedUserIDs.contains(friend.id)
                        SendFriendRequestRow(
                            friend: friend,
                            isFriend: isFriend,
                            isRequested: isRequested,
                            onAdd: {
                                Task {
                                     await sendFriendRequest(to: friend)
                                }
                            }
                        )
                    }
                }
                else {
                    EmptyStateView(
                        icon: "magnifyingglass",
                        title: "Search for a friend",
                        message: "Add friends to see them here."
                    )
                    Spacer()
                        .padding(.top, 40)
                }

                
                Spacer()
            }
            .padding()
            .onAppear {
                Task {
                    await fetchUsers()
                    await fetchCurrentUser()
                    await fetchSentFriendRequests()
                    await fetchFriends()
                }
            }
        }
    }
    
}




extension SendFriendRequestView {
    private func fetchUsers() async {
        errorMessage = nil
        
        do {
            guard let apiUrl = ProcessInfo.processInfo.environment["API_URL"] else {
                errorMessage = "API_URL not set"
                return
            }
            let user_id = supabase.auth.currentUser?.id.uuidString ?? ""
            let response = try await getAllUsersExceptAuthenticated(baseUrl: apiUrl, user_id: user_id)
            print(response)
            users = response
        } catch {
            errorMessage = "Failed to fetch users: \(error.localizedDescription)"
        }
        
    }
    
    private func fetchFriends() async {
        do {
            let apiUrl = ProcessInfo.processInfo.environment["API_URL"]!
            let user_id = supabase.auth.currentUser?.id.uuidString ?? ""
            let response = try await getFriends(baseUrl: apiUrl, user_id: user_id)
            DispatchQueue.main.async {
                friends = response
            }
    } catch {
        DispatchQueue.main.async {
            errorMessage = "Failed to fetch friends: \(error.localizedDescription)"
        }
    }
}


private func fetchCurrentUser() async {
    do {
        let apiUrl = ProcessInfo.processInfo.environment["API_URL"]!
        let user_id = supabase.auth.currentUser?.id.uuidString ?? ""
        let response = try await getUserProfile(baseUrl: apiUrl, user_id: user_id)
        currentUser = response
    } catch {
        errorMessage = "Failed to fetch current user: \(error.localizedDescription)"
    }
}

private func sendFriendRequest(to friend: FriendUser) async {
        guard let currentUser = currentUser else { return }
    do {
        let apiUrl = ProcessInfo.processInfo.environment["API_URL"]!
        _ = try await Shared.sendFriendRequest(
            baseUrl: apiUrl,
            senderId: currentUser.id,
            receiverId: friend.id,
            status: "pending"
        )
        DispatchQueue.main.async {
            requestedUserIDs.insert(friend.id)
        }
    } catch {
        DispatchQueue.main.async {
            errorMessage = "Failed to send friend request: \(error.localizedDescription)"
        }
    }
}


private func fetchSentFriendRequests() async {
    do {
        let apiUrl = ProcessInfo.processInfo.environment["API_URL"]!
        let user_id = supabase.auth.currentUser?.id.uuidString ?? ""
        let sentRequests = try await getSentFriendRequests(baseUrl: apiUrl, user_id: user_id)
        let ids = sentRequests.map { $0.receiver.id }
        DispatchQueue.main.async {
            requestedUserIDs = Set(ids)
        }
    } catch {
        errorMessage = "Failed to fetch sent requests: \(error.localizedDescription)"
    }
}

}
