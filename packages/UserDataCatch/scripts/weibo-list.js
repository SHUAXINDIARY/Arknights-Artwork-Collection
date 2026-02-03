(async () => {
  // 验证是否在微博关注列表页面
  const urlPattern = /^https:\/\/weibo\.com\/u\/page\/follow\/\d+\/?$/;
  if (!urlPattern.test(location.href.split('?')[0])) {
    return { 
      success: false, 
      error: '请在微博关注列表页执行此操作（如 https://weibo.com/u/page/follow/123456）' 
    };
  }

  const result = [];
  const seen = new Set();

  let lastScrollHeight = 0;
  let sameHeightCount = 0;
  const MAX_SAME_HEIGHT = 3;

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function collectOnce() {
    const cards = document.querySelectorAll('div[class*="_userFeedCard_"]');

    cards.forEach((card) => {
      const link = card.querySelector('a[href^="/u/"]');
      if (!link) return;

      const profile = "https://weibo.com" + link.getAttribute("href");
      if (seen.has(profile)) return;
      seen.add(profile);

      const nickname = link.querySelector("span[usercard]")?.innerText?.trim() || "";
      const avatar = link.querySelector("img")?.getAttribute("src") || link.querySelector("img")?.getAttribute("data-src") || "";
      const bio = link.querySelector('div[class*="_clb_"]')?.innerText?.trim() || "";

      result.push({ nickname, avatar, profile, bio });
    });

    console.log("📦 当前已抓取 " + result.length + " 条");
  }

  let stopped = false;

  while (true) {
    // 检查是否被手动停止
    if (window.__STOP_CRAWL__) {
      console.log("⏸️ 用户手动停止");
      stopped = true;
      break;
    }

    collectOnce();

    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    await sleep(2000);

    const currentHeight = document.body.scrollHeight;

    if (currentHeight === lastScrollHeight) {
      sameHeightCount++;
      console.log("⚠️ 页面高度未变化 (" + sameHeightCount + "/" + MAX_SAME_HEIGHT + ")");
    } else {
      sameHeightCount = 0;
      lastScrollHeight = currentHeight;
    }

    if (sameHeightCount >= MAX_SAME_HEIGHT) {
      collectOnce();
      break;
    }
  }

  console.log("✅ 已触底，抓取完成");
  
  const json = JSON.stringify(result, null, 2);
  
  return { success: true, count: result.length, json, stopped };
})();
