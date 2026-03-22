import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.newzplay.app',
  appName: 'Newzplay',
  webDir: 'out',
  server: {
    url: 'https://the-daily-quiz.vercel.app',
    cleartext: false
  },
  ios: {
    allowsLinkPreview: false,
    scrollEnabled: true,
    scheme: 'Newzplay'
  }
};

export default config;
