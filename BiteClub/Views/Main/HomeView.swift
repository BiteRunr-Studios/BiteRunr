import SwiftUI
import Clerk

struct HomeView: View {
    @Environment(Clerk.self) private var clerk
    @State private var isPressed = false
    @StateObject private var wsManager = WebSocketManager()
    @State private var newItemName: String = ""
    
    var body: some View {
        VStack(spacing: 0) {
            NavigationStack {
                List(wsManager.items, id: \.self) { item in
                    Text(item)
                }
                
                HStack {
                    TextField("New item", text: $newItemName)
                        .textFieldStyle(RoundedBorderTextFieldStyle())
                    Button("Send") {
                        wsManager.send(itemName: newItemName)
                        newItemName = ""
                    }
                }
                .padding()
            }
        }
        .onAppear {
            wsManager.connect()
        }
        .onDisappear {
            wsManager.disconnect()
        }
    }
}

#Preview {
    HomeView()
        .environment(Clerk.shared)
}
