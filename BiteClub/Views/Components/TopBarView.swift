//
//  TopBarView.swift
//  BiteClub
//
//  Created by Ryan Somers on 4/12/25.
//

import SwiftUI

struct TopBarView: View {
    @Binding var showProfileSheet: Bool
    
    var body: some View {
        HStack {
            Image("pageLogo")
                .resizable()
                .scaledToFit()
                .frame(height: 32)
            
            Spacer()
            
            Button(action: {
                showProfileSheet = true
            }) {
                Image("profileImage")
                    .resizable()
                    .scaledToFit()
                    .frame(width: 32, height: 32)
            }
        }
        .padding()
        .background(Color(.systemBackground))
    }
}
