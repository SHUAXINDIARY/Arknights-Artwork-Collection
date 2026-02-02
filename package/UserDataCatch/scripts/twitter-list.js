(async () => {
  // 验证是否在 x.com 用户关注列表页
  const urlPattern = /^https:\/\/(x\.com|twitter\.com)\/[^\/]+\/following\/?$/;
  if (!urlPattern.test(location.href.split('?')[0])) {
    return { 
      success: false, 
      error: '请在 X/Twitter 关注列表页执行此操作（如 https://x.com/username/following）' 
    };
  }

  const results = [];
  const seen = new Set();

  let lastCount = 0;
  let idleRounds = 0;

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function collectOnce() {
    const cells = document.querySelectorAll('button[data-testid="UserCell"]');

    cells.forEach((cell) => {
      try {
        const profileLinkEl = cell.querySelector('a[href^="/"]:not([href*="/status"])');
        const path = profileLinkEl?.getAttribute("href");
        if (!path || path.split("/").length !== 2) return;

        const profile = "https://x.com" + path;
        if (seen.has(profile)) return;
        seen.add(profile);

        const nameSpan = cell.querySelector('div[dir="ltr"] span span');
        const nickname = nameSpan?.innerText?.trim() || "";

        const img = cell.querySelector('img[src*="pbs.twimg.com/profile_images"]');
        const avatar = img?.src || "";

        let bio = "";
        const bioSpan = cell.querySelector('div[dir="auto"] span');
        if (bioSpan) bio = bioSpan.innerText.trim();

        results.push({ nickname, avatar, profile, bio });
      } catch (e) {
        console.warn("[X抓取] parse failed", e);
      }
    });
  }

  console.log("[X抓取] 开始自动滚动抓取...");

  while (true) {
    collectOnce();

    if (results.length === lastCount) {
      idleRounds++;
    } else {
      idleRounds = 0;
      lastCount = results.length;
    }

    console.log("[X抓取] 当前已抓取 " + results.length);

    if (idleRounds >= 6) {
      console.log("[X抓取] 多轮无新增，自动停止");
      break;
    }

    window.scrollBy(0, window.innerHeight * 2);
    await sleep(1500);
  }

  console.log("[X抓取] 完成，总数:", results.length);
  
  const json = JSON.stringify(results, null, 2);
  
  return { success: true, count: results.length, json };
})();
