import SwiftUI
import Shared

struct AwaitingOrders: View {
    @Binding var order: Order?
    @State private var orderUsers: [OrderUser] = []
    @State private var errorMessage: String?
    @StateObject private var poller = Poller()
    var onDismiss: (() -> Void)?
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        ZStack {
            VStack (alignment: .leading) {
                HStack {
                    Button("Back") {
                        onDismiss?()
                        dismiss()
                    }
                }
                .padding(.horizontal)
                VStack {
                    OrderStatusBoxView(
                        startDate: Date(),
                        orderGroupName: order?.name ?? "",
                        orderGroupDescription: order?.comments ?? "",
                        orderGroupStatus: order?.status ?? .completed
                    )
                    .id("orderStatusBox-\(order?.id ?? "new")")
                    if orderUsers.isEmpty {
                        Text("No friends listed")
                            .foregroundColor(.secondary)
                            .padding()
                            .id("noFriends-\(order?.id ?? "new")")
                    } else {
                        ForEach(orderUsers, id: \.id) { orderUser in
                            OrderUsersRow(orderUser: orderUser)
                                .id("user-\(orderUser.id)")  // Force unique identity
                        }
                    }
                }
                .padding()
                
                Spacer()
            }
            .navigationBarBackButtonHidden(true)
            .onAppear() {
                startPolling()
            }
            .onDisappear() {
                stopPolling()
            }
            
            VStack {
                Spacer()
                VStack(spacing: 12) {
                    // button 1
                    
                    // button 2
                }
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
            if let users = response.data as? [OrderUser] {
                orderUsers = users
            } else {
                errorMessage = "Failed to decode users."
            }
        } catch {
            errorMessage = "Failed to fetch order users: \(error.localizedDescription)"
            print("Error fetching users: \(error)")
        }
    }
    
    private func startPolling() {
        Task {
            poller.startPolling(
                interval: 2.5,
                pollBlock: {
                    await fetchOrderUsers()
                },
                onResult: { response in
                    print("Polling occured: \(response)")
                },
                onError: { error in
                    print("Polling error: \(error)")
                }
            )
        }
    }
    
    private func stopPolling() {
        Task {
            poller.stopPolling()
        }
    }
}
