const THEME_KEY = 'preferred-theme';
const THEME_LIGHT = 'light';
const THEME_DARK = 'dark';
const themeColorMeta = document.querySelector('meta[name="theme-color"]');
const langBtns = document.querySelectorAll('.lang-btn');
const enElements = document.querySelectorAll('.en');
const zhElements = document.querySelectorAll('.zh');
const themeToggleBtn = document.getElementById('theme-toggle');

function getCurrentTheme() {
  return document.documentElement.classList.contains('theme-light') ? THEME_LIGHT : THEME_DARK;
}

/**
 * 读取并规范化主题偏好，优先本地缓存，其次跟随系统主题。
 * @returns {'light'|'dark'} 规范化后的主题值
 */
function resolvePreferredTheme() {
  const savedTheme = localStorage.getItem(THEME_KEY);
  if (savedTheme === THEME_LIGHT || savedTheme === THEME_DARK) {
    return savedTheme;
  }

  return window.matchMedia('(prefers-color-scheme: light)').matches ? THEME_LIGHT : THEME_DARK;
}

function updateThemeToggleLabel(theme) {
  if (!themeToggleBtn) {
    return;
  }

  const isEn = document.documentElement.lang === 'en';
  const targetThemeText = theme === THEME_LIGHT
    ? (isEn ? 'dark mode' : '深色模式')
    : (isEn ? 'light mode' : '浅色模式');
  const titleText = isEn ? `Switch to ${targetThemeText}` : `切换到${targetThemeText}`;
  themeToggleBtn.textContent = theme === THEME_LIGHT ? '☀️' : '🌙';
  themeToggleBtn.setAttribute('title', titleText);
  themeToggleBtn.setAttribute('aria-label', titleText);
}

function setTheme(theme) {
  const normalizedTheme = theme === THEME_LIGHT ? THEME_LIGHT : THEME_DARK;

  document.documentElement.classList.toggle('theme-light', normalizedTheme === THEME_LIGHT);
  document.body.classList.toggle('theme-light', normalizedTheme === THEME_LIGHT);
  localStorage.setItem(THEME_KEY, normalizedTheme);
  if (themeColorMeta) {
    themeColorMeta.setAttribute('content', normalizedTheme === THEME_LIGHT ? '#f5f7fa' : '#0f141d');
  }
  updateThemeToggleLabel(normalizedTheme);
}

function setLanguage(lang) {
  langBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === lang);
  });

  if (lang === 'en') {
    enElements.forEach(el => el.classList.remove('hidden'));
    zhElements.forEach(el => el.classList.add('hidden'));
    document.documentElement.lang = 'en';
  } else {
    enElements.forEach(el => el.classList.add('hidden'));
    zhElements.forEach(el => el.classList.remove('hidden'));
    document.documentElement.lang = 'zh-CN';
  }

  localStorage.setItem('preferred-lang', lang);
  updateThemeToggleLabel(getCurrentTheme());
}

langBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    setLanguage(btn.dataset.lang);
  });
});

// Load saved language preference
const savedLang = localStorage.getItem('preferred-lang');
if (savedLang) {
  setLanguage(savedLang);
}

setTheme(resolvePreferredTheme());

if (themeToggleBtn) {
  themeToggleBtn.addEventListener('click', () => {
    setTheme(getCurrentTheme() === THEME_LIGHT ? THEME_DARK : THEME_LIGHT);
  });
}

// 图片全屏预览功能
const imgModal = document.getElementById('img-modal');
const imgModalPreview = document.getElementById('img-modal-preview');
const imgModalClose = document.getElementById('img-modal-close');
const friendImages = document.querySelectorAll('.friend-img');

function openImageModal(src) {
  imgModalPreview.src = src;
  imgModal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeImageModal() {
  imgModal.classList.remove('active');
  document.body.style.overflow = '';
}

friendImages.forEach(img => {
  img.addEventListener('click', () => {
    openImageModal(img.src);
  });
});

imgModalClose.addEventListener('click', closeImageModal);

imgModal.addEventListener('click', (e) => {
  if (e.target === imgModal) {
    closeImageModal();
  }
});

// ESC 键关闭
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && imgModal.classList.contains('active')) {
    closeImageModal();
  }
});
