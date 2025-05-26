//
//  InitialsCircle.swift
//  iosApp
//
//  Created by Ryan Somers on 5/26/25.
//  Copyright © 2025 orgName. All rights reserved.
//

import SwiftUI

struct InitialsCircle: View {
    let firstName: String
    let lastName: String
    var body: some View {
        let initials = (firstName.first.map { String($0) } ?? "") + (lastName.first.map { String($0) } ?? "")
        Circle()
            .fill(Color.accentColor.opacity(0.15))
            .frame(width: 48, height: 48)
            .overlay(
                Text(initials)
                    .font(.title2)
                    .fontWeight(.bold)
                    .foregroundColor(.accentColor)
            )
    }
}

#Preview {
    InitialsCircle(firstName: "Ryan", lastName: "Somers")
}
