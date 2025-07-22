import SwiftUI
import Shared
import Supabase

struct AwaitingOrders: View {
    @Binding var order: Order?
    
    @State private var orderUsers: [AwaitingOrderUserDTO] = []
    
    @State private var awaitingOrder: AwaitingOrdersDTO?
    
    @State private var errorMessage: String?
    @StateObject private var poller = Poller()
    @State private var showCancelAlert = false
    let currentUserId = supabase.auth.currentUser?.id.uuidString.lowercased()
    
    enum StartRunButtonState {
        case disabled, enabled, readyToRun
    }
    @State private var buttonState: StartRunButtonState = .disabled
    
    var onDismiss: (() -> Void)?
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        let isCreator = currentUserId == order?.creatorId
        ZStack {
            VStack (alignment: .leading) {
                HStack() {
                    Button(action: {
                        orderUsers = []
                        onDismiss?()
                        dismiss()
                    }) {
                        HStack(alignment: .center) {
                            Image(systemName: "arrow.backward")
                                .font(.headline).fontWeight(Font.Weight.regular)
                                .foregroundStyle(.orange)
                            Text("Back")
                                .font(.headline).fontWeight(Font.Weight.regular)
                                .foregroundStyle(.orange)
                        }
                    }
                    
                    Spacer()
                    
                    if isCreator {
                        Button(action: {
                            showCancelAlert = true
                        }) {
                            Text("Cancel Order")
                                .foregroundStyle(.red)
                        }
                    }
                }
                .padding(.horizontal)
                .padding(.top)
                VStack(spacing: 26) {
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
                        ForEach(orderUsers, id: \.Id) { orderUser in
                            OrderUsersRow(orderUser: orderUser)
                                .id("user-\(orderUser.Id)")  // Force unique identity
                        }
                    }
                }.padding()
                
                Spacer()
                Rectangle()
                    .fill(Color.gray)
                    .frame(height: 1 / UIScreen.main.scale)
                    .edgesIgnoringSafeArea(.horizontal)
                
                VStack {
                    Text("\(awaitingOrder?.count ?? 0) \(awaitingOrder?.count == 1 ? "item" : "items") added")
                        .foregroundColor(.secondary)
                        .fontWeight(Font.Weight.medium)
                        .animation(.easeInOut(duration: 0.3), value: awaitingOrder?.count)
                    VStack(spacing: 12) {
                        // button 1
                        Button(action: {
                            withAnimation(.easeIn(duration: 0.1)) {
                            }
                            Task {
                                print("selecting items")
                            }
                        }) {
                            HStack {
                                Image(systemName: "takeoutbag.and.cup.and.straw.fill")
                                Text("Select Items")
                            }
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 16)
                            .background(Color.orange)
                            .foregroundColor(.white)
                            .cornerRadius(12)
                            .contentShape(Rectangle())
                        }
                    }
                    
                    // button 2
                    // The button has three visual states:
                    // - disabled: gray border and text, no interaction
                    // - enabled: orange border and text, no orange background
                    // - readyToRun: orange background with white text, no border, enabled interaction
                    if isCreator {
                        Button(action: {
                            withAnimation(.easeIn(duration: 0.1)) {
                                // Your button action here
                            }
                            Task {
                            }
                        }) {
                            HStack {
                                Image(systemName: "figure.run")
                                Text(buttonState == .readyToRun ? "Start Run" : "Start Run Anyway")
                            }
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 16)
                            .background(
                                buttonState == .readyToRun ? Color.orange : Color.clear
                            )
                            .overlay(
                                RoundedRectangle(cornerRadius: 12)
                                    .stroke(
                                        buttonState == .readyToRun ? Color.clear : (buttonState == .enabled ? Color.orange : Color.gray),
                                        lineWidth: 1
                                    )
                            )
                            .foregroundColor(
                                buttonState == .readyToRun ? Color.white : (buttonState == .enabled ? Color.orange : Color.gray)
                            )
                            .cornerRadius(12)
                            .scaleEffect()
                            .contentShape(Rectangle())
                        }
                        .disabled(buttonState == .disabled)
                        .animation(.easeInOut(duration: 0.3), value: buttonState)
                    }
                }.padding(.horizontal)
            }
            
            Spacer()
        }
        .navigationBarBackButtonHidden(true)
        .onAppear() {
            startPolling()
        }
        .onDisappear() {
            stopPolling()
        }
        .alert("Cancel Order", isPresented: $showCancelAlert) {
            Button("No", role: .cancel) { }
            Button("Yes, Cancel Order", role: .destructive) {
                Task {
                    await cancelOrder()
                    await MainActor.run {
                        orderUsers = []
                        onDismiss?()
                        dismiss()
                        print("Order cancelled")
                    }
                }
            }
        } message: {
            Text("Are you sure you want to cancel this order?")
        }
    }
    
    
}



extension AwaitingOrders {
    
    private func fetchData() async {
        guard let apiUrl = Bundle.main.infoDictionary?["API_URL"] as? String else {
            errorMessage = "API_URL not set"
            return
        };
        guard let orderId = order?.id, !orderId.isEmpty else {
            errorMessage = "Order ID is missing"
            return
        };
        
        errorMessage = nil
        do {
            let response = try await getAwaitingOrdersData(baseUrl: apiUrl, orderId: orderId)
            if var data = response.data as? AwaitingOrdersDTO {
                awaitingOrder = data
                var mutableOrderUsers: [AwaitingOrderUserDTO] = awaitingOrder!.orderUsers
                mutableOrderUsers.removeAll { $0.userId == supabase.auth.currentUser?.id.uuidString.lowercased() }
                orderUsers = mutableOrderUsers
            } else {
                errorMessage = "Failed to decode users."
            }
        } catch {
            errorMessage = "Failed to fetch order users: \(error.localizedDescription)"
            print("Error fetching users: \(error)")
        }
    }
    
    private func cancelOrder() async {
        guard let apiUrl = Bundle.main.infoDictionary?["API_URL"] as? String else {
            errorMessage = "API_URL not set"
            return
        }
        
        guard let checkOrder = order else {  // Remove `let orderId =` since id is not optional
            errorMessage = "Order ID is missing"
            return
        }
        
        do {
            // Since these are non-optional, just use them directly
            let orderName = checkOrder.name
            let creatorId = checkOrder.creatorId
            let comments = checkOrder.comments
            let orderId = checkOrder.id
            
            let cancelledStatus: Status = .cancelled
            
            let orderToUpdate = UpdateOrderDTO(
                name: orderName,
                creatorId: creatorId,
                comments: comments,
                status: cancelledStatus,
                paused: true
            )
            
            let response = try await updateOrder(baseUrl: apiUrl, orderId: orderId, order: orderToUpdate)
            
            if let updatedOrder = response.data {
                order = updatedOrder
            } else {
                await MainActor.run {
                    errorMessage = "Failed to decode order."
                }
            }
        } catch {
            await MainActor.run {
                errorMessage = "Failed to cancel order: \(error.localizedDescription)"
            }
            print("Error cancelling order: \(error)")
        }
    }
    
    private func startPolling() {
        Task {
            poller.startPolling(
                interval: 2.5,
                pollBlock: {
                    // If cancelled, dismiss immediately
                    await fetchData()
                    
                    await MainActor.run {
                        if awaitingOrder?.order.status == .cancelled {
                            guard let awaitingOrder = awaitingOrder else { return }
                            order = Order(
                                id: awaitingOrder.order.Id,
                                name: awaitingOrder.order.name,
                                creatorId: awaitingOrder.order.creatorId,
                                comments: awaitingOrder.order.comments,
                                status: awaitingOrder.order.status,
                                paused: awaitingOrder.order.paused,
                                createdAt: awaitingOrder.order.createdAt,
                                updatedAt: awaitingOrder.order.updatedAt,
                                orderItems: nil,
                                orderUsers: nil,
                                orderLocations: nil,
                                creator: nil
                            )
                            orderUsers = []
                            onDismiss?()
                            dismiss()
                        }
                        
                        
                        // buttonState transitions:
                        // - .disabled: when no orderUser has status "done"
                        // - .enabled: at least one orderUser has status "done" (but not all)
                        // - .readyToRun: all orderUsers have status "done"
                        if orderUsers.allSatisfy({ $0.status == "done" }) && !orderUsers.isEmpty {
                            buttonState = .readyToRun
                        } else if orderUsers.contains(where: { $0.status == "done" }) {
                            buttonState = .enabled
                        } else {
                            buttonState = .disabled
                        }
                    }
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

