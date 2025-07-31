import SwiftUI
import Shared
import Foundation

struct JoinGroupView: View {
    @State var errorMessage: String?
    @State var orders: [Order] = []
    @Binding var selectedOrder: Order?
    @StateObject private var poller = Poller()
    @EnvironmentObject var supabaseState: SupabaseState
    var onOrderSelected: ((Order?) -> Void)? = nil
    @State private var isKickedOut = false
    
    // New state for tracking kicked out order
    @State private var kickedOutOrderName: String = ""
    @State private var showKickedOutAlert = false
    @State private var wasInAwaitingOrders = false
    
    let currentUserId = supabase.auth.currentUser?.id.uuidString.lowercased()
    
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Text("Select & Start Order Group")
                    .font(.headline)
                    .foregroundStyle(.secondary)
                    .padding(.horizontal)
                
                ForEach(orders, id: \.id) { order in
                    Button(action: {
                        if order.status == Status.active {
                            onOrderSelected?(order)
                        }
                    }) {
                        OrderStatusBoxView(
                            startDate: order.createdAt.toDate(),
                            orderGroupName: order.name,
                            orderGroupDescription: order.comments ?? "",
                            orderGroupStatus: order.status
                        )
                        .padding(.horizontal)
                    }
                    .buttonStyle(PlainButtonStyle())
                }
            }
            .padding(.vertical)
        }
        .onAppear() {
            Task {
                startPolling()
            }
        }
        .onDisappear() {
            Task {
                stopPolling()
            }
        }
        .onChange(of: selectedOrder) { _, newOrder in
            if newOrder != nil {
                // User is entering AwaitingOrders view
                stopPolling()
                wasInAwaitingOrders = true
                Task {
                    await fetchOrders()
                }
            } else {
                // User returned from AwaitingOrders view, reset the flag after a brief delay
                startPolling()
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                    wasInAwaitingOrders = false
                }
            }
        }
        // Alert for when user gets kicked out
        .alert("Order Cancelled", isPresented: $showKickedOutAlert) {
            Button("OK") {
                showKickedOutAlert = false
                kickedOutOrderName = ""
            }
        } message: {
            Text("The order '\(kickedOutOrderName)' has been cancelled by the group creator.")
        }
    }
}


extension JoinGroupView {
    private func fetchOrders() async {
        errorMessage = nil
        
        do {
            guard let apiUrl = Bundle.main.infoDictionary?["API_URL"] as? String else {
                errorMessage = "API_URL not set"
                return
            }
            let user_id = supabase.auth.currentUser?.id.uuidString
            let response = try await getOrders(baseUrl: apiUrl, userId: user_id ?? "")
            if let fetchedOrders = response.data as? [Order] {
                checkForCancelledOrders(newOrders: fetchedOrders)
                self.orders = fetchedOrders
            } else {
                errorMessage = "Failed to decode orders."
            }
            
        } catch {
            errorMessage = "Failed to fetch orders: \(error.localizedDescription)"
            print("Error fetching orders: \(error)")
        }
    }
    
    private func checkForCancelledOrders(newOrders: [Order]) {
        // Only check if we have existing orders to compare against
        guard !orders.isEmpty else { return }
        
        for newOrder in newOrders {
            // Find the corresponding old order
            if let oldOrder = orders.first(where: { $0.id == newOrder.id }) {
                // Check if order changed from active to cancelled
                if oldOrder.status == .active && newOrder.status == .cancelled {
                    // Check if current user is not the creator AND was in AwaitingOrders
                    let isCreator = currentUserId == newOrder.creatorId
                    if !isCreator && wasInAwaitingOrders {
                        // Show the kicked out alert
                        kickedOutOrderName = newOrder.name
                        showKickedOutAlert = true
                        wasInAwaitingOrders = false // Reset the flag
                    }
                }
            }
        }
    }
    
    private func startPolling() {
        Task {
            poller.startPolling(
                interval: 2.5,
                pollBlock: {
                    // If cancelled, dismiss immediately
                    await fetchOrders()
                },
                onResult: { response in
                    print("JoinGroupView Polling occured: \(response)")
                },
                onError: { error in
                    print("JoinGroupView Polling error: \(error)")
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

extension Kotlinx_datetimeInstant {
    func toDate() -> Date {
        let seconds = TimeInterval(self.epochSeconds)
        let nanoseconds = Double(self.nanosecondsOfSecond) / 1_000_000_000
        return Date(timeIntervalSince1970: seconds + nanoseconds)
    }
}
