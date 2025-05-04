import SwiftUI

struct PastOrderGroupBox: View {
    let title: String
    let itemCount: Int
    let extraCount: Int?
    let color: Color
    let avatarCount: Int 

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 8) {
                Text("\(itemCount) Items")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .opacity(0.5)
            }
            Text(title)
                .font(.title2)
                .fontWeight(.semibold)
                .foregroundColor(.secondary)
            Spacer()
            HStack(spacing: -12) {
                ForEach(0..<avatarCount, id: \.self) { _ in
                    Circle()
                        .stroke(Color(.systemGray4), lineWidth: 2)
                        .background(Circle().fill(Color(.systemBackground)))
                        .frame(width: 32, height: 32)
                }
            }
            .padding(.top, 4)
        }
        .padding()
        .frame(
            width: UIScreen.main.bounds.width * 0.42,
            height: 140,
            alignment: .topLeading
        )
        .background(
            ZStack {
                RoundedRectangle(cornerRadius: 18)
                    .fill(Color(.systemBackground))
                    .overlay(
                        RoundedRectangle(cornerRadius: 18)
                            .stroke(Color(.systemGray4), lineWidth: 1.5)
                    )
            }
        )
    }
}
