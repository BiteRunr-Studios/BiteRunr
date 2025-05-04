import Shared

func mapValidationErrors<T>(
    _ fetchResponse: FetchResponse<T>,
    handlers: [String: (String) -> Void]
) {
    guard let fetchError = fetchResponse.error else {
        return
    }
    
    for issue in fetchError.issues {
        let pathKey = issue.path.map { pathElement in
            if let stringElement = pathElement as? PathElement.StringElement {
                return stringElement.value
            } else if let numberElement = pathElement as? PathElement.NumberElement {
                return "[\(numberElement.value)]"
            } else {
                return "unknown"
            }

        }.joined(separator: ".")
        
        // Try exact match
        if let handler = handlers[pathKey] {
            handler(issue.message)
        } else {
            // Try partial match (e.g., "order_users.[0].user_id" → "order_users.user_id")
            let simplifiedPath = pathKey.replacingOccurrences(of: #"\[\d+\]"#, with: "", options: .regularExpression)
            if let handler = handlers[simplifiedPath] {
                handler(issue.message)
            }
        }
    }
}

