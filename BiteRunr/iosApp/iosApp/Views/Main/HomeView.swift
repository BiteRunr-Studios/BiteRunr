// HomeView.swift

import SwiftUI
import Shared

// MARK: - Model

struct PastOrderGroup: Identifiable, Hashable {
    let id = UUID()
    let title: String
    let timestamp: String
    let itemCount: Int
    let extraCount: Int
    let color: Color
    let avatarCount: Int
}

// MARK: - Card

struct PastOrderGroupCard: View {
    let title: String
    let timestamp: String
    let itemCount: Int
    let extraCount: Int
    let color: Color
    let avatarCount: Int
    
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
                    .overlay(
                        Circle().stroke(.separator.opacity(0.15), lineWidth: 1)
                    )
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
            metricPill(
                label: "Items",
                value: "\(itemCount)",
                icon: "cart.fill",
                color: color
            )
            Spacer(minLength: 12)
            metricPill(
                label: "People",
                value: "\(extraCount)",
                icon: "person.fill",
                color: .primary
            )
            Spacer(minLength: 12)
            avatarsStack(count: avatarCount)
        }
    }
    
    private func clampProgress() -> Double {
        let itemComponent = min(Double(itemCount) / 25.0, 1.0) * 0.8
        let extraComponent = min(Double(extraCount) / 5.0, 1.0) * 0.2
        return min(itemComponent + extraComponent, 1.0)
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
    
    private func avatarsStack(count: Int) -> some View {
        HStack(spacing: -10) {
            ForEach(0..<min(count, 3), id: \.self) { idx in
                let hue = Double((idx * 65) % 360) / 360.0
                Circle()
                    .fill(Color(hue: hue, saturation: 0.65, brightness: 0.92))
                    .overlay(
                        Text(initialsForIndex(idx))
                            .font(.caption2.weight(.bold))
                            .foregroundStyle(.white)
                    )
                    .frame(width: 28, height: 28)
                    .overlay(Circle().stroke(.background, lineWidth: 2))
                    .zIndex(Double(10 - idx))
            }
            if count > 3 {
                Circle()
                    .fill(.quaternary)
                    .overlay(
                        Text("+\(count - 4)")
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
        .accessibilityLabel(Text("\(count) participants"))
    }
    
    private func initialsForIndex(_ idx: Int) -> String {
        let names = ["AL", "JP", "MS", "KT", "EV", "RB", "CN", "HW"]
        return names[idx % names.count]
    }
    
    private func progressBar(progress: Double) -> some View {
        GeometryReader { geo in
            let width = geo.size.width
            ZStack(alignment: .leading) {
                RoundedRectangle(cornerRadius: 6, style: .continuous).fill(.quaternary)
                RoundedRectangle(cornerRadius: 6, style: .continuous)
                    .fill(LinearGradient(colors: [color, color.opacity(0.6)], startPoint: .leading, endPoint: .trailing))
                    .frame(width: max(8, width * progress))
            }
        }
        .frame(height: 10)
        .clipShape(RoundedRectangle(cornerRadius: 6, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 6, style: .continuous).stroke(.separator.opacity(0.12), lineWidth: 1))
        .accessibilityLabel(Text("Completion"))
        .accessibilityValue(Text("\(Int(progress * 100)) percent"))
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
                    avatarCount: order.avatarCount
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
    @State private var isPressed = false
    
    private var pastOrders: [PastOrderGroup] {
        [
            PastOrderGroup(title: "Lunch", timestamp: "Sep 12, 2025 · 2:14 PM", itemCount: 21, extraCount: 3, color: .orange, avatarCount: 4),
            PastOrderGroup(title: "Breakfast", timestamp: "Sep 05, 2025 · 9:03 AM", itemCount: 15, extraCount: 0, color: .orange, avatarCount: 2),
            PastOrderGroup(title: "Friday Treats", timestamp: "Aug 22, 2025 · 4:40 PM", itemCount: 12, extraCount: 2, color: .teal, avatarCount: 5)
        ]
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
                        Button(action: {
                            // Navigate to full list
                        }) {
                            Text("See all")
                                .foregroundColor(.orange)
                                .font(.subheadline)
                        }
                        .buttonStyle(.plain)
                    }
                    
                    PastOrderGroupsPagerView(orders: pastOrders)
                        .padding(.bottom, 4)
                    
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
           
        }
    }
}

#Preview {
    HomeView()
}
