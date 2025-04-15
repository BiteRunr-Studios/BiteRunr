import SwiftUI
import Clerk

struct AddFriendView: View {
    @State private var searchText = ""
    @State private var isToggledOn = false
    @State private var friends: [User] = [] // Array to hold fetched friends
    @State private var errorMessage: String? // Optional error message
    @Environment(Clerk.self) private var clerk
    
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
                Image(systemName: "magnifyingglass")
                    .frame(width: 24, height: 24)
                    .foregroundStyle(Color.secondary.opacity(0.3))
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
            } else {
                ForEach(friends, id: \.id) { friend in
                    HStack(spacing: 12) {
                        
                        // Profile image using the image_url from your backend
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
                            // Fallback if no image URL is available
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
                friends = response // Update the friends array with the fetched data
            }
        } catch {
            errorMessage = "Failed to fetch friends: \(error.localizedDescription)"
        }
    }
}
