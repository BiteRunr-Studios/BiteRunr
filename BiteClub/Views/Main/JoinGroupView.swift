//
//  JoinGroupView.swift
//  BiteClub
//
//  Created by Ryan Somers on 4/10/25.
//

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
