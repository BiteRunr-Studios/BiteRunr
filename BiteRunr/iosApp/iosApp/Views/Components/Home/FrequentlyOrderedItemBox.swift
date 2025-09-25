import SwiftUI

struct FrequentlyOrderedItemsBox: View {
    let items: [FrequentlyOrderedItem]
    let accentColor: Color = .orange

    var body: some View {
        VStack(spacing: 12) {
            header
            Divider().opacity(0.12)
            content
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .fill(.background.opacity(0.6))
                .overlay(
                    RoundedRectangle(cornerRadius: 16, style: .continuous)
                        .strokeBorder(.separator.opacity(0.15), lineWidth: 1)
                )
                .shadow(color: .black.opacity(0.06), radius: 14, x: 0, y: 6)
        )
    }

    private var header: some View {
        HStack(spacing: 12) {
            ZStack {
                Circle().fill(accentColor.opacity(0.15))
                Image(systemName: "fork.knife")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundStyle(accentColor)
            }
            .frame(width: 36, height: 36)

            VStack(alignment: .leading, spacing: 2) {
                Text("Frequently Ordered")
                    .font(.headline).fontWeight(.semibold)
                    .lineLimit(1)
                Text(items.isEmpty ? "No recent items" : "Recent items")
                    .font(.subheadline).foregroundStyle(.secondary)
                    .lineLimit(1)
            }

            Spacer()

            Button {
                
            } label: {
                Text("See all")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(accentColor)
            }
            .buttonStyle(.plain)
        }
    }

    private var content: some View {
        VStack(alignment: .leading, spacing: 10) {
            ForEach(items.prefix(3)) { item in
                HStack(spacing: 10) {
                    ZStack {
                        RoundedRectangle(cornerRadius: 8, style: .continuous)
                            .fill(accentColor.opacity(0.10))
                        Image(systemName: "bag.fill")
                            .font(.system(size: 12, weight: .bold))
                            .foregroundStyle(accentColor)
                    }
                    .frame(width: 28, height: 28)

                    VStack(alignment: .leading, spacing: 2) {
                        Text(item.name)
                            .font(.body.weight(.medium))
                            .foregroundStyle(.primary)
                            .lineLimit(1)
                        Text(item.restaurantName)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                            .lineLimit(1)
                    }

                    Spacer()
                }
                .padding(.vertical, 4)
            }
        }
    }
}

struct FrequentlyOrderedItemsSkeleton: View {
    var body: some View {
        VStack(spacing: 12) {
            HStack(spacing: 12) {
                RoundedRectangle(cornerRadius: 18, style: .continuous)
                    .fill(Color.secondary.opacity(0.18))
                    .frame(width: 36, height: 36)
                    .clipShape(Circle())
                VStack(alignment: .leading, spacing: 6) {
                    RoundedRectangle(cornerRadius: 8, style: .continuous)
                        .fill(Color.secondary.opacity(0.18))
                        .frame(width: 160, height: 16)
                    RoundedRectangle(cornerRadius: 8, style: .continuous)
                        .fill(Color.secondary.opacity(0.18))
                        .frame(width: 120, height: 12)
                }
                Spacer()
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .fill(Color.secondary.opacity(0.18))
                    .frame(width: 56, height: 24)
            }
            Divider().opacity(0.12)
            VStack(spacing: 10) {
                ForEach(0..<3) { _ in
                    HStack(spacing: 10) {
                        RoundedRectangle(cornerRadius: 8, style: .continuous)
                            .fill(Color.secondary.opacity(0.18))
                            .frame(width: 28, height: 28)
                        VStack(alignment: .leading, spacing: 4) {
                            RoundedRectangle(cornerRadius: 6, style: .continuous)
                                .fill(Color.secondary.opacity(0.18))
                                .frame(width: 160, height: 14)
                            RoundedRectangle(cornerRadius: 6, style: .continuous)
                                .fill(Color.secondary.opacity(0.18))
                                .frame(width: 120, height: 10)
                        }
                        Spacer()
                        RoundedRectangle(cornerRadius: 6, style: .continuous)
                            .fill(Color.secondary.opacity(0.18))
                            .frame(width: 100, height: 12)
                    }
                    .padding(.vertical, 4)
                }
            }
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .fill(.background.opacity(0.6))
                .overlay(
                    RoundedRectangle(cornerRadius: 16, style: .continuous)
                        .strokeBorder(.separator.opacity(0.15), lineWidth: 1)
                )
                .shadow(color: .black.opacity(0.06), radius: 14, x: 0, y: 6)
        )
        .redacted(reason: .placeholder)
    }
}
