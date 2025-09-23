import SwiftUI

public struct PastOrderGroupCard: View {
    public let title: String
    public let timestamp: String
    public let itemCount: Int
    public let peopleCount: Int
    public let color: Color
    public let avatarCount: Int
    public let avatarURLs: [String]
    public let avatarInitials: [String]

    public init(
        title: String,
        timestamp: String,
        itemCount: Int,
        peopleCount: Int,
        color: Color,
        avatarCount: Int,
        avatarURLs: [String],
        avatarInitials: [String]
    ) {
        self.title = title
        self.timestamp = timestamp
        self.itemCount = itemCount
        self.peopleCount = peopleCount
        self.color = color
        self.avatarCount = avatarCount
        self.avatarURLs = avatarURLs
        self.avatarInitials = avatarInitials
    }

    public var body: some View {
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
            metricPill(label: "People", value: "\(peopleCount)", icon: "person.fill", color: .primary)
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
        let maxVisible = 3
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
