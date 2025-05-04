// Background logic for reading resume and calling LLM
importScripts('llm.js');

console.log('[background.js] Background script loaded');

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[background.js] Received message:', request);
  
  if (request.action === 'readResume') {
    // Try local storage first (for PDFs), then sync storage
    chrome.storage.local.get(['resumeContent'], function(localItems) {
      if (localItems.resumeContent) {
        console.log('[background.js] Found resume in local storage');
        sendResponse({ 'resume-data': localItems.resumeContent });
      } else {
        chrome.storage.sync.get(['resumeContent'], function(syncItems) {
          console.log('[background.js] Found resume in sync storage');
          sendResponse({ 'resume-data': syncItems.resumeContent });
        });
      }
    });
    return true; // async
  }
  
  if (request.action === 'callLLM') {
    callLLM(request.model, request.endpoint, request.apiKey, request.prompt).then(answerText => {
      console.log('[background.js] LLM raw answerText:', answerText);
      // Try to parse as array, else fallback to splitting by newlines
      let answers;
      try {
        answers = JSON.parse(answerText);
      } catch {
        answers = answerText.split(/\n+/).filter(Boolean);
      }
      console.log('[background.js] Parsed answers:', answers);
      sendResponse({ answers });
    });
    return true; // async
  }

  if (request.action === 'generateResume') {
    chrome.storage.sync.get(['promptMd', 'promptTex'], function(prompts) {
      let prompt;
      if (request.templateExt === 'tex') {
        prompt = (prompts.promptTex || '').trim();
      } else {
        prompt = (prompts.promptMd || '').trim();
      }
      // Replace placeholders in prompt
      prompt = prompt
        .replace(/\{\{jobDescription\}\}/g, request.jobDescription || '')
        .replace(/\{\{resumeContent\}\}/g, request.resumeContent || '')
        .replace(/\{\{template\}\}/g, request.template || '');

      callLLM(request.model, request.endpoint, request.apiKey, prompt).then(customizedResume => {
        chrome.storage.local.set({ customizedResume }, function() {
          sendResponse({ success: true, customizedResume });
        });
      });
    });
    return true; // async
  }
});