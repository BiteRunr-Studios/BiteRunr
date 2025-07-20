import SwiftUI
import Shared
import UIKit
import PhotosUI
import AVFoundation
import AVKit

struct ScanReceipt: View {
    @Environment(\.presentationMode) var presentationMode
    @EnvironmentObject var supabaseState: SupabaseState
    
    @State private var selectedItem: PhotosPickerItem?
    @State private var selectedImageData: Data?
    @State private var isLoading = false
    @State private var receiptDetails: ReceiptDetails?
    @State private var errorMessage: String?
    @State private var isShowingImagePicker = false
    @State private var imagePickerSourceType: UIImagePickerController.SourceType = .camera
    @State private var selectedUIImage: UIImage?
    @State private var isShowingImageSourceActionSheet = false
    @State private var allowEditing: Bool = true
    
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                Text("Scan Receipt")
                    .font(.largeTitle)
                    .bold()
                    .padding(.top)
                
                if isLoading {
                    VStack(spacing: 16) {
                        ProgressView()
                            .scaleEffect(1.5)
                            .padding()
                        Text("Analyzing receipt...")
                            .foregroundColor(.secondary)
                    }
                    .frame(maxWidth: .infinity, minHeight: 200)
                } else if let imageData = selectedImageData, let uiImage = UIImage(data: imageData) {
                    VStack(spacing: 12) {
                        Image(uiImage: uiImage)
                            .resizable()
                            .scaledToFit()
                            .frame(maxWidth: .infinity, maxHeight: 400)
                            .cornerRadius(12)
                        
                        if let receiptDetails = receiptDetails {
                            receiptDetailView(details: receiptDetails)
                        } else {
                            Button(action: {
                                isShowingImageSourceActionSheet = true
                            }) {
                                Text("Choose different image")
                                    .foregroundColor(.orange)
                            }
                            
                            Button(action: {
                                Task {
                                    await uploadImage(imageData: imageData)
                                }
                            }) {
                                HStack {
                                    Image(systemName: "doc.text.viewfinder")
                                    Text("Analyze Receipt")
                                }
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 16)
                            }
                            .background(Color.orange)
                            .foregroundColor(.white)
                            .cornerRadius(12)
                            .contentShape(Rectangle())
                        }
                    }
                } else {
                    VStack(spacing: 20) {
                        Button(action: {
                            isShowingImageSourceActionSheet = true
                        }) {
                            VStack(spacing: 12) {
                                Image(systemName: "camera.viewfinder")
                                    .font(.system(size: 70))
                                    .foregroundColor(.orange)
                                
                                Text("Capture or select a receipt photo")
                                    .font(.headline)
                            }
                            .frame(maxWidth: .infinity, minHeight: 200)
                            .background(Color.orange.opacity(0.1))
                            .cornerRadius(12)
                        }
                        .confirmationDialog("Choose Image Source", isPresented: $isShowingImageSourceActionSheet) {
                            Button("Take Photo") {
                                imagePickerSourceType = .camera
                                allowEditing = true
                                isShowingImagePicker = true
                            }
                            Button("Photo Library") {
                                imagePickerSourceType = .photoLibrary
                                allowEditing = true
                                isShowingImagePicker = true
                            }
                            Button("Cancel", role: .cancel) {}
                        }
                        
                        Text("Take a clear photo of your receipt to scan and extract item details.")
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                    }
                }
                
                if let errorMessage = errorMessage {
                    Text(errorMessage)
                        .foregroundColor(.red)
                        .frame(maxWidth: .infinity, alignment: .center)
                        .padding()
                }
                
                Spacer()
            }
            .padding()
        }
        .onChange(of: selectedItem) {
            loadSelectedImage()
        }
        .onChange(of: selectedUIImage) { _, newImage in
            if let image = newImage {
                if let imageData = image.jpegData(compressionQuality: 0.8) {
                    selectedImageData = imageData
                    receiptDetails = nil
                    errorMessage = nil
                }
            }
        }
        .sheet(isPresented: $isShowingImagePicker) {
            ImagePickerView(selectedImage: $selectedUIImage, sourceType: imagePickerSourceType, allowEditing: allowEditing)
        }
        .navigationTitle("Scan Receipt")
    }
    
    private func receiptDetailView(details: ReceiptDetails) -> some View {
        VStack(alignment: .leading, spacing: 20) {
            Text("Receipt Details")
                .font(.headline)
            ForEach(Array(details.items.enumerated()), id: \.offset) { index, item in
                HStack {
                    Text(item.name)
                        .fontWeight(.medium)
                    Spacer()
                    Text("x\(Int(item.quantity))")
                        .foregroundColor(.secondary)
                    Text("$\(String(format: "%.2f", item.unitPrice))")
                        .fontWeight(.semibold)
                }
                .padding(.vertical, 4)
                Divider()
            }
            
            VStack(spacing: 8) {
                HStack {
                    Text("Subtotal")
                        .foregroundColor(.secondary)
                    Spacer()
                    Text("$\(String(format: "%.2f", details.subtotal))")
                }
                
                HStack {
                    Text("Tax")
                        .foregroundColor(.secondary)
                    Spacer()
                    Text("$\(String(format: "%.2f", details.tax))")
                }
                
                HStack {
                    Text("Total")
                        .font(.headline)
                    Spacer()
                    Text("$\(String(format: "%.2f", details.total))")
                        .font(.headline)
                }
            }
            .padding(.top)
            
            Button(action: {
                // Here you would implement adding the items to the order
                // For example: navigateToOrderCreation(receiptDetails)
            }) {
                HStack {
                    Image(systemName: "plus.circle")
                    Text("Create Order From Receipt")
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
            }
            .background(Color.orange)
            .foregroundColor(.white)
            .cornerRadius(12)
            .contentShape(Rectangle())
            .padding(.top, 20)
            
            Button(action: {
                // Reset and scan a new receipt
                selectedImageData = nil
                selectedItem = nil
                selectedUIImage = nil
                receiptDetails = nil
            }) {
                Text("Scan Another Receipt")
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 16)
            }
            .background(Color.gray.opacity(0.2))
            .foregroundColor(.primary)
            .cornerRadius(12)
            .contentShape(Rectangle())
        }
        .padding()
        .background(Color.gray.opacity(0.1))
        .cornerRadius(12)
    }
}

extension ScanReceipt {
    private func loadSelectedImage() {
        Task {
            if let item = selectedItem {
                do {
                    if let data = try await item.loadTransferable(type: Data.self) {
                        await MainActor.run {
                            selectedImageData = data
                            receiptDetails = nil
                            errorMessage = nil
                        }
                    }
                } catch {
                    print("Error loading image: \(error)")
                    await MainActor.run {
                        errorMessage = "Failed to load image"
                    }
                }
            }
        }
    }
    
    private func uploadImage(imageData: Data) async {
        guard supabaseState.isAuthenticated else {
            errorMessage = "You must be logged in to scan receipts"
            return
        }
        
        guard let apiUrl = Bundle.main.infoDictionary?["API_URL"] as? String else {
            errorMessage = "API_URL not set"
            return
        }
        
        await MainActor.run {
            isLoading = true
            errorMessage = nil
        }
        
        do {
            if let uiImage = UIImage(data: imageData) {
                if let resizedData = uiImage.pngData() {
                    let response = try await scanReceipt(baseUrl: apiUrl, imageData: resizedData.toKotlinByteArray())
                    
                    if response.success {
                        receiptDetails = response.data
                        isLoading = false
                    }
                } else {
                    throw NSError(domain: "ScanReceipt", code: 1001, userInfo: [NSLocalizedDescriptionKey: "Failed to convert resized image to data"])
                }
            } else {
                let response = try await scanReceipt(baseUrl: apiUrl, imageData: imageData.toKotlinByteArray())
                
                if response.success {
                    receiptDetails = response.data
                    isLoading = false
                }
            }
        } catch {
            print("Upload error: \(error)")
            await MainActor.run {
                isLoading = false
                errorMessage = "Failed to upload receipt: \(error.localizedDescription)"
            }
        }
    }
}

extension Data {
    func toKotlinByteArray() -> KotlinByteArray {
        // Ensure data size is within Int32 range to prevent overflow
        guard self.count <= Int(Int32.max) else {
            // If data is too large, we should have already resized it earlier
            // This is a fallback safety check
            print("Warning: Data size \(self.count) exceeds Int32.max")
            return KotlinByteArray(size: 0)
        }
        
        let byteArray = KotlinByteArray(size: Int32(self.count))
        
        // Use safer chunked approach to set bytes
        let chunkSize = 1024 * 1024 // Process 1MB at a time
        
        for chunkStart in stride(from: 0, to: self.count, by: chunkSize) {
            let end = Swift.min(chunkStart + chunkSize, self.count)
            let chunk = self[chunkStart..<end]
            
            for (offset, byte) in chunk.enumerated() {
                let index = chunkStart + offset
                byteArray.set(index: Int32(index), value: Int8(bitPattern: byte))
            }
        }
        
        return byteArray
    }
}


struct ImagePickerView: UIViewControllerRepresentable {
    @Binding var selectedImage: UIImage?
    @Environment(\.presentationMode) var presentationMode
    var sourceType: UIImagePickerController.SourceType
    var allowEditing: Bool
    
    func makeUIViewController(context: Context) -> UIViewController {
        let picker = UIImagePickerController()
        picker.delegate = context.coordinator
        picker.sourceType = sourceType
        
        // Use built-in editing interface if enabled
        picker.allowsEditing = allowEditing
        
        return picker
    }
    
    func updateUIViewController(_ uiViewController: UIViewController, context: Context) {}
    
    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }
    
    class Coordinator: NSObject, UIImagePickerControllerDelegate, UINavigationControllerDelegate {
        var parent: ImagePickerView
        
        init(_ parent: ImagePickerView) {
            self.parent = parent
        }
        
        func imagePickerController(_ picker: UIImagePickerController, didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey : Any]) {
            if parent.allowEditing, let image = info[.editedImage] as? UIImage {
                parent.selectedImage = image
            } else if let image = info[.originalImage] as? UIImage {
                parent.selectedImage = image
            }
            
            picker.dismiss(animated: true)
        }
        
        func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
            parent.presentationMode.wrappedValue.dismiss()
        }
    }
}
