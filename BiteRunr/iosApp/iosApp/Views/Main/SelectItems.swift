import Foundation
import SwiftUI
import Shared
import Supabase

struct SelectItems: View {
    @State private var orderLocations: [SelectItemsOrderLocationDTO] = []
    @State private var selectedLocation: SelectItemsOrderLocationDTO? = nil
    @State private var selectedLocationOrderUserItems: [SelectItemsOrderUserLocationItemDTO] = []
    @State private var selectedLocationSearchQueryItems: [SelectItemsItemDTO] = []
    @State private var selectedItem: SelectItemsItemDTO?
    
    @State private var searchValue: String = ""
    @State private var errorMessage: String?
    @State private var isLoading: Bool = false
    @State private var searchTask: Task<Void, Never>? = nil
    @State private var showAddItemSheet = false
    
    var currentOrderUserId: String? {
        let currentUserId = supabase.auth.currentUser?.id.uuidString.lowercased()
        return orderUsers.first(where: { $0.userId == currentUserId })?.id
    }
    
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
                        isLoading = true
                        onDismiss?()
                        dismiss()
                    }) {
                        HStack(alignment: .center) {
                            Image(systemName: "arrow.backward")
                                .font(.headline).fontWeight(.regular)
                                .foregroundStyle(.orange)
                            Text("Back")
                                .font(.headline).fontWeight(.regular)
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
                                    Task {
                                        await selectLocation(orderLocation)
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
                                .disabled(isLoading)
                            }
                        }
                        .frame(maxHeight: .infinity, alignment: .top)
                        .padding(.horizontal)
                        .padding(.top, 1)
                    }
                    .frame(height: 60)
                    
                    // Searchbar
                    HStack {
                        Image(systemName: "magnifyingglass")
                            .frame(width: 24, height: 24)
                            .foregroundStyle(Color.secondary.opacity(0.3))
                        TextField("Search items from \(selectedLocation?.locationName ?? "the selected location")", text: $searchValue)
                            .onChange(of: searchValue) {
                                handleSearchChange()
                            }
                        Spacer()
                        if !searchValue.isEmpty {
                            Button(action: {
                                clearSearch()
                            }) {
                                Image(systemName: "xmark.circle.fill")
                                    .foregroundStyle(Color.secondary.opacity(0.3))
                            }
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
                    .padding(.horizontal)
                }
                
                ScrollView(.vertical) {
                    VStack(spacing: 12) {
                        if isLoading {
                            // Loading skeleton view
                            ForEach(0..<3, id: \.self) { _ in
                                SkeletonLoadingRow()
                                    .background(
                                        RoundedRectangle(cornerRadius: 12)
                                            .fill(Color(.systemBackground))
                                            .overlay(
                                                RoundedRectangle(cornerRadius: 12)
                                                    .stroke(Color.secondary.opacity(0.3), lineWidth: 1)
                                            )
                                    )
                                    .transition(.opacity)
                            }
                        } else if selectedLocationOrderUserItems.isEmpty && searchValue.isEmpty {
                            // Empty state - no items and no search
                            emptyStateView()
                        } else if !searchValue.isEmpty && !selectedLocationSearchQueryItems.isEmpty {
                            // Search results found
                            ForEach(selectedLocationSearchQueryItems, id: \.id) { searchItem in
                                Button(action: {
                                    selectedItem = searchItem
                                    showAddItemSheet = true
                                }) {
                                    if let selectedLocation = selectedLocation {
                                        OrderItemRow(selectedLocation: selectedLocation, item: nil, searchItem: searchItem)
                                            .background(itemRowBackground())
                                    }
                                }
                                .transition(.opacity)
                            }
                        } else if !searchValue.isEmpty && selectedLocationSearchQueryItems.isEmpty {
                            // No search results found
                            noResultsView()
                        } else {
                            // Show user's selected items
                            ForEach(selectedLocationOrderUserItems, id: \.id) { orderUserItem in
                                if let selectedLocation = selectedLocation {
                                    OrderItemRow(selectedLocation: selectedLocation, item: orderUserItem, searchItem: nil)
                                        .background(itemRowBackground())
                                        .swipeActions {
                                            // Edit
                                            Action(symbolImage: "square.and.pencil", tint: .white, background: .orange) { resetPosition in
                                                resetPosition.toggle()
                                                selectedItem = orderUserItem.item
                                                showAddItemSheet = true
                                            }
                                            
                                            // Delete
                                            Action(symbolImage: "trash", tint: .white, background: .red) { resetPosition in
                                                resetPosition.toggle()
                                                // TODO: Implement delete functionality
                                            }
                                        }
                                        .animation(.easeInOut(duration: 0.2), value: orderUserItem)
                                        .transition(.opacity)
                                }
                            }
                        }
                    }
                    .padding(.horizontal)
                    .padding(.top)
                    .animation(.easeInOut(duration: 0.3), value: isLoading)
                    .animation(.easeInOut(duration: 0.3), value: selectedLocationOrderUserItems)
                    .animation(.easeInOut(duration: 0.3), value: selectedLocationSearchQueryItems)
                }
                
                Rectangle()
                    .fill(Color.gray)
                    .frame(height: 1 / UIScreen.main.scale)
                    .edgesIgnoringSafeArea(.horizontal)
                
                // Bottom section
                VStack {
                    HStack {
                        Text("2 items selected")
                            .foregroundColor(.secondary)
                            .fontWeight(.medium)
                    }
                    VStack(spacing: 12) {
                        Button(action: {
                            // TODO: Implement done ordering functionality
                        }) {
                            HStack {
                                Image(systemName: "checkmark")
                                Text("I'm Done Ordering")
                            }
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 16)
                            .background(Color.green)
                            .foregroundColor(.white)
                            .cornerRadius(12)
                            .contentShape(Rectangle())
                        }
                    }
                }
                .padding(.horizontal)
            }
        }
        .navigationBarBackButtonHidden(true)
        .onAppear {
            Task {
                isLoading = true
                await fetchOrderLocations()
            }
        }
        .onDisappear {
            searchTask?.cancel()
        }
        .sheet(isPresented: $showAddItemSheet) {
            AddItemSheet(
                orderLocation: $selectedLocation,
                orderItem: $selectedItem,
                quantity: 1,
                orderUserId: currentOrderUserId!
            )
            .presentationDetents([.medium])
        }
    }
    
    // MARK: - Helper Views
    
    @ViewBuilder
    private func emptyStateView() -> some View {
        VStack(alignment: .center, spacing: 10) {
            ZStack {
                Circle()
                    .fill(Color(UIColor.systemGray6))
                    .frame(width: 67, height: 67)
                Image(systemName: "magnifyingglass")
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .frame(width: 25, height: 25)
                    .foregroundColor(.secondary)
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
        .transition(.opacity)
    }
    
    @ViewBuilder
    private func noResultsView() -> some View {
        VStack(alignment: .center, spacing: 10) {
            ZStack {
                Circle()
                    .fill(Color(UIColor.systemGray6))
                    .frame(width: 67, height: 67)
                Image(systemName: "magnifyingglass")
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .frame(width: 25, height: 25)
                    .foregroundColor(.secondary)
            }
            .frame(width: 67, height: 67)
            Text("No items found")
                .font(.title2)
                .fontWeight(.semibold)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(.top, 20)
        .padding(.horizontal)
        .transition(.opacity)
        
        Button(action: {
            createNewItem()
        }) {
            HStack {
                Image(systemName: "plus.circle")
                Text("Tap here to add as a new item")
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .foregroundColor(.secondary)
            .cornerRadius(12)
            .contentShape(Rectangle())
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(style: StrokeStyle(lineWidth: 1, dash: [7]))
                    .foregroundColor(Color.secondary.opacity(0.3))
            )
        }
    }
    
    @ViewBuilder
    private func itemRowBackground() -> some View {
        RoundedRectangle(cornerRadius: 12)
            .fill(Color(.systemBackground))
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(Color.secondary.opacity(0.3), lineWidth: 1)
            )
    }
}

// MARK: - Business Logic Methods

extension SelectItems {
    private func selectLocation(_ orderLocation: SelectItemsOrderLocationDTO) async {
        await MainActor.run {
            isLoading = true
            selectedLocation = orderLocation
            selectedLocationOrderUserItems = []
            selectedLocationSearchQueryItems = []
        }
        
        if !searchValue.isEmpty {
            await fetchLocationItemsMatchingSearchQuery()
        } else {
            await fetchOrderUserLocationItems()
        }
    }
    
    private func handleSearchChange() {
        isLoading = true
        searchTask?.cancel()
        let trimmedValue = searchValue.trimmingCharacters(in: .whitespacesAndNewlines)
        
        if !trimmedValue.isEmpty {
            searchTask = Task {
                try? await Task.sleep(nanoseconds: 500_000_000)
                
                guard !Task.isCancelled else { return }
                
                await fetchLocationItemsMatchingSearchQuery()
            }
        } else {
            selectedLocationSearchQueryItems = []
            Task {
                await fetchOrderUserLocationItems()
            }
        }
    }
    
    private func clearSearch() {
        searchTask?.cancel()
        searchValue = ""
        selectedLocationSearchQueryItems = []
        Task {
            await fetchOrderUserLocationItems()
        }
    }
    
    private func createNewItem() {
        guard let selectedLocation = selectedLocation else { return }
        
        // Create a new item with proper timestamp handling
        let newItem = SelectItemsItemDTO(
            id: UUID().uuidString,
            name: searchValue,
            locationId: selectedLocation.locationId,
            createdAt: nil,
            updatedAt: nil
        )
        
        selectedItem = newItem
        showAddItemSheet = true
    }
}

// MARK: - API Methods

extension SelectItems {
    private func fetchOrderLocations() async {
        guard let apiUrl = Bundle.main.infoDictionary?["API_URL"] as? String else {
            await MainActor.run {
                errorMessage = "API_URL not set"
                isLoading = false
            }
            return
        }
        
        do {
            let response = try await getOrderLocationsForItemSelection(baseUrl: apiUrl, orderId: order.id)
            
            if let locations = response.data as? [SelectItemsOrderLocationDTO] {
                await MainActor.run {
                    orderLocations = locations
                    selectedLocation = locations.first
                    isLoading = false
                }
                await fetchOrderUserLocationItems()
            } else {
                await MainActor.run {
                    errorMessage = "Failed to decode order locations."
                    isLoading = false
                }
            }
        } catch {
            await MainActor.run {
                errorMessage = "Failed to fetch order locations"
                isLoading = false
            }
        }
    }
    
    private func fetchOrderUserLocationItems() async {
        guard let apiUrl = Bundle.main.infoDictionary?["API_URL"] as? String else {
            await MainActor.run {
                errorMessage = "API_URL not set"
                isLoading = false
            }
            return
        }
        
        guard let currentOrderUserId = currentOrderUserId else {
            await MainActor.run {
                errorMessage = "Current user not found in order participants"
                isLoading = false
            }
            return
        }
        
        guard let selectedLocation = selectedLocation else {
            await MainActor.run {
                errorMessage = "No location selected"
                isLoading = false
            }
            return
        }
        
        do {
            let response = try await getOrderUserLocationItems(
                baseUrl: apiUrl,
                orderUserId: currentOrderUserId,
                orderLocationId: selectedLocation.orderLocationId
            )
            
            if let items = response.data as? [SelectItemsOrderUserLocationItemDTO] {
                await MainActor.run {
                    selectedLocationOrderUserItems = items
                    isLoading = false
                }
            } else {
                await MainActor.run {
                    errorMessage = "Failed to decode order user location items."
                    isLoading = false
                }
            }
        } catch {
            await MainActor.run {
                errorMessage = "Failed to fetch order user location items"
                isLoading = false
            }
        }
    }
    
    private func fetchLocationItemsMatchingSearchQuery() async {
        guard let apiUrl = Bundle.main.infoDictionary?["API_URL"] as? String else {
            await MainActor.run {
                errorMessage = "API_URL not set"
                isLoading = false
            }
            return
        }
        
        guard let selectedLocation = selectedLocation else {
            await MainActor.run {
                errorMessage = "No location selected"
                isLoading = false
            }
            return
        }
        
        do {
            let response = try await getLocationItems(
                baseUrl: apiUrl,
                locationId: selectedLocation.locationId,
                searchQuery: searchValue
            )
            
            if let items = response.data as? [SelectItemsItemDTO] {
                await MainActor.run {
                    selectedLocationSearchQueryItems = items
                    isLoading = false
                }
            } else {
                await MainActor.run {
                    errorMessage = "Failed to decode search results."
                    isLoading = false
                }
            }
        } catch {
            await MainActor.run {
                errorMessage = "Failed to fetch items based on search query"
                isLoading = false
            }
        }
    }
}

// MARK: - Skeleton Loading View

struct SkeletonLoadingRow: View {
    @State private var isAnimating = false
    
    var body: some View {
        HStack {
            Circle()
                .fill(Color.gray.opacity(isAnimating ? 0.2 : 0.4))
                .frame(width: 40, height: 40)
            
            VStack(alignment: .leading) {
                RoundedRectangle(cornerRadius: 4)
                    .fill(Color.gray.opacity(isAnimating ? 0.2 : 0.4))
                    .frame(width: 120, height: 16)
                RoundedRectangle(cornerRadius: 4)
                    .fill(Color.gray.opacity(isAnimating ? 0.2 : 0.4))
                    .frame(width: 80, height: 16)
            }
            
            Spacer()
        }
        .onAppear {
            withAnimation(
                .easeInOut(duration: 1.2)
                .repeatForever(autoreverses: true)
            ) {
                isAnimating = true
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
    }
}
