(async () => {
  // 常量定义
  const URL_PATTERN = /^https:\/\/(x\.com|twitter\.com)\/[^\/]+\/following\/?$/;
  const USER_TYPE = 'x';
  const BASE_URL = 'https://x.com';
  const MAX_IDLE_ROUNDS = 6;
  const SCROLL_DELAY_MS = 1500;
  const SELECTORS = {
    userCell: 'button[data-testid="UserCell"]',
    profileLink: 'a[href^="/"]:not([href*="/status"])',
    nameSpan: 'div[dir="ltr"] span span',
    avatar: 'img[src*="pbs.twimg.com/profile_images"]',
    bio: 'div[dir="auto"] span'
  };

  // 工具函数
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  // 验证是否在 X/Twitter 关注列表页
  const currentUrl = location.href.split('?')[0];
  if (!URL_PATTERN.test(currentUrl)) {
    return {
      success: false,
      error: '请在 X/Twitter 关注列表页执行此操作（如 https://x.com/username/following）'
    };
  }

  const results = [];
  const seenProfiles = new Set();
  let lastCount = 0;
  let idleRounds = 0;

  // 单次收集函数
  const collectOnce = () => {
    const cells = document.querySelectorAll(SELECTORS.userCell);

    cells.forEach((cell) => {
      try {
        const profileLinkEl = cell.querySelector(SELECTORS.profileLink);
        const path = profileLinkEl?.getAttribute('href');
        if (!path || path.split('/').length !== 2) return;

        const profile = BASE_URL + path;
        if (seenProfiles.has(profile)) return;
        seenProfiles.add(profile);

        const nameSpan = cell.querySelector(SELECTORS.nameSpan);
        const nickname = nameSpan?.innerText?.trim() || '';

        const img = cell.querySelector(SELECTORS.avatar);
        const avatar = img?.src || '';

        const bioSpan = cell.querySelector(SELECTORS.bio);
        const bio = bioSpan?.innerText?.trim() || '';

        results.push({ nickname, avatar, profile, bio, type: USER_TYPE });
      } catch (error) {
        console.warn('[X抓取] 解析用户数据失败:', error);
      }
    });
  };

  console.log('[X抓取] 开始自动滚动抓取...');

  let stopped = false;

  while (true) {
    // 检查是否被手动停止
    if (window.__STOP_CRAWL__) {
      console.log('[X抓取] 用户手动停止');
      stopped = true;
      break;
    }

    collectOnce();

    // 检测是否有新数据
    if (results.length === lastCount) {
      idleRounds++;
    } else {
      idleRounds = 0;
      lastCount = results.length;
    }

    console.log(`[X抓取] 当前已抓取 ${results.length} 条`);

    // 多轮无新增则自动停止
    if (idleRounds >= MAX_IDLE_ROUNDS) {
      console.log('[X抓取] 多轮无新增，自动停止');
      break;
    }

    window.scrollBy(0, window.innerHeight * 2);
    await sleep(SCROLL_DELAY_MS);
  }

  console.log(`[X抓取] 完成，总数: ${results.length}`);

  const json = JSON.stringify(results, null, 2);

  return { success: true, count: results.length, json, stopped };
})();
