//
//  SignInView.swift
//  BiteClub
//
//  Created by Claude White on 2025-04-05.
//

import SwiftUI
import Clerk

struct SignInView: View {
    @Environment(\.colorScheme) var colorScheme
    
    @State private var email = ""
    @State private var password = ""
    @State private var isPasswordVisible: Bool = false
    @State private var isPressed = false
    
    let screen = UIScreen.main.bounds
    
    var body: some View {
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

extension SignInView {
    
    func submit(email: String, password: String) async {
        do {
            try await SignIn.create(
                strategy: .identifier(email, password: password)
            )
        } catch {
            dump(error)
        }
    }
    
}
