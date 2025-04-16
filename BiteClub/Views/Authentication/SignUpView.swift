import SwiftUI
import Clerk

struct SignUpView: View {
    @Environment(\.colorScheme) var colorScheme
    
    @State private var email = ""
    @State private var firstName = ""
    @State private var lastName = ""
    @State private var password = ""
    @State private var code = ""
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
                            Task { await verify(code: code) }
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
                        
                        Button(action: {
                            withAnimation(.easeIn(duration: 0.1)) {
                                isPressed = true
                            }
                            Task {
                                await signUp(email: email, password: password)
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
                    }
                }
                .padding()
            }
        }
        .ignoresSafeArea(.keyboard, edges: .bottom)

    }
}

extension SignUpView {
    func signUp(email: String, password: String) async {
        do {
            let signUp = try await SignUp.create(
                strategy: .standard(emailAddress: email, password: password)
            )
            
            try await signUp.prepareVerification(strategy: .emailCode)
            
            isVerifying = true
        } catch {
            dump(error)
        }
    }
    
    func verify(code: String) async {
        do {
            guard let signUp = Clerk.shared.client?.signUp else {
                isVerifying = false
                return
            }
            
            try await signUp.attemptVerification(strategy: .emailCode(code: code))
        } catch {
            dump(error)
        }
    }
}
