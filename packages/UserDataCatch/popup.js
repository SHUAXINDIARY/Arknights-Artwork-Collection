// ============ 常量定义 ============

// 从 config.js 注入，若无则使用默认值
const API_BASE_URL = window.API_BASE_URL;
const API_KEY_STORAGE_KEY = 'user_data_catch_api_key';

const STATUS_HIDE_DELAY_MS = 3000;
const BUTTON_RESET_DELAY_MS = 2000;
const UPLOAD_COMPLETE_DELAY_MS = 3000;

const ELEMENT_IDS = {
  status: 'status',
  resultSection: 'result-section',
  resultJson: 'result-json',
  btnCopy: 'btn-copy',
  btnUpload: 'btn-upload',
  btnClearErrors: 'btn-clear-errors',
  btnClearApikey: 'btn-clear-apikey',
  apikeyModal: 'apikey-modal',
  apikeyInput: 'apikey-input',
  modalCancel: 'modal-cancel',
  modalConfirm: 'modal-confirm',
  errorSection: 'error-section',
  errorList: 'error-list',
  twitterList: 'twitter-list',
  twitterSingle: 'twitter-single',
  weiboList: 'weibo-list',
  weiboSingle: 'weibo-single'
};

const SCRIPTS = {
  twitterList: 'scripts/twitter-list.js',
  twitterSingle: 'scripts/twitter-single.js',
  weiboList: 'scripts/weibo-list.js',
  weiboSingle: 'scripts/weibo-single.js'
};

// ============ 状态变量 ============

let currentJson = '';
let runningListTask = null;

// ============ DOM 工具函数 ============

const getElement = (id) => document.getElementById(id);

// ============ 状态显示函数 ============

/**
 * 显示状态消息
 * @param {string} message - 消息内容
 * @param {'info' | 'success' | 'error'} type - 消息类型
 */
function showStatus(message, type = 'info') {
  const statusEl = getElement(ELEMENT_IDS.status);
  statusEl.textContent = message;
  statusEl.className = `status show ${type}`;

  if (type === 'success' || type === 'error') {
    setTimeout(() => {
      statusEl.className = 'status';
    }, STATUS_HIDE_DELAY_MS);
  }
}

// ============ 结果显示函数 ============

/**
 * 显示抓取结果
 * @param {string} json - JSON 字符串
 */
function showResult(json) {
  currentJson = json;
  const resultSection = getElement(ELEMENT_IDS.resultSection);
  const resultJson = getElement(ELEMENT_IDS.resultJson);

  resultJson.textContent = json;
  resultSection.classList.add('show');

  // 重置复制按钮状态
  const btnCopy = getElement(ELEMENT_IDS.btnCopy);
  btnCopy.textContent = '📋 复制数据';
  btnCopy.classList.remove('copied');
}

/**
 * 隐藏抓取结果
 */
function hideResult() {
  const resultSection = getElement(ELEMENT_IDS.resultSection);
  resultSection.classList.remove('show');
  currentJson = '';
}

// ============ 剪贴板操作 ============

/**
 * 复制当前数据到剪贴板
 */
async function copyToClipboard() {
  if (!currentJson) return;

  const btnCopy = getElement(ELEMENT_IDS.btnCopy);

  try {
    await navigator.clipboard.writeText(currentJson);
    btnCopy.textContent = '✅ 已复制';
    btnCopy.classList.add('copied');
    showStatus('数据已复制到剪贴板', 'success');

    setTimeout(() => {
      btnCopy.textContent = '📋 复制数据';
      btnCopy.classList.remove('copied');
    }, BUTTON_RESET_DELAY_MS);
  } catch (error) {
    console.error('[popup] 复制失败:', error);
    showStatus(`复制失败: ${error.message}`, 'error');
  }
}

// ============ API 操作 ============

/**
 * 检查用户是否已存在于数据库
 * @param {string} nickname - 用户昵称
 * @param {string} type - 用户类型 ('x' | 'weibo')
 * @returns {Promise<{exists: boolean, user?: object, error?: string}>}
 */
async function checkUserExists(nickname, type) {
  if (!nickname) return { exists: false };

  try {
    const checkUrl = `${API_BASE_URL}/users?nickname=${encodeURIComponent(nickname)}&type=${type || 'x'}`;
    const response = await fetch(checkUrl);
    const data = await response.json();

    if (data.success && data.data?.users?.length > 0) {
      return { exists: true, user: data.data.users[0] };
    }
    return { exists: false };
  } catch (error) {
    console.error('[popup] 检查用户是否存在失败:', error);
    return { exists: false, error: error.message };
  }
}

// ============ 脚本执行函数 ============

/**
 * 获取当前活动标签页
 * @returns {Promise<chrome.tabs.Tab>}
 */
async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

/**
 * 执行单用户抓取脚本
 * @param {string} scriptFile - 脚本文件路径
 * @param {string} buttonId - 按钮 ID
 */
async function executeScriptFile(scriptFile, buttonId) {
  const button = getElement(buttonId);
  const originalText = button.innerHTML;
  const isSingleUser = buttonId.includes('single');

  try {
    button.disabled = true;
    button.innerHTML = '<span class="btn-icon">⏳</span> 执行中...';
    showStatus('正在执行抓取脚本...', 'info');
    hideResult();

    const tab = await getActiveTab();

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: [scriptFile]
    });

    const result = results[0]?.result;

    if (result?.success && result?.json) {
      // 如果是单个用户抓取，检查是否已存在
      if (isSingleUser && result.data) {
        const { nickname } = result.data;
        const type = result.data.type || (buttonId.includes('weibo') ? 'weibo' : 'x');

        if (nickname) {
          showStatus('正在检查用户是否已存在...', 'info');
          const checkResult = await checkUserExists(nickname, type);

          if (checkResult.exists) {
            showStatus(`⚠️ 用户 "${nickname}" 已在收藏列表中`, 'info');
            showResult(result.json);
            return;
          }
        }
      }

      const msg = result.count !== undefined
        ? `✅ 抓取完成！共 ${result.count} 条数据`
        : '✅ 抓取完成！';
      showStatus(msg, 'success');
      showResult(result.json);
    } else if (result?.error) {
      showStatus(`❌ ${result.error}`, 'error');
    } else {
      showStatus('❌ 抓取失败，请检查页面', 'error');
    }
  } catch (error) {
    console.error('[popup] 脚本执行失败:', error);
    showStatus(`❌ 执行失败: ${error.message}`, 'error');
  } finally {
    button.disabled = false;
    button.innerHTML = originalText;
  }
}

/**
 * 停止列表抓取任务
 * @param {string} buttonId - 按钮 ID
 */
async function stopListTask(buttonId) {
  if (!runningListTask || runningListTask.buttonId !== buttonId) return;

  const button = getElement(buttonId);

  try {
    const tab = await getActiveTab();

    // 设置停止标志
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => { window.__STOP_CRAWL__ = true; }
    });

    showStatus('⏸️ 正在停止...', 'info');
    button.disabled = true;
  } catch (error) {
    console.error('[popup] 停止任务失败:', error);
  }
}

/**
 * 执行列表抓取脚本（支持暂停）
 * @param {string} scriptFile - 脚本文件路径
 * @param {string} buttonId - 按钮 ID
 */
async function executeListScript(scriptFile, buttonId) {
  const button = getElement(buttonId);
  const originalText = button.innerHTML;

  // 如果当前有任务在运行，则停止
  if (runningListTask?.buttonId === buttonId) {
    await stopListTask(buttonId);
    return;
  }

  try {
    runningListTask = { buttonId, scriptFile };
    button.innerHTML = '<span class="btn-icon">⏸️</span> 点击停止';
    showStatus('正在执行抓取脚本... 点击按钮可停止', 'info');
    hideResult();

    const tab = await getActiveTab();

    // 先清除停止标志
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => { window.__STOP_CRAWL__ = false; }
    });

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: [scriptFile]
    });

    const result = results[0]?.result;

    if (result?.success && result?.json) {
      const stoppedText = result.stopped ? '（已手动停止）' : '';
      const msg = result.count !== undefined
        ? `✅ 抓取完成！共 ${result.count} 条数据${stoppedText}`
        : '✅ 抓取完成！';
      showStatus(msg, 'success');
      showResult(result.json);
    } else if (result?.error) {
      showStatus(`❌ ${result.error}`, 'error');
    } else {
      showStatus('❌ 抓取失败，请检查页面', 'error');
    }
  } catch (error) {
    console.error('[popup] 列表脚本执行失败:', error);
    showStatus(`❌ 执行失败: ${error.message}`, 'error');
  } finally {
    runningListTask = null;
    button.innerHTML = originalText;
  }
}

// ============ 工具函数 ============

/**
 * 从 profile URL 中提取用户名作为 nickname 兜底
 * @param {string} profile - 用户主页 URL
 * @returns {string}
 */
function extractNicknameFromProfile(profile) {
  try {
    const url = new URL(profile);
    const pathParts = url.pathname.split('/').filter(Boolean);
    return pathParts[pathParts.length - 1] || '';
  } catch {
    return '';
  }
}

/**
 * 判断数据类型（x 或 weibo）
 * @param {string} profile - 用户主页 URL
 * @returns {'x' | 'weibo' | 'unknown'}
 */
function detectDataType(profile) {
  if (profile.includes('x.com') || profile.includes('twitter.com')) {
    return 'x';
  }
  if (profile.includes('weibo.com')) {
    return 'weibo';
  }
  return 'unknown';
}

/**
 * HTML 转义
 * @param {string} text - 原始文本
 * @returns {string}
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ============ API Key 存储 ============

/**
 * 获取存储的 API Key
 * @returns {Promise<string>}
 */
async function getStoredApiKey() {
  return new Promise((resolve) => {
    chrome.storage.local.get([API_KEY_STORAGE_KEY], (result) => {
      resolve(result[API_KEY_STORAGE_KEY] || '');
    });
  });
}

/**
 * 存储 API Key
 * @param {string} apiKey - API Key
 * @returns {Promise<void>}
 */
async function storeApiKey(apiKey) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [API_KEY_STORAGE_KEY]: apiKey }, resolve);
  });
}

/**
 * 清除 API Key
 */
async function clearApiKey() {
  await storeApiKey('');
  showStatus('✅ API Key 已清除', 'success');
}

// ============ 模态框 ============

/**
 * 显示 API Key 输入模态框
 * @returns {Promise<string | null>}
 */
function showApiKeyModal() {
  return new Promise((resolve) => {
    const modal = getElement(ELEMENT_IDS.apikeyModal);
    const input = getElement(ELEMENT_IDS.apikeyInput);
    const cancelBtn = getElement(ELEMENT_IDS.modalCancel);
    const confirmBtn = getElement(ELEMENT_IDS.modalConfirm);

    input.value = '';
    modal.classList.add('show');
    input.focus();

    const cleanup = () => {
      modal.classList.remove('show');
      cancelBtn.removeEventListener('click', onCancel);
      confirmBtn.removeEventListener('click', onConfirm);
      input.removeEventListener('keydown', onKeydown);
    };

    const onCancel = () => {
      cleanup();
      resolve(null);
    };

    const onConfirm = () => {
      const value = input.value.trim();
      if (value) {
        cleanup();
        resolve(value);
      } else {
        input.focus();
      }
    };

    const onKeydown = (e) => {
      if (e.key === 'Enter') onConfirm();
      if (e.key === 'Escape') onCancel();
    };

    cancelBtn.addEventListener('click', onCancel);
    confirmBtn.addEventListener('click', onConfirm);
    input.addEventListener('keydown', onKeydown);
  });
}

// ============ 上传功能 ============

/**
 * 上传单条用户数据到 API
 * @param {object} userData - 用户数据
 * @param {string} apiKey - API Key
 * @returns {Promise<object>}
 */
async function uploadUser(userData, apiKey) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apiKey': apiKey
      },
      body: JSON.stringify(userData)
    });
  } catch (fetchError) {
    // 网络错误
    console.error('[popup] 网络请求失败:', fetchError);
    const errorType = fetchError.name || 'UnknownError';
    const errorMsg = fetchError.message || '未知错误';
    throw new Error(`${errorType}: ${errorMsg}`);
  }

  let result;
  try {
    result = await response.json();
  } catch (parseError) {
    // 响应不是有效的 JSON
    const text = await response.text().catch(() => '');
    throw new Error(`响应解析失败 (HTTP ${response.status}): ${text || parseError.message}`);
  }

  if (!response.ok) {
    // API 返回错误
    const errorMsg = result.error || result.message || JSON.stringify(result);
    throw new Error(errorMsg);
  }

  return result;
}

/**
 * 处理上传按钮点击
 */
async function handleUpload() {
  if (!currentJson) {
    showStatus('❌ 没有可上传的数据', 'error');
    return;
  }

  const btnUpload = getElement(ELEMENT_IDS.btnUpload);
  const originalText = btnUpload.innerHTML;

  try {
    // 解析数据
    let data;
    try {
      data = JSON.parse(currentJson);
    } catch {
      showStatus('❌ 数据格式错误', 'error');
      return;
    }

    // 确保是数组
    const users = Array.isArray(data) ? data : [data];

    if (users.length === 0) {
      showStatus('❌ 没有可上传的数据', 'error');
      return;
    }

    // 检查 API Key
    let apiKey = await getStoredApiKey();

    if (!apiKey) {
      apiKey = await showApiKeyModal();
      if (!apiKey) {
        showStatus('已取消上传', 'info');
        return;
      }
      await storeApiKey(apiKey);
    }

    // 开始上传
    btnUpload.classList.add('uploading');
    btnUpload.disabled = true;
    btnUpload.innerHTML = '⏳ 上传中...';

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    const errors = [];

    for (let i = 0; i < users.length; i++) {
      const user = users[i];

      // 处理 nickname（兜底从 profile 提取）
      const nickname = user.nickname?.trim() || extractNicknameFromProfile(user.profile || '');

      // 检测 type
      const type = detectDataType(user.profile || '');

      if (!user.profile || type === 'unknown') {
        errorCount++;
        errors.push(`第 ${i + 1} 条: 无效的 profile`);
        continue;
      }

      const userData = {
        nickname,
        avatar: user.avatar || '',
        profile: user.profile,
        bio: user.bio || '',
        type
      };

      try {
        await uploadUser(userData, apiKey);
        successCount++;
        btnUpload.innerHTML = `⏳ ${successCount}/${users.length}`;
      } catch (error) {
        if (error.message.includes('already exists')) {
          skipCount++;
        } else if (error.message.includes('Invalid or missing API key')) {
          // API Key 无效，清除并提示重新输入
          await storeApiKey('');
          showStatus('❌ API Key 无效，请重新输入', 'error');
          return;
        } else {
          errorCount++;
          errors.push(`${nickname || user.profile}: ${error.message}`);
        }
      }
    }

    // 显示结果
    let resultMsg = `✅ 上传完成: ${successCount} 成功`;
    if (skipCount > 0) resultMsg += `, ${skipCount} 已存在`;
    if (errorCount > 0) resultMsg += `, ${errorCount} 失败`;

    showStatus(resultMsg, errorCount > 0 ? 'info' : 'success');

    // 显示错误详情
    if (errors.length > 0) {
      console.warn('[popup] 上传错误详情:', errors);
      showErrors(errors);
    } else {
      hideErrors();
    }

    btnUpload.classList.remove('uploading');
    btnUpload.classList.add('uploaded');
    btnUpload.innerHTML = '✅ 上传完成';

    setTimeout(() => {
      btnUpload.classList.remove('uploaded');
      btnUpload.innerHTML = originalText;
    }, UPLOAD_COMPLETE_DELAY_MS);
  } catch (error) {
    console.error('[popup] 上传失败:', error);
    showStatus(`❌ 上传失败: ${error.message}`, 'error');
    btnUpload.classList.remove('uploading');
    btnUpload.innerHTML = originalText;
  } finally {
    btnUpload.disabled = false;
  }
}

// ============ 错误显示 ============

/**
 * 显示错误详情
 * @param {string[]} errors - 错误列表
 */
function showErrors(errors) {
  const errorSection = getElement(ELEMENT_IDS.errorSection);
  const errorList = getElement(ELEMENT_IDS.errorList);

  errorList.innerHTML = errors
    .map((err) => {
      // 尝试分离名称和原因
      const colonIndex = err.indexOf(':');
      if (colonIndex > 0) {
        const name = err.substring(0, colonIndex);
        const reason = err.substring(colonIndex + 1).trim();
        return `<div class="error-item"><span class="error-item-name">${escapeHtml(name)}</span>:<span class="error-item-reason">${escapeHtml(reason)}</span></div>`;
      }
      return `<div class="error-item">${escapeHtml(err)}</div>`;
    })
    .join('');

  errorSection.classList.add('show');
}

/**
 * 隐藏错误详情
 */
function hideErrors() {
  const errorSection = getElement(ELEMENT_IDS.errorSection);
  errorSection.classList.remove('show');
}

// ============ 事件绑定 ============

// 抓取按钮
getElement(ELEMENT_IDS.twitterList).addEventListener('click', () => {
  executeListScript(SCRIPTS.twitterList, ELEMENT_IDS.twitterList);
});

getElement(ELEMENT_IDS.twitterSingle).addEventListener('click', () => {
  executeScriptFile(SCRIPTS.twitterSingle, ELEMENT_IDS.twitterSingle);
});

getElement(ELEMENT_IDS.weiboList).addEventListener('click', () => {
  executeListScript(SCRIPTS.weiboList, ELEMENT_IDS.weiboList);
});

getElement(ELEMENT_IDS.weiboSingle).addEventListener('click', () => {
  executeScriptFile(SCRIPTS.weiboSingle, ELEMENT_IDS.weiboSingle);
});

// 复制按钮
getElement(ELEMENT_IDS.btnCopy).addEventListener('click', copyToClipboard);

// 上传按钮
getElement(ELEMENT_IDS.btnUpload).addEventListener('click', handleUpload);

// 清除错误按钮
getElement(ELEMENT_IDS.btnClearErrors).addEventListener('click', hideErrors);

// 清除 API Key 按钮
getElement(ELEMENT_IDS.btnClearApikey).addEventListener('click', clearApiKey);
