f = open('src/app/page.tsx', 'r')
c = f.read()
f.close()

# Add handleSubscribe and handleRestore functions after isNative state
old = "const [isNative, setIsNative] = useState(false);"
new = """const [isNative, setIsNative] = useState(false);

  const handleSubscribe = async () => {
    const w = window as any;
    if (w.Capacitor?.Plugins?.SubscriptionPlugin) {
      try {
        const result = await w.Capacitor.Plugins.SubscriptionPlugin.purchase();
        if (result.isSubscribed) { setIsSubscribed(true); setScreen('home'); }
      } catch {}
    }
  };

  const handleRestore = async () => {
    const w = window as any;
    if (w.Capacitor?.Plugins?.SubscriptionPlugin) {
      try {
        const result = await w.Capacitor.Plugins.SubscriptionPlugin.restore();
        if (result.isSubscribed) { setIsSubscribed(true); setScreen('home'); }
      } catch {}
    }
  };"""

c = c.replace(old, new, 1)

# Wire Subscribe button
old_sub = 'Subscribe \u2014 $4.99/month\n              </button>'
new_sub = 'Subscribe \u2014 $4.99/month\n              </button>'

# Use a different approach - find the subscribe button and add onClick
c = c.replace(
    'rounded-lg bg-gray-900 text-white font-sans font-semibold text-sm hover:opacity-85 transition --opacity mb-3">\n                Subscribe',
    'rounded-lg bg-gray-900 text-white font-sans font-semibold text-sm hover:opacity-85 transition --opacity mb-3" onClick={handleSubscribe}>\n                Subscribe'
)

# Wire Restore button  
c = c.replace(
    'rounded-lg border-[1.5px] border-gray-200 text-gray-500 font-sans font-semibold text-sm hover:bg-gray-50 transition-colors mb-3">\n                Restore Purchase',
    'rounded-lg border-[1.5px] border-gray-200 text-gray-500 font-sans font-semibold text-sm hover:bg-gray-50 transition-colors mb-3" onClick={handleRestore}>\n                Restore Purchase'
)

f = open('src/app/page.tsx', 'w')
f.write(c)
f.close()
print('done')
