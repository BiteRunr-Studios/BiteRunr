//
//  SendFriendRequestView.swift
//  BiteClub
//
//  Created by Ryan Somers on 4/16/25.
//

import SwiftUI
//import Clerk

struct SendFriendRequestView: View {
    @State private var searchText = ""
    @State private var isToggledOn = false
    @State private var users: [User] = []
    @State private var friends: [User] = []
    @State private var currentUser: User? = nil
    @State private var errorMessage: String?
    @State private var requestedUserIDs: Set<UUID> = []
    @State private var acceptedUserIDs: Set<UUID> = []
//    @Environment(Clerk.self) private var clerk
    
    private var filteredUsers: [User] {
        if searchText.isEmpty {
            return users
        } else {
            return users.filter { user in
                let fullName = "\(user.firstName) \(user.lastName)".lowercased()
                let email = user.email.lowercased()
                let searchQuery = searchText.lowercased()
                
                return fullName.contains(searchQuery) || email.contains(searchQuery)
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
                        HStack(spacing: 12) {
                            if let imageUrlString = friend.imageUrl, let imageUrl = URL(string: imageUrlString) {
                                AsyncImage(url: imageUrl) { phase in
                                    switch phase {
                                    case .empty:
                                        ProgressView()
                                            .frame(width: 40, height: 40)
                                    case .success(let image):
                                        image
                                            .resizable()
                                            .aspectRatio(contentMode: .fill)
                                            .frame(width: 40, height: 40)
                                            .clipShape(Circle())
                                    case .failure:
                                        Image(systemName: "person.circle.fill")
                                            .resizable()
                                            .aspectRatio(contentMode: .fill)
                                            .frame(width: 40, height: 40)
                                            .foregroundColor(.gray)
                                    @unknown default:
                                        Image(systemName: "person.circle.fill")
                                            .resizable()
                                            .aspectRatio(contentMode: .fill)
                                            .frame(width: 40, height: 40)
                                            .foregroundColor(.gray)
                                    }
                                }
                            } else {
                                Image(systemName: "person.circle.fill")
                                    .resizable()
                                    .aspectRatio(contentMode: .fill)
                                    .frame(width: 40, height: 40)
                                    .foregroundColor(.gray)
                            }
                            
                            VStack(alignment: .leading) {
                                Text(friend.firstName + " " + friend.lastName)
                                    .foregroundStyle(.primary)
                                Text(friend.email)
                                    .foregroundStyle(.secondary)
                            }
                            Spacer()
                            
                            let isFriend = friends.contains(where: { $0.id == friend.id })
                            let isRequested = requestedUserIDs.contains(friend.id)
                            
                            Button {
                                Task {
                                    await sendFriendRequest(to: friend)
                                }
                            } label: {
                                if isFriend {
                                        Text("Friends")
                                            .fontWeight(.medium)
                                            .frame(width: 100, height: 32)
                                            .background(Color.green)
                                            .foregroundColor(.white)
                                            .cornerRadius(6)
                                    } else if isRequested {
                                        Text("Requested")
                                            .fontWeight(.medium)
                                            .frame(width: 100, height: 32)
                                            .background(Color.orange)
                                            .foregroundColor(.white)
                                            .cornerRadius(6)
                                    } else {
                                        Text("Add")
                                            .fontWeight(.medium)
                                            .frame(width: 100, height: 32)
                                            .background(Color.gray.opacity(0.3))
                                            .foregroundColor(.primary)
                                            .cornerRadius(6)
                                    }
                            }
                            .buttonStyle(.plain)
                            .padding(.horizontal)
                            .animation(.spring(duration: 0.2), value: requestedUserIDs)
                            .disabled(isFriend || isRequested)
                        }
                        .padding(.vertical, 4)
                    }
                }
                
                Spacer()
            }
            .padding()
            .onAppear {
                Task {
//                    await fetchUsers()
//                    await fetchCurrentUser()
//                    await fetchSentFriendRequests()
//                    await fetchFriends()
                }
            }
        }
    }
    
}

extension SendFriendRequestView {
//    private func fetchUsers() async {
//        do {
//            if let user = clerk.user {
//                let apiUrl = ProcessInfo.processInfo.environment["API_URL"]!
//                let url = "\(apiUrl)/users/all-except/\(user.id)"
//                let response: [User] = try await fetch(url: url, responseType: [User].self, body: nil as String?)
//                users = response
//            }
//        } catch {
//            errorMessage = "Failed to fetch friends: \(error.localizedDescription)"
//        }
//    }
//
//    private func fetchFriends() async {
//        do {
//            if let user = clerk.user {
//                let apiUrl = ProcessInfo.processInfo.environment["API_URL"]!
//                let url = "\(apiUrl)/users/clerk/\(user.id)/friends"
//                let response: [User] = try await fetch(url: url, responseType: [User].self, body: nil as String?)
//                DispatchQueue.main.async {
//                    friends = response
//                }
//            }
//        } catch {
//            DispatchQueue.main.async {
//                errorMessage = "Failed to fetch friends: \(error.localizedDescription)"
//            }
//        }
//    }
//
//
//    private func fetchCurrentUser() async {
//        do {
//            if let clerkUser = clerk.user {
//                let apiUrl = ProcessInfo.processInfo.environment["API_URL"]!
//                let url = "\(apiUrl)/users/clerk/\(clerkUser.id)"
//                let user: User = try await fetch(url: url, responseType: User.self, body: nil as String?)
//                currentUser = user
//            }
//        } catch {
//            errorMessage = "Failed to fetch current user: \(error.localizedDescription)"
//        }
//    }
//
//    private func sendFriendRequest(to friend: User) async {
//        guard let currentUser = currentUser else { return }
//        do {
//            let apiUrl = ProcessInfo.processInfo.environment["API_URL"]!
//            let url = "\(apiUrl)/friend-requests"
//            let body = CreateFriendRequestBody(
//                sender_id: currentUser.id,
//                receiver_id: friend.id,
//                status: "pending"
//            )
//            _ = try await fetch(
//                url: url,
//                method: "POST",
//                responseType: FriendRequestResponse.self,
//                body: body
//            )
//            DispatchQueue.main.async {
//                requestedUserIDs.insert(friend.id)
//            }
//        } catch {
//            DispatchQueue.main.async {
//                errorMessage = "Failed to send friend request: \(error.localizedDescription)"
//            }
//        }
//    }
//
//    private func fetchSentFriendRequests() async {
//        guard let currentUser = currentUser else { return }
//        do {
//            let apiUrl = ProcessInfo.processInfo.environment["API_URL"]!
//            let url = "\(apiUrl)/sent-friend-requests?userId=\(currentUser.id.uuidString)&status=pending"
//            let sentRequests: [SentFriendRequest] = try await fetch(url: url, responseType: [SentFriendRequest].self, body: nil as String?)
//            let ids = sentRequests.map { $0.receiver.id }
//            DispatchQueue.main.async {
//                requestedUserIDs = Set(ids)
//            }
//        } catch {
//            errorMessage = "Failed to fetch sent requests: \(error.localizedDescription)"
//        }
//    }
    
}
