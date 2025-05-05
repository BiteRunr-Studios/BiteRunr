import SwiftUI
import Shared

struct AddFriendsView: View {
    @State private var searchText = ""
    @State private var isToggledOn = false
    
    @State private var friends: [FriendUser] = []
    @State private var saveFriendsButton: Bool = false
    @Binding var orderFriendDTOS: [OrderUserDTO]
    @Binding var isPresented: Bool
    
    @State private var errorMessage: String?
    
    var body: some View {
        VStack {
            Capsule()
                .fill(Color.secondary.opacity(0.5))
                .frame(width: 120, height: 3)
                .padding(.vertical, 10)
            
            VStack(alignment: .leading, spacing: 20) {
                Text("Add Friends")
                    .foregroundStyle(.secondary)
                    .font(.title2)
                    .padding(.horizontal)
                    .padding(.top, 15)
                
                HStack(spacing: 12) {
                    TextField("Search Friends", text: $searchText)
                        .autocapitalization(.none)
                        .disableAutocorrection(true)
                        .frame(height: 50)
                        .padding(.horizontal, 16)
                        .frame(height: 55)
                    
                    if !searchText.isEmpty {
                        Button(action: {
                            withAnimation {
                                searchText = ""
                            }
                        }) {
                            Image(systemName: "xmark.circle.fill")
                                .foregroundStyle(Color.secondary)
                        }
                        .transition(.scale)
                        .animation(.default, value: searchText)
                        .padding(.horizontal)
                    } else {
                        Image(systemName: "magnifyingglass")
                            .frame(width: 24, height: 24)
                            .foregroundStyle(Color.secondary.opacity(0.3))
                            .padding(.horizontal)
                    }
                }
                .background(Color(UIColor.systemBackground))
                .cornerRadius(12)
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(Color.secondary.opacity(0.3), lineWidth: 1)
                )
                .padding(.horizontal, 16)
                
                if let errorMessage = errorMessage {
                    Text(errorMessage)
                        .foregroundColor(.red)
                }
                else if filteredFriends.isEmpty && !searchText.isEmpty {
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
                }
                else if filteredFriends.isEmpty && friends.isEmpty {
                    VStack(spacing: 10) {
                        Image(systemName: "person.3.fill")
                            .font(.system(size: 40))
                            .foregroundColor(.secondary)
                            .padding(.top, 20)
                        
                        Text("No friends available")
                            .foregroundColor(.secondary)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.top, 20)
                } else {
                    ZStack {
                        ScrollView {
                            ForEach(filteredFriends, id: \.id) { friend in
                                Button(action: {
                                    toggleFriend(friend)
                                }) {
                                    FriendSelectRow(
                                        friend: friend,
                                        isSelected: orderFriendDTOS.contains(where: { $0.orderUserId == friend.id })
                                    )
                                }
                                .buttonStyle(.plain)
                                .padding(.horizontal)
                                .padding(.vertical, 8)
                            }
                            HStack {
                            }.padding(.bottom, 50)
                        }
                        
                        if saveFriendsButton {
                            VStack {
                                Spacer()
                                Button(action: {
                                    Task {
                                        isPresented = false
                                    }
                                }) {
                                    HStack {
                                        Image(systemName: "checkmark.circle")
                                        Text("Set Friends")
                                    }
                                    .frame(maxWidth: .infinity)
                                    .padding(.vertical, 16)
                                }
                                .background(Color.orange)
                                .foregroundColor(.white)
                                .cornerRadius(12)
                                .contentShape(Rectangle())
                            }
                            .transition(.opacity) // Transition animation
                            .padding(.horizontal, 16)
                        }
                    }
                    .animation(.easeInOut(duration: 0.2), value: saveFriendsButton) // Apply animation to ZStack
                    Spacer()
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
            .onAppear {
                Task {
                    await fetchFriends()
                    withAnimation {
                        saveFriendsButton = orderFriendDTOS.count > 0
                    }
                }
            }
        }
        .ignoresSafeArea(.container, edges: .bottom)
    }
}

extension AddFriendsView {
    private var filteredFriends: [FriendUser] {
        if searchText.isEmpty {
            return friends
        } else {
            return friends.filter { friend in
                let fullName = "\(friend.firstName) \(friend.lastName)".lowercased()
                let email = friend.email?.lowercased() ?? ""
                let searchQuery = searchText.lowercased()
                
                return fullName.contains(searchQuery) || email.contains(searchQuery)
            }
        }
    }
    
    private func fetchFriends() async {
        do {
            guard let userId = supabase.auth.currentUser?.id.uuidString else { return }
            
            guard let apiUrl = ProcessInfo.processInfo.environment["API_URL"] else {
                errorMessage = "API_URL not set"
                return
            }
            
            let response = try await getFriends(baseUrl: apiUrl, user_id: userId)
            friends = response.data as! [FriendUser]
        } catch {
            errorMessage = "Failed to fetch friends: \(error.localizedDescription)"
        }
    }
    
    private func toggleFriend(_ friend: FriendUser) {
        if let index = orderFriendDTOS.firstIndex(where: { $0.orderUserId == friend.id }) {
            orderFriendDTOS.remove(at: index)
        } else {
            let dto = OrderUserDTO(orderUserId: friend.id, orderId: nil)
            orderFriendDTOS.append(dto)
        }
        withAnimation {
            saveFriendsButton = orderFriendDTOS.count > 0
        }
    }
}
