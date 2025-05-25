import SwiftUI
import Shared

struct HomeView: View {
    @EnvironmentObject var supabaseState: SupabaseState
    @State private var isPressed = false
    
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 12) {
                    HStack {
                        Text("Past Order Groups")
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
                    HStack {
                        PastOrderGroupBox(
                            title: "Lunch",
                            itemCount: 21,
                            extraCount: 3,
                            color: .orange,
                            avatarCount: 4
                        )
                        Spacer()
                        PastOrderGroupBox(
                            title: "Breakfast",
                            itemCount: 15,
                            extraCount: nil,
                            color: .orange,
                            avatarCount: 2
                        )
                    }
                    
                    
                    
                    let frequentlyOrderedItems = [
                        FrequentlyOrderedItem(name: "Triple Stacker", quantity: 3, price: 23.43, restaurant: "A&W"),
                        FrequentlyOrderedItem(name: "Big Mac", quantity: 2, price: 17.76, restaurant: "McDonald's"),
                        FrequentlyOrderedItem(name: "Blizzard", quantity: 1, price: 9.12, restaurant: "Dairy Queen"),
                        FrequentlyOrderedItem(name: "Blizzard", quantity: 1, price: 9.12, restaurant: "Dairy Queen"),
                        FrequentlyOrderedItem(name: "Blizzard", quantity: 1, price: 9.12, restaurant: "Dairy Queen"),
                        FrequentlyOrderedItem(name: "Blizzard", quantity: 1, price: 9.12, restaurant: "Dairy Queen"),
                        FrequentlyOrderedItem(name: "Blizzard", quantity: 1, price: 9.12, restaurant: "Dairy Queen"),
                        FrequentlyOrderedItem(name: "Blizzard", quantity: 1, price: 9.12, restaurant: "Dairy Queen")
                    ]
                    
                    FrequentlyOrderedItemsBox(items: frequentlyOrderedItems)
                    
                    let payments = [
                        PastPayment(name: "Nick Smith", date: Date(timeIntervalSince1970: 1707705600), amount: 9.12),
                        PastPayment(name: "Dylan Wright", date: Date(timeIntervalSince1970: 1707024000), amount: 13.24)
                    ]
                    
                    PastPaymentsBox(payments: payments)
                    
                    
                }.padding()
            }
        }
    }
}

#Preview {
    HomeView()
}
