import SwiftUI
import Shared
import PhotosUI
import TOCropViewController

struct ScanReceipt: View {
    @EnvironmentObject var supabaseState: SupabaseState
    
    @State private var receiptImage: UIImage?
    @State private var showSheet: Bool = false
    @State private var showImagePicker: Bool = false
    @State private var sourceType: UIImagePickerController.SourceType = .camera
    
    @State private var showCropper: Bool = false
    
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var receiptDetails: ReceiptDetails?
    
    var body: some View {
        ScrollView {
            Button(action: {
                showSheet = true
            }, label: {
                Text("Scan Receipt")
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 16)
                    .background(Color.orange)
                    .foregroundColor(.white)
                    .cornerRadius(12)
                    .contentShape(Rectangle())
            })
            .actionSheet(isPresented: $showSheet) {
                ActionSheet(
                    title: Text("Select Option"),
                    buttons: [
                        .default(Text("Photo Library")) {
                            showImagePicker = true
                            sourceType = .photoLibrary
                        },
                        .default(Text("Camera")) {
                            showImagePicker = true
                            sourceType = .camera
                        },
                        .cancel()
                        
                    ]
                )
            }
            
            if isLoading {
                VStack(spacing: 16) {
                    ProgressView()
                        .scaleEffect(1.5)
                        .padding()
                    Text("Analyzing receipt...")
                        .foregroundColor(.secondary)
                }
                .frame(maxWidth: .infinity, minHeight: 200)
            }
            
            if let receiptDetails = receiptDetails {
                receiptDetailView(details: receiptDetails)
            }
            
            if let errorMessage = errorMessage {
                Text(errorMessage)
                    .foregroundColor(.red)
                    .frame(maxWidth: .infinity, alignment: .center)
                    .padding()
            }
        }
        .sheet(isPresented: $showImagePicker) {
            ImagePicker(
                image: $receiptImage,
                isShown: $showImagePicker,
                sourceType: sourceType
            )
        }
        .sheet(isPresented: $showCropper) {
            if receiptImage != nil {
                CropViewController(image: $receiptImage) { croppedImage in
                    showCropper = false
                    Task {
                        isLoading = true
                        await uploadImage(image: croppedImage)
                        isLoading = false
                    }
                }
            }
        }
        .onChange(of: receiptImage) { oldImage, newImage in
            if newImage != nil {
                showCropper = true
            }
        }
    }
    
    private func receiptDetailView(details: ReceiptDetails) -> some View {
        VStack(alignment: .leading, spacing: 20) {
            Text("Receipt Details")
                .font(.headline)
            ForEach(
                Array(details.items.enumerated()),
                id: \.offset
            ) { index, item in
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
        }
        .padding()
        .background(Color.gray.opacity(0.1))
        .cornerRadius(12)
    }
    
    private func uploadImage(image: UIImage?) async {
        guard supabaseState.isAuthenticated else {
            errorMessage = "You must be logged in to scan receipts"
            return
        }
        
        guard let image = image else {
            errorMessage = "No image selected"
            return
        }
        
        guard let imageData = image.pngData() else {
            errorMessage = "Failed to convert image to data"
            return
        }
        
        guard let apiUrl = Bundle.main.infoDictionary?["API_URL"] as? String else {
            errorMessage = "API_URL not set"
            return
        }
        
        errorMessage = nil
        
        do {
            let response = try await scanReceipt(
                baseUrl: apiUrl,
                imageData: imageData.toKotlinByteArray()
            )
            
            if response.success {
                receiptDetails = response.data
            }
        } catch {
            print("Upload error: \(error)")
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
                byteArray
                    .set(index: Int32(index), value: Int8(bitPattern: byte))
            }
        }
        
        return byteArray
    }
}

struct CropViewController: UIViewControllerRepresentable {
    @Binding var image: UIImage?
    var onCropped: (UIImage) -> Void
    @Environment(\.presentationMode) var presentationMode

    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }

    func makeUIViewController(context: Context) -> TOCropViewController {
        let cropController = TOCropViewController(image: image ?? UIImage())
        cropController.delegate = context.coordinator
        return cropController
    }

    func updateUIViewController(_ uiViewController: TOCropViewController, context: Context) {}

    class Coordinator: NSObject, TOCropViewControllerDelegate {
        var parent: CropViewController
        init(_ parent: CropViewController) {
            self.parent = parent
        }
        func cropViewController(_ cropViewController: TOCropViewController, didCropTo image: UIImage, with cropRect: CGRect, angle: Int) {
            parent.onCropped(image)
            parent.presentationMode.wrappedValue.dismiss()
        }
        func cropViewController(_ cropViewController: TOCropViewController, didFinishCancelled cancelled: Bool) {
            parent.presentationMode.wrappedValue.dismiss()
        }
    }
}
