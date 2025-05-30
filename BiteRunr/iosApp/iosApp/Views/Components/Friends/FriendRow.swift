import SwiftUI
import Shared
import Supabase

struct FriendRow: View {
    let user: FriendUser
    @State private var showingOptions = false
    @State private var isDeleting = false
    @State private var deleteError: String? = nil
    @EnvironmentObject private var supabaseState: SupabaseState
    var onDelete: (() -> Void)?
    
    var body: some View {
        HStack(spacing: 16) {
            // Profile image or initials
            if let imageUrlString = user.avatarUrl, let imageUrl = URL(string: imageUrlString) {
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
                        InitialsCircle(firstName: user.firstName, lastName: user.lastName)
                    @unknown default:
                        InitialsCircle(firstName: user.firstName, lastName: user.lastName)
                    }
                }
            } else {
                InitialsCircle(firstName: user.firstName, lastName: user.lastName)
            }
            
            VStack(alignment: .leading, spacing: 4) {
                Text(user.firstName + " " + user.lastName)
                    .font(.headline)
                    .fontWeight(.medium)
                Text(user.email ?? "No email")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .lineLimit(1)
                    .truncationMode(.tail)
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
                    Button("Remove Friend", role: .destructive) {
                        Task {
                            await deleteFriend()
                        }
                    }
                    Button("Cancel", role: .cancel) {}
                }
            }
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .fill(Color(.secondarySystemBackground))
                .shadow(color: Color.black.opacity(0.04), radius: 4, x: 0, y: 2)
        )
        .contentShape(Rectangle())
        .alert("Error", isPresented: .init(get: { deleteError != nil }, set: { if !$0 { deleteError = nil } })) {
            Button("OK") { deleteError = nil }
        } message: {
            if let error = deleteError {
                Text(error)
            }
        }
    }
    
    private func deleteFriend() async {
        isDeleting = true
        deleteError = nil
        
        do {
            let apiUrl = ProcessInfo.processInfo.environment["API_URL"]!
            let user_id = supabase.auth.currentUser?.id.uuidString ?? ""
            try await Shared.deleteFriend(baseUrl: apiUrl, user_id: user_id)
            DispatchQueue.main.async {
                onDelete?()
            }
        } catch {
            DispatchQueue.main.async {
                deleteError = "Failed to delete friend: \(error.localizedDescription)"
            }
        }
        
        DispatchQueue.main.async {
            isDeleting = false
        }
    }
}

struct EmptyResponse: Decodable {}

