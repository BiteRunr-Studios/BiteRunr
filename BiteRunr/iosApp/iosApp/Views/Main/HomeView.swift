import SwiftUI
import Shared

struct HomeView: View {
    @EnvironmentObject var supabaseState: SupabaseState
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
