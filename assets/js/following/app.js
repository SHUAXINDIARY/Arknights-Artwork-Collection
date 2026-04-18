import { PAGE_SIZE, THEME_KEY } from "./constants.js";
import { elements } from "./dom.js";
import { state, isLocal } from "./state.js";
import { loadData, testImageLoading, filterData } from "./data.js";
import { createRenderer } from "./render.js";

const { render, initWeiboImageObserver } = createRenderer({
    state,
    elements,
    isLocal,
    pageSize: PAGE_SIZE,
    filterData,
});

function resetPagination() {
    state.visibleCount = PAGE_SIZE;
}

function deleteUser(profile) {
    const index = state.currentData.findIndex((user) => user.profile === profile);
    if (index !== -1) {
        state.currentData.splice(index, 1);
        state.deletedCount += 1;
        render();
    }
}

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

function getCurrentTheme() {
    return document.body.classList.contains("theme-light") ? "light" : "dark";
}

function updateThemeSwitchLabel(theme) {
    const isEn = document.body.classList.contains("lang-en");
    const targetThemeText =
        theme === "light"
            ? isEn
                ? "dark mode"
                : "深色模式"
            : isEn
              ? "light mode"
              : "浅色模式";
    const titleText = isEn ? `Switch to ${targetThemeText}` : `切换到${targetThemeText}`;
    elements.themeSwitch.textContent = theme === "light" ? "☀️" : "🌙";
    elements.themeSwitch.title = titleText;
    elements.themeSwitch.setAttribute("aria-label", titleText);
}

function setTheme(theme) {
    document.body.classList.toggle("theme-light", theme === "light");
    localStorage.setItem(THEME_KEY, theme);
    if (elements.themeColorMeta) {
        elements.themeColorMeta.setAttribute(
            "content",
            theme === "light" ? "#f7f9fa" : "#0f141d",
        );
    }
    updateThemeSwitchLabel(theme);
}

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

function bindEvents() {
    let searchTimeout = null;

    elements.searchInput.addEventListener("input", (event) => {
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
                group
                    .querySelectorAll(".filter-btn")
                    .forEach((item) => item.classList.remove("active"));
                btn.classList.add("active");
                state.filters.platform = filterValue;
            } else if (groupType === "bio") {
                if (btn.classList.contains("active")) {
                    btn.classList.remove("active");
                    state.filters.bio = null;
                } else {
                    group
                        .querySelectorAll(".filter-btn")
                        .forEach((item) => item.classList.remove("active"));
                    btn.classList.add("active");
                    state.filters.bio = filterValue;
                }
            }
            resetPagination();
            render();
        });
    });

    elements.loadMoreBtn?.addEventListener("click", () => {
        state.visibleCount += PAGE_SIZE;
        render();
    });

    elements.grid.addEventListener("click", (event) => {
        const deleteBtn = event.target.closest('[data-action="delete-user"]');
        if (!deleteBtn) {
            return;
        }
        const profile = decodeURIComponent(deleteBtn.dataset.profile || "");
        deleteUser(profile);
    });

    window.addEventListener("scroll", () => {
        if (window.scrollY > 300) {
            elements.backTopBtn.classList.add("visible");
        } else {
            elements.backTopBtn.classList.remove("visible");
        }
    });

    elements.backTopBtn.addEventListener("click", () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    });

    elements.exportBtn?.addEventListener("click", exportJSON);

    elements.langSwitch.addEventListener("click", () => {
        setLang(state.currentLang === "zh" ? "en" : "zh");
    });

    elements.themeSwitch.addEventListener("click", () => {
        setTheme(getCurrentTheme() === "light" ? "dark" : "light");
    });
}

async function init() {
    if (isLocal && elements.exportBtn) {
        elements.exportBtn.style.display = "inline-flex";
    }

    bindEvents();

    setLang(state.currentLang);

    const savedTheme = localStorage.getItem(THEME_KEY);
    const systemPrefersLight = window.matchMedia(
        "(prefers-color-scheme: light)",
    ).matches;
    setTheme(savedTheme || (systemPrefersLight ? "light" : "dark"));

    state.isLoading = true;
    state.loadingStage = "data";
    resetPagination();
    render();

    await loadData(state);
    state.loadingStage = "avatar";
    render();

    state.canLoadImages = await testImageLoading(state);
    if (!state.canLoadImages) {
        console.log("[图片加载] Twitter 图片加载失败，使用兜底方案");
    }

    initWeiboImageObserver();
    state.isLoading = false;
    render();
}

init();
