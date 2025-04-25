import SwiftUI
import Shared
//import Clerk

struct LocationSelectRow: View {
    let location: Location
    let isSelected: Bool

    var body: some View {
        HStack(spacing: 12) {
            Image("locationIcon")
                .resizable()
                .aspectRatio(contentMode: .fill)
                .frame(width: 35, height: 35)

            VStack(alignment: .leading) {
                Text(location.name)
                    .foregroundStyle(.primary)
                    .lineLimit(1)
                    .truncationMode(.tail)
                Text(location.address)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
                    .truncationMode(.tail)
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

