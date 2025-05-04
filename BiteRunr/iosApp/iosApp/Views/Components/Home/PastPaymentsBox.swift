import SwiftUI

struct PastPayment: Identifiable {
    let id = UUID()
    let name: String
    let date: Date
    let amount: Double
}

struct PastPaymentsBox: View {
    let payments: [PastPayment]
    let dateFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateStyle = .long
        return formatter
    }()

    var body: some View {
        HStack {
            Text("Past Payments")
                .font(.headline)
                .foregroundStyle(.secondary)
            Spacer()
            Button(action: {
                // See all action
            }) {
                Text("See all")
                    .foregroundColor(.orange)
                    .font(.subheadline)
            }
        }
        VStack(alignment: .leading, spacing: 16) {
            ForEach(payments.prefix(2)) { payment in
                HStack(spacing: 12) {
                    // Profile placeholder
                    Circle()
                        .fill(Color.gray.opacity(0.3))
                        .frame(width: 40, height: 40)
                        .overlay(
                            Image(systemName: "person.fill")
                                .foregroundColor(.gray)
                                .font(.system(size: 20))
                        )
                    VStack(alignment: .leading, spacing: 2) {
                        Text(payment.name)
                            .font(.body)
                            .fontWeight(.medium)
                        Text(dateFormatter.string(from: payment.date))
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    Spacer()
                    Text(String(format: "-$%.2f", payment.amount))
                        .font(.body)
                        .foregroundColor(.primary)
                }
                .padding(.vertical, 4)
            }
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 18)
                .fill(Color(.systemBackground))
                .overlay(
                    RoundedRectangle(cornerRadius: 18)
                        .stroke(Color(.systemGray4), lineWidth: 1.5)
                )
        )
    }
}
