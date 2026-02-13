(async () => {
  // 验证是否在微博用户主页
  const urlPattern = /^https:\/\/weibo\.com\/u\/\d+\/?$/;
  if (!urlPattern.test(location.href.split('?')[0])) {
    return { 
      success: false, 
      error: '请在微博用户主页执行此操作（如 https://weibo.com/u/123456）' 
    };
  }

  const result = {
    nickname: '',
    avatar: '',
    profile: location.href,
    bio: '',
    type: 'weibo'
  };

  const nameEl = document.querySelector('._name_1yc79_291');
  if (nameEl) {
    result.nickname = nameEl.innerText.trim();
  }

  const avatarImg = document.querySelector('.woo-avatar-img');
  if (avatarImg) {
    result.avatar = avatarImg.src;
  }

  const uidMatch = location.href.match(/\/u\/(\d+)/);
  if (uidMatch) {
    result.profile = "https://weibo.com/u/" + uidMatch[1];
  }

  // 如果没有 nickname，从 profile 提取 uid 作为 nickname
  if (!result.nickname && uidMatch) {
    result.nickname = uidMatch[1];
  }

  const bioEl = document.querySelector('._con3_1yc79_224') || document.querySelector('[class*="_con3_"]') || document.querySelector('[class*="ProfileHeader_desc"]');
  if (bioEl) {
    result.bio = bioEl.innerText.trim();
  }

  const json = JSON.stringify(result, null, 2);
  
  console.log(result);
  return { success: true, data: result, json };
})();
