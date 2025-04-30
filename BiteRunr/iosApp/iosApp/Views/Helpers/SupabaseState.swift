import Foundation
import Shared
import Combine

class SupabaseState: ObservableObject {
    private let tokenHelper: SupabaseTokenHelper
    @Published var isLoggedIn: Bool
    @Published var isLoggingOut: Bool = false
    private var cancellables = Set<AnyCancellable>()
    
    init(tokenHelper: SupabaseTokenHelper) {
        self.tokenHelper = tokenHelper
        self.isLoggedIn = tokenHelper.isUserLoggedIn()
    }
    
    func getToken(tokenKey: String) -> String? {
        return tokenHelper.getUserToken(tokenKey: tokenKey)
    }
    
    func saveToken(tokenKey: String, token: String) {
        tokenHelper.saveUserToken(tokenKey: tokenKey, token: token)
        
        DispatchQueue.main.async {
            self.isLoggedIn = true
        }
    }
    
    func logout() {
        guard !isLoggingOut else { return }
        
        isLoggingOut = true
        
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            self.tokenHelper.clearUserToken()
            
            DispatchQueue.main.async {
                self.isLoggedIn = false
                DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
                    self.isLoggingOut = false
                }
            }
        }
    }
}
