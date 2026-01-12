// 全局函數定義 - 必須在最開始定義
window.copyToClipboard = function(text) {
  console.log('嘗試複製文字:', text);
  
  // 優先使用現代 Clipboard API
  if (navigator.clipboard && window.isSecureContext) {
    console.log('使用 Clipboard API');
    navigator.clipboard.writeText(text).then(() => {
      console.log('Clipboard API 成功');
      showCopySuccess(text);
    }).catch(err => {
      console.error('Clipboard API 失敗，使用備用方法:', err);
      fallbackCopy(text);
    });
  } else {
    console.log('使用備用複製方法');
    // 備用方法
    fallbackCopy(text);
  }
};

window.downloadImage = function(src) {
  const link = document.createElement('a');
  link.href = src;
  link.download = src.split('/').pop() || 'image';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// 顯示複製成功訊息
function showCopySuccess(text) {
  // 創建一個臨時的提示訊息
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: #7c3aed;
    color: white;
    padding: 12px 20px;
    border-radius: 6px;
    font-size: 14px;
    z-index: 10001;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  `;
  notification.textContent = `已複製: ${text}`;
  document.body.appendChild(notification);
  
  // 2秒後自動移除
  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, 2000);
}

// 顯示複製失敗訊息
function showCopyError() {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: #ef4444;
    color: white;
    padding: 12px 20px;
    border-radius: 6px;
    font-size: 14px;
    z-index: 10001;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  `;
  notification.textContent = '複製失敗，請手動複製';
  document.body.appendChild(notification);
  
  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, 2000);
}

// 備用複製方法
function fallbackCopy(text) {
  try {
    console.log('開始備用複製方法');
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-999999px';
    textarea.style.top = '-999999px';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    
    console.log('textarea 已創建並添加到 DOM');
    
    textarea.focus();
    textarea.select();
    
    console.log('嘗試執行 execCommand copy');
    const successful = document.execCommand('copy');
    console.log('execCommand 結果:', successful);
    
    document.body.removeChild(textarea);
    
    if (successful) {
      console.log('備用複製成功');
      showCopySuccess(text);
    } else {
      console.log('備用複製失敗');
      showCopyError();
    }
  } catch (err) {
    console.error('備用複製方法失敗:', err);
    showCopyError();
  }
}

// DOM 檢查器 - 在網頁上顯示元素資訊
class DOMInspector {
  constructor() {
    this.isActive = false;
    this.currentElement = null;
    this.popup = null;
    this.highlight = null;
    this.boundMouseOver = null;
    this.boundMouseOut = null;
    this.boundClick = null;
    this.init();
  }

  init() {
    try {
      // 創建浮動 popup 面板
      this.createPopup();
      
      // 創建高亮元素
      this.createHighlight();
      
      // 監聽來自 background script 的消息
      if (chrome && chrome.runtime && chrome.runtime.onMessage) {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
          try {
            if (request.action === 'toggle') {
              this.toggleInspection(request.isActive);
              sendResponse({received: true});
            }
          } catch (error) {
            console.log('消息處理錯誤:', error);
            sendResponse({received: false, error: error.message});
          }
        });
      }
    } catch (error) {
      console.log('init 錯誤:', error);
    }
  }

  createPopup() {
    // 創建浮動 popup 面板
    this.popup = document.createElement('div');
    this.popup.id = 'dom-inspector-popup';
    this.popup.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      width: 450px;
      max-height: 600px;
      background: white;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      overflow: hidden;
      display: none;
      transition: opacity 0.2s ease;
    `;

    // 創建標題欄
    const header = document.createElement('div');
    header.style.cssText = `
      background: #7c3aed;
      color: white;
      padding: 12px 16px;
      font-weight: 600;
      display: flex;
      justify-content: space-between;
      align-items: center;
    `;
    header.innerHTML = `
      <span>🔍 DOM Inspector</span>
      <button id="close-popup" style="background: none; border: none; color: white; cursor: pointer; font-size: 18px;">×</button>
    `;

    // 創建設定區域
    const settingsArea = document.createElement('div');
    settingsArea.style.cssText = `
      padding: 12px 16px;
      background: #f8f9fa;
      border-bottom: 1px solid #e0e0e0;
      display: flex;
      align-items: center;
      gap: 8px;
    `;
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = 'use-original-size';
    checkbox.style.cssText = `
      margin: 0;
      cursor: pointer;
    `;
    
    // 從localStorage讀取保存的狀態
    const savedState = localStorage.getItem('dom-inspector-divide-size');
    if (savedState === 'true') {
      checkbox.checked = true;
    }
    
    // 監聽checkbox變化並保存狀態
    checkbox.addEventListener('change', () => {
      localStorage.setItem('dom-inspector-divide-size', checkbox.checked.toString());
    });
    
    const checkboxLabel = document.createElement('label');
    checkboxLabel.htmlFor = 'use-original-size';
    checkboxLabel.style.cssText = `
      font-size: 13px;
      color: #555;
      cursor: pointer;
      user-select: none;
    `;
    checkboxLabel.textContent = '複製除以2的尺寸';
    
    settingsArea.appendChild(checkbox);
    settingsArea.appendChild(checkboxLabel);

    // 創建內容區域
    const content = document.createElement('div');
    content.id = 'popup-content';
    content.style.cssText = `
      padding: 20px;
      max-height: 500px;
      overflow-y: auto;
    `;

    this.popup.appendChild(header);
    this.popup.appendChild(settingsArea);
    this.popup.appendChild(content);
    document.body.appendChild(this.popup);

    // 關閉按鈕事件
    const closeBtn = this.popup.querySelector('#close-popup');
    closeBtn.addEventListener('click', () => {
      this.hidePopup();
    });

    // 拖拽功能
    this.makeDraggable(this.popup, header);
  }

  createHighlight() {
    this.highlight = document.createElement('div');
    this.highlight.style.cssText = `
      position: absolute;
      border: 2px solid #7c3aed;
      background: rgba(124, 58, 237, 0.1);
      pointer-events: none;
      z-index: 9999;
      display: none;
      transition: all 0.2s ease;
    `;
    document.body.appendChild(this.highlight);
  }

  makeDraggable(element, handle) {
    let isDragging = false;
    let startX, startY, startLeft, startTop;

    handle.addEventListener('mousedown', (e) => {
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      startLeft = parseInt(element.style.left) || 0;
      startTop = parseInt(element.style.top) || 0;
      handle.style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;
      
      element.style.left = (startLeft + deltaX) + 'px';
      element.style.top = (startTop + deltaY) + 'px';
    });

    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        handle.style.cursor = 'grab';
      }
    });
  }

  toggleInspection(isActive) {
    try {
      // 直接設置狀態，不進行複雜的邏輯判斷
      this.isActive = isActive;
      
      if (this.isActive) {
        this.showPopup();
        this.bindEvents();
        // 每次重新開啟時，重置為無選中狀態
        this.clearSelection();
      } else {
        this.hidePopup();
        this.unbindEvents();
        this.clearSelection();
      }
    } catch (error) {
      console.log('toggleInspection 錯誤:', error);
      // 如果出現錯誤，重置狀態
      this.isActive = false;
    }
  }

  bindEvents() {
    // 使用箭頭函數來保持 this 的引用，並存儲引用以便移除
    this.boundMouseOver = (event) => this.handleMouseOver(event);
    this.boundMouseOut = (event) => this.handleMouseOut(event);
    this.boundClick = (event) => this.handleClick(event);
    
    document.addEventListener('mouseover', this.boundMouseOver);
    document.addEventListener('mouseout', this.boundMouseOut);
    document.addEventListener('click', this.boundClick);
  }

  unbindEvents() {
    // 使用存儲的引用來移除事件監聽器
    if (this.boundMouseOver) {
      document.removeEventListener('mouseover', this.boundMouseOver);
      this.boundMouseOver = null;
    }
    if (this.boundMouseOut) {
      document.removeEventListener('mouseout', this.boundMouseOut);
      this.boundMouseOut = null;
    }
    if (this.boundClick) {
      document.removeEventListener('click', this.boundClick);
      this.boundClick = null;
    }
  }

  handleMouseOver(event) {
    if (!this.isActive) return;
    
    const element = event.target;
    if (element === this.popup || element.closest('#dom-inspector-popup')) return;
    
    // 懸停時只顯示高亮框線，不更新資訊
    this.showHighlight(element);
  }

  handleMouseOut(event) {
    if (!this.isActive) return;
    
    if (event.relatedTarget && 
        (event.relatedTarget === this.popup || event.relatedTarget.closest('#dom-inspector-popup'))) {
      return;
    }
    
    // 如果沒有選中的元素，則清除高亮
    if (!this.currentElement) {
      this.clearHighlight();
    }
  }

  handleClick(event) {
    if (!this.isActive) return;
    
    const element = event.target;
    if (element === this.popup || element.closest('#dom-inspector-popup')) return;
    
    // 如果點擊的是按鈕或連結，不處理
    if (element.tagName === 'BUTTON' || element.tagName === 'A') return;
    
    event.preventDefault();
    event.stopPropagation();

    // 如果點擊的是圖片，直接複製高度
    if (element.tagName === 'IMG') {
      const height = element.naturalHeight || element.offsetHeight;
      // 檢查checkbox狀態來決定是否除以2
      const useDividedSize = document.getElementById('use-original-size')?.checked || false;
      const finalHeight = useDividedSize ? Math.round(height / 2) : height;
      window.copyToClipboard(finalHeight.toString());
    }
    
    // 如果點擊的是同一個元素，則取消選中
    // 選中元素 (不再因為重複點擊而取消選中)
    this.currentElement = element;
    // 保持高亮顯示
    this.showHighlight(element);
    // 更新資訊框
    this.updatePopupInfo(element);
  }

  showHighlight(element) {
    if (!element) return;
    
    const rect = element.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    
    this.highlight.style.display = 'block';
    this.highlight.style.left = (rect.left + scrollLeft) + 'px';
    this.highlight.style.top = (rect.top + scrollTop) + 'px';
    this.highlight.style.width = rect.width + 'px';
    this.highlight.style.height = rect.height + 'px';
  }

  clearHighlight() {
    this.highlight.style.display = 'none';
  }

  clearSelection() {
    this.currentElement = null;
    this.clearHighlight();
    this.clearPopupInfo();
  }

  showPopup() {
    try {
      if (this.popup && this.popup.style) {
        this.popup.style.display = 'block';
        this.popup.style.opacity = '1';
      }
    } catch (error) {
      console.log('showPopup 錯誤:', error);
    }
  }

  hidePopup() {
    try {
      if (this.popup && this.popup.style) {
        this.popup.style.opacity = '0';
        setTimeout(() => {
          if (this.popup && this.popup.style) {
            this.popup.style.display = 'none';
            // 關閉資訊視窗時，同時關閉檢查模式
            this.isActive = false;
            this.unbindEvents();
            // 不清空選中狀態，只清除高亮
            this.clearHighlight();
            
            // 通知 background.js 更新狀態
            try {
              chrome.runtime.sendMessage({action: 'updateStatus', isActive: false});
            } catch (error) {
              console.log('無法發送狀態更新消息:', error);
            }
          }
        }, 200);
      }
    } catch (error) {
      console.log('hidePopup 錯誤:', error);
    }
  }

    updatePopupInfo(element) {
    if (!element) return;
    
    const content = this.popup.querySelector('#popup-content');
    const elementData = this.getElementData(element);
    
    // 清空內容
    content.innerHTML = '';
    
    // 創建元素標籤
    const elementLabel = document.createElement('div');
    elementLabel.style.cssText = 'margin-bottom: 20px;';
    elementLabel.innerHTML = `
      <div style="font-size: 12px; color: #666; text-transform: uppercase; margin-bottom: 6px;">Element</div>
      <div style="font-size: 20px; font-weight: 600; color: #7c3aed;">${elementData.tagName.toLowerCase()}</div>
    `;
    content.appendChild(elementLabel);
    
    // 如果是圖片，顯示圖片預覽
    if (elementData.tagName === 'IMG' && elementData.src) {
      const imgPreview = document.createElement('div');
      imgPreview.style.cssText = 'margin-bottom: 16px;';
      const img = document.createElement('img');
      img.src = elementData.src;
      img.alt = elementData.alt || '';
      img.style.cssText = 'width: 100%; max-height: 150px; object-fit: contain; border-radius: 4px; border: 1px solid #e0e0e0;';
      imgPreview.appendChild(img);
      content.appendChild(imgPreview);
    }
    
    // 創建屬性容器
    const propertiesContainer = document.createElement('div');
    propertiesContainer.style.cssText = 'margin-bottom: 20px;';
    
    const propertiesTitle = document.createElement('div');
    propertiesTitle.style.cssText = 'font-size: 16px; font-weight: 600; color: #333; margin-bottom: 12px;';
    propertiesTitle.textContent = 'Properties';
    propertiesContainer.appendChild(propertiesTitle);
    
    if (elementData.tagName === 'IMG') {
      // 圖片特殊屬性
      // 檔案名稱
      const fileName = this.getFileName(elementData.src) || elementData.alt || 'Unknown';
      const fileNameRow = this.createPropertyRow('File name', fileName);
      propertiesContainer.appendChild(fileNameRow);
      
      // 檔案大小
      const fileSizeRow = this.createPropertyRow('File size', 'Loading...', 'file-size-value');
      propertiesContainer.appendChild(fileSizeRow);
      
      // 尺寸（可點擊複製）
      const originalWidth = elementData.naturalWidth || elementData.offsetWidth;
      const originalHeight = elementData.naturalHeight || elementData.offsetHeight;
      const dimensionsText = `${originalWidth}×${originalHeight} px`;
      const dimensionsRow = this.createPropertyRow('Dimensions', dimensionsText, 'dimensions-copy', true);
      const dimensionsSpan = dimensionsRow.querySelector('.dimensions-copy');
      dimensionsSpan.addEventListener('click', () => {
        const useDividedSize = document.getElementById('use-original-size')?.checked || false;
        const finalWidth = useDividedSize ? Math.round(originalWidth / 2) : originalWidth;
        const finalHeight = useDividedSize ? Math.round(originalHeight / 2) : originalHeight;
        const finalDimensionsText = `${finalWidth}×${finalHeight} px`;
        window.copyToClipboard(finalDimensionsText);
      });
      propertiesContainer.appendChild(dimensionsRow);
      
      // 來源
      if (elementData.src) {
        const sourceRow = this.createPropertyRow('Source', elementData.src.substring(0, 25) + (elementData.src.length > 25 ? '...' : ''));
        propertiesContainer.appendChild(sourceRow);
      }
      
      // Alt 文字
      if (elementData.alt) {
        const altRow = this.createPropertyRow('Alt text', elementData.alt);
        propertiesContainer.appendChild(altRow);
      }
      
      // 下載按鈕
      const downloadBtn = document.createElement('button');
      downloadBtn.style.cssText = 'background: #7c3aed; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; font-size: 13px; margin-top: 8px; display: flex; align-items: center; gap: 4px;';
      downloadBtn.innerHTML = '⬇ Download';
      downloadBtn.addEventListener('click', () => {
        window.downloadImage(elementData.src);
      });
      propertiesContainer.appendChild(downloadBtn);
      
    } else {
      // 其他元素的屬性
      // 尺寸（可點擊複製）
      const originalWidth = elementData.offsetWidth;
      const originalHeight = elementData.offsetHeight;
      const dimensionsText = `${originalWidth}×${originalHeight} px`;
      const dimensionsRow = this.createPropertyRow('Dimensions', dimensionsText, 'dimensions-copy', true);
      const dimensionsSpan = dimensionsRow.querySelector('.dimensions-copy');
      dimensionsSpan.addEventListener('click', () => {
        const useDividedSize = document.getElementById('use-original-size')?.checked || false;
        const finalWidth = useDividedSize ? Math.round(originalWidth / 2) : originalWidth;
        const finalHeight = useDividedSize ? Math.round(originalHeight / 2) : originalHeight;
        const finalDimensionsText = `${finalWidth}×${finalHeight} px`;
        window.copyToClipboard(finalDimensionsText);
      });
      propertiesContainer.appendChild(dimensionsRow);
      
      // Class
      if (elementData.className) {
        const classRow = this.createPropertyRow('Class', elementData.className);
        propertiesContainer.appendChild(classRow);
      }
      
      // ID
      if (elementData.id) {
        const idRow = this.createPropertyRow('ID', elementData.id);
        propertiesContainer.appendChild(idRow);
      }
      
      // 文字內容
      if (elementData.textContent) {
        const textRow = this.createPropertyRow('Text content', elementData.textContent.substring(0, 30) + (elementData.textContent.length > 30 ? '...' : ''));
        propertiesContainer.appendChild(textRow);
      }
    }
    
    content.appendChild(propertiesContainer);
  }

  // 創建屬性行
  createPropertyRow(label, value, className = null, isClickable = false) {
    const row = document.createElement('div');
    row.style.cssText = 'display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f0f0f0;';
    
    const labelSpan = document.createElement('span');
    labelSpan.style.cssText = 'color: #666; font-size: 13px;';
    labelSpan.textContent = label;
    
    const valueSpan = document.createElement('span');
    valueSpan.style.cssText = 'color: #333; font-size: 13px; font-weight: 500; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;';
    
    if (className) {
      valueSpan.className = className;
    }
    
    if (isClickable) {
      valueSpan.style.cssText += 'cursor: pointer; padding: 2px 6px; border-radius: 4px; transition: background-color 0.2s;';
      valueSpan.title = '點擊複製尺寸';
      valueSpan.addEventListener('mouseenter', () => {
        valueSpan.style.backgroundColor = '#f3f4f6';
      });
      valueSpan.addEventListener('mouseleave', () => {
        valueSpan.style.backgroundColor = 'transparent';
      });
    }
    
    valueSpan.textContent = value;
    
    row.appendChild(labelSpan);
    row.appendChild(valueSpan);
    
    return row;
  }

  clearPopupInfo() {
    const content = this.popup.querySelector('#popup-content');
    content.innerHTML = `
      <div style="text-align: center; color: #666; margin-top: 40px;">
        <div style="font-size: 32px; margin-bottom: 12px; opacity: 0.5;">🔍</div>
        <p style="margin: 0; font-size: 12px;">點擊網頁元素查看詳細資訊</p>
      </div>
    `;
  }

  updateFileSizeDisplay(fileSize) {
    const fileSizeElement = this.popup.querySelector('.file-size-value');
    if (fileSizeElement) {
      fileSizeElement.textContent = fileSize;
    }
  }

  getElementData(element) {
    const data = {
      tagName: element.tagName,
      offsetWidth: element.offsetWidth,
      offsetHeight: element.offsetHeight,
      className: element.className,
      id: element.id,
      textContent: element.textContent?.trim()
    };

    if (element.tagName === 'IMG') {
      const img = element;
      data.src = img.src;
      data.alt = img.alt;
      data.naturalWidth = img.naturalWidth;
      data.naturalHeight = img.naturalHeight;
      
      // 獲取圖片檔案大小（不觸發重新更新）
      if (img.src) {
        this.getImageFileSize(img.src).then(fileSize => {
          // 只在需要時更新檔案大小顯示，不觸發整個資訊框重新渲染
          if (this.currentElement === element && fileSize) {
            this.updateFileSizeDisplay(fileSize);
          }
        });
      }
    }

    return data;
  }

  async getImageFileSize(url) {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      const contentLength = response.headers.get('content-length');
      if (contentLength) {
        const size = parseInt(contentLength);
        if (size < 1024) return size + ' B';
        if (size < 1024 * 1024) return (size / 1024).toFixed(1) + ' KB';
        return (size / (1024 * 1024)).toFixed(1) + ' MB';
      }
    } catch (error) {
      console.log('無法獲取圖片檔案大小:', error);
    }
    return null;
  }

  getFileName(url) {
    if (!url) return null;
    const urlObj = new URL(url);
    return urlObj.pathname.split('/').pop();
  }
}





// 等待 DOM 載入完成後初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new DOMInspector();
  });
} else {
  new DOMInspector();
}

