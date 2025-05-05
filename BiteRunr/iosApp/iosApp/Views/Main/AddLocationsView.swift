import SwiftUI
import Shared

struct AddLocationsView: View {
    @State private var searchText = ""
    @State private var isToggledOn = false
    
    @State private var locations: [Location] = [] // Array to hold fetched locations
    @State private var saveLocationsButton: Bool = false
    @Binding var orderLocationDTOS: [OrderLocationDTO]
    @Binding var isPresented: Bool
    
    @State private var errorMessage: String? // Optional error message
    
    var body: some View {
        VStack {
            Capsule()
                .fill(Color.secondary.opacity(0.5))
                .frame(width: 120, height: 3)
                .padding(.vertical, 10)
            
            VStack(alignment: .leading, spacing: 20) {
                Text("Add Locations")
                    .foregroundStyle(.secondary)
                    .font(.title2)
                    .padding(.horizontal)
                    .padding(.top, 15)
                
                HStack(spacing: 12) {
                    TextField("Search Locations", text: $searchText)
                        .autocapitalization(.none)
                        .disableAutocorrection(true)
                        .frame(height: 50)
                        .padding(.horizontal, 16)
                        .frame(height: 55)
                    
                    if !searchText.isEmpty {
                        Button(action: {
                            withAnimation {
                                searchText = ""
                            }
                        }) {
                            Image(systemName: "xmark.circle.fill")
                                .foregroundStyle(Color.secondary)
                        }
                        .transition(.scale)
                        .animation(.default, value: searchText)
                        .padding(.horizontal)
                    } else {
                        Image(systemName: "magnifyingglass")
                            .frame(width: 24, height: 24)
                            .foregroundStyle(Color.secondary.opacity(0.3))
                            .padding(.horizontal)
                    }
                }
                .background(Color(UIColor.systemBackground))
                .cornerRadius(12)
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(Color.secondary.opacity(0.3), lineWidth: 1)
                )
                .padding(.horizontal, 16)
                
                if let errorMessage = errorMessage {
                    Text(errorMessage)
                        .foregroundColor(.red)
                }
                else if (filteredLocations.isEmpty && !searchText.isEmpty) {
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
                    ZStack {
                        ScrollView {
                            ForEach(filteredLocations, id: \.id) { location in
                                Button(action: {
                                    toggleLocation(location)
                                }) {
                                    LocationSelectRow(
                                        location: location,
                                        isSelected: orderLocationDTOS.contains(where: { $0.orderLocationId == location.id }),
                                    )
                                }
                                .buttonStyle(.plain)
                                .padding(.horizontal)
                                .padding(.vertical, 8)
                            }
                            HStack {
                            }.padding(.bottom, 60)
                        }
                        
                        if saveLocationsButton {
                            VStack {
                                Spacer()
                                Button(action: {
                                    Task {
                                        isPresented = false
                                    }
                                }) {
                                    HStack {
                                        Image(systemName: "checkmark.circle")
                                        Text("Set Locations")
                                    }
                                    .frame(maxWidth: .infinity)
                                    .padding(.vertical, 16)
                                }
                                .background(Color.orange)
                                .foregroundColor(.white)
                                .cornerRadius(12)
                                .contentShape(Rectangle())
                            }
                            .transition(.opacity) // Transition animation
                            .padding(.horizontal, 16)
                        }
                    }
                    .animation(.easeInOut(duration: 0.2), value: saveLocationsButton) // Apply animation to ZStack
                    Spacer()
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
            .onAppear {
                Task {
                    await fetchLocations()
                    withAnimation {
                        saveLocationsButton = orderLocationDTOS.count > 0
                    }
                }
            }
        }
        .ignoresSafeArea(.container, edges: .bottom)
    }
}

extension AddLocationsView {
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
    
    private func fetchLocations() async {
        do {
            guard let apiUrl = ProcessInfo.processInfo.environment["API_URL"] else {
                errorMessage = "API_URL not set"
                return
            }
            let url = "\(apiUrl)/locations"
            let response = try await getLocations(url: url)
            if response.success {
                locations = response.data as! [Location]
            }
        } catch {
            errorMessage = "Failed to fetch locations: \(error.localizedDescription)"
        }
    }
    
    
    private func toggleLocation(_ location: Location) {
        if let index = orderLocationDTOS.firstIndex(where: { $0.orderLocationId == location.id }) {
            orderLocationDTOS.remove(at: index)
        } else {
            let dto = OrderLocationDTO(orderLocationId: location.id, orderId: nil)
            orderLocationDTOS.append(dto)
        }
        withAnimation {
            saveLocationsButton = orderLocationDTOS.count > 0
        }
    }
}
