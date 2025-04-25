//
//  KeyboardResponder.swift
//  BiteClub
//
//  Created by Ryan Somers on 4/18/25.
//

import SwiftUI
import Combine

final class KeyboardResponder: ObservableObject, Observable {
    @Published var isKeyboardVisible: Bool = false
    private var cancellables: Set<AnyCancellable> = []

    init() {
        NotificationCenter.default.publisher(for: UIResponder.keyboardWillShowNotification)
            .sink { [weak self] _ in self?.isKeyboardVisible = true }
            .store(in: &cancellables)
        NotificationCenter.default.publisher(for: UIResponder.keyboardWillHideNotification)
            .sink { [weak self] _ in self?.isKeyboardVisible = false }
            .store(in: &cancellables)
    }
}
