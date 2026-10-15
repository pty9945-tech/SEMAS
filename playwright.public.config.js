import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';
export default defineConfig({
  testDir:'./tests/public-browser',workers:1,timeout:45_000,
  reporter:[['list']],
  use:{baseURL:process.env.LIVE_SITE_URL||'http://127.0.0.1:3100/',browserName:'chromium',viewport:{width:1440,height:1000},
    launchOptions:{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||(existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),args:['--no-sandbox']}},
  webServer:process.env.LIVE_SITE_URL?undefined:{command:'node tests/support/public-server.js',url:'http://127.0.0.1:3100',reuseExistingServer:false,timeout:20_000},
});
