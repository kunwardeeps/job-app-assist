document.addEventListener('DOMContentLoaded', function() {
  console.log('[popup.js] DOMContentLoaded');
  document.getElementById('autofill-btn').addEventListener('click', function() {
    console.log('[popup.js] Auto Fill button clicked');
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      console.log('[popup.js] Executing content.js in tab', tabs[0].id);
      chrome.scripting.executeScript({
        target: {tabId: tabs[0].id},
        files: ['content.js']
      });
      // Send message to content script to trigger autofill
      chrome.tabs.sendMessage(tabs[0].id, { action: 'autofill' }, function(response) {
        console.log('[popup.js] Sent autofill message, response:', response);
      });
    });
  });
});