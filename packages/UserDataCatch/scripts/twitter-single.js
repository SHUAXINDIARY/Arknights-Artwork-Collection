(async () => {
  // 常量定义
  const URL_PATTERN = /^https:\/\/(x\.com|twitter\.com)\/[^\/]+\/?$/;
  const USER_TYPE = 'x';
  const SELECTORS = {
    userName: '[data-testid="UserName"] span span',
    avatar: 'img[alt="打开个人资料照片"][src*="pbs.twimg.com/profile_images"]',
    bio: '[data-testid="UserDescription"]'
  };

  // 验证是否在 X/Twitter 用户主页
  const currentUrl = location.href.split('?')[0];
  if (!URL_PATTERN.test(currentUrl)) {
    return {
      success: false,
      error: '请在 X/Twitter 用户主页执行此操作（如 https://x.com/username）'
    };
  }

  // 从 URL 路径提取用户名作为 nickname 兜底
  const extractUsernameFromPath = () => {
    const pathParts = location.pathname.split('/').filter(Boolean);
    return pathParts[pathParts.length - 1] || '';
  };

  // 获取昵称
  const nameEl = document.querySelector(SELECTORS.userName);
  const nickname = nameEl?.innerText?.trim() || extractUsernameFromPath();

  // 获取头像（移除尺寸后缀获取原图）
  const avatarImg = document.querySelector(SELECTORS.avatar);
  const avatar = avatarImg?.src?.replace(/_(normal|200x200|400x400)/, '') || '';

  // 获取简介
  const bioEl = document.querySelector(SELECTORS.bio);
  const bio = bioEl?.innerText?.trim() || '';

  const result = {
    nickname,
    avatar,
    profile: location.origin + location.pathname,
    bio,
    type: USER_TYPE
  };

  const json = JSON.stringify(result, null, 2);
  console.log('[X抓取] 用户数据:', json);

  return { success: true, data: result, json };
})();
