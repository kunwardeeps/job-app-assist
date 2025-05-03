document.addEventListener('DOMContentLoaded', function() {
  // Load saved config
  chrome.storage.sync.get([
    'resumePath', 'llmEndpoint', 'llmKey', 'llmModel',
    'personalName', 'personalEmail', 'personalPhone', 'personalLinkedin', 'personalGithub', 'template'
  ], function(items) {
    const resumePathInput = document.getElementById('resume-path');
    const llmEndpointInput = document.getElementById('llm-endpoint');
    const llmKeyInput = document.getElementById('llm-key');
    const llmModelSelect = document.getElementById('llm-model');
    const nameInput = document.getElementById('personal-name');
    const emailInput = document.getElementById('personal-email');
    const phoneInput = document.getElementById('personal-phone');
    const linkedinInput = document.getElementById('personal-linkedin');
    const githubInput = document.getElementById('personal-github');
    const templateInput = document.getElementById('template');

    if (resumePathInput) resumePathInput.value = items.resumePath || '';
    if (llmEndpointInput) llmEndpointInput.value = items.llmEndpoint || '';
    if (llmKeyInput) llmKeyInput.value = items.llmKey || '';
    if (llmModelSelect) llmModelSelect.value = items.llmModel || 'gemini';
    if (nameInput) nameInput.value = items.personalName || '';
    if (emailInput) emailInput.value = items.personalEmail || '';
    if (phoneInput) phoneInput.value = items.personalPhone || '';
    if (linkedinInput) linkedinInput.value = items.personalLinkedin || '';
    if (githubInput) githubInput.value = items.personalGithub || '';
    if (templateInput) templateInput.value = items.template || '';
  });

  // Use form submit event instead of button click
  const optionsForm = document.getElementById('options-form');
  if (optionsForm) {
    optionsForm.addEventListener('submit', function(e) {
      e.preventDefault();
      const resumePathInput = document.getElementById('resume-path');
      const llmEndpointInput = document.getElementById('llm-endpoint');
      const llmKeyInput = document.getElementById('llm-key');
      const llmModelSelect = document.getElementById('llm-model');
      const nameInput = document.getElementById('personal-name');
      const emailInput = document.getElementById('personal-email');
      const phoneInput = document.getElementById('personal-phone');
      const linkedinInput = document.getElementById('personal-linkedin');
      const githubInput = document.getElementById('personal-github');
      const templateInput = document.getElementById('template');

      chrome.storage.sync.set({
        resumePath: resumePathInput ? resumePathInput.value : '',
        llmEndpoint: llmEndpointInput ? llmEndpointInput.value : '',
        llmKey: llmKeyInput ? llmKeyInput.value : '',
        llmModel: llmModelSelect ? llmModelSelect.value : 'gemini',
        personalName: nameInput ? nameInput.value : '',
        personalEmail: emailInput ? emailInput.value : '',
        personalPhone: phoneInput ? phoneInput.value : '',
        personalLinkedin: linkedinInput ? linkedinInput.value : '',
        personalGithub: githubInput ? githubInput.value : '',
        template: templateInput ? templateInput.value : ''
      }, function() {
        alert('Configuration saved!');
      });
    });
  }

  // Safely get elements
  const browseBtn = document.getElementById('browse-btn');
  const resumeFileInput = document.getElementById('resume-file');
  const resumePathInput = document.getElementById('resume-path');
  const resumeTemplatePathInput = document.getElementById('resume-template-path');
  const resumeTemplateBrowseBtn = document.getElementById('resume-template-browse-btn');
  const resumeTemplateFileInput = document.getElementById('resume-template-file');
  const resumeTemplateStatus = document.getElementById('resume-template-status');

  // Load saved resume template (if any) and update input/status
  if (resumeTemplatePathInput) {
    chrome.storage.local.get(['resumeTemplate'], function(items) {
      if (items.resumeTemplate && items.resumeTemplate.name) {
        resumeTemplatePathInput.value = items.resumeTemplate.name;
      }
    });
  }

  // Only add listeners if all elements exist
  if (browseBtn && resumeFileInput && resumePathInput) {
    browseBtn.addEventListener('click', function(e) {
      e.preventDefault();
      resumeFileInput.click();
    });

    resumeFileInput.addEventListener('change', function() {
      if (resumeFileInput.files && resumeFileInput.files.length > 0) {
        resumePathInput.value = resumeFileInput.files[0].name;
      }
    });
  }

  if (resumeTemplateBrowseBtn && resumeTemplateFileInput && resumeTemplatePathInput) {
    resumeTemplateBrowseBtn.addEventListener('click', function() {
      resumeTemplateFileInput.click();
    });
    resumeTemplateFileInput.addEventListener('change', function(e) {
      if (resumeTemplateFileInput.files.length > 0) {
        resumeTemplatePathInput.value = resumeTemplateFileInput.files[0].name;
        if (resumeTemplateStatus) {
          resumeTemplateStatus.textContent = "Template selected.";
        }
      }
    });
  }

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

  // Handle resume template (.md or .tex) import
  document.getElementById('resume-template-file').addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function(e) {
        // Store as text in local storage for .md or .tex files
        const templateContent = {
          name: file.name,
          type: file.type,
          ext: file.name.split('.').pop().toLowerCase(),
          data: e.target.result
        };
        chrome.storage.local.set({ resumeTemplate: templateContent }, function() {
          console.log('[options.js] Resume template saved to local storage');
        });
      };
      reader.readAsText(file);
    }
  });

  // Load dark mode preference
  chrome.storage.sync.get(['darkMode'], function(items) {
    const darkMode = !!items.darkMode;
    applyDarkMode(darkMode);
    const toggle = document.getElementById('dark-mode-toggle');
    if (toggle) toggle.checked = darkMode;
  });

  // Dark mode toggle event
  const darkToggle = document.getElementById('dark-mode-toggle');
  if (darkToggle) {
    darkToggle.addEventListener('change', function() {
      const enabled = darkToggle.checked;
      applyDarkMode(enabled);
      chrome.storage.sync.set({ darkMode: enabled });
    });
  }
});

// Dark mode logic
function applyDarkMode(enabled) {
  if (enabled) {
    document.body.classList.add('dark-mode');
  } else {
    document.body.classList.remove('dark-mode');
  }
}