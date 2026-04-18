/**
 * 从个人主页链接中提取用户名。
 * @param {string} profile 用户主页链接
 * @returns {string} 用户名（含 @ 前缀）；提取失败时返回空字符串
 */
function getUsername(profile = "") {
    const match = profile.match(/x\.com\/([^/]+)/);
    return match ? `@${match[1]}` : "";
}

/**
 * 根据当前加载阶段与语言返回加载提示文案。
 * @param {{ loadingStage: "data" | "avatar" }} state 页面状态对象
 * @returns {string} 当前阶段对应的加载文本
 */
function getLoadingText(state) {
    const isEn = document.body.classList.contains("lang-en");
    if (state.loadingStage === "avatar") {
        return isEn ? "Checking avatar loading..." : "正在检测头像加载能力...";
    }
    return isEn ? "Loading data..." : "正在加载数据...";
}

const X_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
</svg>`;

const WEIBO_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -3 30 30"><path d="m12.44 22.251c-4.898.482-9.131-1.732-9.449-4.951s3.398-6.216 8.301-6.701 9.13 1.724 9.448 4.949-3.398 6.219-8.298 6.699zm-1.291-3.818c-.334.525-.912.869-1.571.869-.245 0-.48-.048-.694-.134l.012.004c-.452-.21-.759-.661-.759-1.183 0-.294.097-.565.262-.783l-.002.003c.336-.517.911-.854 1.565-.854.231 0 .452.042.656.119l-.013-.004c.469.204.792.663.792 1.198 0 .287-.093.552-.25.767l.003-.004zm1.564-2.004c-.126.212-.354.351-.614.351-.084 0-.165-.015-.24-.041l.005.002c-.18-.072-.304-.245-.304-.447 0-.103.032-.198.087-.276l-.001.002c.121-.204.34-.338.59-.338.085 0 .167.016.242.044l-.005-.002c.183.075.31.251.31.458 0 .105-.033.203-.089.283l.001-.002zm.217-3.349c-.39-.102-.839-.161-1.301-.161-2.007 0-3.755 1.106-4.668 2.742l-.014.027c-.251.482-.399 1.052-.399 1.657 0 1.683 1.142 3.1 2.694 3.516l.025.006c.474.154 1.019.243 1.584.243 2.061 0 3.847-1.177 4.722-2.896l.014-.03c.208-.445.329-.966.329-1.515 0-1.782-1.275-3.266-2.963-3.59l-.023-.004zm9.315-1.507c-.426-.123-.702-.222-.499-.757.233-.428.371-.937.371-1.478s-.137-1.05-.379-1.494l.008.016c-.962-1.37-3.59-1.297-6.607-.037 0 0-.943.408-.703-.334.463-1.499.388-2.739-.333-3.46-1.65-1.657-5.999.046-9.718 3.784-2.774 2.796-4.386 5.756-4.386 8.311 0 4.903 6.281 7.883 12.422 7.883 8.05 0 13.41-4.68 13.41-8.4 0-2.244-1.905-3.515-3.59-4.045v.012zm2.35-6.272c-.702-.781-1.716-1.27-2.844-1.27-.284 0-.561.031-.828.09l.025-.005c-.443.094-.77.481-.77.945 0 .533.432.965.965.965.069 0 .136-.007.201-.021l-.006.001c.119-.027.255-.042.395-.042 1.027 0 1.86.833 1.86 1.86 0 .204-.033.399-.093.583l.004-.013c-.03.089-.047.192-.047.299 0 .43.281.795.669.921l.007.002c.083.025.178.039.277.039.434 0 .804-.276.943-.663l.002-.007c.118-.352.186-.757.186-1.179 0-.986-.373-1.884-.985-2.563l.003.003.037.055zm2.978-2.703c-1.439-1.597-3.515-2.596-5.824-2.596-.578 0-1.142.063-1.684.182l.052-.01c-.497.124-.86.567-.86 1.094 0 .622.504 1.126 1.126 1.126.07 0 .138-.006.204-.018l-.007.001c.352-.079.757-.125 1.172-.125 3.068 0 5.556 2.487 5.556 5.556 0 .612-.099 1.201-.282 1.752l.011-.039c-.036.105-.056.226-.056.352 0 .624.506 1.13 1.13 1.13.498 0 .921-.322 1.071-.77l.002-.008c.24-.72.378-1.548.378-2.41 0-2.03-.769-3.881-2.032-5.277l.006.007.037.055z"/></svg>`;

/**
 * 创建渲染器，封装页面渲染与微博头像懒加载行为。
 * @param {{
 *   state: any,
 *   elements: Record<string, any>,
 *   isLocal: boolean,
 *   pageSize: number,
 *   filterData: (state: any) => Array<any>
 * }} options 渲染器配置
 * @returns {{ render: () => void, initWeiboImageObserver: () => void }} 渲染方法与观察器初始化方法
 */
export function createRenderer({ state, elements, isLocal, pageSize, filterData }) {
    const weiboImageCache = new Map();
    let weiboImageObserver = null;

    /**
     * 请求微博头像并写入 img，失败时回退为首字母占位。
     * @param {HTMLImageElement} imgElement 目标图片元素
     * @param {string} avatarUrl 微博头像地址
     * @param {string} fallbackLetter 失败时展示的占位字符
     * @returns {Promise<void>} 无返回值
     */
    async function loadWeiboImage(imgElement, avatarUrl, fallbackLetter) {
        // 命中缓存时直接复用，避免重复请求微博图源。
        if (weiboImageCache.has(avatarUrl)) {
            const cachedUrl = weiboImageCache.get(avatarUrl);
            if (cachedUrl) {
                imgElement.src = cachedUrl;
            } else {
                imgElement.outerHTML = `<div class="avatar-placeholder avatar-fallback">${fallbackLetter}</div>`;
            }
            return;
        }

        try {
            const response = await fetch(avatarUrl, {
                headers: { Referer: "https://weibo.com/" },
            });
            if (!response.ok) {
                throw new Error("图片加载失败");
            }

            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            weiboImageCache.set(avatarUrl, blobUrl);
            imgElement.src = blobUrl;
        } catch (error) {
            console.warn("[微博图片加载失败]", avatarUrl);
            weiboImageCache.set(avatarUrl, null);
            imgElement.outerHTML = `<div class="avatar-placeholder avatar-fallback">${fallbackLetter}</div>`;
        }
    }

    /**
     * 初始化微博头像的 IntersectionObserver。
     * @returns {void} 无返回值
     */
    function initWeiboImageObserver() {
        if (weiboImageObserver) {
            return;
        }

        weiboImageObserver = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) {
                        return;
                    }

                    // 仅在进入可视区时才加载微博头像，减少首屏请求数。
                    const img = entry.target;
                    const avatarUrl = img.dataset.weiboSrc;
                    const fallbackLetter = img.dataset.fallback || "W";

                    if (avatarUrl) {
                        loadWeiboImage(img, avatarUrl, fallbackLetter);
                        weiboImageObserver.unobserve(img);
                    }
                });
            },
            { rootMargin: "100px", threshold: 0 },
        );
    }

    /**
     * 把当前页面中待加载的微博图片交给观察器监听。
     * @returns {void} 无返回值
     */
    function observeWeiboImages() {
        if (!weiboImageObserver) {
            return;
        }
        const weiboImages = document.querySelectorAll("img[data-weibo-src]");
        weiboImages.forEach((img) => weiboImageObserver.observe(img));
    }

    /**
     * 生成单个用户卡片 HTML。
     * @param {any} user 用户数据对象
     * @returns {string} 卡片 HTML 字符串
     */
    function createCard(user) {
        const username = getUsername(user.profile);
        const hasAvatar = user.avatar && user.avatar.trim() !== "";
        const fallbackLetter = user.type === "weibo" ? "W" : "X";
        const isWeibo = user.type === "weibo";

        let avatarHtml;
        if (!hasAvatar || !state.canLoadImages) {
            avatarHtml = `<div class="avatar-placeholder avatar-fallback">${fallbackLetter}</div>`;
        } else if (isWeibo) {
            avatarHtml = `<img class="avatar" data-weibo-src="${user.avatar}" data-fallback="${fallbackLetter}" alt="${user.nickname}" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7">`;
        } else {
            avatarHtml = `<img class="avatar" src="${user.avatar}" alt="${user.nickname}" loading="lazy" onerror="this.outerHTML='<div class=\\'avatar-placeholder avatar-fallback\\'>${fallbackLetter}</div>'">`;
        }

        const deleteBtnHtml = isLocal
            ? `
            <button class="delete-btn visible" data-action="delete-user" data-profile="${encodeURIComponent(user.profile)}" title="删除">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>`
            : "";

        const iconSvg = user.type === "weibo" ? WEIBO_ICON : X_ICON;
        const cardClass = user.type === "weibo" ? "card weibo-card" : "card";

        return `
          <div class="${cardClass}" data-profile="${user.profile}">
            ${deleteBtnHtml}
            <div class="card-header">
              ${avatarHtml}
              <div class="user-info">
                <a href="${user.profile}" target="_blank" class="nickname" title="${user.nickname}">${user.nickname || "未知用户"}</a>
                <div class="handle">${username}</div>
              </div>
            </div>
            ${
                user.bio
                    ? `<p class="bio">${user.bio}</p>`
                    : '<p class="bio" style="font-style: italic; opacity: 0.6;"><span class="zh">暂无简介</span><span class="en">No bio</span></p>'
            }
            <a href="${user.profile}" target="_blank" class="profile-link">
              ${iconSvg}
              <span class="zh">访问主页</span><span class="en">Visit Profile</span>
            </a>
          </div>
        `;
    }

    /**
     * 根据当前状态渲染页面列表、统计文本与分页按钮。
     * @returns {void} 无返回值
     */
    function render() {
        if (state.isLoading) {
            const loadingText = getLoadingText(state);
            elements.totalCountEl.textContent = "0";
            elements.filteredCountEl.textContent = "0";
            elements.resultCountEl.innerHTML = "";
            elements.grid.innerHTML = `
            <div class="loading" style="grid-column: 1 / -1;">
                <div class="loading-spinner" aria-hidden="true"></div>
                <p>${loadingText}</p>
            </div>
            `;
            elements.loadMoreWrap.style.display = "none";
            return;
        }

        const filtered = filterData(state);
        const shownCount = Math.min(state.visibleCount, filtered.length);
        const paginatedData = filtered.slice(0, shownCount);

        elements.totalCountEl.textContent = state.currentData.length;
        elements.filteredCountEl.textContent = filtered.length;

        if (filtered.length === 0) {
            elements.grid.innerHTML = `
            <div class="no-results" style="grid-column: 1 / -1;">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <p><span class="zh">没有找到匹配的用户</span><span class="en">No matching users found</span></p>
            </div>
            `;
            elements.resultCountEl.innerHTML = "";
            elements.loadMoreWrap.style.display = "none";
            return;
        }

        let resultText = "";
        const isEn = document.body.classList.contains("lang-en");
        if (
            state.searchTerm ||
            state.filters.platform !== "all" ||
            state.filters.bio !== null
        ) {
            resultText = isEn
                ? `Found ${filtered.length} results`
                : `找到 ${filtered.length} 个结果`;
        }
        if (state.deletedCount > 0) {
            const deletedText = isEn
                ? `Deleted ${state.deletedCount}`
                : `已删除 ${state.deletedCount} 个`;
            resultText +=
                (resultText ? " · " : "") +
                `<span class="deleted-count">${deletedText}</span>`;
        }
        if (filtered.length > pageSize) {
            const pageText = isEn
                ? `Showing ${shownCount}/${filtered.length}`
                : `已显示 ${shownCount}/${filtered.length}`;
            resultText += (resultText ? " · " : "") + pageText;
        }
        elements.resultCountEl.innerHTML = resultText;

        // 分页只渲染当前可见区间，减少 DOM 数量。
        elements.grid.innerHTML = paginatedData.map(createCard).join("");

        const hasMore = shownCount < filtered.length;
        elements.loadMoreWrap.style.display = hasMore ? "flex" : "none";
        if (hasMore) {
            const remainCount = filtered.length - shownCount;
            const nextCount = Math.min(pageSize, remainCount);
            elements.loadMoreBtn.innerHTML = `
            <span class="zh">加载更多（再看 ${nextCount} 条，剩余 ${remainCount} 条）</span>
            <span class="en">Load More (${nextCount} next, ${remainCount} left)</span>
            `;
        }

        observeWeiboImages();
    }

    return {
        render,
        initWeiboImageObserver,
    };
}
