import Foundation

public func fetch<T: Decodable, U: Encodable>(
    url: String,
    method: String = "GET",
    responseType: T.Type,
    body: U? = nil
) async throws -> T {
    guard let url = URL(string: url) else {
        throw URLError(.badURL)
    }
    
    var request = URLRequest(url: url)
    request.httpMethod = method
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    
    if let body = body {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        request.httpBody = try encoder.encode(body)
    }
    
    let (data, response) = try await URLSession.shared.data(for: request)
    
    guard let httpResponse = response as? HTTPURLResponse else {
        throw URLError(.badServerResponse)
    }
    
    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    
    let decoder = JSONDecoder()
    decoder.dateDecodingStrategy = .custom { decoder in
        let container = try decoder.singleValueContainer()
        let dateStr = try container.decode(String.self)
        
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        
        if let date = formatter.date(from: dateStr) {
            return date
        }
        throw DecodingError.dataCorruptedError(
            in: container,
            debugDescription: "Invalid date format: \(dateStr)"
        )
    }
    
    if !(200...299).contains(httpResponse.statusCode) {
        if let responseError = try? decoder.decode(ErrorResponse.self, from: data) {
            throw responseError
        } else {
            throw URLError(.badServerResponse)
        }
    }
    
    return try decoder.decode(T.self, from: data)
}
