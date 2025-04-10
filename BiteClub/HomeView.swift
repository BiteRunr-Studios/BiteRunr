//
//  HomeView.swift
//  BiteClub
//
//  Created by Ryan Somers on 4/10/25.
//

import SwiftUI

struct HomeView: View {
    @State var showProfileSheet: Bool = false
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
                        Text("Profile Sheet")
                            .font(.title)
                            .padding()
                    }
            }
    }
}

#Preview {
    HomeView()
}
