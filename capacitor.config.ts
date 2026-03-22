import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.newzplay.app',
  appName: 'Newzplay',
  server: {
    url: 'https://newzplay.vercel.app',
    cleartext: false
  }
};

export default config;
