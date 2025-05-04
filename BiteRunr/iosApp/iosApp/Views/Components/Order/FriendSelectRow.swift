import SwiftUI
import Shared

struct FriendSelectRow: View {
    let friend: FriendUser
    let isSelected: Bool
    
    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: "person.crop.circle.fill")
                .resizable()
                .aspectRatio(contentMode: .fill)
                .frame(width: 40, height: 40)
                .foregroundColor(.gray)
            
            VStack(alignment: .leading) {
                Text(friend.firstName + " " + friend.lastName)
                    .foregroundStyle(.primary)
                Text(friend.email ?? "Friend")
                    .foregroundStyle(.secondary)
            }
            
            
            Spacer()
            ZStack {
                RoundedRectangle(cornerRadius: 6)
                    .stroke(isSelected ? Color.orange : Color.gray.opacity(0.4), lineWidth: 1)
                    .frame(width: 20, height: 20)
                    .background(
                        RoundedRectangle(cornerRadius: 6)
                            .fill(isSelected ? Color.orange : Color.clear)
                    )
                
                if isSelected {
                    Image(systemName: "checkmark")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(.white)
                }
            }
        }
    }
}
