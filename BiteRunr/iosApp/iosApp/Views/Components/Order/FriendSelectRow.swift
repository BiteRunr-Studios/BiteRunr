import SwiftUI
//import Clerk

struct FriendSelectRow: View {
    let friend: User
    let isSelected: Bool
    
    var body: some View {
        HStack(spacing: 12) {
            if let imageUrlString = friend.imageUrl, let imageUrl = URL(string: imageUrlString) {
                AsyncImage(url: imageUrl) { phase in
                    switch phase {
                    case .empty:
                        ProgressView()
                            .frame(width: 40, height: 40)
                    case .success(let image):
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                            .frame(width: 40, height: 40)
                            .clipShape(Circle())
                    case .failure:
                        Image(systemName: "person.circle.fill")
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                            .frame(width: 40, height: 40)
                            .foregroundColor(.gray)
                    @unknown default:
                        Image(systemName: "person.circle.fill")
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                            .frame(width: 40, height: 40)
                            .foregroundColor(.gray)
                    }
                }
            } else {
                Image(systemName: "person.circle.fill")
                    .resizable()
                    .aspectRatio(contentMode: .fill)
                    .frame(width: 40, height: 40)
                    .foregroundColor(.gray)
            }
            
            VStack(alignment: .leading) {
                Text(friend.firstName + " " + friend.lastName)
                    .foregroundStyle(.primary)
                Text(friend.email)
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
