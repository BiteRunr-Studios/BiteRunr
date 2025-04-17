import SwiftUI
import Clerk

struct MainLayout: View {
    @State private var selectedTab: Tab = .home
    @State private var showProfileSheet = false
    @Environment(Clerk.self) private var clerk
    
    var body: some View {
        VStack(spacing: 0) {
            TopBarView(showProfileSheet: $showProfileSheet)
            
            selectedTab.view
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            
            Divider()
            
            HStack {
                ForEach(Tab.allCases, id: \.self) { tab in
                    Spacer()
                    Button(action: {
                        selectedTab = tab
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
        .sheet(isPresented: $showProfileSheet) {
            ProfileView()
        }
    }
}

enum Tab: Int, CaseIterable {
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
    
    @ViewBuilder
    var view: some View {
        switch self {
        case .home: HomeView()
        case .addGroup: AddGroupView()
        case .joinGroup: JoinGroupView()
        case .friends: FriendsView()
        }
    }
}



#Preview {
    MainLayout()
        .environment(Clerk.shared)
}
