import SwiftUI
import Shared

struct PickupItemsView: View {
    var orderId: String
    @State private var orderLocations: [SelectItemsOrderLocationDTO] = []
    @State private var selectedLocation: SelectItemsOrderLocationDTO? = nil
    @State private var errorMessage: String?
    @State private var isLoading: Bool = false
    
    var onDismiss: (() -> Void)?
    @Environment(\.dismiss) private var dismiss

    @State var pickupItems: [PickupItemDTO] = []
    
    var body: some View {
        NavigationStack {
            ScrollView {
                if isLoading {
                    VStack(spacing: 16) {
                        ProgressView()
                            .scaleEffect(1.5)
                            .padding()
                        Text("Loading Item Summary")
                            .foregroundColor(.secondary)
                    }
                    .frame(maxWidth: .infinity, minHeight: 200)
                }
                else if errorMessage != nil {
                    Text(errorMessage ?? "An unexpected error occurred.")
                }
                else {
                    VStack(spacing: 0) {
                        locationPillsView
                        OrderSummary(orderData: pickupItems)
                    }
                    .padding()
                }
            }
            .navigationTitle("Pickup Items")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button {
                        onDismiss?()
                        dismiss()
                    } label: {
                        Label("Back", systemImage: "chevron.left")
                            .labelStyle(.titleAndIcon)
                            .foregroundColor(.accentColor)
                    }
                }
            }
        }.onAppear() {
            Task {
                await fetchOrderLocations()
            }
        }
    }
    
    @ViewBuilder
    private var locationPillsView: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack {
                ForEach(orderLocations, id: \.orderLocationId) { orderLocation in
                    Button(action: {
                        Task {
                            await selectLocation(orderLocation)
                        }
                    }) {
                        Text("\(orderLocation.locationName)")
                            .font(.subheadline)
                            .fontWeight(.medium)
                            .foregroundColor(selectedLocation?.orderLocationId == orderLocation.orderLocationId ? .white : .secondary)
                            .padding(.horizontal, 16)
                            .padding(.vertical, 8)
                            .background(
                                RoundedRectangle(cornerRadius: 20)
                                    .fill(selectedLocation?.orderLocationId == orderLocation.orderLocationId ? Color.orange : Color(UIColor.systemGray6))
                            )
                    }
                    .buttonStyle(PlainButtonStyle())
                    .disabled(isLoading)
                }
            }
            .frame(maxHeight: .infinity, alignment: .top)
            .padding(.horizontal)
            .padding(.top, 1)
        }
        .frame(height: 60)
    }
}

extension PickupItemsView {
    private func fetchOrderLocations() async {
        guard let apiUrl = Bundle.main.infoDictionary?["API_URL"] as? String else {
            await MainActor.run {
                errorMessage = "API_URL not set"
                isLoading = false
            }
            return
        }
        
        do {
            let response = try await getOrderLocationsForItemSelection(baseUrl: apiUrl, orderId: orderId)
            
            if let locations = response.data as? [SelectItemsOrderLocationDTO] {
                await MainActor.run {
                    orderLocations = locations
                    selectedLocation = locations.first
                    isLoading = false
                }
            } else {
                await MainActor.run {
                    errorMessage = "Failed to decode order locations."
                    isLoading = false
                }
            }
        } catch {
            await MainActor.run {
                errorMessage = "Failed to fetch order locations"
                isLoading = false
            }
        }
    }
    
    func getOrderItemsForOrderLocation() async {
        do {
            guard let apiUrl = Bundle.main.infoDictionary?["API_URL"] as? String else {
                errorMessage = "API_URL not set"
                return
            }
            
            guard let orderLocationId = selectedLocation?.orderLocationId else {
                errorMessage = "Order Location Id not available"
                return
            }
            
            print(orderLocationId)
            
            let response = try await getOrderItemsFromOrderLocation(baseUrl: apiUrl, orderLocationId: orderLocationId)
            
            if response.success {
                pickupItems = response.data as! [PickupItemDTO]
                isLoading = false
            }
        } catch {
            errorMessage = "Failed to fetch friend requests: \(error.localizedDescription)"
        }
    }
    
    private func selectLocation(_ orderLocation: SelectItemsOrderLocationDTO) async {
        await MainActor.run {
            isLoading = true
            selectedLocation = orderLocation
        }
    }
}

struct StatCard: View {
    let title: String
    let value: String
    let color: Color
    
    var body: some View {
        VStack(spacing: 4) {
            Text(value)
                .font(.system(size: 28, weight: .semibold))
                .foregroundColor(color)
            Text(title)
                .font(.footnote)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding()
        .background(.thinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

struct BadgeView: View {
    let text: String
    let color: Color
    let textColor: Color
    
    var body: some View {
        Text(text)
            .font(.caption)
            .fontWeight(.semibold)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(color)
            .foregroundColor(textColor)
            .clipShape(Capsule())
    }
}

struct OrderSummary: View {
    let orderData: [PickupItemDTO]
    
    var groupedItems: [String: (quantity: Int, customizations: [OrderRequest])] {
        var result: [String: (quantity: Int, customizations: [OrderRequest])] = [:]
        for item in orderData {
            if var existing = result[item.itemName] {
                existing.quantity += Int(item.totalQuantity)
                existing.customizations.append(contentsOf: item.requests)
                result[item.itemName] = existing
            } else {
                result[item.itemName] = (Int(item.totalQuantity), item.requests)            }
        }
        return result
    }
    
    var totalItems: Int {
        groupedItems.values.reduce(0) { $0 + $1.quantity }
    }
    
    var totalCustomizations: Int {
        groupedItems.values.reduce(0) { sum, group in
            sum + group.customizations.reduce(0) { $0 + Int($1.quantity) }
        }
    }
    
    var body: some View {
        VStack(spacing: 16) {
            // Overview Stats
            HStack(spacing: 12) {
                StatCard(title: "Total Items", value: "\(totalItems)", color: .cyan)
                StatCard(title: "Customizations", value: "\(totalCustomizations)", color: .purple)
            }
            
            // Order Breakdown
            VStack(alignment: .leading, spacing: 12) {
                Text("Order Breakdown")
                    .font(.headline)
                    .padding(.bottom, 4)
                
                ForEach(Array(groupedItems.keys).sorted(), id: \.self) { itemName in
                    if let group = groupedItems[itemName] {
                        let customizationTotal = group.customizations.reduce(0) { $0 + Int($1.quantity) }
                        let regularQuantity = group.quantity - customizationTotal
                        
                        VStack(alignment: .leading, spacing: 8) {
                            // Item Header
                            HStack {
                                Text(itemName)
                                    .font(.system(size: 16, weight: .semibold))
                                Spacer()
                                BadgeView(
                                    text: "\(group.quantity)x",
                                    color: .cyan.opacity(0.15),
                                    textColor: .cyan
                                )
                            }
                            .padding()
                            .background(.thinMaterial)
                            .clipShape(RoundedRectangle(cornerRadius: 10))
                            
                            // Regular Items
                            if regularQuantity > 0 {
                                HStack {
                                    Text("Regular")
                                        .font(.subheadline)
                                        .foregroundColor(.secondary)
                                    Spacer()
                                    BadgeView(
                                        text: "\(regularQuantity)x",
                                        color: .gray.opacity(0.15),
                                        textColor: .gray
                                    )
                                }
                                .padding(8)
                                .background(Color(.systemGray6))
                                .clipShape(RoundedRectangle(cornerRadius: 8))
                            }
                            
                            // Customizations (using index as ID)
                            ForEach(Array(group.customizations.enumerated()), id: \.offset) { _, customization in
                                HStack {
                                    Text(customization.comment)
                                        .font(.subheadline)
                                        .foregroundColor(.secondary)
                                    Spacer()
                                    BadgeView(
                                        text: "\(Int(customization.quantity))x",
                                        color: .purple.opacity(0.15),
                                        textColor: .purple
                                    )
                                }
                                .padding(8)
                                .background(Color(.systemGray6))
                                .clipShape(RoundedRectangle(cornerRadius: 8))
                            }
                        }
                    }
                }
            }
            .padding()
            .background(.thinMaterial)
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }
    }
}

struct OrderItemCard: View {
    let item: PickupItemDTO
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(alignment: .top) {
                BadgeView(text: "\(item.totalQuantity)x", color: .cyan, textColor: .white)
                Text(item.itemName)
                    .font(.headline)
                Spacer()
            }
            
            if !item.requests.isEmpty {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Your Customizations")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                    
                    ForEach(Array(item.requests.enumerated()), id: \.offset) { _, request in
                        Text("\(Int(request.quantity) > 1 ? "\(Int(request.quantity))x " : "")\(request.comment)")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }
                }
                .padding()
                .background(Color(.systemGray6))
                .clipShape(RoundedRectangle(cornerRadius: 8))
            }
        }
        .padding()
        .background(.thinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}
