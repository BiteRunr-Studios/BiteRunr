import Foundation
import Combine

// MARK: - JSONDecoder Helper
extension JSONDecoder {
    static var iso8601withFractionalSeconds: JSONDecoder {
        let decoder = JSONDecoder()
        let isoFormatter = ISO8601DateFormatter()
        isoFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        decoder.dateDecodingStrategy = .custom { decoder in
            let container = try decoder.singleValueContainer()
            let dateStr = try container.decode(String.self)
            if let date = isoFormatter.date(from: dateStr) {
                return date
            }
            throw DecodingError.dataCorruptedError(
                in: container,
                debugDescription: "Cannot decode date string: \(dateStr)"
            )
        }
        return decoder
    }
}

// MARK: - SSE Client
class OrderItemsSSEClient: NSObject, ObservableObject, URLSessionDataDelegate {
    @Published var orderItems: [OrderItem] = []
    private var task: URLSessionDataTask?
    private var buffer = ""
    
    func connect(orderId: String) {
        guard let url = URL(string: "https://biterunrapisockets.omniquark.me/sse/order_items?orderId=\(orderId)") else {
            print("Invalid URL")
            return
        }
        var request = URLRequest(url: url)
        request.setValue("text/event-stream", forHTTPHeaderField: "Accept")
        
        let session = URLSession(configuration: .default, delegate: self, delegateQueue: nil)
        task = session.dataTask(with: request)
        print("Connecting to SSE for orderId: \(orderId)")
        task?.resume()
    }
    
    func disconnect() {
        print("Disconnecting from SSE")
        task?.cancel()
    }
    
    // MARK: - URLSessionDataDelegate
    
    func urlSession(_ session: URLSession, dataTask: URLSessionDataTask, didReceive data: Data) {
        guard let chunk = String(data: data, encoding: .utf8) else { return }
        buffer += chunk
        
        // Split by double newlines (end of SSE event)
        let events = buffer.components(separatedBy: "\n\n")
        buffer = events.last ?? "" // Save incomplete event for next time
        
        for event in events.dropLast() {
            if let dataLine = event.split(separator: "\n").first(where: { $0.hasPrefix("data:") }) {
                let jsonString = dataLine.dropFirst(5).trimmingCharacters(in: .whitespaces)
                if let jsonData = jsonString.data(using: .utf8) {
                    do {
                        let decoder = JSONDecoder.iso8601withFractionalSeconds
                        let items = try decoder.decode([OrderItem].self, from: jsonData)
                        DispatchQueue.main.async {
                            self.orderItems = items
                        }
                    } catch {
                        print("JSON decode error: \(error)")
                        print("Raw JSON: \(jsonString)")
                    }
                }
            }
        }
    }
    
    func urlSession(_ session: URLSession, task: URLSessionTask, didCompleteWithError error: Error?) {
        if let error = error {
            print("SSE connection closed with error: \(error.localizedDescription)")
        } else {
            print("SSE connection closed normally.")
        }
    }
}
