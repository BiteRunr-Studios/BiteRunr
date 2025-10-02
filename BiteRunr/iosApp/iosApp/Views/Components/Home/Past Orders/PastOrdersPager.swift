import SwiftUI

public struct PastOrderGroupUI: Identifiable, Hashable {
    public let id = UUID()
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
}

public struct PastOrdersPagerView: View {
    public let orders: [PastOrderGroupUI]
    @State private var selection: Int = 0
    @Environment(\.colorScheme) private var colorScheme

    public init(orders: [PastOrderGroupUI]) {
        self.orders = orders
    }

    public var body: some View {
        VStack(spacing: 8) {
            TabView(selection: $selection) {
                ForEach(Array(orders.enumerated()), id: \.offset) { index, order in
                    PastOrderGroupCard(
                        title: order.title,
                        timestamp: order.timestamp,
                        itemCount: order.itemCount,
                        peopleCount: order.peopleCount,
                        color: order.color,
                        avatarCount: order.avatarCount,
                        avatarURLs: order.avatarURLs,
                        avatarInitials: order.avatarInitials
                    )
                    .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                    .contentShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                    .tag(index)
                }
            }
            .tabViewStyle(.page(indexDisplayMode: .never))
            .frame(maxWidth: .infinity)
            .frame(height: 150)

            HStack(spacing: 6) {
                ForEach(0..<orders.count, id: \.self) { i in
                    Circle()
                        .fill(
                            i == selection
                            ? (colorScheme == .light ? Color.black : Color.white)
                            : (colorScheme == .light ? Color.black.opacity(0.25) : Color.white.opacity(0.35))
                        )
                        .frame(width: i == selection ? 8 : 6, height: i == selection ? 8 : 6)
                }
            }
            .animation(.easeInOut, value: selection)
            .padding(.top, 2)
        }
    }
}
