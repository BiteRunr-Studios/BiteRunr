import Foundation
import SwiftUI
import Shared
import Supabase

struct SelectItems: View {
    @State private var orderLocations: [SelectItemsOrderLocationDTO] = []
    @State private var selectedLocation: SelectItemsOrderLocationDTO? = nil
    @State private var selectedLocationOrderUserItems: [SelectItemsOrderUserLocationItemDTO] = []
    @State private var selectedLocationSerachQueryItems: [SelectItemsItemDTO] = []
    
    @State private var searchValue: String = ""
    @State private var errorMessage: String?
    let currentUserId = supabase.auth.currentUser?.id.uuidString.lowercased()
    
    let order: AwaitingOrderDTO
    let orderUsers: [AwaitingOrderUserDTO]
    
    var onDismiss: (() -> Void)?
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        ZStack {
            VStack(alignment: .leading) {
                // Back button container
                HStack {
                    // Back button
                    Button(action: {
                        onDismiss?()
                        dismiss()
                    }) {
                        HStack(alignment: .center) {
                            Image(systemName: "arrow.backward")
                                .font(.headline).fontWeight(Font.Weight.regular)
                                .foregroundStyle(.orange)
                            Text("Back")
                                .font(.headline).fontWeight(Font.Weight.regular)
                                .foregroundStyle(.orange)
                        }
                    }
                }
                .padding(.horizontal)
                .padding(.top)
                
                // Page title and subtitle container
                VStack(alignment: .leading) {
                    // Page title
                    Text("Select Items")
                        .font(.title2)
                        .fontWeight(.semibold)
                        .foregroundColor(.secondary)
                    // Page subtitle
                    Text("Choose from \(orderLocations.count) locations")
                        .font(.body)
                        .foregroundStyle(.secondary)
                }
                .padding(.horizontal)
                .padding(.top)
                
                // Location pills and searchbar container
                VStack(spacing: 0) {
                    // Location pills
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack {
                            ForEach(orderLocations, id: \.orderLocationId) { orderLocation in
                                Button(action: {
                                    selectedLocation = orderLocation
                                    Task {
                                        await fetchOrderUserLocationItems()
                                    }
                                }) {
                                    Text("\(orderLocation.locationName)")
                                        .font(.subheadline)
                                        .fontWeight(.medium)
                                        .foregroundColor(selectedLocation?.orderLocationId == orderLocation.orderLocationId ? .white : .secondary)
                                        .padding(.horizontal, 16)
                                        .padding(.vertical, 8)
                                        .background(
                                            RoundedRectangle(cornerRadius: 20)
                                                .fill(selectedLocation?.orderLocationId == orderLocation.orderLocationId ? Color.orange : Color(UIColor.systemGray6))
                                        )
                                }
                                .buttonStyle(PlainButtonStyle())
                            }
                        }
                        .frame(maxHeight: .infinity, alignment: .top)
                        .padding(.horizontal)
                        .padding(.top, 1)
                    }
                    .frame(height: 60)
                    
                    // Searchbar
                    HStack {
                        TextField("Search items from \(selectedLocation?.locationName ?? "the selected location")", text: $searchValue)
                            .onChange(of: searchValue) {
                                Task {
                                    await fetchLocationItemsMatchingSearchQuery()
                                }
                            }
                        Spacer()
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
                    .padding(.horizontal)
                }
                
                
                
                ScrollView(.vertical) {
                    if selectedLocationOrderUserItems.isEmpty && searchValue.isEmpty {
                        // Nothing has been typed in the search bar and the user does not have items added from the selected location
                        VStack(alignment: .center, spacing: 10) {
                            ZStack {
                                Circle()
                                    .fill(Color(red: 0.957, green: 0.957, blue: 0.957)) // #F4F4F4
                                    .frame(width: 67, height: 67)
                                Image(systemName: "magnifyingglass")
                                    .resizable()
                                    .aspectRatio(contentMode: .fit)
                                    .frame(width: 35, height: 35)
                                    .foregroundColor(Color(red: 0.557, green: 0.557, blue: 0.557)) // #8E8E8E
                            }
                            .frame(width: 67, height: 67)
                            Text("No items selected")
                                .font(.title2)
                                .fontWeight(.semibold)
                                .foregroundColor(.secondary)
                            Text("Search for items or add new ones to get started")
                                .foregroundColor(.secondary)
                                .multilineTextAlignment(.center)
                        }
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                        .padding(.top, 20)
                        .padding(.horizontal)
                    } else if !searchValue.isEmpty && !selectedLocationSerachQueryItems.isEmpty {
                        // Results have been returned matching the search query
                        Text("Matching results")
                        
                    } else if !searchValue.isEmpty && selectedLocationSerachQueryItems.isEmpty {
                        // No result matches the search query
                        Text("No matching results")
                    }
                    else {
                        // User's selected items from the selected location
                        VStack(spacing: 12) { // Add spacing between items
                            
                            ForEach(selectedLocationOrderUserItems, id: \.id) { selectedLocationOrderUserItem in
                                OrderItemRow(selectedLocation: selectedLocation!, item: selectedLocationOrderUserItem)
                                    .background(
                                        RoundedRectangle(cornerRadius: 12)
                                            .fill(Color(.systemBackground))
                                            .overlay(
                                                RoundedRectangle(cornerRadius: 12)
                                                    .stroke(Color.secondary.opacity(0.3),
                                                            lineWidth: 1
                                                           )
                                            )
                                    )
                                    .swipeActions {
                                        // Edit
                                        Action(symbolImage: "square.and.pencil", tint: .white, background: .orange) { resetPosition in
                                            resetPosition.toggle()
                                        }
                                        
                                        // Delete
                                        Action(symbolImage: "trash", tint: .white, background: .red) { resetPosition in
                                            resetPosition.toggle()
                                        }
                                    }
                            }
                        }
                        .padding(.horizontal)
                        .padding(.top)
                    }
                }
                
                Rectangle()
                    .fill(Color.gray)
                    .frame(height: 1 / UIScreen.main.scale)
                    .edgesIgnoringSafeArea(.horizontal)
                
                VStack {
                    HStack {
                        Text("2 items selected")
                            .foregroundColor(.secondary)
                            .fontWeight(Font.Weight.medium)
                    }
                    .foregroundColor(.secondary)
                    VStack(spacing: 12) {
                        Button(action: {
                            withAnimation {
                                
                            }
                        }) {
                            HStack {
                                Image(systemName: "checkmark")
                                Text("I’m Done Ordering")
                            }
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 16)
                            .background(Color.green)
                            .foregroundColor(.white)
                            .cornerRadius(12)
                            .contentShape(Rectangle())
                        }
                    }
                }.padding(.horizontal)
            }
        }
        .navigationBarBackButtonHidden(true)
        .onAppear() {
            Task {
                await fetchOrderLocations()
            }
        }
    }
}

extension SelectItems {
    private func fetchOrderLocations() async {
        guard let apiUrl = Bundle.main.infoDictionary?["API_URL"] as? String else {
            errorMessage = "API_URL not set"
            return
        };
        
        do {
            let response = try await getOrderLocationsForItemSelection(baseUrl: apiUrl, orderId: order.id)
            
            if let locations = response.data as? [SelectItemsOrderLocationDTO] {
                orderLocations = locations
                selectedLocation = locations.first
                await fetchOrderUserLocationItems()
            } else {
                errorMessage = "Failed to decode order locations."
            }
        } catch {
            errorMessage = "Failed to fetch order locations"
        }
    }
    
    private func fetchOrderUserLocationItems() async {
        guard let apiUrl = Bundle.main.infoDictionary?["API_URL"] as? String else {
            errorMessage = "API_URL not set"
            return
        };
        
        guard let currentOrderUserId = orderUsers.first(where: { $0.userId == currentUserId })?.id else {
            errorMessage = "Current user not found in order participants"
            return
        };
        
        guard let selectedLocation = selectedLocation else {
            errorMessage = "No location selected"
            return
        };
        
        do {
            let response = try await getOrderUserLocationItems(baseUrl: apiUrl, orderUserId: currentOrderUserId, orderLocationId: selectedLocation.orderLocationId)
            
            if let items = response.data as? [SelectItemsOrderUserLocationItemDTO] {
                selectedLocationOrderUserItems = items
            } else {
                errorMessage = "Failed to decode order user location items."
            }
        } catch {
            errorMessage = "Failed to fetch order user location items"
        }
    }
    
    private func fetchLocationItemsMatchingSearchQuery() async {
        guard let apiUrl = Bundle.main.infoDictionary?["API_URL"] as? String else {
            errorMessage = "API_URL not set"
            return
        };
        
        do {
            let response = try await getLocationItems(baseUrl: apiUrl, locationId: selectedLocation!.locationId, searchQuery: searchValue)
            
            if let items = response.data as? [SelectItemsItemDTO] {
                selectedLocationSerachQueryItems = items
            } else {
                errorMessage = "Failed to decode order user location items."
            }
        } catch {
            errorMessage = "Failed to fetch items based on search query"
        }
    }
}
