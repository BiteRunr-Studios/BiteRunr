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
    
    var body: some View {
        ScrollView {
            HStack(spacing: 12) {
                //                if let imageUrlString = user.imageUrl, let imageUrl = URL(string: imageUrlString) {
                //                    AsyncImage(url: imageUrl) { phase in
                //                        switch phase {
                //                        case .empty:
                //                            ProgressView()
                //                                .frame(width: 50, height: 50)
                //                        case .success(let image):
                //                            image
                //                                .resizable()
                //                                .aspectRatio(contentMode: .fill)
                //                                .frame(width: 50, height: 50)
                //                                .clipShape(Circle())
                //                        case .failure:
                //                            Image(systemName: "person.circle.fill")
                //                                .resizable()
                //                                .aspectRatio(contentMode: .fill)
                //                                .frame(width: 50, height: 50)
                //                                .foregroundColor(.gray)
                //                        @unknown default:
                //                            Image(systemName: "person.circle.fill")
                //                                .resizable()
                //                                .aspectRatio(contentMode: .fill)
                //                                .frame(width: 50, height: 50)
                //                                .foregroundColor(.gray)
                //                        }
                //                    }
                //                }
                //                else {
                Image(systemName: "person.circle.fill")
                    .resizable()
                    .aspectRatio(contentMode: .fill)
                    .frame(width: 50, height: 50)
                    .foregroundColor(.gray)
                //                }
                
                
                VStack(alignment: .leading, spacing: 4) {
                    Text(user.profile.firstName + " " + user.profile.lastName)
                        .fontWeight(.medium)
                    
//                    Text(user.email)
//                        .font(.subheadline)
//                        .foregroundColor(.secondary)
                }
                
                Spacer()
                
                HStack(spacing: 12) {
                    // Options button
                    Button {
                        showingOptions = true
                    } label: {
                        Image(systemName: "ellipsis")
                            .padding(8)
                            .foregroundColor(.primary)
                    }
                    .confirmationDialog("Friend Options", isPresented: $showingOptions) {
                        Button("Reject Request", role: .destructive) {
                            Task {
                                //                                await deleteFriendRequest()
                                print("Friend request rejected")
                            }
                        }
                        Button("Approve Request") {
                            Task {
                                //                                await acceptFriendRequest()
                                print("Friend request accepted")
                            }
                        }
                        Button("Cancel", role: .cancel) {}
                    }
                    
                }
            }
            .padding(.vertical, 8)
            .alert("Error", isPresented: .init(get: { errorMessage != nil }, set: { if !$0 { errorMessage = nil } })) {
                Button("OK") { errorMessage = nil }
            } message: {
                if let error = errorMessage {
                    Text(error)
                }
            }
        }
    }
}

extension PlaceholderRequestRow {
    //    private func deleteFriendRequest() async {
    //        isDeleting = true
    //        errorMessage = nil
    //        do {
    //            let apiUrl = ProcessInfo.processInfo.environment["API_URL"]!
    //            let url = "\(apiUrl)/friend-requests?sender_id=\(senderId)&receiver_id=\(receiverId)"
    //            let _: EmptyResponseDeleted = try await fetch(
    //                url: url,
    //                method: "DELETE",
    //                responseType: EmptyResponseDeleted.self,
    //                body: nil as String?
    //            )
    //            DispatchQueue.main.async {
    //                onDelete?()
    //            }
    //        } catch {
    //            DispatchQueue.main.async {
    //                errorMessage = "Failed to reject request: \(error.localizedDescription)"
    //            }
    //        }
    //        isDeleting = false
    //    }
    //
    //    private func acceptFriendRequest() async {
    //        isDeleting = true
    //        errorMessage = nil
    //        do {
    //            let apiUrl = ProcessInfo.processInfo.environment["API_URL"]!
    //            let url = "\(apiUrl)/friends"
    //            let body: [String: String] = [
    //                "user_id": senderId,
    //                "friend_id": receiverId
    //            ]
    //            let friendship: Friendship = try await fetch(
    //                url: url,
    //                method: "POST",
    //                responseType: Friendship.self,
    //                body: body
    //            )
    //            DispatchQueue.main.async {
    //                onAccept?()
    //                onDelete?()
    //            }
    //        } catch {
    //            DispatchQueue.main.async {
    //                errorMessage = "Failed to accept request: \(error.localizedDescription)"
    //            }
    //        }
    //        isDeleting = false
    //    }
    
}

struct EmptyResponseDeleted: Decodable {}
