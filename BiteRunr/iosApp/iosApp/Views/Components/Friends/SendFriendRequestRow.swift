import SwiftUI
import Shared

struct SendFriendRequestRow: View {
    let friend: FriendUser
    let isFriend: Bool
    let isRequested: Bool
    let onAdd: () -> Void

    var body: some View {
        HStack(spacing: 16) {
            if let imageUrlString = friend.avatarUrl, let imageUrl = URL(string: imageUrlString) {
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
                        InitialsCircle(firstName: friend.firstName, lastName: friend.lastName)
                    @unknown default:
                        InitialsCircle(firstName: friend.firstName, lastName: friend.lastName)
                    }
                }
            } else {
                InitialsCircle(firstName: friend.firstName, lastName: friend.lastName)
            }

            VStack(alignment: .leading, spacing: 2) {
                Text(friend.firstName + " " + friend.lastName)
                    .font(.headline)
                    .fontWeight(.medium)
//                Text(friend.email ?? "No Email Provided…")
//                    .font(.subheadline)
//                    .foregroundColor(.secondary)
            }
            Spacer()

            // Action button
            Button(action: onAdd) {
                HStack {
                    if isFriend {
                        Image(systemName: "checkmark.circle.fill")
                        Text("Friends")
                    } else if isRequested {
                        Image(systemName: "hourglass")
                        Text("Requested")
                    } else {
                        Image(systemName: "person.badge.plus")
                        Text("Add")
                    }
                }
                .fontWeight(.medium)
                .frame(minWidth: 90, minHeight: 32)
                .padding(.horizontal, 10)
                .background(
                    Capsule()
                        .fill(
                            isFriend ? Color.green :
                            isRequested ? Color.orange :
                            Color.accentColor.opacity(0.15)
                        )
                )
                .foregroundColor(
                    isFriend || isRequested ? .white : .accentColor
                )
            }
            .buttonStyle(.plain)
            .disabled(isFriend || isRequested)
            .animation(.spring(duration: 0.2), value: isRequested)
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .fill(Color(.secondarySystemBackground))
                .shadow(color: Color.black.opacity(0.04), radius: 4, x: 0, y: 2)
        )
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
    }
}
