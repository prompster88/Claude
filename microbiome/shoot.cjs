const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const scenes = (process.argv[2] || '1,2,3').split(',');
  const W = +(process.argv[3] || 2000), H = +(process.argv[4] || 1250);
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  for (const s of scenes) {
    const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
    page.on('console', m => console.log('[page]', m.text()));
    page.on('pageerror', e => console.log('[pageerror]', e.message));
    const t0 = Date.now();
    await page.goto(`http://127.0.0.1:8765/render.html?scene=${s}`);
    await page.waitForFunction(() => window.__done === true, null, { timeout: 600000 });
    await page.screenshot({ path: `out/scene${s}.png` });
    console.log(`scene ${s} done in ${((Date.now()-t0)/1000).toFixed(1)}s`);
    await page.close();
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
