import SwiftUI
import Shared
import Supabase

struct MainLayout: View {
    @State private var selectedTab: Tab = .home
    @State private var showProfileSheet = false
    @StateObject private var keyboard = KeyboardResponder()
    @State private var order: Order? = nil
    @State private var showOrderDetails = false
    @State private var onGoingActiveOrders: Bool = false
    @StateObject private var poller = Poller()
    @State private var wasPollingBeforeJoinGroup: Bool = false

    var body: some View {
        ZStack(alignment: .top) {
            // Main content
            ZStack(alignment: .bottom) {
                VStack(spacing: 0) {
                    TopBarView(showProfileSheet: $showProfileSheet)
                    TabView(selection: $selectedTab) {
                        HomeView()
                            .tag(Tab.home)
                        AddGroupView(onOrderCreated: { newOrder in
                            order = newOrder
                            withAnimation {
                                showOrderDetails = true
                            }
                        })
                        .tag(Tab.addGroup)
                        JoinGroupView(
                            selectedOrder: $order,
                            onOrderSelected: { selectedOrder in
                                if let selectedOrder = selectedOrder {
                                    order = selectedOrder
                                    withAnimation {
                                        showOrderDetails = true
                                    }
                                }
                            }
                        )
                        .tag(Tab.joinGroup)
                        FriendsView()
                            .tag(Tab.friends)
                    }
                }
                .sheet(isPresented: $showProfileSheet) {
                    ProfileView()
                }

                if onGoingActiveOrders && !keyboard.isKeyboardVisible {
                    HStack(spacing: 12) {
                        Image(systemName: "circle.fill")
                            .symbolEffect(.pulse, options: .speed(2).repeat(.continuous))
                            .foregroundColor(.white)
                            .font(.footnote)
                        Text("You have ongoing orders. 🍔")
                            .foregroundColor(.white)
                            .fontWeight(.semibold)
                            .font(.subheadline)
                        Button {
                            withAnimation {
                                selectedTab = .joinGroup
                            }
                        } label: {
                            Text("View")
                                .underline()
                                .foregroundColor(.white)
                        }
                        .fontWeight(.semibold)
                        .font(.subheadline)
                    }
                    .padding(.vertical, 12)
                    .padding(.horizontal, 20)
                    .background(
                        RoundedRectangle(cornerRadius: 24, style: .continuous)
                            .fill(Color.orange)
                            .shadow(color: Color.orange.opacity(0.25), radius: 18, x: 0, y: 6)
                    )
                    .frame(maxWidth: .infinity)
                    .padding(.horizontal, 32)
                    .padding(.bottom, 80)
                    .transition(.opacity)
                    .animation(.easeInOut(duration: 0.3), value: onGoingActiveOrders)
                }


                // Bottom tab bar
                if !keyboard.isKeyboardVisible {
                    HStack {
                        ForEach(Tab.allCases, id: \.self) { tab in
                            Spacer()
                            Button(action: {
                                withAnimation {
                                    selectedTab = tab
                                }
                            }) {
                                VStack(spacing: 2) {
                                    Image(systemName: selectedTab == tab ? tab.filledIcon : tab.icon)
                                        .font(.system(size: 21))
                                        .foregroundColor(selectedTab == tab ? .orange : .gray)
                                    Text(tab.name)
                                        .font(.caption2)
                                        .foregroundColor(selectedTab == tab ? .orange : .gray)
                                }
                            }
                            Spacer()
                        }
                    }
                    .padding(.bottom, 5)
                    .padding(.top, 8)
                    .background(Color(.systemBackground))
                    .overlay(
                        Rectangle()
                            .fill(Color.gray)
                            .frame(height: 1 / UIScreen.main.scale)
                            .frame(maxHeight: .infinity, alignment: .top),
                        alignment: .top
                    )
                }
            }

            // Order details overlay
            if showOrderDetails, let currentOrder = order {
                AwaitingOrders(
                    order: Binding(
                        get: { currentOrder },
                        set: { order = $0 }
                    ),
                    onDismiss: {
                        withAnimation {
                            showOrderDetails = false
                        }
                        // Optional: Reset order after animation completes
                        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                            order = nil
                        }
                    }
                )
                .id(currentOrder.id) // Add this line
                .background(Color(.systemBackground))
                .transition(.asymmetric(
                    insertion: .move(edge: .trailing),
                    removal: .move(edge: .trailing)
                ))
                .zIndex(1)
            }
        }
        .onAppear() {
            startPolling()
        }
        .onDisappear() {
            stopPolling()
        }
        .onChange(of: selectedTab) { oldTab, newTab in
            handleTabChange(oldTab: oldTab, newTab: newTab)
        }
        .environment(keyboard)
        .ignoresSafeArea(.keyboard, edges: .bottom)
    }

    private func startPolling() {
        Task {
            guard let apiUrl = Bundle.main.infoDictionary?["API_URL"] as? String else {
                print("API_URL not set")
                return
            }
            guard let userId = supabase.auth.currentUser?.id.uuidString else {
                print("userId not set")
                return
            }
            poller.startPolling(
                interval: 5,
                pollBlock: {
                    try await checkUserInActiveOrder(baseUrl: apiUrl, userId: userId)
                },
                onResult: { response in
                    if response.success {
                        onGoingActiveOrders = response.data as! Bool
                    }
                },
                onError: { error in
                    print("Polling error: \(error)")
                }
            )
        }
    }

    private func stopPolling() {
        Task {
            onGoingActiveOrders = false
            poller.stopPolling()
        }
    }

    private func handleTabChange(oldTab: Tab, newTab: Tab) {
        if newTab == .joinGroup {
            wasPollingBeforeJoinGroup = poller.isPolling
            if poller.isPolling {
                stopPolling()
            }
        } else if oldTab == .joinGroup && wasPollingBeforeJoinGroup {
            startPolling()
        }
    }
}

extension AnyTransition {
    static var slideUpFromBottom: AnyTransition {
        .asymmetric(
            insertion: .move(edge: .bottom),
            removal: .move(edge: .bottom)
        )
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

    var name: String {
        switch self {
        case .home: return "Home"
        case .addGroup: return "Add Group"
        case .joinGroup: return "Groups"
        case .friends: return "Friends"
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
