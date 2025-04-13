//
//  AddGroupView.swift
//  BiteClub
//
//  Created by Ryan Somers on 4/10/25.
//

import SwiftUI

struct AddGroupView: View {
    @State var showProfileSheet: Bool = false
    var body: some View {
        VStack(spacing: 0) {
            NavigationStack {
                Text("Add a group!")
                    .navigationTitle("")
                    .navigationBarTitleDisplayMode(.inline)
            }
        }
    }
}

#Preview {
    AddGroupView()
}
