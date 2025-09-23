import Foundation
import SwiftUI
import Shared
import Supabase

struct AddItemSheet: View {
    @State var orderLocation: SelectItemsOrderLocationDTO?
    @State var orderItem: SelectItemsItemDTO?
    @State var quantity: Int
    
    @State var comments: String = ""
    
    @State var orderUserId: String
    @State var actionType: String
    @State var orderId: String
    @State var orderLocationId: String
    @State var itemId: String
    @State var isExistingItem: Bool = false
    
    @State private var ItemNameError: String?
    
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
                Text(orderItem!.name)
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
                withAnimation(.easeIn(duration: 0.1)) {
                    
                }
                Task {
                    dismiss()
                    
                    if isExistingItem {
                        await addExistingItem()
                    } else {
                        await addNewItem()
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
        .dismissKeyboardOnTap()
        Spacer()
    }
}

extension AddItemSheet {
    private func addNewItem() async {
        guard let apiUrl = Bundle.main.infoDictionary?["API_URL"] as? String else { return }
        print("Added new item")
        print(itemId)
        // Build object to send in repo function
        let item = SelectItemsAddNewItemDTO(
            orderUserId: orderUserId,
            newItem: SelectItemsNewItemDTO(
                name: orderItem!.name,
                locationId: orderLocation!.locationId
            ),
            quantity: Int32(quantity),
            comments:  comments.isEmpty ? nil : comments,
        )
        
        print(item)
        do {
            let result = try await addNewItemToLocation(baseUrl: apiUrl, order_id: orderId, order_location_id: orderLocationId, newItem: item)
            
            if result.success {
                return
            }
            
            // Handle Form Validation Errors
            mapValidationErrors(result, handlers: [
                "new_item.name": { ItemNameError = $0 },
            ])
            print(result.error!)
        } catch {
            print("An error occured when adding new item")
        }
    }
    
    private func addExistingItem() async {
        guard let apiUrl = Bundle.main.infoDictionary?["API_URL"] as? String else { return }
        print("Added reference to existing item")
        print(itemId)
        let existingItem = SelectItemsAddExistingItemDTO(
            orderLocationId: orderLocationId,
            orderUserId: orderUserId,
            itemId: itemId,
            comments: comments.isEmpty ? nil : comments,
            quantity: Int32(quantity)
        )
        
        do {
            let result = try await addItemsToOrderUser(baseUrl: apiUrl, existingItemReference: existingItem)
            if result.success {
                return
            }
            
            print("Failed to add exisitng item to user's order")
        } catch {
            print("An error occured when adding existing item")
        }
    }
}
