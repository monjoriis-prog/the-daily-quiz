import StoreKit

@MainActor
class StoreManager: ObservableObject {

    static let shared = StoreManager()

    // This must match the Product ID you created in App Store Connect
    private let productId = "com.newzplay.premium.monthly"
    private var updateTask: Task<Void, Never>?

    init() {
        // Listen for subscription changes (renewals, cancellations, etc.)
        updateTask = Task(priority: .background) {
            for await result in Transaction.updates {
                if case .verified(let transaction) = result {
                    await transaction.finish()
                }
            }
        }
    }

    deinit {
        updateTask?.cancel()
    }

    /// Check if the user currently has an active subscription
    func isSubscriptionActive() async -> Bool {
        for await result in Transaction.currentEntitlements {
            if case .verified(let transaction) = result {
                if transaction.productID == productId && !transaction.isUpgraded {
                    // Check it hasn't expired
                    if let expirationDate = transaction.expirationDate {
                        if expirationDate > Date() {
                            return true
                        }
                    } else {
                        // No expiration = still active
                        return true
                    }
                }
            }
        }
        return false
    }

    /// Start a purchase flow for the monthly subscription
    func purchase() async throws -> Bool {
        // Fetch the product from App Store
        let products = try await Product.products(for: [productId])
        guard let product = products.first else {
            print("[StoreManager] Product not found: \(productId)")
            return false
        }

        // Start the purchase
        let result = try await product.purchase()

        switch result {
        case .success(let verification):
            if case .verified(let transaction) = verification {
                await transaction.finish()
                print("[StoreManager] Purchase successful!")
                return true
            }
            print("[StoreManager] Purchase not verified")
            return false
        case .userCancelled:
            print("[StoreManager] User cancelled")
            return false
        case .pending:
            print("[StoreManager] Purchase pending (e.g. parental approval)")
            return false
        @unknown default:
            return false
        }
    }

    /// Restore previous purchases (e.g. if user reinstalled the app)
    func restore() async -> Bool {
        do {
            try await AppStore.sync()
            let isActive = await isSubscriptionActive()
            print("[StoreManager] Restore result: \(isActive)")
            return isActive
        } catch {
            print("[StoreManager] Restore failed: \(error)")
            return false
        }
    }
}
