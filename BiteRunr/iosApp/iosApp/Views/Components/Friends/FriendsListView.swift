import SwiftUI
import Shared

struct FriendsListView: View {
    let friends: [UserProfile]
    var onFriendDeleted: ((UserProfile) -> Void)? 
    
    var body: some View {
        ScrollView {
            VStack(spacing: 0) {
                if friends.isEmpty {
                    EmptyStateView(
                        icon: "person.2.slash",
                        title: "No Friends Yet",
                        message: "Add friends to see them here."
                    )
                } else {
                    ForEach(friends, id: \.id) { friend in
                        FriendRow(user: friend, onDelete: {
                            onFriendDeleted?(friend)
                        })
                    }
                }
            }
            .padding(.top)
        }
    }
}

