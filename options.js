document.addEventListener('DOMContentLoaded', function() {
  // Load saved config
  chrome.storage.sync.get(['resumePath', 'llmEndpoint', 'llmKey', 'llmModel'], function(items) {
    document.getElementById('resume-path').value = items.resumePath || '';
    document.getElementById('llm-endpoint').value = items.llmEndpoint || '';
    document.getElementById('llm-key').value = items.llmKey || '';
    document.getElementById('llm-model').value = items.llmModel || 'gemini';
  });

  document.getElementById('save-btn').addEventListener('click', function() {
    chrome.storage.sync.set({
      resumePath: document.getElementById('resume-path').value,
      llmEndpoint: document.getElementById('llm-endpoint').value,
      llmKey: document.getElementById('llm-key').value,
      llmModel: document.getElementById('llm-model').value
    }, function() {
      alert('Configuration saved!');
    });
  });

  document.getElementById('browse-btn').addEventListener('click', function() {
    document.getElementById('resume-file').click();
  });

  document.getElementById('resume-file').addEventListener('change', async function(event) {
    const file = event.target.files[0];
    if (file) {
      document.getElementById('resume-path').value = file.name;
      
      // Read file based on type
      const reader = new FileReader();
      reader.onload = async function(e) {
        let resumeContent;
        
        if (file.name.toLowerCase().endsWith('.pdf')) {
          console.log('[options.js] Reading PDF file, size:', e.target.result.byteLength);
          // For PDFs, store as ArrayBuffer
          resumeContent = {
            type: 'pdf',
            data: Array.from(new Uint8Array(e.target.result)),
            size: e.target.result.byteLength
          };
          // Use chrome.storage.local for PDFs since they can be large
          chrome.storage.local.set({ resumeContent }, function() {
            console.log('[options.js] PDF content saved to local storage');
          });
        } else {
          // For JSON/text files use sync storage
          const text = e.target.result;
          try {
            resumeContent = JSON.parse(text);
          } catch {
            resumeContent = {
              type: 'text',
              data: text
            };
          }
          chrome.storage.sync.set({ resumeContent }, function() {
            console.log('[options.js] Text/JSON content saved to sync storage');
          });
        }
      };

      // Read as appropriate format
      if (file.name.toLowerCase().endsWith('.pdf')) {
        reader.readAsArrayBuffer(file);
      } else {
        reader.readAsText(file);
      }
    }
  });

  // Handle resume template (LaTeX .tex) import
  document.getElementById('resume-template-file').addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function(e) {
        // Store as text in local storage for .tex files
        const templateContent = {
          name: file.name,
          type: file.type,
          data: e.target.result
        };
        chrome.storage.local.set({ resumeTemplate: templateContent }, function() {
          document.getElementById('resume-template-status').textContent = 'Template uploaded: ' + file.name;
          console.log('[options.js] Resume template saved to local storage');
        });
      };
      reader.readAsText(file);
    }
  });
});