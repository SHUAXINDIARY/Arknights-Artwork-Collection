/**
 * 拉取并写入关注数据。
 * @param {{ currentData: Array<any> }} state 页面状态对象（会被原地更新）
 * @returns {Promise<void>} 无返回值；失败时将 currentData 置空
 */
export async function loadData(state) {
    try {
        const response = await fetch("./data.json");
        if (!response.ok) {
            throw new Error("Failed to load data.json");
        }
        const data = await response.json();
        state.currentData = data?.reverse?.() || [];
        console.log(`✅ 加载了 ${state.currentData.length} 条数据`);
    } catch (error) {
        console.error("❌ 数据加载失败:", error);
        state.currentData = [];
    }
}

/**
 * 检测当前环境下是否可加载 Twitter 头像。
 * @param {{ currentData: Array<any> }} state 页面状态对象
 * @returns {Promise<boolean>} true 表示可正常加载头像；false 表示需要走兜底头像
 */
export async function testImageLoading(state) {
    return new Promise((resolve) => {
        // 从数据中挑一个 Twitter 头像做探测，避免全量请求。
        const testUser = state.currentData.find(
            (user) =>
                user.avatar && user.avatar.trim() !== "" && user.type === "x",
        );
        if (!testUser) {
            resolve(false);
            return;
        }

        const img = new Image();
        // 设置超时，避免网络慢时一直等待导致首屏阻塞。
        const timeout = setTimeout(() => {
            img.onload = null;
            img.onerror = null;
            resolve(false);
        }, 3000);

        img.onload = () => {
            clearTimeout(timeout);
            resolve(true);
        };

        img.onerror = () => {
            clearTimeout(timeout);
            resolve(false);
        };

        img.src = testUser.avatar;
    });
}

/**
 * 根据搜索词与筛选条件返回过滤后的数据。
 * @param {{
 *   currentData: Array<any>,
 *   searchTerm: string,
 *   filters: { platform: "all" | "twitter" | "weibo", bio: null | "has-bio" | "no-bio" }
 * }} state 页面状态对象
 * @returns {Array<any>} 满足条件的用户列表；可能为空数组
 */
export function filterData(state) {
    let filtered = [...state.currentData];

    // 先应用关键词搜索（昵称 / 简介）。
    if (state.searchTerm) {
        const term = state.searchTerm.toLowerCase();
        filtered = filtered.filter(
            (user) =>
                (user.nickname && user.nickname.toLowerCase().includes(term)) ||
                (user.bio && user.bio.toLowerCase().includes(term)),
        );
    }

    // 再应用平台筛选。
    if (state.filters.platform === "twitter") {
        filtered = filtered.filter((user) => user.type === "x");
    } else if (state.filters.platform === "weibo") {
        filtered = filtered.filter((user) => user.type === "weibo");
    }

    // 最后应用简介有无筛选。
    if (state.filters.bio === "has-bio") {
        filtered = filtered.filter((user) => user.bio && user.bio.trim() !== "");
    } else if (state.filters.bio === "no-bio") {
        filtered = filtered.filter((user) => !user.bio || user.bio.trim() === "");
    }

    return filtered;
}
