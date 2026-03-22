import StoreKit

@MainActor
class StoreManager: ObservableObject {
    static let shared = StoreManager()
    
    @Published var isSubscribed = false
    @Published var products: [Product] = []
    
    private let productId = "com.newzplay.premium.monthly"
    private var updateListenerTask: Task<Void, Error>?
    
    init() {
        updateListenerTask = listenForTransactions()
        Task {
            await loadProducts()
            await updateSubscriptionStatus()
        }
    }
    
    deinit {
        updateListenerTask?.cancel()
    }
    
    func loadProducts() async {
        do {
            products = try await Product.products(for: [productId])
        } catch {
            print("[StoreManager] Failed to load products: \(error)")
        }
    }
    
    func purchase() async -> Bool {
        guard let product = products.first else {
            print("[StoreManager] No products available")
            return false
        }
        
        do {
            let result = try await product.purchase()
            switch result {
            case .success(let verification):
                let transaction = try checkVerified(verification)
                await transaction.finish()
                await updateSubscriptionStatus()
                return true
            case .userCancelled:
                return false
            case .pending:
                return false
            @unknown default:
                return false
            }
        } catch {
            print("[StoreManager] Purchase error: \(error)")
            return false
        }
    }
    
    func restore() async {
        try? await AppStore.sync()
        await updateSubscriptionStatus()
    }
    
    func updateSubscriptionStatus() async {
        var hasSubscription = false
        
        for await result in Transaction.currentEntitlements {
            if let transaction = try? checkVerified(result) {
                if transaction.productID == productId && transaction.revocationDate == nil {
                    hasSubscription = true
                }
            }
        }
        
        isSubscribed = hasSubscription
    }
    
    private func checkVerified<T>(_ result: VerificationResult<T>) throws -> T {
        switch result {
        case .unverified:
            throw StoreError.failedVerification
        case .verified(let item):
            return item
        }
    }
    
    private func listenForTransactions() -> Task<Void, Error> {
        return Task.detached {
            for await result in Transaction.updates {
                if let transaction = try? self.checkVerified(result) {
                    await transaction.finish()
                    await self.updateSubscriptionStatus()
                }
            }
        }
    }
}

enum StoreError: Error {
    case failedVerification
}
