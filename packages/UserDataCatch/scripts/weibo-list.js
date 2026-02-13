(async () => {
  // 常量定义
  const URL_PATTERN = /^https:\/\/weibo\.com\/u\/page\/follow\/\d+\/?$/;
  const USER_TYPE = 'weibo';
  const BASE_URL = 'https://weibo.com';
  const MAX_SAME_HEIGHT_ROUNDS = 3;
  const SCROLL_DELAY_MS = 2000;
  const SELECTORS = {
    userCard: 'div[class*="_userFeedCard_"]',
    profileLink: 'a[href^="/u/"]',
    nickname: 'span[usercard]',
    bio: 'div[class*="_clb_"]'
  };

  // 工具函数
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  // 验证是否在微博关注列表页
  const currentUrl = location.href.split('?')[0];
  if (!URL_PATTERN.test(currentUrl)) {
    return {
      success: false,
      error: '请在微博关注列表页执行此操作（如 https://weibo.com/u/page/follow/123456）'
    };
  }

  const results = [];
  const seenProfiles = new Set();
  let lastScrollHeight = 0;
  let sameHeightCount = 0;

  // 单次收集函数
  const collectOnce = () => {
    const cards = document.querySelectorAll(SELECTORS.userCard);

    cards.forEach((card) => {
      const link = card.querySelector(SELECTORS.profileLink);
      if (!link) return;

      const profile = BASE_URL + link.getAttribute('href');
      if (seenProfiles.has(profile)) return;
      seenProfiles.add(profile);

      const nicknameEl = link.querySelector(SELECTORS.nickname);
      const nickname = nicknameEl?.innerText?.trim() || '';

      const imgEl = link.querySelector('img');
      const avatar = imgEl?.getAttribute('src') || imgEl?.getAttribute('data-src') || '';

      const bioEl = link.querySelector(SELECTORS.bio);
      const bio = bioEl?.innerText?.trim() || '';

      results.push({ nickname, avatar, profile, bio, type: USER_TYPE });
    });

    console.log(`[微博抓取] 当前已抓取 ${results.length} 条`);
  };

  console.log('[微博抓取] 开始自动滚动抓取...');

  let stopped = false;

  while (true) {
    // 检查是否被手动停止
    if (window.__STOP_CRAWL__) {
      console.log('[微博抓取] 用户手动停止');
      stopped = true;
      break;
    }

    collectOnce();

    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    await sleep(SCROLL_DELAY_MS);

    const currentHeight = document.body.scrollHeight;

    // 检测页面是否触底
    if (currentHeight === lastScrollHeight) {
      sameHeightCount++;
      console.log(`[微博抓取] 页面高度未变化 (${sameHeightCount}/${MAX_SAME_HEIGHT_ROUNDS})`);
    } else {
      sameHeightCount = 0;
      lastScrollHeight = currentHeight;
    }

    // 多轮高度未变化则触底
    if (sameHeightCount >= MAX_SAME_HEIGHT_ROUNDS) {
      collectOnce(); // 最后再收集一次
      break;
    }
  }

  console.log(`[微博抓取] 完成，总数: ${results.length}`);

  const json = JSON.stringify(results, null, 2);

  return { success: true, count: results.length, json, stopped };
})();
