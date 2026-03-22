f = open('src/app/page.tsx', 'r')
c = f.read()
f.close()

# Add subscription check useEffect after isNative state
old = "const [isNative, setIsNative] = useState(false);"
new = """const [isNative, setIsNative] = useState(false);

  useEffect(() => {
    const checkSub = async () => {
      const w = window as any;
      if (w.Capacitor && w.Capacitor.Plugins && w.Capacitor.Plugins.SubscriptionPlugin) {
        setIsNative(true);
        try {
          const result = await w.Capacitor.Plugins.SubscriptionPlugin.getStatus();
          setIsSubscribed(result.isSubscribed);
        } catch { setIsSubscribed(false); }
      } else {
        setIsSubscribed(true);
      }
    };
    checkSub();
  }, []);"""

c = c.replace(old, new, 1)

f = open('src/app/page.tsx', 'w')
f.write(c)
f.close()
print('done')
