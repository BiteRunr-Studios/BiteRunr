//
//  AddFriendView.swift
//  BiteClub
//
//  Created by Ryan Somers on 4/14/25.
//

import SwiftUI

struct AddFriendView: View {
    @State private var searchText = ""
    @State private var isToggledOn = false
    var body: some View {
        // --- The Grabber Handle ---
        Capsule()
            .fill(Color.secondary.opacity(0.5))
            .frame(width: 120, height: 3)
            .padding(.vertical, 10)
        VStack(alignment: .leading, spacing: 20) {
            Text("Add Friends")
                .foregroundStyle(.secondary)
                .font(.title2)
            HStack(spacing: 12) {
                TextField("Search Friends", text: $searchText)
                Image(systemName: "magnifyingglass")
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
                Image("profileImage")
                VStack (alignment: .leading) {
                    Text("Username")
                        .foregroundStyle(.primary)
                    Text("Email")
                        .foregroundStyle(.secondary)
                }
                Spacer()
                
                Button {
                    isToggledOn.toggle()
                } label: {
                    Text("")
                        .frame(width: 44, height: 24)
                        .background(isToggledOn ? Color.orange : Color.gray.opacity(0.3))
                        .foregroundColor(.white)
                        .cornerRadius(6)
                }
                .buttonStyle(.plain)
                .padding(.horizontal)
                .animation(.easeInOut(duration: 0.2), value: isToggledOn)
            }
            
            Spacer()
            
            
            
            
        }
        .padding()
    }
}

#Preview {
    AddFriendView()
}
