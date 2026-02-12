// 当前抓取的 JSON 数据
let currentJson = '';

// 当前正在执行的列表任务
let runningListTask = null;

// 显示状态
function showStatus(message, type = 'info') {
  const statusEl = document.getElementById('status');
  statusEl.textContent = message;
  statusEl.className = 'status show ' + type;
  
  if (type === 'success' || type === 'error') {
    setTimeout(() => {
      statusEl.className = 'status';
    }, 3000);
  }
}

// 显示结果
function showResult(json) {
  currentJson = json;
  const resultSection = document.getElementById('result-section');
  const resultJson = document.getElementById('result-json');
  
  resultJson.textContent = json;
  resultSection.classList.add('show');
  
  // 重置复制按钮状态
  const btnCopy = document.getElementById('btn-copy');
  btnCopy.textContent = '📋 复制数据';
  btnCopy.classList.remove('copied');
}

// 隐藏结果
function hideResult() {
  const resultSection = document.getElementById('result-section');
  resultSection.classList.remove('show');
  currentJson = '';
}

// 复制到剪贴板
async function copyToClipboard() {
  if (!currentJson) return;
  
  const btnCopy = document.getElementById('btn-copy');
  
  try {
    await navigator.clipboard.writeText(currentJson);
    btnCopy.textContent = '✅ 已复制';
    btnCopy.classList.add('copied');
    showStatus('数据已复制到剪贴板', 'success');
    
    setTimeout(() => {
      btnCopy.textContent = '📋 复制数据';
      btnCopy.classList.remove('copied');
    }, 2000);
  } catch (error) {
    console.error(error);
    showStatus('复制失败: ' + error.message, 'error');
  }
}

// 执行脚本文件
async function executeScriptFile(scriptFile, buttonId) {
  const button = document.getElementById(buttonId);
  const originalText = button.innerHTML;
  
  try {
    button.disabled = true;
    button.innerHTML = '<span class="btn-icon">⏳</span> 执行中...';
    showStatus('正在执行抓取脚本...', 'info');
    hideResult();

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: [scriptFile]
    });

    const result = results[0]?.result;
    
    if (result?.success && result?.json) {
      const msg = result.count !== undefined 
        ? `✅ 抓取完成！共 ${result.count} 条数据`
        : '✅ 抓取完成！';
      showStatus(msg, 'success');
      showResult(result.json);
    } else if (result?.error) {
      showStatus('❌ ' + result.error, 'error');
    } else {
      showStatus('❌ 抓取失败，请检查页面', 'error');
    }
  } catch (error) {
    console.error(error);
    showStatus('❌ 执行失败: ' + error.message, 'error');
  } finally {
    button.disabled = false;
    button.innerHTML = originalText;
  }
}

// 停止列表抓取任务
async function stopListTask(buttonId) {
  if (!runningListTask || runningListTask.buttonId !== buttonId) return;
  
  const button = document.getElementById(buttonId);
  
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // 设置停止标志
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => { window.__STOP_CRAWL__ = true; }
    });
    
    showStatus('⏸️ 正在停止...', 'info');
    button.disabled = true;
  } catch (error) {
    console.error(error);
  }
}

// 执行列表抓取脚本（支持暂停）
async function executeListScript(scriptFile, buttonId) {
  const button = document.getElementById(buttonId);
  const originalText = button.innerHTML;
  
  // 如果当前有任务在运行，则停止
  if (runningListTask && runningListTask.buttonId === buttonId) {
    await stopListTask(buttonId);
    return;
  }
  
  try {
    runningListTask = { buttonId, scriptFile };
    button.innerHTML = '<span class="btn-icon">⏸️</span> 点击停止';
    showStatus('正在执行抓取脚本... 点击按钮可停止', 'info');
    hideResult();

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
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
      showStatus('❌ ' + result.error, 'error');
    } else {
      showStatus('❌ 抓取失败，请检查页面', 'error');
    }
  } catch (error) {
    console.error(error);
    showStatus('❌ 执行失败: ' + error.message, 'error');
  } finally {
    runningListTask = null;
    button.innerHTML = originalText;
  }
}

// 绑定按钮事件
document.getElementById('twitter-list').addEventListener('click', () => {
  executeListScript('scripts/twitter-list.js', 'twitter-list');
});

document.getElementById('twitter-single').addEventListener('click', () => {
  executeScriptFile('scripts/twitter-single.js', 'twitter-single');
});

document.getElementById('weibo-list').addEventListener('click', () => {
  executeListScript('scripts/weibo-list.js', 'weibo-list');
});

document.getElementById('weibo-single').addEventListener('click', () => {
  executeScriptFile('scripts/weibo-single.js', 'weibo-single');
});

// 复制按钮事件
document.getElementById('btn-copy').addEventListener('click', copyToClipboard);

// ============ 添加到数据库功能 ============

const API_BASE_URL = 'https://akdb.nixideshuaxin.workers.dev';
const API_KEY_STORAGE_KEY = 'user_data_catch_api_key';

// 从 profile URL 中提取用户名作为 nickname
function extractNicknameFromProfile(profile) {
  try {
    const url = new URL(profile);
    const pathParts = url.pathname.split('/').filter(Boolean);
    return pathParts[pathParts.length - 1] || '';
  } catch {
    return '';
  }
}

// 判断数据类型（x 或 weibo）
function detectDataType(profile) {
  if (profile.includes('x.com') || profile.includes('twitter.com')) {
    return 'x';
  }
  if (profile.includes('weibo.com')) {
    return 'weibo';
  }
  return 'unknown';
}

// 获取存储的 API Key
async function getStoredApiKey() {
  return new Promise((resolve) => {
    chrome.storage.local.get([API_KEY_STORAGE_KEY], (result) => {
      resolve(result[API_KEY_STORAGE_KEY] || '');
    });
  });
}

// 存储 API Key
async function storeApiKey(apiKey) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [API_KEY_STORAGE_KEY]: apiKey }, resolve);
  });
}

// 显示 API Key 输入模态框
function showApiKeyModal() {
  return new Promise((resolve) => {
    const modal = document.getElementById('apikey-modal');
    const input = document.getElementById('apikey-input');
    const cancelBtn = document.getElementById('modal-cancel');
    const confirmBtn = document.getElementById('modal-confirm');
    
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

// 上传单条数据到 API
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
    // 网络错误 - 输出更多调试信息
    console.error('Fetch error:', fetchError);
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

// 处理上传按钮点击
async function handleUpload() {
  if (!currentJson) {
    showStatus('❌ 没有可上传的数据', 'error');
    return;
  }
  
  const btnUpload = document.getElementById('btn-upload');
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
      
      // 处理 nickname
      let nickname = user.nickname?.trim() || '';
      if (!nickname) {
        nickname = extractNicknameFromProfile(user.profile || '');
      }
      
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
      console.warn('上传错误详情:', errors);
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
    }, 3000);
    
  } catch (error) {
    console.error(error);
    showStatus('❌ 上传失败: ' + error.message, 'error');
    btnUpload.classList.remove('uploading');
    btnUpload.innerHTML = originalText;
  } finally {
    btnUpload.disabled = false;
  }
}

// 显示错误详情
function showErrors(errors) {
  const errorSection = document.getElementById('error-section');
  const errorList = document.getElementById('error-list');
  
  errorList.innerHTML = errors.map(err => {
    // 尝试分离名称和原因
    const colonIndex = err.indexOf(':');
    if (colonIndex > 0) {
      const name = err.substring(0, colonIndex);
      const reason = err.substring(colonIndex + 1).trim();
      return `<div class="error-item"><span class="error-item-name">${escapeHtml(name)}</span>:<span class="error-item-reason">${escapeHtml(reason)}</span></div>`;
    }
    return `<div class="error-item">${escapeHtml(err)}</div>`;
  }).join('');
  
  errorSection.classList.add('show');
}

// 隐藏错误详情
function hideErrors() {
  const errorSection = document.getElementById('error-section');
  errorSection.classList.remove('show');
}

// HTML 转义
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 绑定上传按钮事件
document.getElementById('btn-upload').addEventListener('click', handleUpload);

// 绑定清除错误按钮事件
document.getElementById('btn-clear-errors').addEventListener('click', hideErrors);

// 清除 API Key
async function clearApiKey() {
  await storeApiKey('');
  showStatus('✅ API Key 已清除', 'success');
}

// 绑定清除 API Key 按钮事件
document.getElementById('btn-clear-apikey').addEventListener('click', clearApiKey);
