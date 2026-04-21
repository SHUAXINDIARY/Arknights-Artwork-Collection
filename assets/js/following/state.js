import { PAGE_SIZE } from "./constants.js";

/**
 * 页面运行时状态。
 * filters.platform: 平台筛选（all/twitter/weibo）。
 * filters.bio: 简介筛选（all/has-bio/no-bio）。
 * loadingStage: 加载阶段（data/avatar）。
 * @type {{
 *   filters: { platform: "all" | "twitter" | "weibo", bio: "all" | "has-bio" | "no-bio" },
 *   searchTerm: string,
 *   currentData: Array<any>,
 *   deletedCount: number,
 *   canLoadImages: boolean,
 *   isLoading: boolean,
 *   loadingStage: "data" | "avatar",
 *   visibleCount: number,
 *   currentLang: "zh" | "en" | string
 * }}
 */
export const state = {
    filters: {
        platform: "all", // all, twitter, weibo
        bio: "all", // all, has-bio, no-bio
    },
    searchTerm: "",
    currentData: [],
    deletedCount: 0,
    canLoadImages: true,
    isLoading: true,
    loadingStage: "data", // data, avatar
    visibleCount: PAGE_SIZE,
    currentLang: localStorage.getItem("lang") || "zh",
};

/**
 * 是否本地环境（本地环境下允许删除与导出调试能力）。
 * @type {boolean}
 */
export const isLocal =
    location.hostname === "localhost" ||
    location.hostname === "127.0.0.1" ||
    location.protocol === "file:";
