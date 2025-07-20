import SwiftUI
import Shared

struct OrderUsersRow: View {
    let orderUser: OrderUser
    
    var body: some View {
        HStack {
            if let imageUrlString = orderUser.user.avatarUrl, let imageUrl = URL(string: imageUrlString) {
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
                        InitialsCircle(firstName: orderUser.user.firstName, lastName: orderUser.user.lastName)
                    @unknown default:
                        InitialsCircle(firstName: orderUser.user.firstName, lastName: orderUser.user.lastName)
                    }
                }
            } else {
                InitialsCircle(firstName: orderUser.user.firstName, lastName: orderUser.user.lastName)
            }
            
            VStack(alignment: .leading) {
                Text(orderUser.user.firstName + " " + orderUser.user.lastName)
                    .font(.headline)
                    .foregroundStyle(.primary)
                Text(orderUser.status)
                    .foregroundStyle(.secondary)
                    .opacity(0.5)
            }
            
            Spacer()
            if orderUser.status == "done" {
                Image(systemName: "checkmark.circle.fill")
                    .resizable()
                    .aspectRatio(contentMode: .fill)
                    .frame(width: 35, height: 35)
                    .foregroundColor(.green)
                    .transition(.scale.combined(with: .opacity))
            }
        }
//        .padding(.vertical)
        .animation(.spring(response: 0.4, dampingFraction: 0.7), value: orderUser.status)
    }
}
