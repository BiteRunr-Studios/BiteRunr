import SwiftUI
import Shared

struct OrderItemRow: View {
    let selectedLocation: SelectItemsOrderLocationDTO
    let item: SelectItemsOrderUserLocationItemDTO?
    let searchItem: SelectItemsItemDTO?
    
    var displayName: String {
          if let item = item {
              return item.item.name
          } else if let searchItem = searchItem {
              return searchItem.name
          } else {
              return "Unknown Item"
          }
      }
      
      var displayQuantity: String? {
          if let item = item {
              return "X \(item.quantity)"
          }
          return nil
      }

    
    var body: some View {
        HStack {
            // Food Icon svg
//            Image("utensilsIcon")
//                .resizable()
//                .aspectRatio(contentMode: .fit)
//                .frame(width: 40, height: 40)
            ZStack {
                Circle()
                    .fill(Color(UIColor.systemGray6))
                    .frame(width: 40, height: 40)
                Image(systemName: "fork.knife")
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .frame(width: 25, height: 25)
                    .foregroundColor(.orange)
            }
            .frame(width: 40, height: 40)
            
            // Food text container
            VStack(alignment: .leading) {
                // Food name
                Text(displayName)
                    .font(.body)
                    .fontWeight(.medium)
                    .foregroundColor(.secondary)
                // Food location or quantity
                Text(
                    displayQuantity != nil
                        ? "\(displayQuantity!)"
                        : "From \(selectedLocation.locationName)"
                )
                .font(.callout)
                .fontWeight(.medium)
                .foregroundColor(.secondary)
                .opacity(0.3)

            }
            
            Spacer()
            
            if searchItem == nil {
                // Icon
                Image(systemName: "chevron.left")
                    .foregroundColor(.secondary)
                    .font(.system(size: 14))
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
    }
}
