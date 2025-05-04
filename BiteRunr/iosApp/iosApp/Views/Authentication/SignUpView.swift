import SwiftUI
import Shared
import Supabase

struct SignUpView: View {
    private let api = SupabaseAuthApi()
    @EnvironmentObject var supabaseState: SupabaseState
    @Environment(\.colorScheme) var colorScheme
    
    @State private var email = ""
    @State private var firstName = ""
    @State private var lastName = ""
    @State private var password = ""
    @State private var code = ""
    @State private var errorMessage: String?
    @State private var isVerifying = false
    @State private var isPasswordVisible: Bool = false
    @State private var isPressed = false
    
    let screen = UIScreen.main.bounds
    
    var body: some View {
        ScrollView {
            VStack(spacing: 6) {
                Image("signUpIcon")
                    .resizable()
                    .scaledToFill()
                    .frame(width: screen.width, height: screen.height / 3.33)
                    .clipped()
                
                VStack(spacing: 16) {
                    Text("Sign Up")
                        .foregroundColor(.secondary)
                    if isVerifying {
                        TextField("Code", text: $code)
                        Button("Verify") {
                            Task { /*await verify(code: code)*/ }
                        }
                    } else {
                        HStack(spacing: 12) {
                            TextField("First Name", text: $firstName)
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
                        HStack(spacing: 12) {
                            TextField("Last Name", text: $lastName)
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
                        HStack(spacing: 12) {
                            TextField("Email", text: $email)
                                .textContentType(.emailAddress)
                                .textInputAutocapitalization(.never)
                                .autocorrectionDisabled()
                            Image(systemName: "envelope.fill")
                                .frame(width: 24, height: 24)
                                .foregroundStyle(Color.secondary.opacity(0.3))
                                .textInputAutocapitalization(.never)
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
                                    .textContentType(.password)
                                    .textInputAutocapitalization(.never)
                                    .autocorrectionDisabled()
                            }
                            else {
                                SecureField("Password", text: $password)
                                    .textContentType(.password)
                                    .textInputAutocapitalization(.never)
                                    .autocorrectionDisabled()
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
                                .scaleEffect(isPressed ? 0.995 : 1.0)
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
                                try? await supabase.auth.signInWithOAuth(provider: .google, redirectTo: URL(string: "biterunr://auth-callback")!)
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
                                try? await supabase.auth.signInWithOAuth(provider: .github, redirectTo: URL(string: "biterunr://auth-callback")!)
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
                }
                .padding()
            }
        }
        .ignoresSafeArea(.keyboard, edges: .bottom)

    }
}

extension SignUpView {

}
