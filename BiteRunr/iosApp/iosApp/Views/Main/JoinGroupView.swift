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
    @State private var isNavigatingAway = false
    
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
        .onChange(of: selectedOrder) { _, newOrder in
            if newOrder != nil {
                Task {
                    await fetchOrders()
                }
            }
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
                self.orders = fetchedOrders
            } else {
                errorMessage = "Failed to decode orders."
            }
            
        } catch {
            errorMessage = "Failed to fetch orders: \(error.localizedDescription)"
            print("Error fetching orders: \(error)")
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

extension Kotlinx_datetimeInstant {
    func toDate() -> Date {
        let seconds = TimeInterval(self.epochSeconds)
        let nanoseconds = Double(self.nanosecondsOfSecond) / 1_000_000_000
        return Date(timeIntervalSince1970: seconds + nanoseconds)
    }
}
