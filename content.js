// Content script: detects forms, extracts questions, and communicates with popup/background

console.log('[content.js] Content script loaded');

// Initialize PDF.js worker
if (typeof window.pdfjsLib === 'undefined') {
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('pdf.min.js');
  script.onload = () => {
    console.log('[content.js] PDF.js injected');
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('pdf.worker.min.js');
  };
  document.head.appendChild(script);
} else {
  window.pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('pdf.worker.min.js');
  console.log('[content.js] PDF.js worker initialized with:', window.pdfjsLib.GlobalWorkerOptions.workerSrc);
}

function waitForPDFjs() {
  return new Promise((resolve) => {
    if (window.pdfjsLib) {
      resolve();
    } else {
      const check = setInterval(() => {
        if (window.pdfjsLib) {
          clearInterval(check);
          resolve();
        }
      }, 50);
    }
  });
}

// Helper: Extract text from PDF content
async function extractPDFText(arrayBuffer) {
  try {
    await waitForPDFjs(); // Wait for PDF.js to be loaded
    if (!window.pdfjsLib) {
      throw new Error('PDF.js not loaded');
    }
    console.log('[content.js] Starting PDF extraction, buffer size:', arrayBuffer.byteLength);
    const loadingTask = window.pdfjsLib.getDocument({ data: arrayBuffer });
    console.log('[content.js] PDF loading task created');
    
    const pdf = await loadingTask.promise;
    console.log('[content.js] PDF loaded, pages:', pdf.numPages);
    
    let text = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      console.log('[content.js] Processing page', i);
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map(item => item.str).join(' ');
      text += pageText + '\n';
      console.log('[content.js] Page', i, 'text length:', pageText.length);
    }
    
    console.log('[content.js] PDF extraction complete, total text length:', text.length);
    return text;
  } catch (e) {
    console.error('[content.js] PDF extraction error:', e);
    console.error('[content.js] Error stack:', e.stack);
    return null;
  }
}

// Helper: Process resume content
async function processResumeContent(content) {
  if (!content) {
    console.log('[content.js] No resume content provided');
    return null;
  }

  console.log('[content.js] Processing resume content of type:', content.type);
  
  if (content.type === 'pdf') {
    console.log('[content.js] Converting PDF data array to buffer, length:', content.data.length);
    // Convert Uint8Array back to ArrayBuffer
    const arrayBuffer = new Uint8Array(content.data).buffer;
    console.log('[content.js] Created array buffer, size:', arrayBuffer.byteLength);
    
    const text = await extractPDFText(arrayBuffer);
    if (!text) {
      console.error('[content.js] PDF text extraction failed');
      return null;
    }
    
    return {
      raw_text: text,
      extracted: true,
      source: 'pdf'
    };
  } else if (content.type === 'text') {
    return {
      raw_text: content.data,
      extracted: false,
      source: 'text'
    };
  } else {
    // Assume JSON object
    return content;
  }
}

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
      // Ask background for resume content
      chrome.runtime.sendMessage({ action: 'readResume' }, async (resp) => {
        console.log('[content.js] Resume read response:', resp);
        if (!resp || !resp.resume) {
          alert('Could not read resume. Check file in options.');
          return;
        }

        // Process resume content (including PDF extraction if needed)
        const resume = await processResumeContent(resp.resume);
        if (!resume) {
          alert('Could not process resume content.');
          return;
        }

        const questions = extractQuestions();
        const questionTexts = questions.map(q => q.label);
        
        // Format resume data for prompt based on type
        let resumeText;
        if (resume.raw_text) {
          // For PDF or plain text resumes
          resumeText = resume.raw_text;
        } else {
          // For JSON resumes
          resumeText = JSON.stringify(resume);
        }
        
        // Compose prompt
        const prompt = `Resume: ${resumeText}\n\nAnswer the following job application questions as the candidate, using the resume above.\nReturn a JSON object where each key is the question and the value is the answer.\nQuestions: ${JSON.stringify(questionTexts)}\n\nExample format: {"Why do you want this job?": "Because...", "Describe your experience": "I have..."}`;
        
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