function loadConfig() {
  chrome.storage.sync.get(['apiKey', 'endpoint', 'model', 'template'], function(items) {
    document.getElementById('template').value = items.template || '';
    document.getElementById('current-template').textContent = items.template || '(No template set)';
  });
}

document.getElementById('config-form').addEventListener('submit', function(e) {
  e.preventDefault();
  const template = document.getElementById('template').value;
  chrome.storage.sync.set({
    template
  }, function() {
    document.getElementById('current-template').textContent = template || '(No template set)';
  });
});

document.addEventListener('DOMContentLoaded', loadConfig);