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
  document.getElementById('resume-file').addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (file) {
      document.getElementById('resume-path').value = file.name;
      // Optionally, read and store file content in storage
      const reader = new FileReader();
      reader.onload = function(e) {
        try {
          const resumeContent = JSON.parse(e.target.result);
          chrome.storage.sync.set({ resumeContent });
        } catch {
          chrome.storage.sync.set({ resumeContent: e.target.result });
        }
      };
      reader.readAsText(file);
    }
  });
});