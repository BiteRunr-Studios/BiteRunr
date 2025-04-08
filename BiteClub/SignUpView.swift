//
//  SignUpView.swift
//  BiteClub
//
//  Created by Claude White on 2025-04-05.
//

import SwiftUI
import Clerk

struct SignUpView: View {
    @State private var email = ""
    @State private var password = ""
    @State private var code = ""
    @State private var isVerifying = false
    @State private var isPasswordVisible: Bool = false
    let screen = UIScreen.main.bounds
    
    var body: some View {
        VStack(spacing: 6) {
            Image("signUpIcon")
                .resizable()
                .scaledToFill()
                .frame(width: screen.width, height: screen.height / 3.33)
                .clipped()
            
            VStack(spacing: 16) {
                Text("Sign Up")
                if isVerifying {
                    TextField("Code", text: $code)
                    Button("Verify") {
                        Task { await verify(code: code) }
                    }
                } else {
                    HStack(spacing: 12) {
                        TextField("Email", text: $email)
                        Image(systemName: "envelope.fill")
                            .frame(width: 24, height: 24)
                            .foregroundStyle(.gray)
                    }
                    .padding(.vertical, 16)
                    .padding(.horizontal, 16)
                    .cornerRadius(12)
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(Color.gray, lineWidth: 1)
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
                            Image(systemName: isPasswordVisible ? "eye.slash" : "eye")
                                .frame(width: 24, height: 24)
                                .foregroundStyle(.gray)
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 16)
                    .padding(.horizontal, 16)
                    .foregroundStyle(.gray)
                    .cornerRadius(12)
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(.gray, lineWidth: 1)
                    )
                    
                    Button("Continue") {
                        Task { await signUp(email: email, password: password) }
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 16)
                    .background(.orange)
                    .foregroundStyle(.white)
                    .cornerRadius(12)
                    
                    HStack {
                        Rectangle()
                            .frame(height: 1)
                            .foregroundColor(.gray)
                            .cornerRadius(12)
                        
                        Text("OR")
                            .padding(.horizontal, 8)
                            .foregroundColor(.gray)
                        
                        Rectangle()
                            .frame(height: 1)
                            .foregroundColor(.gray)
                            .cornerRadius(12)
                    }
                    .padding(.horizontal)
                    
                    Button(action: {
                        print("Continue with Google")
                    }) {
                        HStack {
                            Image("GoogleIcon")
                            Text("Continue with Google")
                                .foregroundColor(.gray)
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 16)
                    .foregroundStyle(.gray)
                    .cornerRadius(12)
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(.gray, lineWidth: 1)
                    )
                    
                    Button(action: {
                        print("Continue with Apple")
                    }) {
                        HStack {
                            Image("Apple")
                            Text("Continue with Apple")
                                .foregroundColor(.gray)
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 16)
                    .foregroundStyle(.gray)
                    .cornerRadius(12)
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(.gray, lineWidth: 1)
                    )
                    
                    Button(action: {
                        print("Continue with GitHub")
                    }) {
                        HStack {
                            Image("GitHub")
                            Text("Continue with GitHub")
                                .foregroundColor(.gray)
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 16)
                    .foregroundStyle(.gray)
                    .cornerRadius(12)
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(.gray, lineWidth: 1)
                    )
                }
            }
            .padding()
        }
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
