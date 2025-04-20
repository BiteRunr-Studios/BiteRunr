import Combine
import Foundation

class WebSocketManager: ObservableObject {
    private var webSocketTask: URLSessionWebSocketTask?
    @Published var items: [OrderItem] = []
    
    func connect() {
        guard let url = URL(string: "wss://biterunrapisockets.omniquark.me/ws")
        else { return }
        webSocketTask = URLSession.shared.webSocketTask(with: url)
        webSocketTask?.resume()
        receive()
    }
    
    private func receive() {
        webSocketTask?.receive { [weak self] result in
            switch result {
            case .success(.string(let message)):
                if let data = message.data(using: .utf8) {
                    let decoder = JSONDecoder()
                    let isoFormatter = ISO8601DateFormatter()
                    isoFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
                    decoder.dateDecodingStrategy = .custom { decoder in
                        let container = try decoder.singleValueContainer()
                        let dateStr = try container.decode(String.self)
                        if let date = isoFormatter.date(from: dateStr) {
                            return date
                        }
                        throw DecodingError.dataCorruptedError(in: container, debugDescription: "Cannot decode date string: \(dateStr)")
                    }
                    do {
                        let json = try decoder.decode(ItemsUpdateList.self, from: data)
                        DispatchQueue.main.async {
                            self?.items = json.payload
                        }
                    } catch {
                        print("Decoding error: \(error)")
                    }
                }
                self?.receive() // Continue listening
            case .failure(let error):
                print("WebSocket receive error: \(error)")
            default:
                break
            }
        }
    }
    
    func send(itemName: String) {
        let orderLocationUUID = UUID(
            uuidString: "8722c017-0c79-42b4-8923-3a4a292cb39e"
        )
        let userUUID = UUID(uuidString: "6553a306-1d96-43da-90b8-89013fad115b")
        let newOrderItem = OrderItem(
            id: nil,
            orderLocationId: orderLocationUUID!,
            userId: userUUID!,
            name: itemName,
            quantity: 1,
            createdAt: nil,
            updatedAt: nil
        )
        
        let newItem = ItemUpdate(
            type: .create,
            payload: newOrderItem,
            source: .client
        )
        
        guard let data = try? JSONEncoder().encode(newItem),
              let message = String(data: data, encoding: .utf8)
        else {
            print("Failed to encode message")
            return
        }
        
        webSocketTask?.send(.string(message)) { error in
            if let error = error {
                print("WebSocket send error: \(error)")
            }
        }
    }
    
    func disconnect() {
        webSocketTask?.cancel(with: .goingAway, reason: nil)
    }
}

enum ItemUpdateType: String, Codable {
    case create, update, delete
}

enum ItemUpdateSource: String, Codable {
    case client, server, webhook
}

struct ItemUpdate: Codable {
    var type: ItemUpdateType
    var payload: OrderItem
    var source: ItemUpdateSource
}

struct ItemsUpdateList: Codable {
    var type: ItemUpdateType
    var payload: [OrderItem]
    var source: ItemUpdateSource
}
