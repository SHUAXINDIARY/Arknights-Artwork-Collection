(async () => {
  // 验证是否在 x.com 用户主页
  const urlPattern = /^https:\/\/(x\.com|twitter\.com)\/[^\/]+\/?$/;
  if (!urlPattern.test(location.href.split('?')[0])) {
    return { 
      success: false, 
      error: '请在 X/Twitter 用户主页执行此操作（如 https://x.com/username）' 
    };
  }

  const result = {
    nickname: '',
    avatar: '',
    profile: location.origin + location.pathname,
    bio: ''
  };

  const nameEl = document.querySelector('[data-testid="UserName"] span span');
  if (nameEl) {
    result.nickname = nameEl.innerText.trim();
  }

  const avatarImg = document.querySelector('img[alt="打开个人资料照片"][src*="pbs.twimg.com/profile_images"]');
  if (avatarImg) {
    result.avatar = avatarImg.src.replace(/_(normal|200x200|400x400)/, '');
  }

  const bioEl = document.querySelector('[data-testid="UserDescription"]');
  if (bioEl) {
    result.bio = bioEl.innerText.trim();
  }

  const json = JSON.stringify(result, null, 2);
  
  console.log(json);
  return { success: true, data: result, json };
})();
