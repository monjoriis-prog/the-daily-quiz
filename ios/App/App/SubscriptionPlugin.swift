import Capacitor
import StoreKit

@objc(SubscriptionPlugin)
public class SubscriptionPlugin: CAPPlugin, CAPBridgedPlugin {

    // These 3 properties tell Capacitor how to find and call our plugin
    public let identifier = "SubscriptionPlugin"
    public let jsName = "SubscriptionPlugin"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getSubscriptionStatus", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "purchase", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "restore", returnType: CAPPluginReturnPromise)
    ]

    // Called by the web app to check if user has an active subscription
    @objc func getSubscriptionStatus(_ call: CAPPluginCall) {
        Task { @MainActor in
            let isActive = await StoreManager.shared.isSubscriptionActive()
            call.resolve(["isActive": isActive])
        }
    }

    // Called when user taps "Subscribe" in the web app
    @objc func purchase(_ call: CAPPluginCall) {
        Task { @MainActor in
            do {
                let success = try await StoreManager.shared.purchase()
                call.resolve(["success": success])
            } catch {
                call.reject("Purchase failed: \(error.localizedDescription)")
            }
        }
    }

    // Called when user taps "Restore Purchases" in the web app
    @objc func restore(_ call: CAPPluginCall) {
        Task { @MainActor in
            let restored = await StoreManager.shared.restore()
            call.resolve(["restored": restored])
        }
    }
}
