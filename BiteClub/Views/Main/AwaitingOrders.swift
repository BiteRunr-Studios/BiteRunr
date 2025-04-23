import SwiftUI
import Clerk

struct AwaitingOrders: View {
    
    
    var body: some View {
        DisableBackSwipeView {
                   VStack {
                       Text("Hello")
                   }
                   .navigationBarBackButtonHidden(true)
               }

    }
}
