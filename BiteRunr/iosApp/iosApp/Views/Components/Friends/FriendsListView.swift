import SwiftUI
import Shared

struct FriendsListView: View {
    let friends: [FriendUser]
    var onFriendDeleted: ((FriendUser) -> Void)?
    
    var body: some View {
        VStack(spacing: 0) {
            if friends.isEmpty {
                VStack(spacing: 16) {
                    Text("🫂")
                        .font(.system(size: 60))
                        .padding(.top, 60)
                    Text("No Friends Yet")
                        .font(.title2)
                        .fontWeight(.bold)
                    Text("Tap the ➕ button above to add your first friend!")
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .transition(.opacity)
            } else {
                ScrollView {
                    LazyVStack(spacing: 14) {
                        ForEach(friends, id: \.id) { friend in
                            FriendRow(user: friend, onDelete: {
                                onFriendDeleted?(friend)
                            })
                            .padding(.horizontal, 24)
                            .transition(.move(edge: .bottom).combined(with: .opacity))
                        }
                    }
                    .padding(.top, 16)
                }
            }
        }
        .animation(.spring(), value: friends)
    }
}
