//
//  RequestsPlaceholderView.swift
//  BiteClub
//
//  Created by Ryan Somers on 4/16/25.
//

import SwiftUI

struct RequestsPlaceholderView: View {
    var body: some View {
        VStack(spacing: 20) {
            Spacer()
            
            Image(systemName: "clock.badge")
                .font(.system(size: 60))
                .foregroundColor(.secondary)
            
            Text("Coming Soon")
                .font(.title2)
                .fontWeight(.semibold)
            
            Text("Friend requests feature is under development.\nCheck back later!")
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal)
            
            VStack(spacing: 16) {
                PlaceholderRequestRow(name: "Jane Smith", email: "jane@example.com")
                PlaceholderRequestRow(name: "John Doe", email: "john@example.com")
            }
            .padding()
            .background(Color(.systemGray6))
            .cornerRadius(12)
            .padding(.horizontal)
            .padding(.top, 20)
            
            Spacer()
        }
    }
}
