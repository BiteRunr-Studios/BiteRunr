//
//  FriendsView.swift
//  BiteClub
//
//  Created by Ryan Somers on 4/16/25.
//

import SwiftUI
import Clerk

struct FriendsView: View {
    @State private var searchText = ""
    @State private var selectedTab = 0
    @State private var showAddFriendSheet = false
    @State private var friends: [User] = []
    @State private var isLoading = false
    @State private var errorMessage: String? = nil
    @Environment(Clerk.self) private var clerk
    
    // Placeholder count for requests until i can figure out api
    private let placeholderRequestCount = 2
    
    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Custom tab selector
                HStack(spacing: 0) {
                    TabButton(title: "Friends", isSelected: selectedTab == 0) {
                        selectedTab = 0
                    }
                    
                    TabButton(title: "Requests", isSelected: selectedTab == 1, badgeCount: placeholderRequestCount) {
                        selectedTab = 1
                    }
                }
                .padding(.horizontal)
                .padding(.top, 8)
                
                // Search bar
                HStack(spacing: 12) {
                    Image(systemName: "magnifyingglass")
                        .foregroundStyle(Color.secondary)
                    
                    TextField("Search", text: $searchText)
                        .autocapitalization(.none)
                        .disableAutocorrection(true)
                    
                    if !searchText.isEmpty {
                        Button(action: {
                            searchText = ""
                        }) {
                            Image(systemName: "xmark.circle.fill")
                                .foregroundStyle(Color.secondary)
                        }
                    }
                }
                .padding()
                .background(Color(.systemGray6))
                .cornerRadius(10)
                .padding(.horizontal)
                .padding(.top, 8)
                
                if selectedTab == 0 {
                    // Friends tab
                    if isLoading {
                        Spacer()
                        ProgressView()
                        Spacer()
                    } else if let error = errorMessage {
                        Spacer()
                        VStack(spacing: 16) {
                            Image(systemName: "exclamationmark.triangle")
                                .font(.system(size: 50))
                                .foregroundColor(.orange)
                            Text(error)
                                .multilineTextAlignment(.center)
                            Button("Try Again") {
                                Task {
                                    await loadFriends()
                                }
                            }
                            .buttonStyle(.bordered)
                        }
                        .padding()
                        Spacer()
                    } else {
                        FriendsListView(
                            friends: filteredFriends,
                            onFriendDeleted: { deletedFriend in
                                // Remove the friend from the local array
                                if let index = friends.firstIndex(where: { $0.id == deletedFriend.id }) {
                                    friends.remove(at: index)
                                }
                            }
                        )
                        .transition(.opacity)
                    }
                } else {
                    RequestsPlaceholderView()
                        .transition(.opacity)
                }
            }
            .navigationTitle("Friends")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        showAddFriendSheet = true
                    } label: {
                        Image(systemName: "person.badge.plus")
                    }
                }
            }
            .sheet(isPresented: $showAddFriendSheet) {
                SendFriendRequestView()
                    .presentationDetents([
                                .height(UIScreen.main.bounds.height * 0.82),
                                .large
                            ])
                    .presentationDragIndicator(.hidden)
            }
            .onAppear {
                Task {
                    await loadFriends()
                }
            }
            .animation(.bouncy, value: selectedTab)
        }
    }
    
    // friends filtering
    private var filteredFriends: [User] {
        if searchText.isEmpty {
            return friends
        } else {
            return friends.filter { friend in
                let fullName = "\(friend.firstName) \(friend.lastName)".lowercased()
                return fullName.contains(searchText.lowercased()) ||
                friend.email.lowercased().contains(searchText.lowercased())
            }
        }
    }
    
    // fetch friends
    private func loadFriends() async {
        isLoading = true
        errorMessage = nil
        
        do {
            if let user = clerk.user {
                let apiUrl = ProcessInfo.processInfo.environment["API_URL"]!
                let friendsUrl = "\(apiUrl)/users/clerk/\(user.id)/friends"
                friends = try await fetch(url: friendsUrl, responseType: [User].self, body: nil as String?)
            }
        } catch {
            errorMessage = "Failed to load friends: \(error.localizedDescription)"
        }
        
        isLoading = false
    }
}

