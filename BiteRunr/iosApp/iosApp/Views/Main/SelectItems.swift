import Foundation
import SwiftUI
import Shared
import Supabase

struct SelectItems: View {
    @State private var orderLocations: [SelectItemsOrderLocationDTO] = []
    @State private var selectedLocation: SelectItemsOrderLocationDTO? = nil
    @State private var selectedLocationOrderUserItems: [SelectItemsOrderUserLocationItemDTO] = []
    @State private var selectedLocationSearchQueryItems: [SelectItemsItemDTO] = []
    @State private var editingItem: (item: SelectItemsItemDTO, orderItemId: String, quantity: Int, comments: String?)? = nil
    @State private var isExistingItem: Bool = false
    
    enum ActionType: String {
        case create = "Create"
        case edit = "Edit"
    }

    @State private var currentActionType: ActionType = .create
    
    @State private var searchValue: String = ""
    @State private var errorMessage: String?
    @State private var isLoading: Bool = false
    @State private var searchTask: Task<Void, Never>? = nil
    @State private var showAddItemSheet = false
    
    
    private var currentUserId: String? {
        supabase.auth.currentUser?.id.uuidString.lowercased()
    }
    
    private var currentOrderUser: AwaitingOrderUserDTO? {
        guard let userId = currentUserId else { return nil }
        return orderUsers.first { $0.userId == userId }
    }
    
    var currentOrderUserId: String? {
        currentOrderUser?.id
    }
    
    let order: AwaitingOrderDTO
    let orderUsers: [AwaitingOrderUserDTO]
    
    var onDismiss: (() -> Void)?
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        ZStack {
            VStack(alignment: .leading) {
                // Back button container
                backButtonView
                
                // Page title and subtitle container
                titleView
                
                // Location pills and searchbar container
                VStack(spacing: 0) {
                    // Location pills
                    locationPillsView
                    
                    // Searchbar
                    searchbarView
                }
                
                contentScrollView
                
                bottomSectionView
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
            if let currentOrderUserId = currentOrderUserId,
               let editingItem = editingItem {
                AddItemSheet(
                    orderLocation: selectedLocation,
                    orderItem: editingItem.item,
                    quantity: editingItem.quantity,
                    comments: editingItem.comments ?? "",
                    orderItemId: editingItem.orderItemId,
                    orderUserId: currentOrderUserId,
                    actionType: currentActionType.rawValue,
                    orderId: order.id,
                    orderLocationId: selectedLocation!.orderLocationId,
                    itemId: editingItem.item.id,
                    isExistingItem: isExistingItem
                )
                .presentationDetents([.medium])
            }
        }
    }
    
    // MARK: - Handle Edit Action
    private func handleEditAction(for orderUserItem: SelectItemsOrderUserLocationItemDTO) {
        // Set the editing item with both the item and its current quantity
        editingItem = (item: orderUserItem.item, orderItemId: orderUserItem.id, quantity: Int(orderUserItem.quantity), comments: orderUserItem.comments) as? (item: SelectItemsItemDTO, orderItemId: String, quantity: Int, comments: String?)
        currentActionType = ActionType.edit
        isExistingItem = true
        showAddItemSheet = true
    }
    
    // MARK: - Handle Delete Action
    private func handleDeleteAction(for orderUserItem: SelectItemsOrderUserLocationItemDTO) async {
        guard let apiUrl = Bundle.main.infoDictionary?["API_URL"] as? String else {
            errorMessage = "API_URL not set"
            isLoading = false
            return
        }
        
        do {
            let response = try await deleteItemReferenceToUserOrder(baseUrl: apiUrl, orderItemId: orderUserItem.id)
        
            if response.success {
                selectedLocationOrderUserItems.removeAll { $0.id == orderUserItem.id }
            }
        } catch {
           print("")
        }
    }
    
    // MARK: - Back Button View
    @ViewBuilder
    private var backButtonView: some View {
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
    }
    
    // MARK: - Title View
    @ViewBuilder
    private var titleView: some View {
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
    }
    
    // MARK: - Location Pills View
    @ViewBuilder
    private var locationPillsView: some View {
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
    }
    
    // MARK: - Searchbar View
    @ViewBuilder
    private var searchbarView: some View {
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
    
    // MARK: - ContentScrollView
    @ViewBuilder
    private var contentScrollView: some View {
        ScrollView(.vertical) {
            VStack(spacing: 12) {
                if isLoading {
                    // Loading skeleton view
                    loadingView
                } else if selectedLocationOrderUserItems.isEmpty && searchValue.isEmpty {
                    emptyStateView
                } else if !searchValue.isEmpty && !selectedLocationSearchQueryItems.isEmpty {
                    // Search results found
                    searchResultsView
                } else if !searchValue.isEmpty && selectedLocationSearchQueryItems.isEmpty {
                    // No search results found
                    noResultsView
                } else {
                    // Show user's selected items
                    userItemsView
                }
            }
            .padding(.horizontal)
            .padding(.top)
            // Apply a single animation for all state changes
            .animation(.easeInOut(duration: 0.3), value: isLoading)
            .animation(.easeInOut(duration: 0.3), value: selectedLocationOrderUserItems)
            .animation(.easeInOut(duration: 0.3), value: selectedLocationSearchQueryItems)
        }
    }
    
    // MARK: - Loading View
    @ViewBuilder
    private var loadingView: some View {
        ForEach(0..<3, id: \.self) { _ in
            SkeletonLoadingRow()
                .background(itemRowBackground)
                .transition(.opacity)
        }
    }
    
    // MARK: - Search Results View
    @ViewBuilder
    private var searchResultsView: some View {
        ForEach(selectedLocationSearchQueryItems, id: \.id) { searchItem in
            Button(action: {
                createNewItem(searchQueryItem: searchItem)
            }) {
                if let selectedLocation = selectedLocation {
                    OrderItemRow(selectedLocation: selectedLocation, item: nil, searchItem: searchItem)
                        .background(itemRowBackground)
                }
            }
            .transition(.opacity)
        }
    }
    
    // MARK: - User Items View
    @ViewBuilder
    private var userItemsView: some View {
        ForEach(selectedLocationOrderUserItems, id: \.id) { orderUserItem in
            if let selectedLocation = selectedLocation {
                OrderItemRow(selectedLocation: selectedLocation, item: orderUserItem, searchItem: nil)
                    .background(itemRowBackground)
                    .swipeActions {
                        Action(symbolImage: "square.and.pencil", tint: .white, background: .orange) { resetPosition in
                            resetPosition.toggle()
                            handleEditAction(for: orderUserItem)
                        }
                        Action(symbolImage: "trash", tint: .white, background: .red) { resetPosition in
                            resetPosition.toggle()
                            Task {
                                await handleDeleteAction(for: orderUserItem)
                            }
                        }
                    }
                    .animation(.easeInOut(duration: 0.2), value: orderUserItem)
                    .transition(.opacity)
            }
        }
    }
    
    // MARK: - Bottom Section View
    @ViewBuilder
    private var bottomSectionView: some View {
        Rectangle()
            .fill(Color.gray)
            .frame(height: 1 / UIScreen.main.scale)
            .edgesIgnoringSafeArea(.horizontal)
        VStack {
            HStack {
                Color.clear
                    .frame(height: 10)
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
    
    // MARK: - Empty State View
    @ViewBuilder
    private var emptyStateView: some View {
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
    
    // MARK: - No Result View
    @ViewBuilder
    private var noResultsView: some View {
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
            createNewItem(searchQueryItem: nil)
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
    
    // MARK: - Item Row Background View
    @ViewBuilder
    private var itemRowBackground: some View {
        RoundedRectangle(cornerRadius: 12)
            .fill(Color(.systemBackground))
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(Color.secondary.opacity(0.3), lineWidth: 1)
            )
    }
}

// MARK: - Helper Functions
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
           clearSearch()
        }
    }
    
    private func clearSearch() {
        searchTask?.cancel()
        searchValue = ""
        selectedLocationSearchQueryItems = []
        isLoading = false
    }
    
    private func createNewItem(searchQueryItem: SelectItemsItemDTO?) {
        guard let selectedLocation = selectedLocation else { return }
        
        // Create a new item with proper timestamp handling
        let newItem = SelectItemsItemDTO(
            id: searchQueryItem != nil ? searchQueryItem!.id : UUID().uuidString,
            name: searchQueryItem != nil ? searchQueryItem!.name : searchValue.trimmingCharacters(in: .whitespaces),
            locationId: selectedLocation.locationId,
            createdAt: nil,
            updatedAt: nil
        )
        
        isExistingItem = searchQueryItem != nil
        
        editingItem = (item: newItem, orderItemId: UUID().uuidString, quantity: 1, comments: "")
        currentActionType = .create
        showAddItemSheet = true
    }
}
