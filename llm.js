// LLM API logic: switchable between Gemini and GPT-4
async function callLLM(model, endpoint, apiKey, prompt) {
  console.log('[llm.js] callLLM called with model:', model, 'endpoint:', endpoint);

  if (model === 'gemini') {
    // Google Gemini API call
    console.log('[llm.js] Sending request to Gemini API');
    const response = await fetch(endpoint + apiKey, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({contents: [{parts: [{text: prompt}]}]})
    });
    console.log('[llm.js] Gemini API response status:', response.status);
    const data = await response.json();
    console.log('[llm.js] Gemini API response data:', data);
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  } else if (model === 'gpt-4') {
    // OpenAI GPT-4 API call
    console.log('[llm.js] Sending request to GPT-4 API');
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({model: 'gpt-4', messages: [{role: 'user', content: prompt}]})
    });
    console.log('[llm.js] GPT-4 API response status:', response.status);
    const data = await response.json();
    console.log('[llm.js] GPT-4 API response data:', data);
    return data.choices?.[0]?.message?.content || '';
  }
  console.warn('[llm.js] Unknown model:', model);
  return '';
}