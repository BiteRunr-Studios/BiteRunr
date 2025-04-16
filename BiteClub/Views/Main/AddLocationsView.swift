import SwiftUI
import Clerk

struct AddLocationsView: View {
    @State private var searchText = ""
    @State private var isToggledOn = false
    @State private var locations: [Location] = []
    @State private var errorMessage: String?
    @Environment(Clerk.self) private var clerk
    
    var body: some View {
        Capsule()
            .fill(Color.secondary.opacity(0.5))
            .frame(width: 120, height: 3)
            .padding(.vertical, 10)
        
        VStack(alignment: .leading, spacing: 20) {
            Text("Add Locations")
                .foregroundStyle(.secondary)
                .font(.title2)
            
            HStack(spacing: 12) {
                TextField("Search Locations", text: $searchText)
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
            
            if let errorMessage = errorMessage {
                Text(errorMessage)
                    .foregroundColor(.red)
            } else {
                ForEach(locations, id: \.id) { location in
                    HStack(spacing: 12) {
                        Image("locationIcon")
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                            .frame(width: 35, height: 35)
                        
                        
                        VStack(alignment: .leading) {
                            Text(location.name)
                                .foregroundStyle(.primary)
                            Text(location.address)
                                .foregroundStyle(.secondary)
                        }
                        Spacer()
                        
                        Button {
                            isToggledOn.toggle()
                        } label: {
                            Text("")
                                .frame(width: 44, height: 24)
                                .background(isToggledOn ? Color.orange : Color.gray.opacity(0.3))
                                .foregroundColor(.white)
                                .cornerRadius(6)
                        }
                        .buttonStyle(.plain)
                        .padding(.horizontal)
                        .animation(.easeInOut(duration: 0.2), value: isToggledOn)
                    }
                }
            }
            
            Spacer()
        }
        .padding()
        .onAppear {
            Task {
                await fetchLocations()
            }
        }
    }
    
    private func fetchLocations() async {
        do {
            let apiUrl = ProcessInfo.processInfo.environment["API_URL"]!
            let url = "\(apiUrl)/locations"
            let response: [Location] = try await fetch(url: url, responseType: [Location].self, body: nil as String?)
            locations = response // Update the friends array with the fetched data
        } catch {
            errorMessage = "Failed to fetch locations: \(error.localizedDescription)"
        }
    }
}
