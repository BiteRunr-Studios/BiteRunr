// HomeView.swift

import SwiftUI
import Shared
import Supabase

struct PastOrderGroup: Identifiable, Hashable {
    let id = UUID()
    let title: String
    let timestamp: String
    let itemCount: Int
    let extraCount: Int
    let color: Color
    let avatarCount: Int
    let avatarURLs: [String]
    let avatarInitials: [String]
}

struct FrequentlyOrderedItem: Identifiable, Hashable {
    let id: String
    let name: String
    let restaurantName: String
    let createdAt: String
}

// MARK: - HomeView

struct HomeView: View {
    @EnvironmentObject var supabaseState: SupabaseState

    @State private var orders: [PastOrderGroup] = []
    @State private var isLoadingOrders = false
    @State private var errorMessage: String? = nil
    @State private var hasLoadedOnce = false
    @State private var showPastOrdersSheet = false

    // Recent items
    @State private var recentItems: [FrequentlyOrderedItem] = []
    @State private var isLoadingRecentItems = false

    private var shouldShowSkeleton: Bool {
        (!hasLoadedOnce && (isLoadingOrders || (orders.isEmpty && errorMessage == nil)))
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    // Header
                    HStack {
                        Text("Past Order Groups")
                            .font(.headline)
                            .foregroundStyle(.secondary)

                        Spacer()

                        Button(action: { showPastOrdersSheet = true }) {
                            Text("See all")
                                .foregroundColor(.orange)
                                .font(.subheadline)
                        }
                        .buttonStyle(.plain)
                    }

                    // Pager
                    ZStack {
                        if shouldShowSkeleton {
                            TabView {
                                ForEach(0..<3) { _ in
                                    PastOrderGroupCardSkeleton(active: shouldShowSkeleton)
                                        .redacted(reason: .placeholder)
                                }
                            }
                            .tabViewStyle(.page(indexDisplayMode: .automatic))
                            .indexViewStyle(.page(backgroundDisplayMode: .interactive))
                            .frame(height: 250)
                            .transition(.opacity.animation(.easeOut(duration: 0.2)))
                            .animation(nil, value: shouldShowSkeleton)
                        }

                        if !shouldShowSkeleton && errorMessage == nil {
                            PastOrdersPagerView(orders: orders.map(toPagerUI))
                                .padding(.bottom, 4)
                                .transition(.asymmetric(
                                    insertion: .opacity.combined(with: .scale(scale: 0.98))
                                        .animation(.spring(response: 0.35, dampingFraction: 0.9, blendDuration: 0.15)),
                                    removal: .opacity.animation(.easeOut(duration: 0.15))
                                ))
                                .id(orders.count)
                        }
                    }

                    // Frequently Ordered Items
                    if isLoadingRecentItems {
                        FrequentlyOrderedItemsSkeleton()
                    } else {
                        FrequentlyOrderedItemsBox(items: recentItems)
                    }

//                    NavigationLink(destination: ScanReceipt()) {
//                        HStack {
//                            Image(systemName: "document.viewfinder")
//                            Text("Scan")
//                        }
//                        .frame(maxWidth: .infinity)
//                        .padding(.vertical, 16)
//                    }
//                    .background(Color.orange)
//                    .foregroundColor(.white)
//                    .cornerRadius(12)
//                    .contentShape(Rectangle())
                }
                .padding()
            }
        }
        .sheet(isPresented: $showPastOrdersSheet) {
            PastOrdersSheet(
                orders: orders.map {
                    PastOrderRowModel(
                        id: $0.id.uuidString,
                        title: $0.title,
                        timestamp: $0.timestamp,
                        itemCount: $0.itemCount,
                        peopleCount: $0.extraCount,
                        accentColor: $0.color,
                        avatarURLs: $0.avatarURLs,
                        avatarInitials: $0.avatarInitials
                    )
                }
            )
        }
        .onAppear {
            Task {
                await loadOrders()
                await loadRecentItems()
            }
        }
        .animation(.bouncy, value: orders.count)
        .alert(item: Binding(
            get: { errorMessage.map { IdentifiableString(value: $0) } },
            set: { _ in errorMessage = nil }
        )) { msg in
            Alert(title: Text("Error"), message: Text(msg.value), dismissButton: .default(Text("OK")))
        }
    }

    private func toPagerUI(_ g: PastOrderGroup) -> PastOrderGroupUI {
        PastOrderGroupUI(
            title: g.title,
            timestamp: g.timestamp,
            itemCount: g.itemCount,
            peopleCount: g.extraCount,
            color: g.color,
            avatarCount: g.avatarCount,
            avatarURLs: g.avatarURLs,
            avatarInitials: g.avatarInitials
        )
    }
}

// MARK: - Networking & Mapping

extension HomeView {
    private func loadOrders() async {
        withTransaction(Transaction(animation: nil)) {
            isLoadingOrders = true
            if !hasLoadedOnce { errorMessage = nil }
        }
        defer {
            withTransaction(Transaction(animation: nil)) {
                isLoadingOrders = false
            }
        }

        do {
            guard let apiUrl = Bundle.main.infoDictionary?["API_URL_LOCAL"] as? String else {
                errorMessage = "API_URL not set"
                return
            }

            let userId =
                supabase.auth.currentUser?.id.uuidString ?? ""
            if userId.isEmpty {
                errorMessage = "User not signed in"
                return
            }

            let response = try await getUserOrderDetails(baseUrl: apiUrl, userId: userId)
            if response.success {
                guard let dtoArray = response.data as? [OrderDetailsResponse] else {
                    errorMessage = "Invalid orders payload"
                    return
                }
                let mapped = dtoArray.map(mapToPastOrderGroup)
                try? await Task.sleep(nanoseconds: 120_000_000)
                await MainActor.run {
                    withAnimation(.easeInOut(duration: 0.25)) {
                        self.orders = mapped
                        self.hasLoadedOnce = true
                    }
                }
            } else {
                errorMessage = errorMessage ?? "Failed to fetch orders"
            }
        } catch {
            errorMessage = "Failed to fetch orders: \(error.localizedDescription)"
        }
    }

    private func loadRecentItems() async {
        isLoadingRecentItems = true
        defer { isLoadingRecentItems = false }

        do {
            guard let apiUrl = Bundle.main.infoDictionary?["API_URL_LOCAL"] as? String else {
                errorMessage = "API_URL not set"
                return
            }
            let userId =
                supabase.auth.currentUser?.id.uuidString ?? ""
            if userId.isEmpty {
                errorMessage = "User not signed in"
                return
            }

            let response = try await getUserFoodItems(baseUrl: apiUrl, userId: userId)

            if response.success {
                guard let dtoArray = response.data as? [FoodItemDTO] else {
                    errorMessage = "Invalid recent items payload"
                    return
                }
                let mapped = dtoArray.map(mapToFrequentlyOrderedItem)
                await MainActor.run {
                    withAnimation(.easeInOut(duration: 0.2)) {
                        self.recentItems = Array(mapped.prefix(3))
                    }
                }
            } else {
              
            }
        } catch {
            errorMessage = "Failed to fetch recent items: \(error.localizedDescription)"
        }
    }

    private func mapToPastOrderGroup(_ dto: OrderDetailsResponse) -> PastOrderGroup {
        let users = dto.orderUsers.map { $0.user }
        let urls: [String] = users.map { $0.avatarUrl ?? "" }
        let initials: [String] = users.map { user in
            let f = user.firstName.trimmingCharacters(in: .whitespacesAndNewlines)
            let l = user.lastName.trimmingCharacters(in: .whitespacesAndNewlines)
            let fi = f.first.map { String($0).uppercased() } ?? ""
            let li = l.first.map { String($0).uppercased() } ?? ""
            let joined = (fi + li)
            return joined.isEmpty ? "?" : joined
        }

        return PastOrderGroup(
            title: dto.order.name,
            timestamp: dto.order.createdAt,
            itemCount: Int(dto.itemsCount),
            extraCount: Int(dto.peopleCount),
            color: colorForStatus(dto.order.status),
            avatarCount: Int(dto.orderUsers.count),
            avatarURLs: urls,
            avatarInitials: initials
        )
    }

    private func mapToFrequentlyOrderedItem(_ dto: FoodItemDTO) -> FrequentlyOrderedItem {
        FrequentlyOrderedItem(
            id: dto.id,
            name: dto.name,
            restaurantName: dto.restaurantName,
            createdAt: dto.createdAt
        )
    }

    private func colorForStatus(_ status: String) -> Color {
        switch status.lowercased() {
        case "completed", "done": return .orange
        case "paused": return .gray
        case "active", "open": return .orange
        default: return .blue
        }
    }
}

private struct IdentifiableString: Identifiable {
    let id = UUID()
    let value: String
}
