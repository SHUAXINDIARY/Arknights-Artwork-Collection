import { PAGE_SIZE } from "./constants.js";

export const state = {
    filters: {
        platform: "all", // all, twitter, weibo
        bio: null, // null, has-bio, no-bio
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

export const isLocal =
    location.hostname === "localhost" ||
    location.hostname === "127.0.0.1" ||
    location.protocol === "file:";
