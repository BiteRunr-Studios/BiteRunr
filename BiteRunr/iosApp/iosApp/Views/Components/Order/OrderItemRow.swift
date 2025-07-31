import SwiftUI
import Shared

struct OrderItemRow: View {
    let selectedLocation: SelectItemsOrderLocationDTO
    let item: SelectItemsOrderUserLocationItemDTO
    
    var body: some View {
        HStack {
            // Food Icon svg
            Image("utensilsIcon")
                .resizable()
                .aspectRatio(contentMode: .fit)
                .frame(width: 40, height: 40)
            
            // Food text container
            VStack(alignment: .leading) {
                // Food name
                Text(item.item.name)
                    .font(.body)
                    .fontWeight(.medium)
                    .foregroundColor(.secondary)
                // Food location
                Text("X \(item.quantity)")
                    .font(.callout)
                    .fontWeight(.medium)
                    .foregroundColor(.secondary).opacity(0.3)
            }
            
            Spacer()
            
            // Icon
            Image(systemName: "chevron.left")
                .foregroundColor(.secondary)
                .font(.system(size: 14))
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
    }
}
