import SwiftUI

struct TopBarView: View {
    @EnvironmentObject var supabaseState: SupabaseState
    @Binding var showProfileSheet: Bool
    
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
                if supabaseState.isAuthenticated {
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
