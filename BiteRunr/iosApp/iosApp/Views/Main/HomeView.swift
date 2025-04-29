import SwiftUI
import Shared

struct HomeView: View {
    @EnvironmentObject var supabaseState: SupabaseState
    @State private var isPressed = false
    @StateObject private var poller = Poller()
    
    var body: some View {
        VStack(spacing: 0) {
            NavigationStack {
                Text("Welcome to BiteRunr!")
                    .navigationTitle("")
                    .navigationBarTitleDisplayMode(.inline)
            }
            Text(supabaseState.getToken(tokenKey: "supbase_user_id") ?? "None")
        }
    }
}

#Preview {
    HomeView()
}
