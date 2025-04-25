import SwiftUI

struct DisableBackSwipeView<Content: View>: UIViewControllerRepresentable {
    let content: Content

    init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }

    func makeUIViewController(context: Context) -> UIViewController {
        let controller = UIHostingController(rootView: content)
        controller.navigationController?.interactivePopGestureRecognizer?.isEnabled = false
        return controller
    }

    func updateUIViewController(_ uiViewController: UIViewController, context: Context) {
        if let navController = uiViewController.navigationController {
            navController.interactivePopGestureRecognizer?.isEnabled = false
        }
    }
}
