import SwiftUI
import Shared

struct AddGroupView: View {
    // Sheets
    @State var showProfileSheet: Bool = false
    @State var showAddFriendSheet: Bool = false
    @State var showAddLocationSheet: Bool = false
    @State private var selectedFriendsDisplay: String = ""
    @State private var selectedLocationsDisplay: String = ""
    @State private var isPressed = false
    @State private var navigate = false
    
    // Fields
    @State private var name: String = ""
    @State private var comments: String = ""
    
    // Field Error Messages
    @State private var nameError: String?
    @State private var orderUsersError: String?
    @State private var orderLocationsError: String?
    @State private var commentsError: String?
    
    @State private var orderLocationDTOs: [OrderLocationDTO] = []
    @State private var orderUsersDTOs: [OrderUserDTO] = []
    @State private var showConfirmation: Bool = false
    @State private var newOrder: Order? = nil
    
    @Environment(\.colorScheme) var colorScheme
    var onOrderCreated: ((Order?) -> Void)? = nil
    
    var body: some View {
        NavigationStack {
            ZStack {
                Color.clear // Needed to detect taps on background
                ScrollView {
                    VStack(alignment: .leading,spacing: 12) {
                        Text("Create Order")
                            .font(.headline)
                            .foregroundStyle(.secondary)
                        
                        // Order Name Field
                        VStack(alignment: .leading, spacing: 4) {
                            HStack(spacing: 12) {
                                TextField("Name", text: $name)
                                    .onChange(of: name) {
                                        if !name.isEmpty {
                                            nameError = nil
                                        }
                                    }
                                
                                Image(systemName: "person.fill")
                                    .frame(width: 24, height: 24)
                                    .foregroundStyle(Color.secondary.opacity(0.3))
                            }
                            .padding(.vertical, 16)
                            .padding(.horizontal, 16)
                            .background(Color(UIColor.systemBackground))
                            .cornerRadius(12)
                            .overlay(
                                RoundedRectangle(cornerRadius: 12)
                                    .stroke(nameError != nil ? Color.red : Color.secondary.opacity(0.3), lineWidth: 1)
                            )
                            
                            if let error = nameError {
                                HStack {
                                    Image(systemName: "exclamationmark.circle.fill")
                                        .foregroundStyle(Color.red)
                                    Text(error)
                                        .font(.caption)
                                        .foregroundColor(.red)
                                }
                            }
                        }
                        
                        // Select Locations Field
                        VStack(alignment: .leading, spacing: 4) {
                            let locationText = orderLocationDTOs.isEmpty
                            ? "Select Locations"
                            : "\(orderLocationDTOs.count) location(s) selected"
                            
                            let locationColor: Color = .secondary.opacity(0.5)
                            //                            : (colorScheme == .dark ? .white : .black)
                            
                            HStack(spacing: 12) {
                                Text(locationText)
                                    .foregroundStyle(locationColor)
                                    .lineLimit(1)
                                    .onChange(of: orderLocationDTOs) {
                                        if !orderLocationDTOs.isEmpty {
                                            orderLocationsError = nil
                                        }
                                    }
                                
                                
                                Spacer()
                                
                                Image(systemName: "map.fill")
                                    .frame(width: 24, height: 24)
                                    .foregroundStyle(Color.secondary.opacity(0.3))
                            }
                            .contentShape(Rectangle())
                            .onTapGesture {
                                showAddLocationSheet = true
                            }
                            .sheet(isPresented: $showAddLocationSheet) {
                                AddLocationsView(orderLocationDTOS: $orderLocationDTOs, isPresented: $showAddLocationSheet)
                            }
                            .padding(.vertical, 16)
                            .padding(.horizontal, 16)
                            .background(Color(UIColor.systemBackground))
                            .cornerRadius(12)
                            .overlay(
                                RoundedRectangle(cornerRadius: 12)
                                    .stroke(orderLocationsError != nil ? Color.red : Color.secondary.opacity(0.3), lineWidth: 1)
                            )
                            
                            if let error = orderLocationsError {
                                HStack {
                                    Image(systemName: "exclamationmark.circle.fill")
                                        .foregroundStyle(Color.red)
                                    Text(error)
                                        .font(.caption)
                                        .foregroundColor(.red)
                                }
                            }
                        }
                        
                        
                        // Select Friends Field
                        VStack(alignment: .leading, spacing: 4) {
                            let userText = orderUsersDTOs.isEmpty
                            ? "Select Friends"
                            : "\(orderUsersDTOs.count) friend(s) selected"
                            
                            let userColor: Color = .secondary.opacity(0.5)
                            
                            HStack(spacing: 12) {
                                Text(userText)
                                    .foregroundStyle(userColor)
                                    .lineLimit(1)
                                    .onChange(of: orderUsersDTOs) {
                                        if !orderUsersDTOs.isEmpty {
                                            orderUsersError = nil
                                        }
                                    }
                                
                                Spacer()
                                
                                Image(systemName: "person.2.fill")
                                    .frame(width: 24, height: 24)
                                    .foregroundStyle(Color.secondary.opacity(0.3))
                            }
                            .contentShape(Rectangle())
                            .onTapGesture {
                                showAddFriendSheet = true
                            }
                            .sheet(isPresented: $showAddFriendSheet) {
                                AddFriendsView(orderFriendDTOS: $orderUsersDTOs, isPresented: $showAddFriendSheet)
                            }
                            .padding(.vertical, 16)
                            .padding(.horizontal, 16)
                            .background(Color(UIColor.systemBackground))
                            .cornerRadius(12)
                            .overlay(
                                RoundedRectangle(cornerRadius: 12)
                                    .stroke(orderUsersError != nil ? Color.red : Color.secondary.opacity(0.3), lineWidth: 1)
                            )
                            
                            if let error = orderUsersError {
                                HStack {
                                    Image(systemName: "exclamationmark.circle.fill")
                                        .foregroundStyle(Color.red)
                                    Text(error)
                                        .font(.caption)
                                        .foregroundColor(.red)
                                }
                            }
                            
                        }
                        
                        // Comments Field
                        VStack {
                            HStack(spacing: 12) {
                                TextField("Comments", text: $comments, axis: .vertical)
                                    .onChange(of: comments) {
                                        if !comments.isEmpty {
                                            commentsError = nil
                                        }
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
                                    .stroke(commentsError != nil ? Color.red : Color.secondary.opacity(0.3), lineWidth: 1)
                            )
                        }
                        // Submission Buttons
                        Button(action: {
                            withAnimation(.easeIn(duration: 0.1)) {
                                isPressed = true
                            }
                            Task {
                                guard let creatorId = supabase.auth.currentUser?.id.uuidString else { return }
                                
                                let apiUrl = Bundle.main.infoDictionary?["API_URL"] as! String
                                let order = OrderDTO(
                                    id: nil,
                                    name: name,
                                    creatorId: creatorId,
                                    comments: comments,
                                    status: .active,
                                    paused: false,
                                    createdAt: nil,
                                    updatedAt: nil,
                                    orderUsers: orderUsersDTOs,
                                    orderLocations: orderLocationDTOs,
                                    creator: nil
                                )
                                let result = try await createOrder(baseUrl: apiUrl, order: order)
                                if result.success, let createdOrder = result.data {
                                    name = ""
                                    orderUsersDTOs = []
                                    orderLocationDTOs = []
                                    comments = ""
                                    
                                    onOrderCreated?(createdOrder)
                                    
                                }
                                
                                mapValidationErrors(result, handlers: [
                                    "name": { nameError = $0 },
                                    "order_locations": { orderLocationsError = $0 },
                                    "order_users": { orderUsersError = $0 },
                                    "comments": { commentsError = $0 }
                                ])
                            }
                        }) {
                            HStack {
                                Image(systemName: "plus.circle")
                                Text("Create and Start")
                            }
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 16)
                            .background(Color.orange)
                            .foregroundColor(.white)
                            .cornerRadius(12)
                            .scaleEffect(isPressed ? 0.995 : 1.0)
                            .contentShape(Rectangle())
                        }
                        .navigationDestination(isPresented: $navigate) {
                            AwaitingOrders(
                                order: $newOrder,
                                onDismiss: {
                                    onOrderCreated?(nil) // Pass nil to reset in MainLayout
                                }
                            )
                        }
                    }
                    .padding()
                }
            }
            .onDisappear {
                name = ""
                comments = ""
                nameError = nil
                orderUsersError = nil
                orderLocationsError = nil
                commentsError = nil
                orderLocationDTOs = []
                orderUsersDTOs = []
                showConfirmation = false
                newOrder = nil
                isPressed = false
                navigate = false
            }
            
        }
    }
}
