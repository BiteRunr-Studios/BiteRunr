import SwiftUI
import Shared

struct SignInView: View {
    let screen = UIScreen.main.bounds
    @Environment(\.colorScheme) var colorScheme
    
    @EnvironmentObject var supabaseState: SupabaseState
    
    @State private var email = ""
    @State private var password = ""
    @State private var isPasswordVisible: Bool = false
    @State private var isPressed = false
    
    let api = SupabaseAuthApi(
        supabaseUrl: "https://gpsyyguiopnrnztzwboq.supabase.co",
        supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdwc3l5Z3Vpb3Bucm56dHp3Ym9xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQxMzUyMjgsImV4cCI6MjA1OTcxMTIyOH0.ZbukR17lKPXnTW8guz8DCb9Q4a8Id30iYxBawqkoVYA"
    )
    
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
                            await submit(email: email, password: password)
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
                        print("Continue with Google")
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
                        print("Continue with Apple")
                    }) {
                        HStack {
                            Image("Apple")
                                .renderingMode(.template)
                                .foregroundColor(colorScheme == .dark ? .white : .black)
                            Text("Continue with Apple")
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
    func submit(email: String, password: String) async {
        do {
            let response = try await api.signIn(email: email, password: password)
            supabaseState.saveToken(token: response.access_token)
        } catch {
            print("Error: \(error)")
        }
    }
}
