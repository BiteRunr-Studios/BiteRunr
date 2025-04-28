import SwiftUI
import Shared
//import Clerk

struct HomeView: View {
    //    @Environment(Clerk.self) private var clerk
    @State private var isPressed = false
    @StateObject private var poller = Poller()
    
    var body: some View {
        VStack(spacing: 0) {
            NavigationStack {
                Text("Welcome to BiteRunr!")
                    .navigationTitle("")
                    .navigationBarTitleDisplayMode(.inline)
            }
            .onAppear() {
                Task {
                    guard let apiUrl = ProcessInfo.processInfo.environment["API_URL"] else {
                        print("API_URL not set")
                        return
                    }
                    let url = "\(apiUrl)/locations"
                    poller.startPolling(
                        interval: 5,
                        pollBlock: { try await getLocations(url: url) },
                        onResult: { locations in
                            print("Polled locations: \(locations.count)")
                        },
                        onError: { error in
                            print("Polling error: \(error)")
                        }
                    )
                
                }
            }
            .onDisappear(){
                Task {
                    poller.stopPolling()
                }
            }
        }
    }
}

#Preview {
    HomeView()
}
