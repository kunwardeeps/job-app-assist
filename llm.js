// LLM API logic: switchable between Gemini and GPT-4
async function callLLM(model, endpoint, apiKey, prompt) {
  if (model === 'gemini') {
    // Google Gemini API call
    const response = await fetch(endpoint + apiKey, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({contents: [{parts: [{text: prompt}]}]})
    });
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  } else if (model === 'gpt-4') {
    // OpenAI GPT-4 API call
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({model: 'gpt-4', messages: [{role: 'user', content: prompt}]})
    });
    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  }
  return '';
}