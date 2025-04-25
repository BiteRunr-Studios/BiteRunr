import SwiftUI

struct SignUpOrSignInView: View {
    @State private var isSignUp = false
    
    var body: some View {
            if isSignUp {
                SignUpView()
            } else {
                SignInView()
            }
        HStack {
            Text(isSignUp ? "Already have an account?" : "Don't have an account?")
                .foregroundColor(.secondary)
                Button {
                    isSignUp.toggle()
                } label: {
                    Text(isSignUp ? "Sign in": "Sign up")
                        .underline()
                        .foregroundColor(Color.orange)
                }
        }
    }
}
