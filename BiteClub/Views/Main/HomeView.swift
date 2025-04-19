import SwiftUI
import Clerk

struct HomeView: View {
    @Environment(Clerk.self) private var clerk
    @State private var isPressed = false
    @ObservedObject var websocket = Websocket()
    
    var body: some View {
        VStack(spacing: 0) {
            
            NavigationStack {
                List(websocket.messages) { message in
                    Text(message)
                }
            }
        }
    }
}

#Preview {
    HomeView()
        .environment(Clerk.shared)
}
