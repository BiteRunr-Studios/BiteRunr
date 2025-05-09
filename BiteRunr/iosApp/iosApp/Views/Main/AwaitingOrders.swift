import SwiftUI
import Shared

struct AwaitingOrders: View {
    @Binding var order: Order?
    @State private var orderUsers: [FriendUser] = []
    @State private var errorMessage: String?
    var onDismiss: (() -> Void)?
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        VStack (alignment: .leading) {
            HStack {
                Button("Back") {
                    dismiss()
                    onDismiss?()
                }
            }
            .padding(.horizontal)
            VStack {
                OrderStatusBoxView(
                    startDate: Date(),
                    orderGroupName: order?.name ?? "",
                    orderGroupDescription: order?.comments ?? ""
                )
                if orderUsers.isEmpty {
                    Text("No friends listed")
                        .foregroundColor(.secondary)
                        .padding()
                } else {
                    ForEach(orderUsers, id: \.id) { user in
                        OrderUsersRow(user: user)
                    }
                }
            }
            .padding()
            
            Spacer()
        }
        .navigationBarBackButtonHidden(true)
        .onAppear {
            Task {
                await fetchOrderUsers()
            }
        }
    }
    
}


extension AwaitingOrders {
    private func fetchOrderUsers() async {
        errorMessage = nil
        
        do {
            guard let apiUrl = ProcessInfo.processInfo.environment["API_URL"] else {
                errorMessage = "API_URL not set"
                return
            }
            guard let orderId = order?.id, !orderId.isEmpty else {
                errorMessage = "Order ID is missing"
                return
            }
            let response = try await getOrderUsers(baseUrl: apiUrl, orderId: orderId)
            if let users = response.data as? [FriendUser] {
                orderUsers = users
            } else {
                errorMessage = "Failed to decode users."
            }
        } catch {
            errorMessage = "Failed to fetch order users: \(error.localizedDescription)"
            print("Error fetching users: \(error)")
        }
    }
}
