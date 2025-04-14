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
    
    @State private var firstName = ""
    @State private var lastName = ""
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 16) {
                    // Profile Header
                    HStack {
                        if let user = clerk.user, let url = URL(string: user.imageUrl) {
                            AsyncImage(url: url) { image in
                                image
                                    .resizable()
                                    .scaledToFill()
                                    .clipShape(Circle())
                                    .shadow(radius: 3)
                                    .overlay {
                                        Circle().stroke(.secondary, lineWidth: 2)
                                    }
                            } placeholder: {
                                ProgressView()
                            }
                            .frame(width: 40, height: 40)
                            
                            VStack(alignment: .leading) {
                                if let firstName = user.firstName, !firstName.isEmpty,
                                   let lastName = user.lastName, !lastName.isEmpty {
                                    Text("\(firstName) \(lastName)")
                                } else {
                                    Text("User")
                                }
                                
                                Text(user.primaryEmailAddress?.emailAddress ?? "No Email")
                                    .font(.subheadline)
                                    .foregroundStyle(.primary)
                            }
                        }
                    }
                    .padding(.vertical, 8)
                    
                    Divider() // Custom divider
                    
                    // Editable Fields
                    if let user = clerk.user {
                        VStack(spacing: 12) {
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
                            .onAppear {
                                firstName = user.firstName ?? ""
                            }
                            
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
                            .onAppear {
                                lastName = user.lastName ?? ""
                            }
                            
                            Button(action: {
                                withAnimation(.easeIn(duration: 0.1)) {
                                    isPressed = true
                                }
                                Task {
                                    try await user.update(.init(firstName: firstName, lastName: lastName))
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
                    
                    Divider() // Custom divider
                    
                    // Sign Out Button
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
                            .background(Color.red.opacity(0.1))
                            .foregroundColor(.red)
                            .cornerRadius(12)
                            .scaleEffect(isPressed ? 0.99 : 1.0)
                    }
                    .contentShape(Rectangle())
                }
                .padding()
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
