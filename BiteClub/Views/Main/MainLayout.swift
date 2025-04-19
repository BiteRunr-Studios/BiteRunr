import SwiftUI
import Clerk

struct MainLayout: View {
    @State private var selectedTab: Tab = .home
    @State private var showProfileSheet = false
    @StateObject private var keyboard = KeyboardResponder()
    @Environment(Clerk.self) private var clerk

    var body: some View {
        ZStack(alignment: .bottom) {
            VStack(spacing: 0) {
                TopBarView(showProfileSheet: $showProfileSheet)
                TabView(selection: $selectedTab) {
                    HomeView()
                        .tag(Tab.home)
                    AddGroupView()
                        .tag(Tab.addGroup)
                    JoinGroupView()
                        .tag(Tab.joinGroup)
                    FriendsView()
                        .tag(Tab.friends)
                }
                
                if !keyboard.isKeyboardVisible {
                    Divider()
                    HStack {
                        ForEach(Tab.allCases, id: \.self) { tab in
                            Spacer()
                            Button(action: {
                                withAnimation {
                                    selectedTab = tab
                                }
                            }) {
                                Image(systemName: selectedTab == tab ? tab.filledIcon : tab.icon)
                                    .font(.system(size: 24))
                                    .foregroundColor(selectedTab == tab ? .orange : .gray)
                            }
                            Spacer()
                        }
                    }
                    .padding()
                    .background(Color(.systemBackground))
                }
            }
            .sheet(isPresented: $showProfileSheet) {
                ProfileView()
            }
        }
        .environment(keyboard)
    }
}

enum Tab: Int, CaseIterable, Hashable {
    case home, addGroup, joinGroup, friends

    var icon: String {
        switch self {
        case .home: return "house"
        case .addGroup: return "plus.circle"
        case .joinGroup: return "arrow.triangle.2.circlepath.circle"
        case .friends: return "person.3"
        }
    }

    var filledIcon: String {
        switch self {
        case .home: return "house.fill"
        case .addGroup: return "plus.circle.fill"
        case .joinGroup: return "arrow.triangle.2.circlepath.circle.fill"
        case .friends : return "person.3.fill"
        }
    }
}

#Preview {
    MainLayout()
        .environment(Clerk.shared)
}
