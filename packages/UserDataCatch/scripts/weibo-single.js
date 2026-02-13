(async () => {
  // 常量定义
  const URL_PATTERN = /^https:\/\/weibo\.com\/u\/\d+\/?$/;
  const UID_PATTERN = /\/u\/(\d+)/;
  const USER_TYPE = 'weibo';
  const BASE_URL = 'https://weibo.com/u/';
  const SELECTORS = {
    name: '._name_1yc79_291',
    avatar: '.woo-avatar-img',
    bio: ['._con3_1yc79_224', '[class*="_con3_"]', '[class*="ProfileHeader_desc"]']
  };

  // 验证是否在微博用户主页
  const currentUrl = location.href.split('?')[0];
  if (!URL_PATTERN.test(currentUrl)) {
    return {
      success: false,
      error: '请在微博用户主页执行此操作（如 https://weibo.com/u/123456）'
    };
  }

  // 从 URL 提取 UID
  const uidMatch = location.href.match(UID_PATTERN);
  const uid = uidMatch?.[1] || '';

  // 获取昵称（兜底使用 UID）
  const nameEl = document.querySelector(SELECTORS.name);
  const nickname = nameEl?.innerText?.trim() || uid;

  // 获取头像
  const avatarImg = document.querySelector(SELECTORS.avatar);
  const avatar = avatarImg?.src || '';

  // 获取简介（尝试多个选择器）
  const bioEl = SELECTORS.bio
    .map((selector) => document.querySelector(selector))
    .find((el) => el !== null);
  const bio = bioEl?.innerText?.trim() || '';

  // 构建标准化的 profile URL
  const profile = uid ? BASE_URL + uid : location.href;

  const result = {
    nickname,
    avatar,
    profile,
    bio,
    type: USER_TYPE
  };

  const json = JSON.stringify(result, null, 2);
  console.log('[微博抓取] 用户数据:', json);

  return { success: true, data: result, json };
})();
