//
//  TopBarView.swift
//  BiteClub
//
//  Created by Ryan Somers on 4/12/25.
//

import SwiftUI
import Clerk

struct TopBarView: View {
    @Binding var showProfileSheet: Bool
    @Environment(Clerk.self) private var clerk
    
    var body: some View {
        HStack {
            Image("pageLogo")
                .resizable()
                .scaledToFit()
                .frame(height: 52)
            
            Spacer()
            
            Button(action: {
                showProfileSheet = true
            }) {
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
            }
        }
        .padding()
        .background(Color(.systemBackground))
    }
}
