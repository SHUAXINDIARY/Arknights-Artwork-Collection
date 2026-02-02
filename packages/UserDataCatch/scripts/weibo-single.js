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
    bio: ''
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

  const bioEl = document.querySelector('[class*="ProfileHeader_desc"]') || document.querySelector('[class*="desc"]');
  if (bioEl) {
    result.bio = bioEl.innerText.trim();
  }

  const json = JSON.stringify(result, null, 2);
  
  console.log(result);
  return { success: true, data: result, json };
})();
