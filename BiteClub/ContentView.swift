//
//  ContentView.swift
//  BiteClub
//
//  Created by Claude White on 2025-04-05.
//

import SwiftUI
import Clerk

struct ContentView: View {
    @Environment(Clerk.self) private var clerk
    
    var body: some View {
        VStack {
            if let user = clerk.user {
                Text("Hello, \(user.id)")
                Button("Sign Out") {
                    Task { try? await clerk.signOut() }
                }
            } else {
                SignUpOrSignInView()
            }
        }
        .toolbarBackground(.teal, for: .tabBar)
    }
}

#Preview {
    ContentView()
        .environment(Clerk.shared)
}
