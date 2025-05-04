import SwiftUI
import Shared

struct OrderUsersRow: View {
    let user: FriendUser
    
    var body: some View {
        HStack {
            Image(systemName: "person.crop.circle")
                .resizable()
                .aspectRatio(contentMode: .fill)
                .frame(width: 35, height: 35)
                .foregroundColor(.gray)
            VStack(alignment: .leading, spacing: 8) {
                Text(user.firstName + " " + user.lastName)
                    .font(.headline)
                Text("Adding Items...")
                    .foregroundStyle(.secondary)
                    .opacity(0.5)
            }
            
            Spacer()
            
        }
        .padding()
    }
}
