import SwiftUI
import Shared

struct OrderUsersRow: View {
    let orderUser: OrderUser
    
    var body: some View {
        HStack {
            Image(systemName: "person.crop.circle")
                .resizable()
                .aspectRatio(contentMode: .fill)
                .frame(width: 35, height: 35)
                .foregroundColor(.gray)
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
        .padding()
        .animation(.spring(response: 0.4, dampingFraction: 0.7), value: orderUser.status)
    }
}
