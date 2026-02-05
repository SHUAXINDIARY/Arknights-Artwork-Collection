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

  const bioEl = document.querySelector('._con3_1yc79_224') || document.querySelector('[class*="_con3_"]') || document.querySelector('[class*="ProfileHeader_desc"]');
  if (bioEl) {
    result.bio = bioEl.innerText.trim();
  }

  // 请求远程关注列表数据，判断当前用户是否已被关注并展示到UI
  const followingUrl = 'https://raw.githubusercontent.com/SHUAXINDIARY/Arknights-Artwork-Collection/refs/heads/main/weibo.js';
  try {
    const response = await fetch(followingUrl);
    const text = await response.text();
    // 解析 JS 文件中的 weibo 数组（格式为 const weibo = [...]）
    const jsonMatch = text.match(/const\s+weibo\s*=\s*(\[[\s\S]*\])/);
    if (jsonMatch && jsonMatch[1]) {
      const weibo = JSON.parse(jsonMatch[1]);
      // 通过 nickname 和 avatar 匹配判断是否已关注
      const isFollowing = weibo.some(user => 
        user.nickname === result.nickname
        //  && 
        // user.avatar === result.avatar
      );
      
      // 在页面上展示关注状态
      const existingBadge = document.getElementById('arknights-following-badge');
      if (existingBadge) existingBadge.remove();
      
      const badge = document.createElement('div');
      badge.id = 'arknights-following-badge';
      badge.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: bold;
        z-index: 9999;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        transition: opacity 0.3s;
        cursor: pointer;
        ${isFollowing 
          ? 'background: linear-gradient(135deg, #10b981, #059669); color: white;' 
          : 'background: linear-gradient(135deg, #f59e0b, #d97706); color: white;'}
      `;
      badge.textContent = isFollowing ? '✓ 已在收藏列表中' : '✗ 未在收藏列表中';
      badge.title = '点击关闭';
      badge.onclick = () => badge.remove();
      document.body.appendChild(badge);
      
      // 5秒后自动淡出
      setTimeout(() => {
        badge.style.opacity = '0';
        setTimeout(() => badge.remove(), 300);
      }, 5000);
    }
  } catch (err) {
    console.error('获取关注列表失败:', err);
  }

  const json = JSON.stringify(result, null, 2);
  
  console.log(result);
  return { success: true, data: result, json };
})();
