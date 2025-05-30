import SwiftUI
import Shared
//import Clerk

struct RequestsPlaceholderView: View {
    let friendRequests: [FriendRequestUser]
    @State private var errorMessage: String?
    @State private var isLoading = false
    
    var onRequestAccepted: ((FriendRequestUser) -> Void)?
    var onRequestRejected: ((FriendRequestUser) -> Void)?
    
    var body: some View {
        VStack(spacing: 0) {
            if friendRequests.isEmpty {
                EmptyStateView(
                    icon: "person.2.slash",
                    title: "No Friend Requests Yet",
                    message: "You are very lonely right now (or maybe you just really want to make friends)."
                )
                .padding(.top, 60)
            } else {
                ScrollView {
                    LazyVStack(spacing: 14) {
                        ForEach(friendRequests, id: \.id) { request in
                            PlaceholderRequestRow(
                                user: request.toUser(),
                                senderId: request.senderId,
                                receiverId: request.receiverId,
                                friendRequestId: request.id,
                                onDelete: {
                                    onRequestRejected?(request)
                                },
                                onAccept: {
                                    onRequestAccepted?(request)
                                }
                            )
                            .padding(.horizontal, 24)
                            .transition(.move(edge: .bottom).combined(with: .opacity))
                        }
                    }
                    .padding(.top, 16)
                }
            }
        }
        .animation(.spring(), value: friendRequests)
    }
}
