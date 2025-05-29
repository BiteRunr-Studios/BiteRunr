import SwiftUI
import Supabase

extension AnyTransition {
    static var blurReplace: AnyTransition {
        AnyTransition.modifier(
            active: BlurModifier(blur: 20),
            identity: BlurModifier(blur: 0)
        )
    }
}

struct BlurModifier: ViewModifier {
    let blur: Double
    
    func body(content: Content) -> some View {
        content
            .blur(radius: blur)
            .opacity(blur == 0 ? 1 : 0)
    }
}

struct ContentView: View {
    @EnvironmentObject var supabaseState: SupabaseState

    var body: some View {
        GeometryReader { geometry in
            ZStack(alignment: .top) {
                if supabaseState.isCheckingAuth {
                    Color(.systemBackground)
                        .ignoresSafeArea()
                    ProgressView()
                        .zIndex(2)
                } else {
                    Color(UIColor(red: 1.0, green: 0.533, blue: 0.0, alpha: 1.0))
                        .ignoresSafeArea(edges: .top)
                        .frame(height: geometry.safeAreaInsets.top)
                    ZStack {
                        if supabaseState.isAuthenticated {
                            MainLayout()
                                .transition(.blurReplace)
                                .zIndex(1)
                        } else {
                            SignUpOrSignInView()
                                .transition(.blurReplace)
                                .zIndex(1)
                        }
                    }
                    .animation(.easeInOut(duration: 0.5), value: supabaseState.isAuthenticated)
                }
            }
        }
    }
}



#Preview {
    ContentView()
}
