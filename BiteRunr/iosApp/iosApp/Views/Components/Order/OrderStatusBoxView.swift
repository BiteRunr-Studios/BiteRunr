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
                let statusStyle = style(for: orderGroupStatus)
                HStack(alignment: .center) {
                    Image(systemName: iconName(for: orderGroupStatus))
                        .foregroundColor(.white)
                        .font(.footnote)
                        .if(statusStyle.isBlinking && iconName(for: orderGroupStatus) == "circle.fill") { view in
                            view.symbolEffect(.pulse, options: .speed(2).repeat(.continuous))
                        }
                    Text(orderGroupStatus.name.lowercased())
                }
                .font(.headline)
                .foregroundColor(.white)
                .padding(.horizontal, 10)
                .padding(.vertical, 2)
                .background(
                    Group {
                        if let fill = statusStyle.fillColor {
                            Capsule().fill(fill)
                        } else {
                            Capsule().fill(Color.gray)
                        }
                    }
                )
                
                //                Image(systemName: "clock.arrow.trianglehead.counterclockwise.rotate.90")
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
                        .stroke(Color(.systemGray4),
                                lineWidth: 1.5
                               )
                )
        )
    }
}

struct StatusStyle {
    let fillColor: Color?
    let isBlinking: Bool
}

func style(for status: Status) -> StatusStyle {
    switch status {
    case .cancelled:
        return StatusStyle(fillColor: .red, isBlinking: false)
    case .active:
        return StatusStyle(fillColor: .orange, isBlinking: true)
    case .completed:
        return StatusStyle(fillColor: .green, isBlinking: false)
    case .created:
        return StatusStyle(fillColor: .gray, isBlinking: false)
    }
}

func iconName(for status: Status) -> String {
    switch status {
    case .cancelled:
        return "xmark"
    case .completed:
        return "checkmark"
    default:
        return "circle.fill"
    }
}

extension View {
    @ViewBuilder
    func `if`<Content: View>(_ condition: Bool, transform: (Self) -> Content) -> some View {
        if condition {
            transform(self)
        } else {
            self
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

