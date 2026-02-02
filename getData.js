// 推特列表
(async () => {
    const results = [];
    const seen = new Set();

    let lastCount = 0;
    let idleRounds = 0;

    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

    function collectOnce() {
        const cells = document.querySelectorAll(
            'button[data-testid="UserCell"]'
        );

        cells.forEach((cell) => {
            try {
                // 主页链接
                const profileLinkEl = cell.querySelector(
                    'a[href^="/"]:not([href*="/status"])'
                );
                const path = profileLinkEl?.getAttribute("href");
                if (!path || path.split("/").length !== 2) return;

                const profile = "https://x.com" + path;
                if (seen.has(profile)) return;
                seen.add(profile);

                // 昵称（展示名）
                const nameSpan = cell.querySelector('div[dir="ltr"] span span');
                const nickname = nameSpan?.innerText?.trim() || "";

                // 头像
                const img = cell.querySelector(
                    'img[src*="pbs.twimg.com/profile_images"]'
                );
                const avatar = img?.src || "";

                // 用户签名 / 简介（bio）
                // 通常在 UserCell 最底部的 dir="auto" 文本块
                let bio = "";
                const bioSpan = cell.querySelector('div[dir="auto"] span');
                if (bioSpan) bio = bioSpan.innerText.trim();

                results.push({
                    nickname,
                    avatar,
                    profile,
                    bio,
                });
            } catch (e) {
                console.warn("[X抓取] parse failed", e);
            }
        });
    }

    console.log("[X抓取] 开始自动滚动抓取（含签名）...");

    while (true) {
        collectOnce();

        if (results.length === lastCount) {
            idleRounds++;
        } else {
            idleRounds = 0;
            lastCount = results.length;
        }

        console.log(`[X抓取] 当前已抓取 ${results.length}`);

        // 多轮无新增，认为到底
        if (idleRounds >= 6) {
            console.log("[X抓取] 多轮无新增，自动停止");
            break;
        }

        // 触发虚拟列表加载
        window.scrollBy(0, window.innerHeight * 2);
        await sleep(1500);
    }

    console.log("[X抓取] 完成，总数:", results.length);
    console.table(results);

    // 标准 JSON 导出
    const json = JSON.stringify(results, null, 2);
    copy(json);

    return results;
})();

// 推特单个
(() => {
    const result = {
        nickname: '',
        avatar: '',
        profile: location.origin + location.pathname,
        bio: ''
    };

    /** 1. 昵称（显示名） */
    const nameEl = document.querySelector('[data-testid="UserName"] span span');
    if (nameEl) {
        result.nickname = nameEl.innerText.trim();
    }

    /** 2. 头像（终极稳定方案）
     * 规则：
     * - img[alt="打开个人资料照片"]
     * - src 包含 pbs.twimg.com/profile_images
     */
    const avatarImg = document.querySelector(
        'img[alt="打开个人资料照片"][src*="pbs.twimg.com/profile_images"]'
    );

    if (avatarImg) {
        result.avatar = avatarImg.src.replace(
            /_(normal|200x200|400x400)/,
            ''
        );
    }

    /** 3. 简介（bio） */
    const bioEl = document.querySelector('[data-testid="UserDescription"]');
    if (bioEl) {
        result.bio = bioEl.innerText.trim();
    }

    console.log(result);
    return result;
})();



// 微博
(() => {
    const result = [];
    const seen = new Set();

    let lastScrollHeight = 0;
    let sameHeightCount = 0;
    const MAX_SAME_HEIGHT = 3; // 连续 3 次高度不变，认为触底

    const INTERVAL = 2000; // 每次滚动间隔（ms）

    function collectOnce() {
        const cards = document.querySelectorAll('div[class*="_userFeedCard_"]');

        cards.forEach((card) => {
            const link = card.querySelector('a[href^="/u/"]');
            if (!link) return;

            const profile = "https://weibo.com" + link.getAttribute("href");
            if (seen.has(profile)) return;
            seen.add(profile);

            const nickname =
                link.querySelector("span[usercard]")?.innerText?.trim() || "";

            const avatar =
                link.querySelector("img")?.getAttribute("src") ||
                link.querySelector("img")?.getAttribute("data-src") ||
                "";

            const bio =
                link.querySelector('div[class*="_clb_"]')?.innerText?.trim() ||
                "";

            result.push({
                nickname,
                avatar,
                profile,
                bio,
            });
        });

        console.log(`📦 当前已抓取 ${result.length} 条`);
    }

    const timer = setInterval(() => {
        collectOnce();

        window.scrollTo({
            top: document.body.scrollHeight,
            behavior: "smooth",
        });

        const currentHeight = document.body.scrollHeight;

        if (currentHeight === lastScrollHeight) {
            sameHeightCount++;
            console.log(
                `⚠️ 页面高度未变化 (${sameHeightCount}/${MAX_SAME_HEIGHT})`
            );
        } else {
            sameHeightCount = 0;
            lastScrollHeight = currentHeight;
        }

        // 判定触底
        if (sameHeightCount >= MAX_SAME_HEIGHT) {
            clearInterval(timer);
            collectOnce();

            window.__WEIBO_FOLLOWING__ = result;

            console.log("✅ 已触底，抓取完成");
            console.log(result);
        }
    }, INTERVAL);
})();


// 微博单个
(() => {
    const result = {
        nickname: '',
        avatar: '',
        profile: location.href,
        bio: ''
    };

    /** 1. 昵称 */
    const nameEl = document.querySelector('._name_1yc79_291');
    if (nameEl) {
        result.nickname = nameEl.innerText.trim();
    }

    /** 2. 头像 */
    const avatarImg = document.querySelector('.woo-avatar-img');
    if (avatarImg) {
        // 微博头像一般 src 就是最终图
        result.avatar = avatarImg.src;
    }

    /** 3. 个人主页链接（标准化） */
    const uidMatch = location.href.match(/\/u\/(\d+)/);
    if (uidMatch) {
        result.profile = `https://weibo.com/u/${uidMatch[1]}`;
    }

    /** 4. 简介（新版微博可能没有） */
    // 尝试常见的简介区域（部分账号存在）
    const bioEl =
        document.querySelector('[class*="ProfileHeader_desc"]') ||
        document.querySelector('[class*="desc"]');

    if (bioEl) {
        result.bio = bioEl.innerText.trim();
    }

    console.log(result);
    return result;
})();
