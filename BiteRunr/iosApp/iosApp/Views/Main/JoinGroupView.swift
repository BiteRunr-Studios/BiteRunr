import SwiftUI

struct JoinGroupView: View {
    var body: some View {
        VStack(spacing: 0) {
            NavigationStack {
                Text("Join a group!")
                    .navigationTitle("")
                    .navigationBarTitleDisplayMode(.inline)
            }
        }
    }
}

#Preview {
    JoinGroupView()
}
