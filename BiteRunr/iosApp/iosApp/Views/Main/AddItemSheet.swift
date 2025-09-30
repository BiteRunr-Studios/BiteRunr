import Foundation
import SwiftUI
import Shared
import Supabase

struct AddItemSheet: View {
    let orderLocation: SelectItemsOrderLocationDTO?
    let orderItem: SelectItemsItemDTO
    
    @State var quantity: Int
    @State var comments: String
    
    let orderItemId: String
    let orderUserId: String
    let actionType: String
    let orderId: String
    let orderLocationId: String
    let itemId: String
    let onSuccess: (() -> Void)?
    
    @State var isExistingItem: Bool = false
    
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {

        VStack(alignment: .leading) {
            Capsule()
                .fill(Color.secondary.opacity(0.5))
                .frame(width: 120, height: 3)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 10)
            // Page title and subtitle container
            VStack(alignment: .leading) {
                // Page title
                Text(orderItem.name)
                    .font(.title2)
                    .fontWeight(.semibold)
                    .foregroundColor(.secondary)
                // Page subtitle
                Text("From \(orderLocation!.locationName)")
                    .font(.body)
                    .foregroundStyle(.secondary)
            }
            
            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 12) {
                    Stepper("\(quantity)", value: $quantity, in: 1...1000)
                }
                .padding(.vertical, 12)
                .padding(.horizontal, 16)
                .background(Color(UIColor.systemBackground))
                .cornerRadius(12)
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(Color.secondary.opacity(0.3), lineWidth: 1)
                )
            }
            
            VStack {
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
            }
            
            Button(action: {
                Task {
                    var success = false
                    
                    if actionType == "Create" {
                        if isExistingItem {
                            success = await addExistingItem()
                        } else {
                            success = await addNewItem()
                        }
                    } else if actionType == "Edit" {
                        success = await editExistingItem()
                    }
                    
                    if success {
                        dismiss()
                        onSuccess?()
                    }
                }
            }) {
                HStack {
                    if actionType == "Create" {
                        Image(systemName: "plus.circle")
                    } else {
                        Image(systemName: "square.and.pencil")
                    }
                    Text(actionType == "Create" ? "Add" : "Edit")
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
                .background(Color.orange)
                .foregroundColor(.white)
                .cornerRadius(12)
                .contentShape(Rectangle())
            }
            
            
        }
        .padding()
        Spacer()
    }
}

extension AddItemSheet {
    private func addNewItem() async -> Bool {
        print("Adding new item")
        guard let apiUrl = Bundle.main.infoDictionary?["API_URL"] as? String else { return false }

        // Build object to send in repo function
        let item = SelectItemsAddNewItemDTO(
            orderUserId: orderUserId,
            newItem: SelectItemsNewItemDTO(
                name: orderItem.name,
                locationId: orderLocation!.locationId
            ),
            quantity: Int32(quantity),
            comments:  comments.isEmpty ? nil : comments,
        )
        
        print("Order Id: \(orderId)")
        print("Order Location Id: \(orderLocationId)")
        print(item)
        do {
            let result = try await addNewItemToLocation(baseUrl: apiUrl, orderId: orderId, orderLocationId: orderLocationId, newItem: item)
            
            return result.success
        } catch {
            print("An error occured when adding new item")
            return false
        }
    }
    
    private func addExistingItem() async -> Bool {
        guard let apiUrl = Bundle.main.infoDictionary?["API_URL"] as? String else { return false}

        let existingItem = SelectItemsAddExistingItemDTO(
            orderLocationId: orderLocationId,
            orderUserId: orderUserId,
            itemId: itemId,
            comments: comments.isEmpty ? nil : comments,
            quantity: Int32(quantity)
        )
        
        do {
            let result = try await addItemsToOrderUser(baseUrl: apiUrl, existingItemReference: existingItem)
            print("Failed to add exisitng item to user's order")
            return result.success
        } catch {
            
            print("An error occured when adding existing item")
            return false
        }
    }
    
    private func editExistingItem() async -> Bool {
        guard let apiUrl = Bundle.main.infoDictionary?["API_URL"] as? String else { return false}
        
        let editedItem = SelectItemsEditItemDTO(
            comments: comments.isEmpty ? nil : comments,
            quantity: Int32(quantity)
        )
        
        print(orderItem.id)
        
        do {
            let result = try await editItemReferenceToUserOrder(baseUrl: apiUrl, orderItemId: orderItemId, editedItem: editedItem)
            
            print("Failed to edit exisitng item to user's order")
            return result.success
        } catch {
            print("An error occured when editing existing item")
            return false
        }
    }
}
