//
//  BottomTabBar.swift
//  BiteClub
//
//  Created by Ryan Somers on 4/10/25.
//

import SwiftUI

struct BottomTabBar: View {
    var body: some View {
        TabView{
            HomeView()
                .tabItem{
                    Label("Home",systemImage: "house.fill")
                    }
            AddGroupView()
                .tabItem{
                    Label("Add",systemImage: "person.2.badge.plus")
                    }
            JoinGroupView()
                .tabItem{
                    Label("Join",systemImage: "arrow.trianglehead.branch")
                    }
                }
                }
}

#Preview {
    BottomTabBar()
}
