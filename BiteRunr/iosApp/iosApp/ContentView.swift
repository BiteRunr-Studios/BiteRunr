import SwiftUI

struct ContentView: View {
//    @Environment(Clerk.self) private var clerk


    var body: some View {
        GeometryReader { geometry in
            ZStack(alignment: .top) {
                Color(UIColor(red: 1.0, green: 0.533, blue: 0.0, alpha: 1.0))
                    .ignoresSafeArea(edges: .top)
                    .frame(height: geometry.safeAreaInsets.top)
                VStack {
                    if let _ = user {
                        MainLayout()
                    } else {
                        SignUpOrSignInView()
                    }
                }
            }
        }
    }
}

#Preview {
    ContentView()
}
