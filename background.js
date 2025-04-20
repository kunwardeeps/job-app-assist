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
    // request.jobDescription: string, request.resumeContent: string, request.model, request.endpoint, request.apiKey
    const prompt = `
You are an expert resume writer. Given the following job description and the current resume, customize the resume to best fit the job description. 
- Only include relevant experiences, skills, and keywords that match the job description.
- Rewrite sections as needed to highlight fit.
- Output the full customized resume in professional format.

Job Description:
${request.jobDescription}

Current Resume:
${request.resumeContent}
`;

    callLLM(request.model, request.endpoint, request.apiKey, prompt).then(customizedResume => {
      // Save customized resume to local storage
      chrome.storage.local.set({ customizedResume }, function() {
        sendResponse({ success: true });
      });
    });
    return true; // async
  }
});