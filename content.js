// Content script: detects forms, extracts questions, and communicates with popup/background

console.log('[content.js] Content script loaded');

// Helper: extract visible form fields/questions
function extractQuestions() {
  const questions = [];
  const formElements = document.querySelectorAll('form input, form textarea, form select');
  formElements.forEach(el => {
    // Only visible and enabled fields
    if (!el.disabled && el.offsetParent !== null) {
      const label = el.labels && el.labels.length > 0 ? el.labels[0].innerText : el.placeholder || el.name || '';
      if (label) {
        questions.push({
          name: el.name || el.id || label,
          label: label,
          type: el.type || el.tagName.toLowerCase(),
          element: el
        });
      }
    }
  });
  console.log('[content.js] Extracted questions:', questions);
  return questions;
}

// Helper: normalize keys for matching
function normalizeKey(str) {
  return str ? str.toLowerCase().replace(/[^a-z0-9]+/g, '').trim() : '';
}

// Helper: fill answers into form fields
function fillAnswers(questions, answersObj) {
  console.log('[content.js] Filling answers:', answersObj);
  // Normalize LLM answer keys
  const normalizedAnswers = {};
  Object.keys(answersObj).forEach(k => {
    normalizedAnswers[normalizeKey(k)] = answersObj[k];
  });
  questions.forEach((q) => {
    const keyLabel = normalizeKey(q.label);
    const keyName = normalizeKey(q.name);
    const answer = normalizedAnswers[keyLabel] || normalizedAnswers[keyName];
    console.log(`[content.js] Trying to fill field '${q.label}' (name: '${q.name}') with answer:`, answer);
    if (answer !== undefined) {
      if (q.type === 'checkbox' || q.type === 'radio') {
        q.element.checked = !!answer;
      } else if (q.element.tagName.toLowerCase() === 'select') {
        for (let opt of q.element.options) {
          if (normalizeKey(opt.text) === normalizeKey(answer) || normalizeKey(opt.value) === normalizeKey(answer)) {
            q.element.value = opt.value;
            break;
          }
        }
      } else {
        q.element.value = answer;
      }
      q.element.dispatchEvent(new Event('input', { bubbles: true }));
      q.element.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });
}

// Main logic: run on message from popup
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  console.log('[content.js] Received message:', request);
  if (request.action === 'autofill') {
    // Get config from storage
    chrome.storage.sync.get(['resumePath', 'llmEndpoint', 'llmKey', 'llmModel'], async (config) => {
      console.log('[content.js] Loaded config:', config);
      // Ask background to read resume file
      chrome.runtime.sendMessage({ action: 'readResume', path: config.resumePath }, async (resp) => {
        console.log('[content.js] Resume read response:', resp);
        if (!resp || !resp.resume) {
          alert('Could not read resume file. Check path in options.');
          return;
        }
        const resume = resp.resume;
        const questions = extractQuestions();
        const questionTexts = questions.map(q => q.label);
        // Compose prompt
        const prompt = `Resume: ${JSON.stringify(resume)}\n\nAnswer the following job application questions as the candidate, using the resume above.\nReturn a JSON object where each key is the question and the value is the answer.\nQuestions: ${JSON.stringify(questionTexts)}\n\nExample format: {"Why do you want this job?": "Because...", "Describe your experience": "I have..."}`;
        console.log('[content.js] Sending prompt to LLM:', prompt);
        // Ask background to call LLM
        chrome.runtime.sendMessage({
          action: 'callLLM',
          model: config.llmModel,
          endpoint: config.llmEndpoint,
          apiKey: config.llmKey,
          prompt: prompt
        }, (llmResp) => {
          console.log('[content.js] LLM response:', llmResp);
          if (!llmResp || !llmResp.answers) {
            alert('LLM did not return answers.');
            return;
          }
          let answersObj = {};
          
          const stringResult = llmResp.answers.join("").replace("```json", "").replace("```", "").trim();
          if (typeof stringResult === 'string') {
            try {
              answersObj = JSON.parse(stringResult);
            } catch {
              alert('LLM did not return valid JSON.');
              return;
            }
          } else {
            answersObj = llmResp.answers;
          }
          fillAnswers(questions, answersObj);
        });
      });
    });
  }
});