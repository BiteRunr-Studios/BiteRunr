import SwiftUI
import Shared
//import Clerk

struct RequestsPlaceholderView: View {
//    @Environment(Clerk.self) private var clerk
    @State private var errorMessage: String?
    let friendRequests: [FriendRequestUser]
    @State private var isLoading = false
    
    var onRequestAccepted: ((FriendRequestUser) -> Void)?
    var onRequestRejected: ((FriendRequestUser) -> Void)?
    
    var body: some View {
        ScrollView {
            VStack(spacing: 0) {
                if friendRequests.isEmpty {
                    EmptyStateView(
                        icon: "person.2.slash",
                        title: "No Friend Requests Yet",
                        message: "You are very lonely right now (or maybe you just really want to make friends)."
                    )
                } else {
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
                    }
                }
            }
        }
        .padding(.top)
        .padding()
        
        Spacer()
    }
}
