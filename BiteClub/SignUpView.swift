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
    
    var body: some View {
        VStack {
            Text("Sign Up")
            if isVerifying {
                TextField("Code", text: $code)
                Button("Verify") {
                    Task { await verify(code: code) }
                }
            } else {
                TextField("Email", text: $email)
                SecureField("Password", text: $password)
                Button("Continue") {
                    Task { await signUp(email: email, password: password) }
                }
            }
        }
        .padding()
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
