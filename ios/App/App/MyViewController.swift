import UIKit
import Capacitor

class MyViewController: CAPBridgeViewController {

    // This is where we register our custom plugin so the web app can talk to it.
    // Without this, the SubscriptionPlugin is never connected to the Capacitor bridge.
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(SubscriptionPlugin())
    }

    // Keep the status bar visible but with light (white) text
    override var preferredStatusBarStyle: UIStatusBarStyle {
        return .lightContent
    }
}
