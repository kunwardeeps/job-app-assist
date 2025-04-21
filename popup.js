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

  // Grab selected text from the page and put in textarea
  document.getElementById('grab-selection-btn').addEventListener('click', function() {
    chrome.tabs.executeScript({
      code: 'window.getSelection().toString();'
    }, function(selection) {
      if (selection && selection[0]) {
        document.getElementById('job-desc').value = selection[0];
      }
    });
  });

  // Generate customized resume
  document.getElementById('generate-resume-btn').addEventListener('click', function() {
    const jobDesc = document.getElementById('job-desc').value.trim();
    if (!jobDesc) {
      alert('Please enter or select a job description.');
      return;
    }
    // Get resume and config
    chrome.storage.sync.get(['llmEndpoint', 'llmKey', 'llmModel'], function(config) {
      chrome.runtime.sendMessage({ action: 'readResume' }, function(resumeResp) {
        let resumeContent = '';
        if (resumeResp && resumeResp['resume-data']) {
          if (resumeResp['resume-data'].type === 'pdf') {
            resumeContent = '[PDF resume detected. Please use a text resume for customization.]';
          } else if (typeof resumeResp['resume-data'].data === 'string') {
            resumeContent = resumeResp['resume-data'].data;
          } else {
            resumeContent = JSON.stringify(resumeResp['resume-data'].data || resumeResp['resume-data']);
          }
        }
        chrome.storage.local.get(['resumeTemplate'], function(templateData) {
          chrome.runtime.sendMessage({
            action: 'generateResume',
            jobDescription: jobDesc,
            resumeContent: resumeContent,
            template: templateData.resumeTemplate?.data || '',
            model: config.llmModel,
            endpoint: config.llmEndpoint,
            apiKey: config.llmKey
          }, function(resp) {
            if (resp && resp.success) {
              const blob = new Blob([resp.customizedResume], { type: 'text/markdown' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'customized-resume.md';
              document.body.appendChild(a);
              a.click();
              setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
              }, 100);
            } else {
              alert('Failed to generate customized resume.');
            }
          });
        });
      });
    });
  });

  // Add download saved resume handler
  document.getElementById('download-saved-resume-btn').addEventListener('click', function() {
    chrome.storage.local.get(['customizedResume'], function(data) {
      if (data.customizedResume) {
        const blob = new Blob([data.customizedResume], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'saved-resume.md';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 100);
      } else {
        alert('No saved resume found in storage.');
      }
    });
  });
});