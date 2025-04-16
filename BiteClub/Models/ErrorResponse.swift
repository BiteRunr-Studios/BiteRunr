import Foundation

struct ErrorResponse: Codable, Error {
    let success: Bool
    let error: ErrorDetails
    
    struct ErrorDetails: Codable {
        let issues: [Issue]
        let name: String
        
        struct Issue: Codable {
            let code: String
            let path: [PathElement]
            let message: String
            
            enum PathElement: Codable {
                case string(String)
                case number(Int)
                
                init(from decoder: Decoder) throws {
                    let container = try decoder.singleValueContainer()
                    if let stringValue = try? container.decode(String.self) {
                        self = .string(stringValue)
                    } else if let numberValue = try? container.decode(Int.self) {
                        self = .number(numberValue)
                    } else {
                        throw DecodingError.typeMismatch(
                            PathElement.self,
                            DecodingError.Context(
                                codingPath: decoder.codingPath,
                                debugDescription: "Expected a string or number"
                            )
                        )
                    }
                }
                
                func encode(to encoder: Encoder) throws {
                    var container = encoder.singleValueContainer()
                    switch self {
                    case .string(let value):
                        try container.encode(value)
                    case .number(let value):
                        try container.encode(value)
                    }
                }
            }
        }
    }
}
