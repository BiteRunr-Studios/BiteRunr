import SwiftUI

struct FrequentlyOrderedItem: Identifiable {
    let id = UUID()
    let name: String
    let quantity: Int
    let price: Double
    let restaurant: String
}

struct FrequentlyOrderedItemsBox: View {
    let items: [FrequentlyOrderedItem]

    var body: some View {
        HStack {
            Text("Frequently Ordered Items")
                .font(.headline)
                .foregroundStyle(.secondary)
            Spacer()
            Button(action: {
                // See all action
            }) {
                Text("See all")
                    .foregroundColor(.orange)
                    .font(.subheadline)
            }
        }
        VStack(alignment: .leading, spacing: 16) {
            ForEach(items.prefix(3)) { item in
                HStack(spacing: 12) {
                    Text("\(item.quantity)x")
                        .font(.subheadline)
                        .foregroundColor(.gray)
                        .frame(width: 28, alignment: .leading)
                    VStack(alignment: .leading, spacing: 2) {
                        Text(item.name)
                            .font(.body)
                            .fontWeight(.medium)
                        Text(item.restaurant)
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    Spacer()
                    Text(String(format: "$%.2f", item.price))
                        .font(.body)
                        .foregroundColor(.primary)
                }
                .padding(.vertical, 4)
            }
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 18)
                .fill(Color(.systemBackground))
                .overlay(
                    RoundedRectangle(cornerRadius: 18)
                        .stroke(Color(.systemGray4), lineWidth: 1.5)
                )
        )
    }
}
