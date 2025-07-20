import SwiftUI
import Shared
import Supabase

struct UpdateUserRequest: Encodable {
    var first_name: String
    var last_name: String
}

struct UpdateUserResponse: Decodable {}

struct ProfileView: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject var supabaseState: SupabaseState
    @State private var isPressed = false
    @State private var user: UserProfile? = nil
    @State private var userFields = UpdateUserRequest(first_name: "", last_name: "")
    @State private var errorMessage: String?
    @State private var isSaving = false
    @State private var saveSuccess = false
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 32) {
                    // Profile Image and Info
                    VStack(spacing: 12) {
                        if let user = user {
                            let picture: String = supabase.auth.currentUser?.userMetadata["avatar_url"]?.value as? String ?? ""
                            if !picture.isEmpty {
                                AsyncImage(url: URL(string: picture)) { image in
                                    image
                                        .resizable()
                                        .scaledToFill()
                                        .frame(width: 120, height: 120)
                                        .clipShape(Circle())
                                        .shadow(color: .black.opacity(0.15), radius: 8, x: 0, y: 4)
                                } placeholder: {
                                    ProgressView()
                                        .frame(width: 120, height: 120)
                                }
                            } else {
                                Image(systemName: "person.crop.circle.fill")
                                    .resizable()
                                    .scaledToFill()
                                    .frame(width: 120, height: 120)
                                    .foregroundColor(.secondary)
                                    .shadow(color: .black.opacity(0.15), radius: 8, x: 0, y: 4)
                            }
                            Text("\(user.profile.firstName) \(user.profile.lastName)")
                                .font(.title2)
                                .fontWeight(.semibold)
                                .foregroundColor(.primary)
                                .padding(.top, 4)
                            Text(user.email)
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.top, 24)
                    
                    // Card for Form Fields
                    VStack(spacing: 20) {
                        VStack(spacing: 16) {
                            HStack(spacing: 12) {
                                Image(systemName: "person.fill")
                                    .foregroundColor(.orange)
                                TextField("First Name", text: $userFields.first_name)
                                    .onChange(of: userFields.first_name) { errorMessage = nil }
                            }
                            Divider()
                            HStack(spacing: 12) {
                                Image(systemName: "person.fill")
                                    .foregroundColor(.orange)
                                TextField("Last Name", text: $userFields.last_name)
                                    .onChange(of: userFields.last_name) { errorMessage = nil }
                            }
                        }
                        .padding()
                        .background(Color(.systemBackground))
                        .cornerRadius(16)
                        .shadow(color: .black.opacity(0.07), radius: 8, x: 0, y: 4)
                        
                        if let errorMessage = errorMessage {
                            Text(errorMessage)
                                .foregroundColor(.red)
                                .font(.footnote)
                                .padding(.top, 2)
                        }
                        if saveSuccess {
                            Text("Profile updated!")
                                .foregroundColor(.green)
                                .font(.footnote)
                                .padding(.top, 2)
                        }
                        
                        VStack(spacing: 12) {
                            Button(action: {
                                withAnimation(.easeIn(duration: 0.1)) { isPressed = true }
                                Task {
                                    do {
                                        try validateFields()
                                        isSaving = true
                                        errorMessage = nil
                                        saveSuccess = false
                                        await updateProfileUser()
                                        saveSuccess = true
                                        await getProfileUser()
                                    } catch {
                                        errorMessage = error.localizedDescription
                                    }
                                    isSaving = false
                                    withAnimation(.easeOut(duration: 0.1)) { isPressed = false }
                                }
                            }) {
                                if isSaving {
                                    ProgressView()
                                        .frame(maxWidth: .infinity)
                                        .padding(.vertical, 14)
                                } else {
                                    Text("Save")
                                        .fontWeight(.semibold)
                                        .frame(maxWidth: .infinity)
                                        .padding(.vertical, 14)
                                }
                            }
                            .background(Color.orange)
                            .foregroundColor(.white)
                            .cornerRadius(12)
                            .shadow(color: .orange.opacity(0.15), radius: 4, x: 0, y: 2)
                            .scaleEffect(isPressed ? 0.995 : 1.0)
                            .contentShape(Rectangle())
                            .disabled(isSaving)
                            
                            Button(action: {
                                withAnimation(.easeIn(duration: 0.1)) { isPressed = true }
                                Task {
                                    try await supabase.auth.signOut()
                                    withAnimation(.easeOut(duration: 0.1)) { isPressed = false }
                                }
                            }) {
                                Text("Sign out")
                                    .fontWeight(.semibold)
                                    .frame(maxWidth: .infinity)
                                    .padding(.vertical, 14)
                                    .background(Color.red.opacity(0.08))
                                    .foregroundColor(.red)
                                    .cornerRadius(12)
                                    .shadow(color: .red.opacity(0.08), radius: 4, x: 0, y: 2)
                                    .scaleEffect(isPressed ? 0.99 : 1.0)
                            }
                            .contentShape(Rectangle())
                        }
                        .frame(maxWidth: .infinity)
                    }
                    .padding(.horizontal, 8)
                }
                .padding(.horizontal, 24)
                .padding(.bottom, 40)
                .onAppear {
                    Task { await getProfileUser() }
                }
            }
            .background(Color(.systemGroupedBackground).ignoresSafeArea())
            .navigationTitle("Account")
            .navigationBarTitleDisplayMode(.inline)
        }
    }
}

extension ProfileView {
    func validateFields() throws {
        guard !userFields.first_name.isEmpty else {
            throw ValidationError("First name cannot be empty.")
        }
        
        guard !userFields.last_name.isEmpty else {
            throw ValidationError("Last name cannot be empty.")
        }
    }
    
    func getProfileUser() async {
        errorMessage = nil
        
        do {
            guard let apiUrl = Bundle.main.infoDictionary?["API_URL"] as? String else {
                errorMessage = "API_URL not set"
                return
            }
            guard let user_id = supabase.auth.currentUser?.id.uuidString, !user_id.isEmpty else {
                errorMessage = "User ID not found"
                return
            }
            let response = try await getUserProfile(baseUrl: apiUrl, user_id: user_id)
            user = response.data
        } catch {
            errorMessage = "Failed to fetch user: \(error.localizedDescription)"
        }
    }
    
    func updateProfileUser() async {
        errorMessage = nil
        do {
            guard let apiUrl = Bundle.main.infoDictionary?["API_URL"] as? String else {
                errorMessage = "API_URL not set"
                return
            }
            guard let user_id = supabase.auth.currentUser?.id.uuidString, !user_id.isEmpty else {
                errorMessage = "User ID not found"
                return
            }
            guard let refresh_token = supabase.auth.currentSession?.refreshToken, !refresh_token.isEmpty else {
                errorMessage = "Refresh Token not found"
                return
            }
            guard let access_token = supabase.auth.currentSession?.accessToken, !access_token.isEmpty else {
                errorMessage = "Access Token not found"
                return
            }
            
            let response = try await updateUserProfile(
                baseUrl: apiUrl,
                userId: user_id,
                firstName: userFields.first_name,
                lastName: userFields.last_name,
                accessToken: access_token,
                refreshToken: refresh_token
            )
            if let updatedUser = response.data {
                user = updatedUser
            }
        } catch {
            errorMessage = "Failed to update profile: \(error.localizedDescription)"
        }
    }
    
}

struct ValidationError: LocalizedError {
    var errorDescription: String?
    
    init(_ description: String) {
        self.errorDescription = description
    }
}

#Preview {
    ProfileView()
}
