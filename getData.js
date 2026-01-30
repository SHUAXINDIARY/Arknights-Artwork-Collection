(async () => {
    const results = [];
    const seen = new Set();

    let lastCount = 0;
    let idleRounds = 0;

    const sleep = ms => new Promise(r => setTimeout(r, ms));

    function collectOnce() {
        const cells = document.querySelectorAll('button[data-testid="UserCell"]');

        cells.forEach(cell => {
            try {
                // 主页链接
                const profileLinkEl = cell.querySelector('a[href^="/"]:not([href*="/status"])');
                const path = profileLinkEl?.getAttribute('href');
                if (!path || path.split('/').length !== 2) return;

                const profile = 'https://x.com' + path;
                if (seen.has(profile)) return;
                seen.add(profile);

                // 昵称（展示名）
                const nameSpan = cell.querySelector('div[dir="ltr"] span span');
                const nickname = nameSpan?.innerText?.trim() || '';

                // 头像
                const img = cell.querySelector('img[src*="pbs.twimg.com/profile_images"]');
                const avatar = img?.src || '';

                // 用户签名 / 简介（bio）
                // 通常在 UserCell 最底部的 dir="auto" 文本块
                let bio = '';
                const bioSpan = cell.querySelector(
                    'div[dir="auto"] span'
                );
                if (bioSpan) bio = bioSpan.innerText.trim();

                results.push({
                    nickname,
                    avatar,
                    profile,
                    bio
                });
            } catch (e) {
                console.warn('[X抓取] parse failed', e);
            }
        });
    }

    console.log('[X抓取] 开始自动滚动抓取（含签名）...');

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
            console.log('[X抓取] 多轮无新增，自动停止');
            break;
        }

        // 触发虚拟列表加载
        window.scrollBy(0, window.innerHeight * 2);
        await sleep(1500);
    }

    console.log('[X抓取] 完成，总数:', results.length);
    console.table(results);

    // 标准 JSON 导出
    const json = JSON.stringify(results, null, 2);
    copy(json);

    return results;
})();
