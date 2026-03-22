#!/usr/bin/env python3
"""
Patches page.tsx to add:
1. One-day free trial (first day = full access, after that = paywall for everything)
2. Promo code display on paywall screen
"""

import re

filepath = '/Users/monjori/Desktop/the-daily-quiz/src/app/page.tsx'  # Mac path
# Also try relative path
import os
if not os.path.exists(filepath):
    filepath = os.path.expanduser('~/Desktop/the-daily-quiz/src/app/page.tsx')

with open(filepath, 'r') as f:
    content = f.read()

# 1. Add trialActive state after isNative state
old_state = "const [isNative, setIsNative] = useState(false);"
new_state = """const [isNative, setIsNative] = useState(false);
  const [trialActive, setTrialActive] = useState(true);"""
content = content.replace(old_state, new_state)

# 2. Add trial check useEffect after the subscription check useEffect
# Find the closing of the subscription useEffect (the one with checkSub)
old_checksub = """    checkSub();
  }, []);"""
new_checksub = """    checkSub();
  }, []);

  // Trial system: 1 day free access, then paywall
  useEffect(() => {
    const firstLaunch = localStorage.getItem('newzplay_first_launch');
    if (!firstLaunch) {
      // First time opening the app — start the trial
      localStorage.setItem('newzplay_first_launch', new Date().toISOString());
      setTrialActive(true);
    } else {
      // Check if trial has expired (more than 24 hours since first launch)
      const launchDate = new Date(firstLaunch);
      const now = new Date();
      const hoursSinceLaunch = (now.getTime() - launchDate.getTime()) / (1000 * 60 * 60);
      setTrialActive(hoursSinceLaunch < 24);
    }
  }, []);"""
content = content.replace(old_checksub, new_checksub)

# 3. Change the locked logic — remove cat.free exception, add trial check
old_locked = "const locked = !cat.free && !isSubscribed;"
new_locked = "const locked = !isSubscribed && !trialActive;"
content = content.replace(old_locked, new_locked)

# 4. Update the paywall subscribe button text to show promo
old_unlock = '>Unlock All Categories — $4.99/mo</button>'
new_unlock = """>Unlock All Categories — $4.99/mo</button>
                <p className="text-center text-xs text-gray-400 font-sans mt-2">Use code <span className="font-semibold text-amber-600">NEWZPLAY10</span> for 10% off your first month</p>"""
content = content.replace(old_unlock, new_unlock)

# 5. Update the "Upgrade" button at bottom of results screen too
old_upgrade = '>Upgrade — $4.99/mo</button>'
new_upgrade = """>Upgrade — $4.99/mo</button>
                <p className="text-center text-xs text-gray-400 font-sans mt-1">Code <span className="font-semibold text-amber-600">NEWZPLAY10</span> = 10% off first month</p>"""
content = content.replace(old_upgrade, new_upgrade)

with open(filepath, 'w') as f:
    f.write(content)

print("✅ Patched page.tsx successfully!")
print("   - Added 1-day trial system (localStorage-based)")
print("   - All categories free for first 24 hours")
print("   - After 24 hours, everything locked (including World)")
print("   - Promo code NEWZPLAY10 shown on paywall")
print("")
print("⚠️  IMPORTANT: The promo code 'NEWZPLAY10' is just displayed in the UI.")
print("   You need to create an Offer Code in App Store Connect:")
print("   1. Go to App Store Connect → Your App → Subscriptions")
print("   2. Click on 'Newzplay Premium' subscription")
print("   3. Go to 'Offer Codes'")
print("   4. Create a new offer code: NEWZPLAY10")
print("   5. Set it to 10% off the first billing period")
print("   6. Set the number of redemptions you want to allow")
