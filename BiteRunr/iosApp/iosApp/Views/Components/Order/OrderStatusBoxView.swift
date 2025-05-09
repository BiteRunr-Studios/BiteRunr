import SwiftUI

struct OrderStatusBoxView: View {
    let startDate: Date
    let orderGroupName: String
    let orderGroupDescription: String
    
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
        .frame(
            width: UIScreen.main.bounds.width * 0.9,
            alignment: .leading
        )
        .background(
            RoundedRectangle(cornerRadius: 18)
                .fill(Color(.systemBackground))
                .overlay(
                    RoundedRectangle(cornerRadius: 18)
                        .stroke(Color(.systemGray4), lineWidth: 1.5)
                )
        )
    }
}

#Preview {
    OrderStatusBoxView(startDate: Date(), orderGroupName: "Ryan's Order", orderGroupDescription: "Ryan's new Order!")
}
