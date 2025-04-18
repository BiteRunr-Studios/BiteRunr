func mapValidationErrors(
    _ errorResponse: ErrorResponse,
    handlers: [String: (String) -> Void]
) {
    for issue in errorResponse.error.issues {
        let pathKey = issue.path.map { pathElement in
            switch pathElement {
            case .string(let str): return str
            case .number(let num): return "[\(num)]"
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

