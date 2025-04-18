// Background logic for reading resume and calling LLM

// Import llm.js for LLM API calls
importScripts('llm.js');

console.log('[background.js] Background script loaded');

// Helper: Read resume file from user path (using fetch for file:// URLs)
async function readResumeFile(path) {
  try {
    if (path.startsWith('file://')) {
      const response = await fetch(path);
      return await response.json();
    } else {
      // Try as relative path in extension directory
      const response = await fetch(chrome.runtime.getURL(path));
      return await response.json();
    }
  } catch (e) {
    return null;
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[background.js] Received message:', request);
  if (request.action === 'readResume') {
    readResumeFile(request.path).then(resume => {
      console.log('[background.js] Read resume result:', resume);
      sendResponse({ resume });
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
});