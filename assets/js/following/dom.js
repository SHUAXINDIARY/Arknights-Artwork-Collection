/**
 * 页面核心 DOM 引用集合。
 * 集中管理后，业务逻辑层只依赖该对象，避免散落查询。
 */
export const elements = {
    /** @type {HTMLMetaElement | null} */
    themeColorMeta: document.querySelector('meta[name="theme-color"]'),
    /** @type {HTMLElement} */
    grid: document.getElementById("grid"),
    /** @type {HTMLInputElement} */
    searchInput: document.getElementById("search"),
    /** @type {NodeListOf<HTMLButtonElement>} */
    filterBtns: document.querySelectorAll(".filter-btn"),
    /** @type {HTMLElement} */
    totalCountEl: document.getElementById("total-count"),
    /** @type {HTMLElement} */
    filteredCountEl: document.getElementById("filtered-count"),
    /** @type {HTMLElement} */
    resultCountEl: document.getElementById("result-count"),
    /** @type {HTMLButtonElement} */
    backTopBtn: document.getElementById("back-top"),
    /** @type {HTMLButtonElement | null} */
    exportBtn: document.getElementById("export-btn"),
    /** @type {HTMLElement} */
    loadMoreWrap: document.getElementById("load-more-wrap"),
    /** @type {HTMLButtonElement | null} */
    loadMoreBtn: document.getElementById("load-more-btn"),
    /** @type {HTMLButtonElement} */
    themeSwitch: document.getElementById("theme-switch"),
    /** @type {HTMLButtonElement} */
    langSwitch: document.getElementById("lang-switch"),
};
