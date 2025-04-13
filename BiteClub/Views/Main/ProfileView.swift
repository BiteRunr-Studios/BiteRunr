//
//  ProfileView.swift
//  BiteClub
//
//  Created by Ryan Somers on 4/12/25.
//

import SwiftUI
import Clerk

struct ProfileView: View {
    @State var showProfileSheet: Bool = false
    @Environment(Clerk.self) private var clerk
    @State private var isPressed = false
    var body: some View {
        NavigationView {
            List {
                HStack {
                    if let user = clerk.user, let url = URL(string: user.imageUrl) {
                        AsyncImage(url: url) { image in
                            image
                                .resizable()
                                .scaledToFill()
                                .clipShape(Circle())
                                .shadow(radius: 3)
                                .overlay {
                                    Circle().stroke(.secondary, lineWidth: 3)
                                }
                        } placeholder: {
                            ProgressView()
                        }
                        .frame(width: 40, height: 40)
                    }


                    VStack(alignment: .leading) {
                        Text("Maya Somebody")
                        Text("I am whoever this person is")
                            .font(.subheadline)
                            .foregroundStyle(.primary)
                    }
                }
                .padding(.vertical, 8)

                Button(action: {
                    withAnimation(.easeIn(duration: 0.1)) {
                        isPressed = true
                    }
                    Task {
                        try? await clerk.signOut()
                        withAnimation(.easeOut(duration: 0.1)) {
                            isPressed = false
                        }
                    }
                }) {
                    Text("Sign out")
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                        .background(Color.orange)
                        .foregroundColor(.white)
                        .cornerRadius(12)
                        .scaleEffect(isPressed ? 0.99 : 1.0)
                }
                .contentShape(Rectangle())
            }
            .navigationTitle("Account")
            .navigationBarTitleDisplayMode(.inline)
        }
    }
}

#Preview {
    ProfileView()
        .environment(Clerk.shared)
}
