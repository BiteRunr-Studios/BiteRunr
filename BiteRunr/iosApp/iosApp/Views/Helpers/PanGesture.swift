import SwiftUI

struct PanGestureValue {
    var translation: CGSize = .zero
    var velocity: CGSize = .zero
    var state: UIGestureRecognizer.State = .possible
}

@available(iOS 18, *)
struct PanGesture: UIGestureRecognizerRepresentable {
    var onBegan: () -> ()
    var onChange: (PanGestureValue) -> ()
    var onEnded: (PanGestureValue) -> ()
    
    func makeCoordinator(converter: CoordinateSpaceConverter) -> Coordinator {
        Coordinator()
    }
    
    func makeUIGestureRecognizer(context: Context) -> UIPanGestureRecognizer {
        let gesture = UIPanGestureRecognizer()
        gesture.delegate = context.coordinator
        // Add these properties to improve gesture recognition
        gesture.maximumNumberOfTouches = 1
        gesture.minimumNumberOfTouches = 1
        return gesture
    }
    
    func updateUIGestureRecognizer(_ recognizer: UIPanGestureRecognizer, context: Context) {
        // Keep this minimal to avoid interference
    }
    
    func handleUIGestureRecognizerAction(_ recognizer: UIPanGestureRecognizer, context: Context) {
        let state = recognizer.state
        let translation = recognizer.translation(in: recognizer.view).toSize
        let velocity = recognizer.velocity(in: recognizer.view).toSize
        
        let gestureValue = PanGestureValue(
            translation: translation,
            velocity: velocity,
            state: state
        )
        
        switch state {
        case .began:
            onBegan()
        case .changed:
            onChange(gestureValue)
        case .ended, .cancelled, .failed:
            onEnded(gestureValue)
        default:
            break
        }
    }
    
    class Coordinator: NSObject, UIGestureRecognizerDelegate {
        func gestureRecognizerShouldBegin(_ gestureRecognizer: UIGestureRecognizer) -> Bool {
            guard let panGesture = gestureRecognizer as? UIPanGestureRecognizer else {
                return false
            }
            
            let velocity = panGesture.velocity(in: panGesture.view)
            
            // Simple horizontal swipe detection - more permissive
            return abs(velocity.x) > abs(velocity.y)
        }
    }
}

extension CGPoint {
    var toSize: CGSize {
        return CGSize(width: x, height: y)
    }
}
