// 当前抓取的 JSON 数据
let currentJson = '';

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

// 绑定按钮事件
document.getElementById('twitter-list').addEventListener('click', () => {
  executeScriptFile('scripts/twitter-list.js', 'twitter-list');
});

document.getElementById('twitter-single').addEventListener('click', () => {
  executeScriptFile('scripts/twitter-single.js', 'twitter-single');
});

document.getElementById('weibo-list').addEventListener('click', () => {
  executeScriptFile('scripts/weibo-list.js', 'weibo-list');
});

document.getElementById('weibo-single').addEventListener('click', () => {
  executeScriptFile('scripts/weibo-single.js', 'weibo-single');
});

// 复制按钮事件
document.getElementById('btn-copy').addEventListener('click', copyToClipboard);
