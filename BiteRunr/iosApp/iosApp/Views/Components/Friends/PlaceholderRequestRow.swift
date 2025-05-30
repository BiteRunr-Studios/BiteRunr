import SwiftUI
import Shared

struct PlaceholderRequestRow: View {
    let user: UserProfile
    let senderId: String
    let receiverId: String
    let friendRequestId: String
    var onDelete: (() -> Void)?
    var onAccept: (() -> Void)?
    
    @State private var isDeleting = false
    @State private var errorMessage: String?
    @State private var showingOptions = false
    @Environment(\.colorScheme) var colorScheme
    
    var body: some View {
        HStack(spacing: 16) {
            // Avatar or initials
            if let imageUrlString = user.profile.avatarUrl, let imageUrl = URL(string: imageUrlString) {
                AsyncImage(url: imageUrl) { phase in
                    switch phase {
                    case .empty:
                        ProgressView()
                            .frame(width: 48, height: 48)
                    case .success(let image):
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                            .frame(width: 48, height: 48)
                            .clipShape(Circle())
                    case .failure:
                        InitialsCircle(firstName: user.profile.firstName, lastName: user.profile.lastName)
                    @unknown default:
                        InitialsCircle(firstName: user.profile.firstName, lastName: user.profile.lastName)
                    }
                }
            } else {
                InitialsCircle(firstName: user.profile.firstName, lastName: user.profile.lastName)
            }
            
            VStack(alignment: .leading, spacing: 4) {
                Text(user.profile.firstName + " " + user.profile.lastName)
                    .font(.headline)
                    .fontWeight(.medium)
            }
            
            Spacer()
            
            if isDeleting {
                ProgressView()
                    .padding(8)
            } else {
                Button {
                    showingOptions = true
                } label: {
                    Image(systemName: "ellipsis")
                        .padding(8)
                        .foregroundColor(.primary)
                }
                .confirmationDialog("Friend Options", isPresented: $showingOptions) {
                    Button("Approve Request") {
                        Task {
                            await acceptFriendRequest()
                        }
                    }
                    Button("Reject Request", role: .destructive) {
                        Task {
                            await deleteFriendRequest()
                        }
                    }
                    Button("Cancel", role: .cancel) {}
                }
            }
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .fill(colorScheme == .light ? Color(.systemGray6) : Color(.secondarySystemBackground))
                .shadow(color: Color.black.opacity(colorScheme == .light ? 0.08 : 0.04), radius: 4, x: 0, y: 2)
        )
        .contentShape(Rectangle())
        .alert("Error", isPresented: .init(get: { errorMessage != nil }, set: { if !$0 { errorMessage = nil } })) {
            Button("OK") { errorMessage = nil }
        } message: {
            if let error = errorMessage {
                Text(error)
            }
        }
    }
}

extension PlaceholderRequestRow {
    private func deleteFriendRequest() async {
        isDeleting = true
        errorMessage = nil
        do {
            let apiUrl = ProcessInfo.processInfo.environment["API_URL"]!
            try await Shared.deleteFriendRequest(
                baseUrl: apiUrl,
                sender_id: senderId,
                receiver_id: receiverId
            )
            DispatchQueue.main.async {
                onDelete?()
            }
        } catch {
            DispatchQueue.main.async {
                errorMessage = "Failed to reject request: \(error.localizedDescription)"
            }
        }
        isDeleting = false
    }
    
    private func acceptFriendRequest() async {
        isDeleting = true
        errorMessage = nil
        do {
            let apiUrl = ProcessInfo.processInfo.environment["API_URL"]!
            try await Shared.acceptFriendRequest(
                baseUrl: apiUrl,
                user_id: senderId,
                friend_id: receiverId
            )
            print("\(senderId) accepted \(receiverId)")
            DispatchQueue.main.async {
                onAccept?()
                onDelete?()
            }
        } catch {
            DispatchQueue.main.async {
                errorMessage = "Failed to accept request: \(error.localizedDescription)"
            }
        }
        isDeleting = false
    }
    
    
}

struct EmptyResponseDeleted: Decodable {}
