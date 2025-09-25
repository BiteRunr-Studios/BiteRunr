import SwiftUI

public struct Shimmer: ViewModifier {
    @State private var phase: CGFloat = -1
    public let isActive: Bool

    public func body(content: Content) -> some View {
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

public extension View {
    func shimmer(active: Bool) -> some View { modifier(Shimmer(isActive: active)) }
}

public struct SkeletonBlock: View {
    public let cornerRadius: CGFloat
    public let active: Bool
    public init(cornerRadius: CGFloat, active: Bool) {
        self.cornerRadius = cornerRadius
        self.active = active
    }

    public var body: some View {
        RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
            .fill(Color.secondary.opacity(0.18))
            .overlay(
                RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                    .stroke(Color(.separator).opacity(0.12), lineWidth: 1)
            )
            .shimmer(active: active)
    }
}

public struct PastOrderGroupCardSkeleton: View {
    public let active: Bool
    public init(active: Bool = true) { self.active = active }

    public var body: some View {
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
            SkeletonBlock(cornerRadius: 18, active: active)
                .frame(width: 36, height: 36)
                .clipShape(Circle())
            VStack(alignment: .leading, spacing: 6) {
                SkeletonBlock(cornerRadius: 8, active: active)
                    .frame(width: 140, height: 16)
                SkeletonBlock(cornerRadius: 8, active: active)
                    .frame(width: 100, height: 12)
            }
            Spacer()
            SkeletonBlock(cornerRadius: 12, active: active)
                .frame(width: 24, height: 24)
                .clipShape(Circle())
        }
    }

    private var statsRow: some View {
        HStack(alignment: .center) {
            HStack(spacing: 8) {
                SkeletonBlock(cornerRadius: 8, active: active)
                    .frame(width: 28, height: 28)
                VStack(alignment: .leading, spacing: 4) {
                    SkeletonBlock(cornerRadius: 6, active: active)
                        .frame(width: 32, height: 14)
                    SkeletonBlock(cornerRadius: 6, active: active)
                        .frame(width: 40, height: 10)
                }
            }
            .padding(.horizontal, 10)
            .padding(.vertical, 8)
            .background(RoundedRectangle(cornerRadius: 12, style: .continuous).fill(Color(.systemFill).opacity(0.12)))

            Spacer(minLength: 12)

            HStack(spacing: 8) {
                SkeletonBlock(cornerRadius: 8, active: active)
                    .frame(width: 28, height: 28)
                VStack(alignment: .leading, spacing: 4) {
                    SkeletonBlock(cornerRadius: 6, active: active)
                        .frame(width: 28, height: 14)
                    SkeletonBlock(cornerRadius: 6, active: active)
                        .frame(width: 42, height: 10)
                }
            }
            .padding(.horizontal, 10)
            .padding(.vertical, 8)
            .background(RoundedRectangle(cornerRadius: 12, style: .continuous).fill(Color(.systemFill).opacity(0.12)))

            Spacer(minLength: 12)

            HStack(spacing: -10) {
                ForEach(0..<4, id: \.self) { _ in
                    SkeletonBlock(cornerRadius: 14, active: active)
                        .frame(width: 28, height: 28)
                        .clipShape(Circle())
                        .overlay(Circle().stroke(.background, lineWidth: 2))
                }
            }
            .padding(.leading, 2)
        }
    }
}
