import SwiftUI

// Reusable row model for a past order
public struct PastOrderRowModel: Identifiable, Hashable {
    public let id: String
    public let title: String
    public let timestamp: String
    public let itemCount: Int
    public let peopleCount: Int
    public let accentColor: Color
    public let avatarURLs: [String]
    public let avatarInitials: [String]

    public init(
        id: String,
        title: String,
        timestamp: String,
        itemCount: Int,
        peopleCount: Int,
        accentColor: Color = .orange,
        avatarURLs: [String] = [],
        avatarInitials: [String] = []
    ) {
        self.id = id
        self.title = title
        self.timestamp = timestamp
        self.itemCount = itemCount
        self.peopleCount = peopleCount
        self.accentColor = accentColor
        self.avatarURLs = avatarURLs
        self.avatarInitials = avatarInitials
    }
}

// MARK: - Row

struct PastOrderRow: View {
    let model: PastOrderRowModel

    var body: some View {
        HStack(spacing: 12) {
            ZStack {
                Circle().fill(model.accentColor.opacity(0.15))
                Image(systemName: "shippingbox.fill")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(model.accentColor)
            }
            .frame(width: 36, height: 36)

            VStack(alignment: .leading, spacing: 2) {
                Text(model.title)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(.primary)
                    .lineLimit(1)

                Text(model.timestamp)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }

            Spacer(minLength: 8)

            HStack(spacing: 8) {
                metricPill(icon: "cart.fill", value: model.itemCount, color: model.accentColor)
                metricPill(icon: "person.fill", value: model.peopleCount, color: .primary)
            }

            avatarsStack(
                urls: model.avatarURLs,
                initials: model.avatarInitials,
                accent: model.accentColor
            )
        }
        .contentShape(Rectangle())
        .padding(.vertical, 8)
    }

    private func metricPill(icon: String, value: Int, color: Color) -> some View {
        HStack(spacing: 6) {
            ZStack {
                RoundedRectangle(cornerRadius: 6, style: .continuous)
                    .fill(color.opacity(0.12))
                Image(systemName: icon)
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(color)
            }
            .frame(width: 22, height: 22)

            Text("\(value)")
                .font(.caption.weight(.semibold))
                .foregroundStyle(.primary)
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 6)
        .background(
            RoundedRectangle(cornerRadius: 10, style: .continuous)
                .fill(.thinMaterial)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 10, style: .continuous)
                .stroke(.separator.opacity(0.15), lineWidth: 1)
        )
    }

    private func avatarsStack(urls: [String], initials: [String], accent: Color) -> some View {
        let maxVisible = 3
        let urls = Array(urls.prefix(maxVisible))
        let initials = Array(initials.prefix(maxVisible))
        let total = max(urls.count, initials.count)

        return HStack(spacing: -8) {
            ForEach(0..<total, id: \.self) { idx in
                let url = urls[safe: idx] ?? ""
                let initStr = initials[safe: idx] ?? "?"

                ZStack {
                    Circle()
                        .fill(accent.opacity(0.2))
                        .overlay(
                            Text(initStr.isEmpty ? "?" : initStr)
                                .font(.caption2.weight(.bold))
                                .foregroundColor(accent)
                        )

                    if !url.isEmpty, let u = URL(string: url) {
                        AsyncImage(url: u) { phase in
                            switch phase {
                            case .empty: Color.clear
                            case .success(let image):
                                image.resizable().scaledToFill()
                                    .transition(.opacity.animation(.easeInOut(duration: 0.15)))
                            case .failure: Color.clear
                            @unknown default: Color.clear
                            }
                        }
                    }
                }
                .frame(width: 24, height: 24)
                .clipShape(Circle())
                .overlay(Circle().stroke(.background, lineWidth: 2))
                .zIndex(Double(10 - idx))
            }
        }
        .accessibilityElement(children: .ignore)
    }
}

private extension Array {
    subscript(safe idx: Int) -> Element? {
        indices.contains(idx) ? self[idx] : nil
    }
}

// MARK: - Section Header

struct PastOrdersSectionHeader: View {
    let title: String
    var body: some View {
        HStack {
            Text(title)
                .font(.footnote.weight(.semibold))
                .foregroundStyle(.secondary)
                .textCase(.uppercase)
            Spacer()
        }
        .padding(.horizontal)
        .padding(.top, 8)
    }
}

// MARK: - Sheet

public struct PastOrdersSheet: View {
    @Environment(\.dismiss) private var dismiss
    
    public let orders: [PastOrderRowModel]

    public init(orders: [PastOrderRowModel]) {
        self.orders = orders
    }

    public var body: some View {
        NavigationStack {
            List {
                ForEach(orders) { order in
                    PastOrderRow(model: order)
                }
            }
            .listStyle(.insetGrouped)
            .navigationTitle("Previous Orders")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button {
                        dismiss()
                    } label: {
                        Image(systemName: "xmark")
                            .font(.system(size: 14, weight: .bold))
                    }
                    .foregroundStyle(.secondary)
                    .accessibilityLabel("Close")
                }
            }
        }
        .presentationDetents([.medium, .large])
        .presentationDragIndicator(.visible)
    }
}

// MARK: - Preview

#Preview("PastOrdersSheet") {
    let demo = [
        PastOrderRowModel(
            id: "1",
            title: "Friday Treats",
            timestamp: "Aug 22, 2025",
            itemCount: 12,
            peopleCount: 5,
            accentColor: .orange,
        ),
        PastOrderRowModel(
            id: "2",
            title: "Team Lunch",
            timestamp: "Sep 12, 2025",
            itemCount: 21,
            peopleCount: 8,
            accentColor: .teal,
        ),
        PastOrderRowModel(
            id: "3",
            title: "Breakfast Run",
            timestamp: "Sep 05, 2025",
            itemCount: 15,
            peopleCount: 3,
            accentColor: .purple,
        )
    ]

    PastOrdersSheet(orders: demo)
}
