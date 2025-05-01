import SwiftUI
import Shared

@main
struct iOSApp: App {
    let tokenHelper = SupabaseTokenHelper.Companion().create()
    @StateObject private var supabaseState = SupabaseState()
    @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate
    
    var body: some Scene {
        WindowGroup {
            ZStack {
                ContentView()
                    .environmentObject(supabaseState)
            }
        }
    }
}

class AppDelegate: NSObject, UIApplicationDelegate {
    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey : Any] = [:]) -> Bool {
        handleDeeplink(data: url as NSURL)
        return true
    }
}
