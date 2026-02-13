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
    bio: '',
    type: 'x'
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

  // 请求远程关注列表数据，判断当前用户是否已被关注并展示到UI
  const followingUrl = 'https://raw.githubusercontent.com/SHUAXINDIARY/Arknights-Artwork-Collection/refs/heads/main/twitter.js';
  try {
    const response = await fetch(followingUrl);
    const text = await response.text();
    // 解析 JS 文件中的 following 数组（格式为 const following = [...]）
    const jsonMatch = text.match(/const\s+following\s*=\s*(\[[\s\S]*\])/);
    if (jsonMatch && jsonMatch[1]) {
      const following = JSON.parse(jsonMatch[1]);
      // 通过 nickname 和 avatar 匹配判断是否已关注
      // 清洗 avatar 地址，移除尺寸后缀以便比较
      const cleanAvatar = (url) => url ? url.replace(/_(normal|200x200|400x400)/, '') : '';
      const isFollowing = following.some(user =>
        user.nickname === result.nickname &&
        cleanAvatar(user.avatar) === cleanAvatar(result.avatar)
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

  console.log(json);
  return { success: true, data: result, json };
})();
