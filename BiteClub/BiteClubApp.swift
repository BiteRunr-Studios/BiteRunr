//
//  BiteClubApp.swift
//  BiteClub
//
//  Created by Claude White on 2025-04-05.
//

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
                print("Configuring Clerk...")
                clerk.configure(publishableKey: "pk_test_YWJzb2x1dGUtcGhvZW5peC03LmNsZXJrLmFjY291bnRzLmRldiQ")
                do {
                    try await clerk.load()
                    print("Clerk loaded successfully")
                } catch {
                    print("Failed to load Clerk: \(error)")
                }
            }
        }
    }
}
