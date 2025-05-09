import SwiftUI
import Shared
//import Clerk

struct MainLayout: View {
    @State private var selectedTab: Tab = .home
    @State private var showProfileSheet = false
    @State private var showAwaitingOrders = false
    @StateObject private var keyboard = KeyboardResponder()
    @State private var order: Order? = nil
    
    var body: some View {
        ZStack(alignment: .bottom) {
            VStack(spacing: 0) {
                if order == nil {
                    TopBarView(showProfileSheet: $showProfileSheet)
                }
                TabView(selection: $selectedTab) {
                    HomeView()
                        .tag(Tab.home)
                    AddGroupView(onOrderCreated: { newOrder in
                        order = newOrder
                    })
                    .tag(Tab.addGroup)
                    JoinGroupView()
                        .tag(Tab.joinGroup)
                    FriendsView()
                        .tag(Tab.friends)
                }
                
                if order == nil && !keyboard.isKeyboardVisible {
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
        .onReceive(
            Timer.publish(every: 5, on: .main, in: .common).autoconnect()
        ) { _ in
            // call the checkIfUserIsPartOfOrder function to
            // determine if the user is part of an ongoing
            // active order group.
            
            // 1. Make a /orders/{orderId}/has-user/{userId}
            //    endpoint that returns true or false depeding
            //    on if the user exists within the order
            //    (either as creator or member)
            
            // 2. Call the endpoint inside the function which
            //    will return true or false
            
            // 3. Assign the function return value to a @State
            //    variable, which will be used to display the
            //    header notification at the top of the screen
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
        case .joinGroup: return "bag"
        case .friends: return "person.2"
        }
    }
    
    var filledIcon: String {
        switch self {
        case .home: return "house.fill"
        case .addGroup: return "plus.circle.fill"
        case .joinGroup: return "bag.fill"
        case .friends : return "person.2.fill"
        }
    }
}

#Preview {
    MainLayout()
}
