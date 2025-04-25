import SwiftUI
//import Clerk

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
    @State private var selectedFriends: String = "Select friends:"
    @State private var selectedLocations: String = "Select locations:"
    @State private var comments: String = ""
    
    // Field Error Messages
    @State private var nameError: String?
    @State private var orderUsersError: String?
    @State private var orderLocationsError: String?
    @State private var commentsError: String?
    
    @State private var orderLocationDTOs: [OrderLocationDTO] = []
    @State private var orderUsersDTOs: [OrderUserDTO] = []
    @State private var showConfirmation: Bool = false
    
//    @Environment(Clerk.self) private var clerk
    @Environment(\.colorScheme) var colorScheme

    
    var body: some View {
        NavigationStack {
            ZStack {
                Color.clear // Needed to detect taps on background
                ScrollView {
                    VStack(alignment: .leading,spacing: 12) {
                        Text("Create Order")
                            .foregroundStyle(.secondary)
                            .font(.title2)
                        
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
                            
                            let locationColor: Color = orderUsersDTOs.isEmpty
                            ? .secondary.opacity(0.5)
                            : (colorScheme == .dark ? .white : .black)
                            
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
                            
                            let userColor: Color = orderUsersDTOs.isEmpty
                            ? .secondary.opacity(0.5)
                            : (colorScheme == .dark ? .white : .black)
                            
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
//                                navigate = await createOrder(status: .active)
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
//                            AwaitingOrders()
                        }
                    }
                    .padding()
                }
            }
        }
    }
}

extension AddGroupView {
//    func createOrder(status: Status) async -> Bool {
//        do {
//            guard let user = clerk.user else {
//                print("Broken Order")
//                return false
//            }
//
//            // maybe need to create route for clerkId
//            let order = OrderDTO(
//                id: nil,
//                name: name,
//                creatorId: nil, // will be set in api using clerk_id
//                comments: comments,
//                status: status,
//                paused: false,
//                createdAt: nil,
//                updatedAt: nil,
//                orderUsers: orderUsersDTOs, // Selected users/friends
//                orderLocations: orderLocationDTOs, // Selected locations
//                creator: nil, // Not necessary creatorId set
//                clerkId: user.id
//            )
//
//            name = ""
//            orderLocationDTOs = []
//            orderUsersDTOs = []
//            comments = ""
//
//            let apiUrl = ProcessInfo.processInfo.environment["API_URL"]!
//            let _: Order = try await fetch(
//                url: "\(apiUrl)/orders",
//                method: "POST",
//                responseType: Order.self,
//                body: order
//            )
//        } catch {
//            guard let errorResponse = error as? ErrorResponse else {
//                print("Unexpected error: \(error)")
//                return false
//            }
//
//            mapValidationErrors(errorResponse, handlers: [
//                "name": { nameError = $0 },
//                "order_locations": { orderLocationsError = $0 },
//                "order_users": { orderUsersError = $0 },
//                "comments": { commentsError = $0 }
//            ])
//
//            return false
//        }
//
//        return true
//    }
}

#Preview {
    AddGroupView()
}
