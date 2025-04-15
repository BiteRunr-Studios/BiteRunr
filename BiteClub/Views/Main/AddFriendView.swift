import SwiftUI
import Clerk

struct AddFriendView: View {
    @State private var searchText = ""
    @State private var isToggledOn = false
    @State private var friends: [User] = [] // Array to hold fetched friends
    @State private var errorMessage: String? // Optional error message
    @Environment(Clerk.self) private var clerk
    
    // Computed property to filter friends based on search text
    private var filteredFriends: [User] {
        if searchText.isEmpty {
            return friends
        } else {
            return friends.filter { friend in
                let fullName = "\(friend.firstName) \(friend.lastName)".lowercased()
                let email = friend.email.lowercased()
                let searchQuery = searchText.lowercased()
                
                return fullName.contains(searchQuery) || email.contains(searchQuery)
            }
        }
    }
    
    var body: some View {
        // --- The Grabber Handle ---
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
            } else if filteredFriends.isEmpty && !searchText.isEmpty {
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
            } else if filteredFriends.isEmpty && friends.isEmpty {
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
                ForEach(filteredFriends, id: \.id) { friend in
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
                        
                        Button {
                            isToggledOn.toggle()
                        } label: {
                            Text("")
                                .frame(width: 44, height: 24)
                                .background(isToggledOn ? Color.orange : Color.gray.opacity(0.3))
                                .foregroundColor(.white)
                                .cornerRadius(6)
                        }
                        .buttonStyle(.plain)
                        .padding(.horizontal)
                        .animation(.easeInOut(duration: 0.2), value: isToggledOn)
                    }
                    .padding(.vertical, 4)
                }
            }
            
            Spacer()
        }
        .padding()
        .onAppear {
            Task {
                await fetchFriends()
            }
        }
    }
    
    private func fetchFriends() async {
        do {
            if let user = clerk.user {
                let url = "http://localhost:3000/users/clerk/\(user.id)/friends"
                let response: [User] = try await fetch(url: url, responseType: [User].self, body: nil as String?)
                friends = response
            }
        } catch {
            errorMessage = "Failed to fetch friends: \(error.localizedDescription)"
        }
    }
}
