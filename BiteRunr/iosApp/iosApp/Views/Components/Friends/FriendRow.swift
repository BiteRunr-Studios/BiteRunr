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
        HStack(spacing: 12) {
            // Profile image
            //            if let imageUrlString = user.imageUrl, let imageUrl = URL(string: imageUrlString) {
            //                AsyncImage(url: imageUrl) { phase in
            //                    switch phase {
            //                    case .empty:
            //                        ProgressView()
            //                            .frame(width: 50, height: 50)
            //                    case .success(let image):
            //                        image
            //                            .resizable()
            //                            .aspectRatio(contentMode: .fill)
            //                            .frame(width: 50, height: 50)
            //                            .clipShape(Circle())
            //                    case .failure:
            //                        Image(systemName: "person.circle.fill")
            //                            .resizable()
            //                            .aspectRatio(contentMode: .fill)
            //                            .frame(width: 50, height: 50)
            //                            .foregroundColor(.gray)
            //                    @unknown default:
            //                        Image(systemName: "person.circle.fill")
            //                            .resizable()
            //                            .aspectRatio(contentMode: .fill)
            //                            .frame(width: 50, height: 50)
            //                            .foregroundColor(.gray)
            //                    }
            //                }
            //            } else {
            Image(systemName: "person.circle.fill")
                .resizable()
                .aspectRatio(contentMode: .fill)
                .frame(width: 50, height: 50)
                .foregroundColor(.gray)
            //            }
            
            VStack(alignment: .leading, spacing: 4) {
                Text(user.firstName + " " + user.lastName)
                    .fontWeight(.medium)
                
            }
            
            Spacer()
            
            if isDeleting {
                ProgressView()
                    .padding(8)
            } else {
                // Options button
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
        .background(Color(.systemBackground))
        .contentShape(Rectangle())
        .alert("Error", isPresented: .init(get: { deleteError != nil }, set: { if !$0 { deleteError = nil } })) {
            Button("OK") { deleteError = nil }
        } message: {
            if let error = deleteError {
                Text(error)
            }
        }
    }
    
}

extension FriendRow {
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

