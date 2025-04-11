//
//  BottomTabBar.swift
//  BiteClub
//
//  Created by Ryan Somers on 4/10/25.
//

import SwiftUI
import Clerk

struct BottomTabBar: View {
    var body: some View {
        ZStack(alignment: .bottom) {
            TabView {
                HomeView()
                    .tabItem {
                        Label("Home", systemImage: "house.fill")
                    }
                AddGroupView()
                    .tabItem {
                        Label("Add", systemImage: "plus.app.fill")
                    }
                JoinGroupView()
                    .tabItem {
                        Label("Join", systemImage: "arrow.trianglehead.branch")
                    }
            }

            Rectangle()
                .fill(Color.gray.opacity(0.3))
                .frame(height: 0.5)
                .edgesIgnoringSafeArea(.bottom)
                .offset(y: -49)
        }
    }
}


#Preview {
    BottomTabBar()
        .environment(Clerk.shared)
}
