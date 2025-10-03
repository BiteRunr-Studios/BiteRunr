import SwiftUI
import Supabase
import Lottie

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
    @State private var showingSplash = true
    @State private var startAnimation = false
    
    var body: some View {
        GeometryReader { geometry in
            ZStack(alignment: .top) {
                if showingSplash {
                    Color(.systemBackground)
                        .ignoresSafeArea()
                    if startAnimation {
                        LottieView(animation: .named("splash-screen.json"))
                            .playing()
                            .animationSpeed(1.5)
                            .frame(maxWidth: .infinity, maxHeight: .infinity)
                    }
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
        .onChange(of: supabaseState.isCheckingAuth) { oldValue, isChecking in
            if !isChecking && showingSplash {
                Task {
                    try? await Task.sleep(for: .seconds(1.5))
                    withAnimation {
                        showingSplash = false
                    }
                }
            }
        }
        .onAppear() {
            Task {
                try? await Task.sleep(for: .seconds(0.3))
                startAnimation = true
            }
        }
    }
}



#Preview {
    ContentView()
}
