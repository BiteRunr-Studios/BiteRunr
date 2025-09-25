import SwiftUI
import Shared

struct PickupItemsView: View {
    var onDismiss: (() -> Void)?
    @Environment(\.dismiss) private var dismiss

    @State var sampleData: [PickupItemDTO] = []
    
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    OrderSummary(orderData: sampleData)
                }
                .padding()
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
                await getData()
            }
        }
    }
}

extension PickupItemsView {
    func getData() async {
        do {
            guard let apiUrl = Bundle.main.infoDictionary?["API_URL"] as? String else {
//                errorMessage = "API_URL not set"
                return
            }
            let response = try await getOrderItemsFromOrderLocation(baseUrl: apiUrl, orderLocationId: "8fb4588b-1de1-46d5-95ab-04e0ebb9bf41")
            if response.success {
                sampleData = response.data as! [PickupItemDTO]
            }
            // Task was cancelled, no need to show error
        } catch {
//            errorMessage = "Failed to fetch friend requests: \(error.localizedDescription)"
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
