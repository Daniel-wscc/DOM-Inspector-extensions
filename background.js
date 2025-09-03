// 背景腳本 - 處理擴展的生命週期和全域事件
let isActive = false;

chrome.runtime.onInstalled.addListener(() => {
  console.log('DOM Inspector Pro 已安裝');
});

// 處理擴展圖標點擊事件
chrome.action.onClicked.addListener(async (tab) => {
  if (!isActive) {
    // 啟用檢查模式
    isActive = true;
    chrome.tabs.sendMessage(tab.id, {action: 'toggle', isActive: true});
  } else {
    // 關閉檢查模式
    isActive = false;
    chrome.tabs.sendMessage(tab.id, {action: 'toggle', isActive: false});
  }
});

// 監聽來自內容腳本的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getStatus') {
    sendResponse({isActive: isActive});
  }
  sendResponse({received: true});
});
