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
                    let picture: String = supabase.auth.currentUser?.userMetadata["avatar_url"]?.value as? String ?? ""
                    if !picture.isEmpty {
                        AsyncImage(url: URL(string: picture)) { image in
                            image
                                .resizable()
                                .scaledToFill()
                                .clipShape(Circle())
                        } placeholder: {
                            ProgressView()
                        }
                        .frame(width: 40, height: 40)
                    } else {
                        Image(systemName: "person.crop.circle.fill").resizable()
                            .scaledToFill()
                            .clipShape(Circle())
                            .frame(width: 40, height: 40)
                            .foregroundColor(.secondary)
                    }
                }
            }
        }
        .padding()
        .background(Color(.systemBackground))
    }
}
