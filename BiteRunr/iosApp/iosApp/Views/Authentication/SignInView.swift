import SwiftUI
import Shared
import Supabase

struct SignInView: View {
    let screen = UIScreen.main.bounds
    @Environment(\.colorScheme) var colorScheme
    
    @State private var email = ""
    @State private var password = ""
    @State var isLoading = false
    @State var result: Result<Void, Error>?
    @State private var errorMessage: String?
    @State private var isPasswordVisible: Bool = false
    @State private var isPressed = false
    
    var body: some View {
        ScrollView {
            VStack(spacing: 6) {
                Image("signUpIcon")
                    .resizable()
                    .scaledToFill()
                    .frame(height: screen.height / 3.33)
                    .ignoresSafeArea(edges: .horizontal)
                    .clipped()
                
                VStack(spacing: 16) {
                    Text("Sign In")
                        .foregroundColor(.secondary)
                    HStack(spacing: 12) {
                        TextField("Email", text: $email)
                            .textContentType(.emailAddress)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()
                        Image(systemName: "envelope.fill")
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
                    HStack(spacing: 12) {
                        if isPasswordVisible {
                            TextField("Password", text: $password)
                        }
                        else {
                            SecureField("Password", text: $password)
                        }
                        Button(action: {
                            isPasswordVisible.toggle()
                        }) {
                            Image(systemName: isPasswordVisible ? "eye.slash.fill" : "eye.fill")
                                .frame(width: 24, height: 24)
                                .foregroundStyle(Color.secondary.opacity(0.3))
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 16)
                    .padding(.horizontal, 16)
                    .foregroundStyle(.primary)
                    .background(Color(UIColor.systemBackground))
                    .cornerRadius(12)
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(Color.secondary.opacity(0.3), lineWidth: 1)
                    )
                    
                    if let errorMessage = errorMessage {
                        Text(errorMessage)
                            .foregroundColor(.red)
                            .font(.caption)
                    }
                    
                    Button(action: {
                        withAnimation(.easeIn(duration: 0.1)) {
                            isPressed = true
                        }
                        Task {
                            await signIn()
                            withAnimation(.easeOut(duration: 0.1)) {
                                isPressed = false
                            }
                        }
                    }) {
                        Text("Continue")
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 16)
                            .background(Color.orange)
                            .foregroundColor(.white)
                            .cornerRadius(12)
                            .scaleEffect(isPressed ? 0.99 : 1.0)
                    }
                    .contentShape(Rectangle())
                    
                    HStack {
                        Rectangle()
                            .frame(height: 1)
                            .foregroundColor(Color.secondary.opacity(0.3))
                            .cornerRadius(12)
                        
                        Text("OR")
                            .padding(.horizontal, 8)
                            .foregroundColor(Color.secondary.opacity(0.3))
                        
                        Rectangle()
                            .frame(height: 1)
                            .foregroundColor(Color.secondary.opacity(0.3))
                            .cornerRadius(12)
                    }
                    .padding(.horizontal)
                    
                    Button(action: {
                        Task {
                            let session = try? await supabase.auth.signInWithOAuth(provider: .google, redirectTo: URL(string: "biterunr://auth-callback")!)
                            await createUser(session: session)
                        }
                    }) {
                        HStack {
                            Image("GoogleIcon")
                            Text("Continue with Google")
                                .foregroundColor(.secondary)
                        }
                        .frame(maxWidth: .infinity)
                    }
                    .padding(.vertical, 16)
                    .background(Color(UIColor.systemBackground))
                    .foregroundStyle(.primary)
                    .cornerRadius(12)
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(Color.secondary.opacity(0.3), lineWidth: 1)
                    )
                    
                    Button(action: {
                        Task {
                            let session = try? await supabase.auth.signInWithOAuth(provider: .github, redirectTo: URL(string: "biterunr://auth-callback")!)
                            await createUser(session: session)
                        }
                    }) {
                        HStack {
                            Image("GitHub")
                                .renderingMode(.template)
                                .foregroundColor(colorScheme == .dark ? .white : .black)
                            Text("Continue with GitHub")
                                .foregroundColor(.secondary)
                        }
                        .frame(maxWidth: .infinity)
                    }
                    .padding(.vertical, 16)
                    .background(Color(UIColor.systemBackground))
                    .foregroundStyle(.primary)
                    .cornerRadius(12)
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(Color.secondary.opacity(0.3), lineWidth: 1)
                    )
                }
                .padding()
            }
        }
    }
}

extension SignInView {
    private func signIn() async {
        isLoading = true
        defer { isLoading = false }
        do {
            let session = try await supabase.auth.signIn(email: email, password: password)
            await createUser(session: session)
            result = .success(())
        } catch {
            result = .failure(error)
        }
    }
    
    private func createUser(session: Session?) async {
        guard let user = session?.user else {
            return
        }
        do {
            let apiUrl = ProcessInfo.processInfo.environment["API_URL"]!
            let fullName = user.userMetadata["full_name"]?.value as? String ?? ""
            let _ = try await createUserProfile(
                baseUrl: apiUrl,
                authUserId: user.id.uuidString,
                firstName: {
                    if let spaceIndex = fullName.firstIndex(of: " ") {
                        return String(fullName[..<spaceIndex])
                    } else {
                        return fullName
                    }
                }(),
                lastName: {
                    if let spaceIndex = fullName.firstIndex(of: " ") {
                        let nextIndex = fullName.index(after: spaceIndex)
                        return String(fullName[nextIndex...])
                    } else {
                        return ""
                    }
                }()
            )
        } catch {
            print("\(error)")
        }
    }
}
