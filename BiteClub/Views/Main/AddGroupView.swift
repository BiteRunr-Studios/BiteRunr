//
//  AddGroupView.swift
//  BiteClub
//
//  Created by Ryan Somers on 4/10/25.
//

import SwiftUI
import Clerk

struct AddGroupView: View {
    // Sheets
    @State var showProfileSheet: Bool = false
    @State var showAddFriendSheet: Bool = false
    @State var showAddLocationSheet: Bool = false
    
    @State private var selectedFriendsDisplay: String = ""
    @State private var selectedLocationsDisplay: String = ""
    @State private var isPressed = false
    
    // Fields
    @State private var name: String = ""
    @State private var selectedFriends: String = "Select friends:"
    @State private var selectedLocations: String = "Select locations:"
    @State private var comments: String = ""
    
    @Environment(Clerk.self) private var clerk
    
    var body: some View {
        ScrollView {
            VStack(alignment: .leading,spacing: 12) {
                Text("Create Order Group")
                    .foregroundStyle(.secondary)
                    .font(.title2)
                HStack(spacing: 12) {
                    TextField("Name", text: $name)
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
                
                HStack(spacing: 12) {
                    Text(selectedLocationsDisplay.isEmpty ? "Select Locations" : selectedLocationsDisplay)
                        .foregroundStyle(selectedLocationsDisplay.isEmpty ? .secondary : .primary)
                        .lineLimit(1)
                    
                    Spacer()
                    
                    Image(systemName: "map.fill")
                        .frame(width: 24, height: 24)
                        .foregroundStyle(Color.secondary.opacity(0.3))
                }
                .contentShape(Rectangle())
                .onTapGesture {
                    showAddLocationSheet = true
                }
                .sheet(isPresented: $showAddLocationSheet) {
                    AddLocationsView()
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
                    Text(selectedFriendsDisplay.isEmpty ? "Select Friends" : selectedFriendsDisplay)
                        .foregroundStyle(selectedFriendsDisplay.isEmpty ? .secondary : .primary)
                        .lineLimit(1)
                    
                    Spacer()
                    
                    Image(systemName: "person.2.fill")
                        .frame(width: 24, height: 24)
                        .foregroundStyle(Color.secondary.opacity(0.3))
                }
                .contentShape(Rectangle())
                .onTapGesture {
                    showAddFriendSheet = true
                }
                .sheet(isPresented: $showAddFriendSheet) {
                    AddFriendView()
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
                    TextField("Comments", text: $comments, axis: .vertical)
                    Image(systemName: "bubble.fill")
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
                
                Button(action: {
                    withAnimation(.easeIn(duration: 0.1)) {
                        isPressed = true
                    }
                    Task {
                        print("Created food order")
                    }
                }) {
                    HStack {
                        Image(systemName: "plus.circle")
                        Text("Create Order Group")
                    }
                    .frame(maxWidth: .infinity)
                }
                .padding(.vertical, 16)
                .background(Color.orange)
                .foregroundColor(.white)
                .cornerRadius(12)
                .scaleEffect(isPressed ? 0.995 : 1.0)
                .contentShape(Rectangle())
            }
            .padding()
        }
        
    }
}

#Preview {
    AddGroupView()
        .environment(Clerk.shared)
}

