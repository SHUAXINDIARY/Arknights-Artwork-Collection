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

export async function testImageLoading(state) {
    return new Promise((resolve) => {
        const testUser = state.currentData.find(
            (user) =>
                user.avatar && user.avatar.trim() !== "" && user.type === "x",
        );
        if (!testUser) {
            resolve(false);
            return;
        }

        const img = new Image();
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

export function filterData(state) {
    let filtered = [...state.currentData];

    if (state.searchTerm) {
        const term = state.searchTerm.toLowerCase();
        filtered = filtered.filter(
            (user) =>
                (user.nickname && user.nickname.toLowerCase().includes(term)) ||
                (user.bio && user.bio.toLowerCase().includes(term)),
        );
    }

    if (state.filters.platform === "twitter") {
        filtered = filtered.filter((user) => user.type === "x");
    } else if (state.filters.platform === "weibo") {
        filtered = filtered.filter((user) => user.type === "weibo");
    }

    if (state.filters.bio === "has-bio") {
        filtered = filtered.filter((user) => user.bio && user.bio.trim() !== "");
    } else if (state.filters.bio === "no-bio") {
        filtered = filtered.filter((user) => !user.bio || user.bio.trim() === "");
    }

    return filtered;
}
