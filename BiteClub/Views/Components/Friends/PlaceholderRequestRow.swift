//
//  PlaceholderRequestRow.swift
//  BiteClub
//
//  Created by Ryan Somers on 4/16/25.
//

import SwiftUI

struct PlaceholderRequestRow: View {
    let user: User
    let senderId: String
    let receiverId: String
    var onDelete: (() -> Void)?
    
    @State private var isDeleting = false
    @State private var errorMessage: String?
    
    var body: some View {
        ScrollView {
            HStack(spacing: 12) {
                if let imageUrlString = user.imageUrl, let imageUrl = URL(string: imageUrlString) {
                    AsyncImage(url: imageUrl) { phase in
                        switch phase {
                        case .empty:
                            ProgressView()
                                .frame(width: 50, height: 50)
                        case .success(let image):
                            image
                                .resizable()
                                .aspectRatio(contentMode: .fill)
                                .frame(width: 50, height: 50)
                                .clipShape(Circle())
                        case .failure:
                            Image(systemName: "person.circle.fill")
                                .resizable()
                                .aspectRatio(contentMode: .fill)
                                .frame(width: 50, height: 50)
                                .foregroundColor(.gray)
                        @unknown default:
                            Image(systemName: "person.circle.fill")
                                .resizable()
                                .aspectRatio(contentMode: .fill)
                                .frame(width: 50, height: 50)
                                .foregroundColor(.gray)
                        }
                    }
                } else {
                    Image(systemName: "person.circle.fill")
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                        .frame(width: 50, height: 50)
                        .foregroundColor(.gray)
                }
                
                
                VStack(alignment: .leading, spacing: 4) {
                    Text(user.firstName + " " + user.lastName)
                        .fontWeight(.medium)
                    
                    Text(user.email)
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                
                Spacer()
                
                HStack(spacing: 12) {
                    Button(action: {
                        Task { await deleteFriendRequest() }
                    }) {
                        Circle()
                            .fill(Color.red.opacity(0.3))
                            .frame(width: 36, height: 36)
                            .overlay(
                                Image(systemName: "xmark")
                                    .foregroundColor(.black)
                            )
                    }
                    .disabled(isDeleting)
                    
                    Button(action: {
                        print("Friend Added.")
                    }) {
                        Circle()
                            .fill(Color.green.opacity(0.3))
                            .frame(width: 36, height: 36)
                            .overlay(
                                Image(systemName: "checkmark")
                                    .foregroundColor(.black)
                            )
                    }
                    
                }
            }
            .padding(.vertical, 8)
            .alert("Error", isPresented: .init(get: { errorMessage != nil }, set: { if !$0 { errorMessage = nil } })) {
                Button("OK") { errorMessage = nil }
            } message: {
                if let error = errorMessage {
                    Text(error)
                }
            }
        }
    }
}

extension PlaceholderRequestRow {
    private func deleteFriendRequest() async {
        isDeleting = true
        errorMessage = nil
        do {
            let apiUrl = ProcessInfo.processInfo.environment["API_URL"]!
            let url = "\(apiUrl)/friend-requests?sender_id=\(senderId)&receiver_id=\(receiverId)"
            let _: EmptyResponseDeleted = try await fetch(
                url: url,
                method: "DELETE",
                responseType: EmptyResponseDeleted.self,
                body: nil as String?
            )
            DispatchQueue.main.async {
                onDelete?()
            }
        } catch {
            DispatchQueue.main.async {
                errorMessage = "Failed to reject request: \(error.localizedDescription)"
            }
        }
        isDeleting = false
    }
    
    private func acceptFriendRequest() async {
        
    }
}

struct EmptyResponseDeleted: Decodable {}
