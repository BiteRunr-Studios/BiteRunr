import Foundation
import SwiftUI
import Shared
import Supabase

struct AddItemSheet: View {
    @Binding var orderLocation: SelectItemsOrderLocationDTO?
    @Binding var orderItem: SelectItemsItemDTO?
    @State var quantity: Int
    @State var comments: String = ""
    @State var orderUserId: String
    
    
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
                        .onChange(of: comments) {
                        }
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
                    //                    isPressed = true
                }
                Task {
                    
                }
            }) {
                HStack {
                    Image(systemName: "plus.circle")
                    Text("Select Item")
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
                .background(Color.orange)
                .foregroundColor(.white)
                .cornerRadius(12)
                .contentShape(Rectangle())
            }
            
            Button(action: {
                withAnimation(.easeIn(duration: 0.1)) {
                    //                    isPressed = true
                }
                Task {
                    
                }
            }) {
                HStack {
                    Image(systemName: "xmark.circle")
                    Text("Cancel")
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
                .foregroundColor(.orange)
                .cornerRadius(12)
                .contentShape(Rectangle())
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(Color.orange, lineWidth: 1)
                )
            }
            
            
        }
        .padding()
        Spacer()
    }
}
