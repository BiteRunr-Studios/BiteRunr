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

struct Shimmer: ViewModifier {
    @State private var phase: CGFloat = -1
    let isActive: Bool

    func body(content: Content) -> some View {
        content
            .overlay(
                Group {
                    if isActive {
                        GeometryReader { geo in
                            let gradient = LinearGradient(
                                colors: [
                                    Color.white.opacity(0.0),
                                    Color.white.opacity(0.35),
                                    Color.white.opacity(0.0)
                                ],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                            Rectangle()
                                .fill(gradient)
                                .rotationEffect(.degrees(20))
                                .offset(x: geo.size.width * phase)
                                .frame(width: geo.size.width * 1.5)
                        }
                        .clipped()
                        .allowsHitTesting(false)
                    }
                }
            )
            .onAppear {
                if isActive {
                    withAnimation(.linear(duration: 1.2).repeatForever(autoreverses: false)) {
                        phase = 1.5
                    }
                }
            }
            .onChange(of: isActive) { active in
                if active {
                    withAnimation(.linear(duration: 1.2).repeatForever(autoreverses: false)) {
                        phase = 1.5
                    }
                } else {
                    withAnimation(.none) { phase = -1 }
                }
            }
    }
}

extension View {
    func shimmer(active: Bool) -> some View { modifier(Shimmer(isActive: active)) }
}

struct SkeletonView: View {
    let cornerRadius: CGFloat
    let active: Bool
    var body: some View {
        RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
            .fill(Color.secondary.opacity(0.18))
            .overlay(
                RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                    .stroke(Color(.separator).opacity(0.12), lineWidth: 1)
            )
            .shimmer(active: active)
    }
}

struct PastOrderGroupCardSkeleton: View {
    var active: Bool = true

    var body: some View {
        VStack(spacing: 12) {
            header
            Divider().opacity(0.12)
            statsRow
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .fill(.background.opacity(0.6))
                .overlay(
                    RoundedRectangle(cornerRadius: 16, style: .continuous)
                        .strokeBorder(.separator.opacity(0.15), lineWidth: 1)
                )
                .shadow(color: .black.opacity(0.08), radius: 16, x: 0, y: 8)
        )
        .accessibilityHidden(true)
    }

    private var header: some View {
        HStack(spacing: 12) {
            SkeletonView(cornerRadius: 18, active: active)
                .frame(width: 36, height: 36)
                .clipShape(Circle())
            VStack(alignment: .leading, spacing: 6) {
                SkeletonView(cornerRadius: 8, active: active)
                    .frame(width: 140, height: 16)
                SkeletonView(cornerRadius: 8, active: active)
                    .frame(width: 100, height: 12)
            }
            Spacer()
            SkeletonView(cornerRadius: 12, active: active)
                .frame(width: 24, height: 24)
                .clipShape(Circle())
        }
    }

    private var statsRow: some View {
        HStack(alignment: .center) {
            HStack(spacing: 8) {
                SkeletonView(cornerRadius: 8, active: active)
                    .frame(width: 28, height: 28)
                VStack(alignment: .leading, spacing: 4) {
                    SkeletonView(cornerRadius: 6, active: active)
                        .frame(width: 32, height: 14)
                    SkeletonView(cornerRadius: 6, active: active)
                        .frame(width: 40, height: 10)
                }
            }
            .padding(.horizontal, 10)
            .padding(.vertical, 8)
            .background(RoundedRectangle(cornerRadius: 12, style: .continuous).fill(Color(.systemFill).opacity(0.12)))

            Spacer(minLength: 12)

            HStack(spacing: 8) {
                SkeletonView(cornerRadius: 8, active: active)
                    .frame(width: 28, height: 28)
                VStack(alignment: .leading, spacing: 4) {
                    SkeletonView(cornerRadius: 6, active: active)
                        .frame(width: 28, height: 14)
                    SkeletonView(cornerRadius: 6, active: active)
                        .frame(width: 42, height: 10)
                }
            }
            .padding(.horizontal, 10)
            .padding(.vertical, 8)
            .background(RoundedRectangle(cornerRadius: 12, style: .continuous).fill(Color(.systemFill).opacity(0.12)))

            Spacer(minLength: 12)

            HStack(spacing: -10) {
                ForEach(0..<4, id: \.self) { _ in
                    SkeletonView(cornerRadius: 14, active: active)
                        .frame(width: 28, height: 28)
                        .clipShape(Circle())
                        .overlay(Circle().stroke(.background, lineWidth: 2))
                }
            }
            .padding(.leading, 2)
        }
    }
}

// MARK: - Card

struct PastOrderGroupCard: View {
    let title: String
    let timestamp: String
    let itemCount: Int
    let extraCount: Int
    let color: Color
    let avatarCount: Int
    let avatarURLs: [String]
    let avatarInitials: [String]

    var body: some View {
        VStack(spacing: 12) {
            header
            Divider().opacity(0.15)
            statsRow
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .fill(.background.opacity(0.6))
                .overlay(
                    RoundedRectangle(cornerRadius: 16, style: .continuous)
                        .strokeBorder(.separator.opacity(0.15), lineWidth: 1)
                )
                .shadow(color: .black.opacity(0.08), radius: 16, x: 0, y: 8)
        )
        .transition(.opacity.combined(with: .scale(scale: 0.995)))
        .accessibilityElement(children: .contain)
    }

    private var header: some View {
        HStack(alignment: .center, spacing: 12) {
            ZStack {
                Circle().fill(color.opacity(0.15))
                Image(systemName: "shippingbox.fill")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundStyle(color)
            }
            .frame(width: 36, height: 36)

            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.headline)
                    .fontWeight(.semibold)
                    .lineLimit(1)
                Text(timestamp)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }
            Spacer()
            ZStack {
                Circle()
                    .fill(Color.secondary.opacity(0.12))
                    .overlay(Circle().stroke(.separator.opacity(0.15), lineWidth: 1))
                Image(systemName: "chevron.right")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(.secondary)
            }
            .frame(width: 24, height: 24)
            .accessibilityHidden(true)
        }
    }

    private var statsRow: some View {
        HStack(alignment: .center) {
            metricPill(label: "Items", value: "\(itemCount)", icon: "cart.fill", color: color)
            Spacer(minLength: 12)
            metricPill(label: "People", value: "\(extraCount)", icon: "person.fill", color: .primary)
            Spacer(minLength: 12)
            avatarsStack()
        }
    }

    private func metricPill(label: String, value: String, icon: String, color: Color) -> some View {
        HStack(spacing: 8) {
            ZStack {
                RoundedRectangle(cornerRadius: 8, style: .continuous)
                    .fill((color == .secondary ? Color.secondary.opacity(0.12) : color.opacity(0.12)))
                Image(systemName: icon)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(color == .secondary ? .secondary : color)
            }
            .frame(width: 28, height: 28)

            VStack(alignment: .leading, spacing: 0) {
                Text(value)
                    .font(.system(.title3, design: .rounded).weight(.semibold))
                Text(label)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 8)
        .background(RoundedRectangle(cornerRadius: 12, style: .continuous).fill(.thinMaterial))
        .overlay(RoundedRectangle(cornerRadius: 12, style: .continuous).stroke(.separator.opacity(0.15), lineWidth: 1))
    }

    private func avatarsStack() -> some View {
        let maxVisible = 4
        let urls = Array(avatarURLs.prefix(maxVisible))
        let inits = Array(avatarInitials.prefix(maxVisible))
        let remaining = max(0, avatarCount - maxVisible)

        return HStack(spacing: -10) {
            ForEach(0..<max(urls.count, inits.count), id: \.self) { idx in
                let url = urls[safe: idx] ?? ""
                let initials = inits[safe: idx] ?? "?"

                ZStack {
                    Circle()
                        .fill(Color.orange.opacity(0.25))
                        .overlay(
                            Text(initials.isEmpty ? "?" : initials)
                                .font(.caption2.weight(.bold))
                                .foregroundColor(.orange)
                        )

                    if let u = URL(string: url), !url.isEmpty {
                        AsyncImage(url: u) { phase in
                            switch phase {
                            case .empty:
                                Color.clear
                            case .success(let image):
                                image
                                    .resizable()
                                    .scaledToFill()
                                    .transition(.opacity.animation(.easeInOut(duration: 0.2)))
                            case .failure:
                                Color.clear
                            @unknown default:
                                Color.clear
                            }
                        }
                    }
                }
                .frame(width: 28, height: 28)
                .clipShape(Circle())
                .overlay(Circle().stroke(.background, lineWidth: 2))
                .zIndex(Double(10 - idx))
            }

            if remaining > 0 {
                Circle()
                    .fill(.quaternary)
                    .overlay(
                        Text("+\(remaining)")
                            .font(.caption2.weight(.bold))
                            .foregroundStyle(.primary)
                    )
                    .frame(width: 28, height: 28)
                    .overlay(Circle().stroke(.background, lineWidth: 2))
                    .zIndex(0)
            }
        }
        .padding(.leading, 2)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(Text("\(avatarCount) participants"))
    }
}

private extension Array {
    subscript(safe idx: Int) -> Element? {
        indices.contains(idx) ? self[idx] : nil
    }
}

// MARK: - Pager

struct PastOrderGroupsPagerView: View {
    let orders: [PastOrderGroup]
    @State private var selection: Int = 0

    var body: some View {
        TabView(selection: $selection) {
            ForEach(Array(orders.enumerated()), id: \.offset) { index, order in
                PastOrderGroupCard(
                    title: order.title,
                    timestamp: order.timestamp,
                    itemCount: order.itemCount,
                    extraCount: order.extraCount,
                    color: order.color,
                    avatarCount: order.avatarCount,
                    avatarURLs: order.avatarURLs,
                    avatarInitials: order.avatarInitials
                )
                .padding(.horizontal, 16)
                .tag(index)
            }
        }
        .tabViewStyle(.page(indexDisplayMode: .automatic))
        .indexViewStyle(.page(backgroundDisplayMode: .interactive))
        .frame(maxWidth: .infinity)
        .frame(height: 250)
    }
}

// MARK: - HomeView

struct HomeView: View {
    @EnvironmentObject var supabaseState: SupabaseState
    @State private var orders: [PastOrderGroup] = []
    @State private var isLoadingOrders = false
    @State private var errorMessage: String? = nil
    @State private var hasLoadedOnce = false

    private var shouldShowSkeleton: Bool {
        (!hasLoadedOnce && (isLoadingOrders || (orders.isEmpty && errorMessage == nil)))
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    HStack {
                        Text("Past Order Groups")
                            .font(.headline)
                            .foregroundStyle(.secondary)
                        Spacer()
                        Button(action: { Task { await loadOrders() } }) {
                            Text("See all")
                                .foregroundColor(.orange)
                                .font(.subheadline)
                        }
                        .buttonStyle(.plain)
                    }

                    ZStack {
                        if shouldShowSkeleton {
                            TabView {
                                ForEach(0..<3) { _ in
                                    PastOrderGroupCardSkeleton(active: shouldShowSkeleton)
                                        .padding(.horizontal, 16)
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
                            PastOrderGroupsPagerView(orders: orders)
                                .padding(.bottom, 4)
                                .transition(.asymmetric(
                                    insertion: .opacity.combined(with: .scale(scale: 0.98))
                                        .animation(.spring(response: 0.35, dampingFraction: 0.9, blendDuration: 0.15)),
                                    removal: .opacity.animation(.easeOut(duration: 0.15))
                                ))
                                .id(orders.count)
                        }
                    }

                    NavigationLink(destination: ScanReceipt()) {
                        HStack {
                            Image(systemName: "document.viewfinder")
                            Text("Scan")
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                    }
                    .background(Color.orange)
                    .foregroundColor(.white)
                    .cornerRadius(12)
                    .contentShape(Rectangle())
                }
                .padding()
               
            }
            .refreshable { await loadOrders() }
        }
        .onAppear { Task { await loadOrders() } }
        .animation(.bouncy, value: orders.count)
        .alert(item: Binding(
            get: { errorMessage.map { IdentifiableString(value: $0) } },
            set: { _ in errorMessage = nil }
        )) { msg in
            Alert(title: Text("Error"), message: Text(msg.value), dismissButton: .default(Text("OK")))
        }
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
                supabase.auth.currentUser?.id.uuidString ??
                supabase.auth.currentUser?.id.uuidString ??
                ""
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
