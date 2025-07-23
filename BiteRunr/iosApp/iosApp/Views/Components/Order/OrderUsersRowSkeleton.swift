import Foundation
import SwiftUICore

struct OrderUsersRowSkeleton: View {
    @State private var isAnimating = false
    
    var body: some View {
        HStack {
            // Avatar skeleton
            Circle()
                .fill(Color.gray.opacity(isAnimating ? 0.2 : 0.4))
                .frame(width: 48, height: 48)
            
            VStack(alignment: .leading, spacing: 4) {
                // Name skeleton
                RoundedRectangle(cornerRadius: 4)
                    .fill(Color.gray.opacity(isAnimating ? 0.2 : 0.4))
                    .frame(width: 120, height: 16)
                
                // Status skeleton
                RoundedRectangle(cornerRadius: 4)
                    .fill(Color.gray.opacity(isAnimating ? 0.2 : 0.4))
                    .frame(width: 80, height: 12)
            }
            
            Spacer()
            
            Circle()
                .fill(Color.gray.opacity(isAnimating ? 0.2 : 0.4))
                .frame(width: 35, height: 35)
        }
        .onAppear {
            withAnimation(
                .easeInOut(duration: 1.2)
                .repeatForever(autoreverses: true)
            ) {
                isAnimating = true
            }
        }
    }
}
