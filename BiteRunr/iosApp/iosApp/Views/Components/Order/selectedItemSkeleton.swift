import Foundation
import SwiftUI

// MARK: - Skeleton Loading View
struct SkeletonLoadingRow: View {
    @State private var isAnimating = false
    
    var body: some View {
        HStack {
            Circle()
                .fill(Color.gray.opacity(isAnimating ? 0.2 : 0.4))
                .frame(width: 40, height: 40)
            
            VStack(alignment: .leading) {
                RoundedRectangle(cornerRadius: 4)
                    .fill(Color.gray.opacity(isAnimating ? 0.2 : 0.4))
                    .frame(width: 120, height: 16)
                RoundedRectangle(cornerRadius: 4)
                    .fill(Color.gray.opacity(isAnimating ? 0.2 : 0.4))
                    .frame(width: 80, height: 16)
            }
            
            Spacer()
        }
        .onAppear {
            withAnimation(
                .easeInOut(duration: 1.2)
                .repeatForever(autoreverses: true)
            ) {
                isAnimating = true
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
    }
}

