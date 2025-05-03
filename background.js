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
    let prompt;
    if (request.templateExt === 'tex') {
      prompt = `
You are an expert resume writer. Given the following job description, current resume, and resume template in LaTeX format, create a customized resume.
- Follow the exact structure and formatting of the LaTeX template
- Only include relevant experiences, skills, and keywords that match the job description
- Rewrite sections as needed to highlight fit

Job Description:
${request.jobDescription}

Current Resume Content:
${request.resumeContent}

Resume Template Format (LaTeX):
${request.template || '(Using default LaTeX format)'}

Instructions:
1. Keep the personal information like name, email, phone number, linkedin and github intact in the LaTex template
2. Fill in the template with relevant content from the current resume
3. Customize content to match job requirements
4. Keep LaTeX formatting intact
5. Output the complete formatted LaTeX resume
6. Keep the dates in the mmm yyyy format (e.g., Jan 2020)
7. Generate a 2 page resume
`;
    } else {
      prompt = `
You are an expert resume writer. Given the following job description, current resume, and resume template in markdown format, create a customized resume.
- Follow the exact structure and formatting of the template
- Only include relevant experiences, skills, and keywords that match the job description
- Rewrite sections as needed to highlight fit

Job Description:
${request.jobDescription}

Current Resume Content:
${request.resumeContent}

Resume Template Format:
${request.template || '(Using default markdown format)'}

Instructions:
1. Keep the personal information like name, email, phone number, linkedin and github intact in the Markdown template
2. Fill in the template with relevant content from the current resume
3. Customize content to match job requirements
4. Keep Markdown formatting intact
5. Output the complete formatted Markdown resume
6. Keep the dates in the mmm yyyy format (e.g., Jan 2020)
7. Generate a 2 page resume
`;
    }
    callLLM(request.model, request.endpoint, request.apiKey, prompt).then(customizedResume => {
      chrome.storage.local.set({ customizedResume }, function() {
        sendResponse({ success: true, customizedResume });
      });
    });
    return true; // async
  }
});