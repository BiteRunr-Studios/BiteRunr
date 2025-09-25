import SwiftUI


struct SingleOrderView: View {
    struct Model: Identifiable, Equatable {
        let id: String
        let title: String
        let createdAt: String
        let status: String
        let comments: String?
        let paused: Bool
        let itemsCount: Int
        let peopleCount: Int
        let users: [Participant]
        
        struct Participant: Identifiable, Equatable {
            let id: String
            let name: String
            let avatarURL: String?
            let amountOwed: String
            let status: String
        }
    }
    
    let model: Model
    
    var body: some View {
        List {
            headerSection
            summarySection
            participantsSection
            if let comments = model.comments, !comments.isEmpty {
                commentsSection(comments)
            }
        }
        .listStyle(.insetGrouped)
        .navigationTitle("Order")
        .navigationBarTitleDisplayMode(.inline)
    }
    
    // MARK: - Sections
    
    private var headerSection: some View {
        Section {
            HStack(spacing: 12) {
                ZStack {
                    Circle().fill(statusColor.opacity(0.15))
                    Image(systemName: "shippingbox.fill")
                        .font(.system(size: 18, weight: .semibold))
                        .foregroundStyle(statusColor)
                }
                .frame(width: 42, height: 42)
                
                VStack(alignment: .leading, spacing: 2) {
                    Text(model.title)
                        .font(.headline)
                        .lineLimit(1)
                    HStack(spacing: 6) {
                        Label(model.createdAt, systemImage: "calendar")
                            .labelStyle(.iconOnly)
                            .foregroundStyle(.secondary)
                        Text(model.createdAt)
                            .foregroundStyle(.secondary)
                            .font(.subheadline)
                            .lineLimit(1)
                    }
                }
                Spacer()
                statusPill
            }
            if model.paused {
                HStack(spacing: 8) {
                    Image(systemName: "pause.fill")
                        .foregroundStyle(.orange)
                    Text("Paused")
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(.orange)
                }
            }
        }
    }
    
    private var summarySection: some View {
        Section("Summary") {
            HStack {
                Label("Items", systemImage: "cart.fill")
                Spacer()
                Text("\(model.itemsCount)")
                    .font(.body.weight(.semibold))
            }
            HStack {
                Label("People", systemImage: "person.2.fill")
                Spacer()
                Text("\(model.peopleCount)")
                    .font(.body.weight(.semibold))
            }
        }
    }
    
    private var participantsSection: some View {
        Section("Participants") {
            ForEach(model.users) { user in
                HStack(spacing: 12) {
                    avatarView(urlString: user.avatarURL, initials: initials(for: user.name))
                        .frame(width: 32, height: 32)
                        .clipShape(Circle())
                        .overlay(Circle().stroke(.separator.opacity(0.15), lineWidth: 1))
                    
                    VStack(alignment: .leading, spacing: 2) {
                        Text(user.name)
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(.primary)
                        Text(user.status.capitalized)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    
                    Spacer()
                    
                    Text(currencyDisplay(user.amountOwed))
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(amountColor(user.amountOwed))
                        .padding(.horizontal, 8)
                        .padding(.vertical, 6)
                        .background(
                            Capsule()
                                .fill(amountColor(user.amountOwed).opacity(0.12))
                        )
                }
                .contentShape(Rectangle())
            }
        }
    }
    
    private func commentsSection(_ comments: String) -> some View {
        Section("Comments") {
            Text(comments)
                .font(.body)
        }
    }
    
    // MARK: - Helpers
    
    private var statusColor: Color {
        switch model.status.lowercased() {
        case "completed", "done": return .teal
        case "paused": return .gray
        case "active", "open": return .orange
        default: return .blue
        }
    }

    private func amountColor(_ amountString: String) -> Color {
        guard let dec = Decimal(string: amountString) else {
            return .secondary
        }
        if dec == 0 {
            return .secondary
        } else if dec > 0 {
            return .orange
        } else {
            return .green
        }
    }

    
    private var statusPill: some View {
        Text(model.status.uppercased())
            .font(.caption.weight(.bold))
            .padding(.horizontal, 8)
            .padding(.vertical, 6)
            .background(Capsule().fill(statusColor.opacity(0.12)))
            .foregroundStyle(statusColor)
    }
    
    private func initials(for name: String) -> String {
        let parts = name
            .split(separator: " ")
            .map { String($0) }
            .filter { !$0.isEmpty }
        let first = parts.first?.first.map { String($0).uppercased() } ?? ""
        let second = parts.dropFirst().first?.first.map { String($0).uppercased() } ?? ""
        let result = first + second
        return result.isEmpty ? "?" : result
    }
    
    private func currencyDisplay(_ amountString: String) -> String {
        if let dec = Decimal(string: amountString) {
            let nf = NumberFormatter()
            nf.numberStyle = .currency
            nf.currencyCode = Locale.current.currency?.identifier ?? "USD"
            nf.maximumFractionDigits = 2
            nf.minimumFractionDigits = 2
            return nf.string(from: dec as NSDecimalNumber) ?? amountString
        }
        return amountString
    }
    
    private func avatarView(urlString: String?, initials: String) -> some View {
        ZStack {
            Circle()
                .fill(Color.orange.opacity(0.25))
                .overlay(
                    Text(initials)
                        .font(.caption2.weight(.bold))
                        .foregroundColor(.orange)
                )
            if let urlString, !urlString.isEmpty, let url = URL(string: urlString) {
                AsyncImage(url: url) { phase in
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
    }
}

// MARK: - Mock Preview

#Preview("SingleOrderView (Mock)") {
    NavigationStack {
        SingleOrderView(
            model: .init(
                id: "ORDER-123",
                title: "Friday Treats",
                createdAt: "Aug 22, 2025 · 4:40 PM",
                status: "Completed",
                comments: "Don’t forget napkins and utensils.",
                paused: false,
                itemsCount: 12,
                peopleCount: 5,
                users: [
                    .init(id: "u1", name: "Alice Lee", avatarURL: "https://i.pravatar.cc/64?img=1", amountOwed: "12.00", status: "done"),
                    .init(id: "u2", name: "John Park", avatarURL: "", amountOwed: "0.00", status: "done"),
                    .init(id: "u3", name: "Maya Singh", avatarURL: "https://i.pravatar.cc/64?img=5", amountOwed: "8.50", status: "done"),
                    .init(id: "u4", name: "Evan Brown", avatarURL: nil, amountOwed: "4.25", status: "ordering")
                ]
            )
        )
    }
}
