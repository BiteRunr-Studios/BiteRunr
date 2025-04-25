import SwiftUI
//import Clerk

struct HomeView: View {
//    @Environment(Clerk.self) private var clerk
    @State private var isPressed = false
    
    var body: some View {
        VStack(spacing: 0) {
            NavigationStack {
                Text("Welcome to BiteRunr!")
                    .navigationTitle("")
                    .navigationBarTitleDisplayMode(.inline)
            }
        }
    }
}

#Preview {
    HomeView()
}
