import Foundation

class Poller: ObservableObject {
    private var timer: Timer?
    
    func startPolling<T>(
        interval: TimeInterval,
        pollBlock: @escaping @Sendable () async throws -> T,
        onResult: @escaping (T) -> Void,
        onError: @escaping (Error) -> Void
    ) {
        timer?.invalidate()
        timer = Timer.scheduledTimer(withTimeInterval: interval, repeats: true) { _ in
            Task {
                do {
                    let result = try await pollBlock()
                    onResult(result)
                } catch {
                    onError(error)
                }
            }
        }
        timer?.fire()
    }
    
    func stopPolling() {
        timer?.invalidate()
        timer = nil
    }
}
