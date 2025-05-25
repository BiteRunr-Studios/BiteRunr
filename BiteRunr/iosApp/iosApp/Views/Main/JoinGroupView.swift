import SwiftUI
import Shared
import Foundation

struct JoinGroupView: View {
    @State var errorMessage: String?
    @State var orders: [Order] = []
    @State var selectedOrder: Order?
    @EnvironmentObject var supabaseState: SupabaseState
    var onOrderSelected: ((Order?) -> Void)? = nil
    
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Text("Select & Start Order Group")
                    .font(.headline)
                    .foregroundStyle(.secondary)
                    .padding(.horizontal)

                ForEach(orders, id: \.id) { order in
                    Button(action: {
                        onOrderSelected?(order)
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
        .task {
            await fetchOrders()
        }
    }
}


extension JoinGroupView {
    private func fetchOrders() async {
        errorMessage = nil
        
        do {
            guard let apiUrl = ProcessInfo.processInfo.environment["API_URL"] else {
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
}

extension Kotlinx_datetimeInstant {
    func toDate() -> Date {
        let seconds = TimeInterval(self.epochSeconds)
        let nanoseconds = Double(self.nanosecondsOfSecond) / 1_000_000_000
        return Date(timeIntervalSince1970: seconds + nanoseconds)
    }
}
