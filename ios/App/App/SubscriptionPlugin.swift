import Capacitor
import StoreKit

@objc(SubscriptionPlugin)
public class SubscriptionPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "SubscriptionPlugin"
    public let jsName = "SubscriptionPlugin"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getStatus", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "purchase", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "restore", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getPrice", returnType: CAPPluginReturnPromise)
    ]
    
    @objc func getStatus(_ call: CAPPluginCall) {
        Task { @MainActor in
            await StoreManager.shared.updateSubscriptionStatus()
            call.resolve(["isSubscribed": StoreManager.shared.isSubscribed])
        }
    }
    
    @objc func purchase(_ call: CAPPluginCall) {
        Task { @MainActor in
            let success = await StoreManager.shared.purchase()
            call.resolve(["success": success, "isSubscribed": StoreManager.shared.isSubscribed])
        }
    }
    
    @objc func restore(_ call: CAPPluginCall) {
        Task { @MainActor in
            await StoreManager.shared.restore()
            call.resolve(["isSubscribed": StoreManager.shared.isSubscribed])
        }
    }
    
    @objc func getPrice(_ call: CAPPluginCall) {
        Task { @MainActor in
            await StoreManager.shared.loadProducts()
            let price = StoreManager.shared.products.first?.displayPrice ?? "$4.99"
            call.resolve(["price": price])
        }
    }
}
