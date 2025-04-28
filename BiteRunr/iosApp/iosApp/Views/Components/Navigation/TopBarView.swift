import SwiftUI

struct TopBarView: View {
    @Binding var showProfileSheet: Bool
    @EnvironmentObject var supabaseState: SupabaseState
    
    var body: some View {
        HStack {
            Image("pageLogo")
                .resizable()
                .scaledToFit()
                .frame(height: 35)
            
            
            Spacer()
            
            Button(action: {
                showProfileSheet = true
            }) {
                if supabaseState.isLoggedIn {
                    Circle()
                        .scaledToFill()
                        .clipShape(Circle())
                        .shadow(radius: 3)
                        .overlay {
                            Circle().stroke(.secondary, lineWidth: 3)
                        }
                        .frame(width: 40, height: 40)
                }
            }
        }
        .padding()
        .background(Color(.systemBackground))
    }
}
