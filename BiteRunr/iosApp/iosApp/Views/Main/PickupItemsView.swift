import Foundation
import SwiftUI
import Shared
import Supabase


struct PickupItemsView: View {
    var onDismiss: (() -> Void)?
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        ZStack {
            VStack(alignment: .leading) {
                HStack {
                    // Back button
                    Button(action: {
                        onDismiss?()
                        dismiss()
                    }) {
                        HStack(alignment: .center) {
                            Image(systemName: "arrow.backward")
                                .font(.headline).fontWeight(.regular)
                                .foregroundStyle(.orange)
                            Text("Back")
                                .font(.headline).fontWeight(.regular)
                                .foregroundStyle(.orange)
                        }
                    }
                    
                    
                }
                .padding(.horizontal)
                .padding(.top)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .navigationBarBackButtonHidden(true)
    }
}
