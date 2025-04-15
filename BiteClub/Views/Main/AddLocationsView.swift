import SwiftUI
import Clerk

struct AddLocationsView: View {
    @State private var searchText = ""
    @State private var isToggledOn = false
    @State private var locations: [Location] = [] // Array to hold fetched locations
    @State private var errorMessage: String? // Optional error message
    @Environment(Clerk.self) private var clerk
    
    // Computed property to filter friends based on search text
    private var filteredLocations: [Location] {
        if searchText.isEmpty {
            return locations
        } else {
            return locations.filter { location in
                let locationName = "\(location.name)".lowercased()
                let locationAddress = location.address.lowercased()
                let searchQuery = searchText.lowercased()
                
                return locationName.contains(searchQuery) || locationAddress.contains(searchQuery)
            }
        }
    }
    
    var body: some View {
        // --- The Grabber Handle ---
        Capsule()
            .fill(Color.secondary.opacity(0.5))
            .frame(width: 120, height: 3)
            .padding(.vertical, 10)
        
        VStack(alignment: .leading, spacing: 20) {
            Text("Add Locations")
                .foregroundStyle(.secondary)
                .font(.title2)
            
            HStack(spacing: 12) {
                TextField("Search Locations", text: $searchText)
                    .autocapitalization(.none)
                    .disableAutocorrection(true)
                if !searchText.isEmpty {
                    Button(action: {
                        searchText = ""
                    }) {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundStyle(Color.secondary)
                    }
                    .transition(.scale)
                    .animation(.default, value: searchText)
                } else {
                    Image(systemName: "magnifyingglass")
                        .frame(width: 24, height: 24)
                        .foregroundStyle(Color.secondary.opacity(0.3))
                }
            }
            .padding(.vertical, 16)
            .padding(.horizontal, 16)
            .background(Color(UIColor.systemBackground))
            .cornerRadius(12)
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(Color.secondary.opacity(0.3), lineWidth: 1)
            )
            
            if let errorMessage = errorMessage {
                Text(errorMessage)
                    .foregroundColor(.red)
            } else if (filteredLocations.isEmpty && !searchText.isEmpty) {
                    VStack(spacing: 10) {
                        Image(systemName: "location.slash.circle.fill")
                            .font(.system(size: 40))
                            .foregroundColor(.secondary)
                            .padding(.top, 20)
                        
                        Text("No locations found matching '\(searchText)'")
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.top, 20)
                }
            else if (filteredLocations.isEmpty && locations.isEmpty) {
                VStack(spacing: 10) {
                    Image(systemName: "location.fill")
                        .font(.system(size: 40))
                        .foregroundColor(.secondary)
                        .padding(.top, 20)
                    
                    Text("No locations available")
                        .foregroundColor(.secondary)
                }
                .frame(maxWidth: .infinity)
                .padding(.top, 20)
            } else {
                ForEach(filteredLocations, id: \.id) { location in
                    HStack(spacing: 12) {
                        Image("locationIcon")
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                            .frame(width: 35, height: 35)
                        
                        
                        VStack(alignment: .leading) {
                            Text(location.name)
                                .foregroundStyle(.primary)
                            Text(location.address)
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
                }
            }
            
            Spacer()
        }
        .padding()
        .onAppear {
            Task {
                await fetchLocations()
            }
        }
    }
    
    private func fetchLocations() async {
        do {
            let url = "http://localhost:3000/locations"
            let response: [Location] = try await fetch(url: url, responseType: [Location].self, body: nil as String?)
            locations = response // Update the friends array with the fetched data
        } catch {
            errorMessage = "Failed to fetch locations: \(error.localizedDescription)"
        }
    }
}
//
//  AddLocationsView.swift
//  BiteClub
//
//  Created by Pierre Badra on 2025-04-14.
//

