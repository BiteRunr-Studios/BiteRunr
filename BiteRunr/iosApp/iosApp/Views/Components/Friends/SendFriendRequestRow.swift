import SwiftUI
import Shared

struct SendFriendRequestRow: View {
    let friend: FriendUser
    let isFriend: Bool
    let isRequested: Bool
    let onAdd: () -> Void

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: "person.circle.fill")
                .resizable()
                .aspectRatio(contentMode: .fill)
                .frame(width: 40, height: 40)
                .foregroundColor(.gray)

            VStack(alignment: .leading) {
                Text(friend.firstName + " " + friend.lastName)
                    .foregroundStyle(.primary)
                Text(friend.email ?? "No Email Provided...")
                    .foregroundStyle(.secondary)
            }
            Spacer()

            Button(action: onAdd) {
                if isFriend {
                    Text("Friends")
                        .fontWeight(.medium)
                        .frame(width: 100, height: 32)
                        .background(Color.green)
                        .foregroundColor(.white)
                        .cornerRadius(6)
                } else if isRequested {
                    Text("Requested")
                        .fontWeight(.medium)
                        .frame(width: 100, height: 32)
                        .background(Color.orange)
                        .foregroundColor(.white)
                        .cornerRadius(6)
                } else {
                    Text("Add")
                        .fontWeight(.medium)
                        .frame(width: 100, height: 32)
                        .background(Color.gray.opacity(0.3))
                        .foregroundColor(.primary)
                        .cornerRadius(6)
                }
            }
            .buttonStyle(.plain)
            .padding(.horizontal)
            .animation(.spring(duration: 0.2), value: isRequested)
            .disabled(isFriend || isRequested)
        }
        .padding(.vertical, 4)
    }
}
