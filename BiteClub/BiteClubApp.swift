import SwiftUI
import Clerk

@main
struct BiteClubApp: App {
    @State private var clerk = Clerk.shared
    
    var body: some Scene {
        WindowGroup {
            ZStack {
                if clerk.isLoaded {
                    ContentView()
                } else {
                    ProgressView()
                }
            }
            .environment(clerk)
            .task {
                do {
                    print("Configuring Clerk...")
                    if let clerkPublicKey = ProcessInfo.processInfo.environment["CLERK_PUBLIC_KEY"] {
                        clerk.configure(publishableKey: clerkPublicKey)
                        try await clerk.load()
                        print("Clerk loaded successfully")
                    } else {
                        throw NSError(domain: "BiteRunrApp", code: 1, userInfo: [NSLocalizedDescriptionKey : "CLERK_PUBLIC_KEY environment variable not set"])
                    }
                } catch {
                    print("Failed to load Clerk: \(error)")
                }
                
                do {
                    if let _ = ProcessInfo.processInfo.environment["API_URL"] {
                        print("API Url loaded successfully")
                    } else {
                        throw NSError(domain: "BiteRunrApp", code: 1, userInfo: [NSLocalizedDescriptionKey : "API_URL environment variable not set"])
                    }
                } catch {
                    print("Failed to load api url: \(error)")
                }
            }
        }
    }
}
