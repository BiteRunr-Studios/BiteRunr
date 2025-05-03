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
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 16) {
                    HStack {
                        
                        if let user = user {
                            Image(systemName: "person")
                                .resizable()
                                .shadow(radius: 3)
                                .frame(width: 30, height: 30)
                            
                            VStack(alignment: .leading) {
                                if !user.profile.firstName.isEmpty && !user.profile.lastName.isEmpty {
                                    Text("\(user.profile.firstName) \(user.profile.lastName)")
                                } else {
                                    Text("User")
                                }
                                // Text(user.primaryEmailAddress?.emailAddress ?? "No Email")
                                //     .font(.subheadline)
                                //     .foregroundStyle(.primary)
                            }
                        }
                    }
                    .padding(.vertical, 8)
                    
                    Divider()
                    
                    VStack(spacing: 12) {
                        HStack(spacing: 12) {
                            TextField("First Name", text: $userFields.first_name)
                                .onChange(of: userFields.first_name, {
                                    errorMessage = nil
                                })
                            Image(systemName: "person.fill")
                                .frame(width: 24, height: 24)
                                .foregroundStyle(Color.secondary.opacity(0.3))
                        }
                        .padding(.vertical, 16)
                        .padding(.horizontal, 16)
                        .background(Color(UIColor.systemBackground))
                        .cornerRadius(12)
                        .overlay(
                            RoundedRectangle(cornerRadius: 12)
                                .stroke(Color.secondary.opacity(0.3), lineWidth: 1)
                        )
                        .onAppear {
                            userFields.first_name = user?.profile.firstName ?? ""
                        }
                        
                        HStack(spacing: 12) {
                            TextField("Last Name", text: $userFields.last_name)
                                .onChange(of: userFields.last_name, {
                                    errorMessage = nil
                                })
                            Image(systemName: "person.fill")
                                .frame(width: 24, height: 24)
                                .foregroundStyle(Color.secondary.opacity(0.3))
                        }
                        .padding(.vertical, 16)
                        .padding(.horizontal, 16)
                        .background(Color(UIColor.systemBackground))
                        .cornerRadius(12)
                        .overlay(
                            RoundedRectangle(cornerRadius: 12)
                                .stroke(Color.secondary.opacity(0.3), lineWidth: 1)
                        )
                        .onAppear {
                            userFields.last_name = user?.profile.lastName ?? ""
                        }
                        
                        if let errorMessage = errorMessage {
                            Text(errorMessage)
                                .foregroundColor(.red)
                                .font(.footnote)
                                .padding(.top, 4)
                        }
                        
                        Button(action: {
                            withAnimation(.easeIn(duration: 0.1)) {
                                isPressed = true
                            }
                            Task {
                                do {
                                    try validateFields()
                                    //                                        await updateProfile()
                                    print("Updated Profile")
                                    errorMessage = nil
                                    print("Profile updated successfully!")
                                } catch {
                                    errorMessage = error.localizedDescription
                                }
                            }
                        }) {
                            Text("Save")
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 12)
                                .background(Color.orange)
                                .foregroundColor(.white)
                                .cornerRadius(12)
                                .scaleEffect(isPressed ? 0.995 : 1.0)
                        }
                        .contentShape(Rectangle())
                    }
                }
                
                Divider()
                
                Button(action: {
                    withAnimation(.easeIn(duration: 0.1)) {
                        isPressed = true
                    }
                    Task {
                        try await supabase.auth.signOut()
                        withAnimation(.easeOut(duration: 0.1)) {
                            isPressed = false
                        }
                    }
                }) {
                    Text("Sign out")
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                        .background(Color.red.opacity(0.1))
                        .foregroundColor(.red)
                        .cornerRadius(12)
                        .scaleEffect(isPressed ? 0.99 : 1.0)
                }
                .contentShape(Rectangle())
            }
            .onAppear {
                Task {
                    await getProfileUser()
                }
            }
            .padding()
        }
        .navigationTitle("Account")
        .navigationBarTitleDisplayMode(.inline)
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
            guard let apiUrl = ProcessInfo.processInfo.environment["API_URL"] else {
                errorMessage = "API_URL not set"
                return
            }
            guard let user_id = supabase.auth.currentUser?.id.uuidString, !user_id.isEmpty else {
                errorMessage = "User ID not found"
                return
            }
            let response = try await getUserProfile(baseUrl: apiUrl, user_id: user_id)
            user = response
        } catch {
            errorMessage = "Failed to fetch user: \(error.localizedDescription)"
        }
    }
    
    //    func updateProfile() async {
    //        do {
    //            try validateFields()
    //
    //            if let user = clerk.user {
    //                // MARK: - Update Clerk user
    //                do {
    //                    try await user.update(.init(firstName: userFields.first_name, lastName: userFields.last_name))
    //
    //                    if user.firstName == userFields.first_name && user.lastName == userFields.last_name {
    //                        errorMessage = nil
    //                        print("Clerk user updated successfully!")
    //                    } else {
    //                        errorMessage = "Name update failed to reflect in Clerk."
    //                    }
    //                } catch {
    //                    print("Clerk update error: \(error.localizedDescription)")
    //
    //                    if user.firstName == userFields.first_name && user.lastName == userFields.last_name {
    //                        errorMessage = nil
    //                        print("Clerk user updated successfully despite error!")
    //                    } else {
    //                        errorMessage = "Failed to update Clerk user: \(error.localizedDescription)"
    //                        return
    //                    }
    //                }
    //
    //                // MARK: - Update Supabase user
    //                let apiUrl = ProcessInfo.processInfo.environment["API_URL"]!
    //                let url = "\(apiUrl)/users/clerk/\(user.id)"
    //                let requestBody = userFields
    //
    //                do {
    //                    let response: UpdateUserResponse = try await fetch(
    //                        url: url,
    //                        method: "PATCH",
    //                        responseType: UpdateUserResponse.self,
    //                        body: requestBody
    //                    )
    //
    //                    print("Supabase user updated successfully! Response: \(response)")
    //                } catch {
    //                    errorMessage = "Failed to update Supabase user: \(error.localizedDescription)"
    //                }
    //            }
    //        } catch {
    //            errorMessage = error.localizedDescription
    //        }
    //    }
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
