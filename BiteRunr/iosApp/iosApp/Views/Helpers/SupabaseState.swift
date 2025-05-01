import Foundation
import Shared
import Combine
import Supabase

class SupabaseState: ObservableObject {
    @Published var isAuthenticated: Bool = false
    
    init() {
        Task {
            for await state in supabase.auth.authStateChanges {
                if [.initialSession, .signedIn, .signedOut].contains(state.event) {
                    await MainActor.run {
                        self.isAuthenticated = state.session != nil
                    }
                }
            }
        }
    }
}
