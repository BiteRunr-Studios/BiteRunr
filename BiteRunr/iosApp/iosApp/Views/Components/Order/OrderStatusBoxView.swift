import SwiftUI
import Shared

struct OrderStatusBoxView: View {
    let startDate: Date
    let orderGroupName: String
    let orderGroupDescription: String
    let orderGroupStatus: Status

    @State private var pulse = false

    private var formattedDate: String {
        let formatter = DateFormatter()
        formatter.dateStyle = .long
        return formatter.string(from: startDate)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("Started on \(formattedDate)")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)

                Spacer()

                Image(systemName: "clock.arrow.trianglehead.counterclockwise.rotate.90")
            }
            Text(orderGroupName)
                .font(.title2)
                .fontWeight(.semibold)
                .foregroundStyle(.primary)
            Text(orderGroupDescription)
                .font(.body)
                .foregroundStyle(.secondary)
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 18)
                .fill(Color(.systemBackground))
                .overlay(
                    RoundedRectangle(cornerRadius: 18)
                        .stroke(
                            orderGroupStatus == .active
                                ? Color.orange.opacity(pulse ? 1 : 0.4)
                                : Color(.systemGray4),
                            lineWidth: 1.5
                        )
                        .animation(
                            orderGroupStatus == .active
                                ? Animation.easeInOut(duration: 1).repeatForever(autoreverses: true)
                                : .default,
                            value: pulse
                        )
                )
        )
        .onAppear {
            if orderGroupStatus == .active {
                pulse = true
            }
        }
    }
}

#Preview {
    OrderStatusBoxView(
        startDate: Date(),
        orderGroupName: "Ryan's Order",
        orderGroupDescription: "Ryan's new Order!",
        orderGroupStatus: .active
    )
}

