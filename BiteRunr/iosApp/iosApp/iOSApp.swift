import SwiftUI
import Shared

@main
struct iOSApp: App {
    let tokenHelper = SupabaseTokenHelper.Companion().create()
    
    var body: some Scene {
        WindowGroup {
            ZStack {
                ContentView()
                    .environmentObject(SupabaseState(tokenHelper: tokenHelper))
            }
        }
    }
}
