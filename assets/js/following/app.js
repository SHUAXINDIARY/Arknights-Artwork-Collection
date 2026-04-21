import { PAGE_SIZE, THEME_KEY } from "./constants.js";
import { elements } from "./dom.js";
import { state, isLocal } from "./state.js";
import { loadData, testImageLoading, filterData } from "./data.js";
import { createRenderer } from "./render.js";

/**
 * 主题常量：统一主题字符串，避免散落魔法值。
 */
const THEME_LIGHT = "light";
const THEME_DARK = "dark";

/**
 * 页面渲染器：负责列表绘制与微博头像懒加载。
 */
const { render, initWeiboImageObserver } = createRenderer({
    state,
    elements,
    isLocal,
    pageSize: PAGE_SIZE,
    filterData,
});

/**
 * 重置分页可见数量到第一页。
 * @returns {void} 无返回值
 */
function resetPagination() {
    state.visibleCount = PAGE_SIZE;
}

/**
 * 按 profile 删除用户并重绘列表。
 * @param {string} profile 用户唯一主页链接
 * @returns {void} 无返回值；未命中时不做任何处理
 */
function deleteUser(profile) {
    const index = state.currentData.findIndex((user) => user.profile === profile);
    if (index !== -1) {
        state.currentData.splice(index, 1);
        state.deletedCount += 1;
        render();
    }
}

/**
 * 导出当前筛选结果为 JS 文件。
 * @returns {void} 无返回值；会触发浏览器下载行为
 */
function exportJSON() {
    const filtered = filterData(state);
    const dataStr = `const following = ${JSON.stringify(filtered, null, 2)}`;
    const blob = new Blob([dataStr], {
        type: "application/javascript",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `following_${new Date().toISOString().slice(0, 10)}.js`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * 获取当前主题。
 * @returns {"light" | "dark"} 当前主题名称
 */
function getCurrentTheme() {
    return document.body.classList.contains("theme-light")
        ? THEME_LIGHT
        : THEME_DARK;
}

/**
 * 读取并规范化主题偏好，优先本地缓存，其次跟随系统主题。
 * @returns {"light" | "dark"} 规范化后的主题值
 */
function resolvePreferredTheme() {
    const savedTheme = localStorage.getItem(THEME_KEY);
    if (savedTheme === THEME_LIGHT || savedTheme === THEME_DARK) {
        return savedTheme;
    }

    return window.matchMedia("(prefers-color-scheme: light)").matches
        ? THEME_LIGHT
        : THEME_DARK;
}

/**
 * 更新主题切换按钮文案与辅助属性。
 * @param {"light" | "dark"} theme 当前生效主题
 * @returns {void} 无返回值
 */
function updateThemeSwitchLabel(theme) {
    const isEn = document.body.classList.contains("lang-en");
    const targetThemeText =
        theme === THEME_LIGHT
            ? isEn
                ? "dark mode"
                : "深色模式"
            : isEn
              ? "light mode"
              : "浅色模式";
    const titleText = isEn ? `Switch to ${targetThemeText}` : `切换到${targetThemeText}`;
    elements.themeSwitch.textContent = theme === THEME_LIGHT ? "☀️" : "🌙";
    elements.themeSwitch.title = titleText;
    elements.themeSwitch.setAttribute("aria-label", titleText);
}

/**
 * 应用主题并持久化到 localStorage。
 * @param {"light" | "dark"} theme 目标主题
 * @returns {void} 无返回值
 */
function setTheme(theme) {
    const normalizedTheme = theme === THEME_LIGHT ? THEME_LIGHT : THEME_DARK;
    document.body.classList.toggle("theme-light", normalizedTheme === THEME_LIGHT);
    localStorage.setItem(THEME_KEY, normalizedTheme);
    if (elements.themeColorMeta) {
        elements.themeColorMeta.setAttribute(
            "content",
            normalizedTheme === THEME_LIGHT ? "#f7f9fa" : "#0f141d",
        );
    }
    updateThemeSwitchLabel(normalizedTheme);
}

/**
 * 切换语言并刷新依赖语言的动态文案。
 * @param {"zh" | "en"} lang 目标语言
 * @returns {void} 无返回值
 */
function setLang(lang) {
    state.currentLang = lang;
    localStorage.setItem("lang", lang);
    if (lang === "en") {
        document.body.classList.add("lang-en");
        elements.searchInput.placeholder = elements.searchInput.dataset.placeholderEn;
        elements.backTopBtn.title = elements.backTopBtn.dataset.titleEn;
    } else {
        document.body.classList.remove("lang-en");
        elements.searchInput.placeholder = elements.searchInput.dataset.placeholderZh;
        elements.backTopBtn.title = elements.backTopBtn.dataset.titleZh;
    }
    updateThemeSwitchLabel(getCurrentTheme());
    render();
}

/**
 * 绑定页面交互事件。
 * @returns {void} 无返回值
 */
function bindEvents() {
    // 记录防抖定时器，避免每次输入都触发重渲染。
    let searchTimeout = null;

    elements.searchInput.addEventListener("input", (event) => {
        // 搜索输入做防抖，降低频繁重渲染开销。
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            state.searchTerm = event.target.value.trim();
            resetPagination();
            render();
        }, 300);
    });

    elements.filterBtns.forEach((btn) => {
        btn.addEventListener("click", () => {
            const group = btn.closest(".filter-group");
            const groupType = group.dataset.group;
            const filterValue = btn.dataset.filter;

            if (groupType === "platform") {
                // 平台筛选为单选。
                group
                    .querySelectorAll(".filter-btn")
                    .forEach((item) => item.classList.remove("active"));
                btn.classList.add("active");
                state.filters.platform = filterValue;
            } else if (groupType === "bio") {
                // 简介筛选与平台一致，改为单选。
                group
                    .querySelectorAll(".filter-btn")
                    .forEach((item) => item.classList.remove("active"));
                btn.classList.add("active");
                state.filters.bio = filterValue;
            }
            resetPagination();
            render();
        });
    });

    elements.loadMoreBtn?.addEventListener("click", () => {
        // 按分页步长扩展可见数量，避免一次性渲染过多卡片。
        state.visibleCount += PAGE_SIZE;
        render();
    });

    // 使用事件委托处理删除按钮，兼容列表重渲染。
    elements.grid.addEventListener("click", (event) => {
        const deleteBtn = event.target.closest('[data-action="delete-user"]');
        if (!deleteBtn) {
            return;
        }
        const profile = decodeURIComponent(deleteBtn.dataset.profile || "");
        deleteUser(profile);
    });

    window.addEventListener("scroll", () => {
        // 滚动超过阈值后显示“返回顶部”按钮，提升长列表可用性。
        if (window.scrollY > 300) {
            elements.backTopBtn.classList.add("visible");
        } else {
            elements.backTopBtn.classList.remove("visible");
        }
    });

    elements.backTopBtn.addEventListener("click", () => {
        // 保持平滑滚动体验，避免跳变。
        window.scrollTo({ top: 0, behavior: "smooth" });
    });

    // 仅在本地调试场景开启导出能力。
    elements.exportBtn?.addEventListener("click", exportJSON);

    elements.langSwitch.addEventListener("click", () => {
        setLang(state.currentLang === "zh" ? "en" : "zh");
    });

    elements.themeSwitch.addEventListener("click", () => {
        setTheme(getCurrentTheme() === THEME_LIGHT ? THEME_DARK : THEME_LIGHT);
    });
}

/**
 * 页面初始化流程：
 * 1) 应用本地调试能力
 * 2) 绑定事件并恢复语言/主题
 * 3) 拉取数据、检测头像能力并首屏渲染
 * @returns {Promise<void>} 无返回值
 */
async function init() {
    // 本地模式显示导出按钮，线上默认隐藏避免误操作。
    if (isLocal && elements.exportBtn) {
        elements.exportBtn.style.display = "inline-flex";
    }

    bindEvents();

    // 先恢复语言，保证主题切换按钮文案立即按当前语言展示。
    setLang(state.currentLang);

    // 再恢复主题，优先用户偏好，没有偏好时跟随系统主题。
    setTheme(resolvePreferredTheme());

    // 首屏先渲染 loading 态，避免数据请求期间空白。
    state.isLoading = true;
    state.loadingStage = "data";
    resetPagination();
    render();

    // 阶段一：加载数据。
    await loadData(state);
    state.loadingStage = "avatar";
    render();

    // 阶段二：检测图片能力，决定是否使用头像兜底方案。
    state.canLoadImages = await testImageLoading(state);
    if (!state.canLoadImages) {
        console.log("[图片加载] Twitter 图片加载失败，使用兜底方案");
    }

    // 所有准备完成后切换到正式列表渲染。
    initWeiboImageObserver();
    state.isLoading = false;
    render();
}

init();
