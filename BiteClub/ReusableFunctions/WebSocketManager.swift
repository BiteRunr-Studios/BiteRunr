import Foundation
import Combine

class WebSocketManager: ObservableObject {
    private var webSocketTask: URLSessionWebSocketTask?
    @Published var items: [String] = []
    
    func connect() {
        guard let url = URL(string: "wss://biterunrapisockets.omniquark.me/ws") else { return }
        webSocketTask = URLSession.shared.webSocketTask(with: url)
        webSocketTask?.resume()
        receive()
    }
    
    private func receive() {
        webSocketTask?.receive { [weak self] result in
            switch result {
            case .success(.string(let message)):
//                if let data = message.data(using: .utf8),
//                   let json = try? JSONDecoder().decode(ItemUpdate.self, from: data) {
                    DispatchQueue.main.async {
                        self?.items.append(message)
                    }
//                }
                self?.receive() // Continue listening
            case .failure(let error):
                print("WebSocket receive error: \(error)")
            default:
                break
            }
        }
    }
    
    func send(itemName: String) {
//        let newItem = ItemUpdate(type: "new_item", item: Item(id: Int(Date().timeIntervalSince1970), name: itemName))
//        guard let data = try? JSONEncoder().encode(newItem),
//              let message = String(data: data, encoding: .utf8) else {
//            print("Failed to encode message")
//            return
//        }
        
        webSocketTask?.send(.string(itemName)) { error in
            if let error = error {
                print("WebSocket send error: \(error)")
            }
        }
    }
    
    func disconnect() {
        webSocketTask?.cancel(with: .goingAway, reason: nil)
    }
}

struct ItemUpdate: Codable {
    let type: String
    let item: Item
}

struct Item: Codable {
    let id: Int
    let name: String
}
