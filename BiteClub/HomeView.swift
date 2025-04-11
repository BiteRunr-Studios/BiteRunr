//
//  HomeView.swift
//  BiteClub
//
//  Created by Ryan Somers on 4/10/25.
//

import SwiftUI
import Clerk

struct HomeView: View {
    @State var showProfileSheet: Bool = false
    @Environment(Clerk.self) private var clerk
    @State private var isPressed = false
    
    var body: some View {
            NavigationStack {
                Text("Welcome to BiteRunr!")
                    .navigationTitle("")
                    .navigationBarTitleDisplayMode(.inline)
                    .toolbar {
                        ToolbarItem(placement: .topBarLeading) {
                            Image("pageLogo")
                                .scaledToFill()
                                .frame(height: 32)
                        }
                        ToolbarItem(placement: .topBarTrailing) {
                            Button(action: {
                                showProfileSheet = true
                            }) {
                                Image("profileImage")
                            }
                        }
                    }
                    .sheet(isPresented: $showProfileSheet) {
                        NavigationView {
                            List {
                                HStack {
                                    Image("profileImage")
                                        .clipShape(Circle())
                                        .shadow(radius: 3)
                                        .overlay {
                                            Circle().stroke(.secondary, lineWidth: 3)
                                        }

                                    VStack(alignment: .leading) {
                                        Text("Maya Johnson")
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
    }
}

#Preview {
    HomeView()
        .environment(Clerk.shared)
}
