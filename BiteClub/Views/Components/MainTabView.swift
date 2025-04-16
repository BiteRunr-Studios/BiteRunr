import SwiftUI

struct MainTabView: View {
    var body: some View {
        TabView {
            HomeView()
                .tabItem {
                    Label("Home", systemImage: "house")
                }

            AddGroupView()
                .tabItem {
                    Label("Add", systemImage: "plus.circle")
                }

            JoinGroupView()
                .tabItem {
                    Label("Start", systemImage: "arrow.clockwise.circle")
                }
        }
    }
}

#Preview {
    MainTabView()
}
