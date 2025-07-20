import Shared
import SwiftUI
import Supabase

struct FriendsView: View {
    @State private var searchText = ""
    @State private var selectedTab = 0
    @State private var showAddFriendSheet = false
    @State private var friends: [FriendUser] = []
    @State private var friendRequests: [FriendRequestUser] = []
    @State private var isLoadingFriends = false
    @State private var isLoadingRequests = false
    @State private var errorMessage: String? = nil
    @EnvironmentObject var supabaseState: SupabaseState
    
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 0) {
                    // Custom tab selector
                    HStack(spacing: 0) {
                        FriendsTabSelector(selectedTab: $selectedTab, requestsCount: friendRequests.count)
                    }
                    .padding(.horizontal)
                    .padding(.top, 8)
                    
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
                        
                        Button(action: { showAddFriendSheet = true }) {
                            Image(systemName: "person.badge.plus")
                                .font(.system(size: 20, weight: .bold))
                                .foregroundColor(.accentColor)
                                .padding(.leading, 2)
                        }
                        .accessibilityLabel("Add Friend")
                    }
                    .padding()
                    .background(Color(.systemGray6))
                    .cornerRadius(10)
                    .padding(.horizontal, 24)
                    .padding(.top, 8)
                    
                    if selectedTab == 0 {
                        // Friends tab
                        if isLoadingFriends {
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
                        RequestsPlaceholderView(
                            friendRequests: filteredFriendRequests,
                            onRequestAccepted: { acceptedRequest in
                                if let index = friendRequests.firstIndex(where: { $0.id == acceptedRequest.id }) {
                                    friendRequests.remove(at: index)
                                }
                                Task {
                                    await loadFriends()
                                }
                            },
                            onRequestRejected: { rejectedRequest in
                                if let index = friendRequests.firstIndex(where: { $0.id == rejectedRequest.id }) {
                                    friendRequests.remove(at: index)
                                }
                                Task {
                                    await loadFriends()
                                }
                            }
                        )
                        .transition(.opacity)
                    }
                }
                .sheet(isPresented: $showAddFriendSheet) {
                    SendFriendRequestView()
                        .presentationDetents([
                            .height(UIScreen.main.bounds.height * 0.82),
                            .large,
                        ])
                        .presentationDragIndicator(.hidden)
                }
                .onAppear {
                    Task {
                        await loadFriends()
                        await loadFriendRequests()
                    }
                }
                .animation(.bouncy, value: selectedTab)
            }
            .refreshable {
                if selectedTab == 0 {
                    await loadFriends()
                } else {
                    await loadFriendRequests()
                }
            }
        }
    }
}

extension FriendsView {
    // fetch friend requests as users
    private func loadFriendRequests() async {
        isLoadingRequests = true
        errorMessage = nil

        do {
            guard let apiUrl = Bundle.main.infoDictionary?["API_URL"] as? String else {
                errorMessage = "API_URL not set"
                return
            }
            let user_id = supabase.auth.currentUser?.id.uuidString ?? ""
            let response = try await getFriendRequests(baseUrl: apiUrl, user_id: user_id)
            if response.success {
                friendRequests = response.data as! [FriendRequestUser]
            }
        } catch is CancellationError {
            // Task was cancelled, no need to show error
        } catch {
            errorMessage = "Failed to fetch friend requests: \(error.localizedDescription)"
        }

        isLoadingRequests = false
    }
    
    // fetch friends
    private func loadFriends() async {
        isLoadingFriends = true
        errorMessage = nil

        do {
            guard let apiUrl = Bundle.main.infoDictionary?["API_URL"] as? String else {
                errorMessage = "API_URL not set"
                return
            }
            let user_id = supabase.auth.currentUser?.id.uuidString ?? ""
            let response = try await getFriends(baseUrl: apiUrl, user_id: user_id)
            if response.success {
                friends = response.data as! [FriendUser]
            }
        } catch is CancellationError {
            // Task was cancelled, no need to show error
        } catch {
            errorMessage = "Failed to fetch friends: \(error.localizedDescription)"
        }

        isLoadingFriends = false
    }
    //
    // friends filtering
    private var filteredFriends: [FriendUser] {
        if searchText.isEmpty {
            return friends
        } else {
            return friends.filter { friend in
                let fullName = "\(friend.firstName) \(friend.lastName))".lowercased()
                return fullName.contains(searchText.lowercased())
                //                    || friend.email.lowercased().contains(searchText.lowercased())
            }
        }
    }
    
    // friends filtering
    private var filteredFriendRequests: [FriendRequestUser] {
        if searchText.isEmpty {
            return friendRequests
        } else {
            return friendRequests.filter { friendRequest in
                let fullName = "\(friendRequest.toUser().profile.firstName) \(friendRequest.toUser().profile.lastName))".lowercased()
                return fullName.contains(searchText.lowercased())
                //                    || friendRequest.user.email.lowercased().contains(searchText.lowercased())
            }
        }
    }
    
    private var getFriendRequestsCount: Int {
        return friendRequests.count
    }
}

struct FriendsTabSelector: View {
    @Binding var selectedTab: Int
    let requestsCount: Int
    let horizontalPadding: CGFloat = 24
    
    var body: some View {
        let width = UIScreen.main.bounds.width - (horizontalPadding * 2)
        let tabWidth = width / 2
        
        ZStack(alignment: .leading) {
            Capsule()
                .fill(Color.orange.opacity(0.15))
                .frame(width: tabWidth, height: 40)
                .offset(x: selectedTab == 0 ? 0 : tabWidth)
                .animation(.spring(response: 0.4, dampingFraction: 0.7), value: selectedTab)
            
            HStack(spacing: 0) {
                Button(action: { withAnimation { selectedTab = 0 } }) {
                    Text("Friends")
                        .fontWeight(selectedTab == 0 ? .semibold : .regular)
                        .foregroundColor(selectedTab == 0 ? .orange : .primary)
                        .frame(width: tabWidth, height: 40)
                        .animation(nil, value: selectedTab)
                }
                Button(action: { withAnimation { selectedTab = 1 } }) {
                    HStack(spacing: 6) {
                        Text("Requests")
                        if requestsCount > 0 {
                            Text("\(requestsCount)")
                                .font(.caption)
                                .padding(5)
                                .background(Circle().fill(Color.red))
                                .foregroundColor(.white)
                        }
                    }
                    .fontWeight(selectedTab == 1 ? .semibold : .regular)
                    .foregroundColor(selectedTab == 1 ? .orange : .primary)
                    .frame(width: tabWidth, height: 40)
                    .animation(nil, value: selectedTab)
                }
            }
        }
        .frame(width: width, height: 40)
        .background(Color(.systemGray6))
        .clipShape(Capsule())
        .padding(.horizontal, horizontalPadding)
        .padding(.top, 8)
    }
}



