import SwiftUI
import Shared

struct AwaitingOrders: View {
    @Binding var order: Order?
    
    var body: some View {
        DisableBackSwipeView {
            VStack {
                Text(order?.id ?? "")
                Text(order?.name ?? "")
                Text(order?.comments ?? "")
            }
            .navigationBarBackButtonHidden(true)
        }
        
    }
}


extension AwaitingOrders {
//    private func getOrderDetails() {
//        guard let userId = supabase.auth.currentUser?.id.uuidString else { return }
//        
//        
//    }
}
