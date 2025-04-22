import SwiftUI
import Clerk

struct HomeView: View {
    @Environment(Clerk.self) private var clerk
    @State private var isPressed = false
    @StateObject var sseClient = OrderItemsSSEClient()
    @State var orderId: String = "c4d3803d-7f6c-4034-8ee7-d7c84b3af364"
    
    var body: some View {
        VStack(spacing: 0) {
            Button("Connect") {
                sseClient.connect(orderId: orderId)
            }
            Button("Disconnect") {
                sseClient.disconnect()
            }
            List(sseClient.orderItems) { item in
                VStack(alignment: .leading) {
                    Text(item.name)
                    Text("Quantity: \(item.quantity)")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
            }
        }
    }
}

#Preview {
    HomeView()
        .environment(Clerk.shared)
}
