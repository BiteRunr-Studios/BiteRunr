import SwiftUI
import Supabase

struct ContentView: View {
    @EnvironmentObject var supabaseState: SupabaseState
    
    var body: some View {
        GeometryReader { geometry in
            ZStack(alignment: .top) {
                Color(UIColor(red: 1.0, green: 0.533, blue: 0.0, alpha: 1.0))
                    .ignoresSafeArea(edges: .top)
                    .frame(height: geometry.safeAreaInsets.top)
                VStack {
                    if supabaseState.isAuthenticated {
                        MainLayout()
                            .transition(.opacity)
                    } else {
                        SignUpOrSignInView()
                            .transition(.opacity)
                    }
                }
                .animation(.easeInOut, value: supabaseState.isAuthenticated)
            }
        }
    }
}

#Preview {
    ContentView()
}
