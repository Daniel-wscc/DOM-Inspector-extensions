// 背景腳本 - 處理擴展的生命週期和全域事件
const tabStates = new Map();

chrome.runtime.onInstalled.addListener(() => {
  console.log('DOM Inspector Pro 已安裝');
});

// 處理擴展圖標點擊事件
chrome.action.onClicked.addListener(async (tab) => {
  const currentState = tabStates.get(tab.id) || false;
  const nextState = !currentState;
  
  // 更新狀態
  tabStates.set(tab.id, nextState);
  
  // 發送訊息給 content script
  try {
    await chrome.tabs.sendMessage(tab.id, { action: 'toggle', isActive: nextState });
  } catch (error) {
    console.log('無法發送訊息 (可能是 content script 尚未載入):', error);
  }
});

// 監聽 Tab 更新事件 (例如重新整理)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // 當頁面開始載入時，重置該 Tab 的狀態為 false
  if (changeInfo.status === 'loading') {
    if (tabStates.has(tabId)) {
      tabStates.set(tabId, false);
      console.log(`Tab ${tabId} 重新整理，重置狀態為 false`);
    }
  }
});

// 監聽 Tab 關閉事件
chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabStates.has(tabId)) {
    tabStates.delete(tabId);
    console.log(`Tab ${tabId} 已關閉，清除狀態`);
  }
});

// 監聽來自內容腳本的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const tabId = sender.tab ? sender.tab.id : null;

  if (request.action === 'getStatus') {
    const isActive = tabId ? (tabStates.get(tabId) || false) : false;
    sendResponse({ isActive: isActive });
  } else if (request.action === 'updateStatus') {
    // 更新狀態以保持同步 (例如用戶從 UI 關閉了 inspector)
    if (tabId) {
      tabStates.set(tabId, request.isActive);
      console.log(`Tab ${tabId} 狀態已更新:`, request.isActive);
    }
  }
  sendResponse({ received: true });
});
