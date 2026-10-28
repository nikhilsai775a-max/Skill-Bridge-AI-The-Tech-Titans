// Netlify Function: secure SkillBridge AI Mentor endpoint using OpenRouter free models.
// Required environment variable: OPENROUTER_API_KEY (set privately in Netlify).
// Uses OpenRouter's free-model router; availability and quotas may vary.
exports.handler = async (event) => {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
  };
  const reply = (statusCode, payload) => ({ statusCode, headers, body: JSON.stringify(payload) });
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers, body: "" };
  if (event.httpMethod !== "POST") return reply(405, { error: "Use POST for AI Mentor requests." });
  if (!process.env.OPENROUTER_API_KEY) {
    return reply(503, { error: "OPENROUTER_API_KEY is not configured in Netlify environment variables. Add it privately, then redeploy." });
  }
  let input;
  try { input = JSON.parse(event.body || "{}"); }
  catch { return reply(400, { error: "Request body must be valid JSON." }); }
  const question = typeof input.question === "string" ? input.question.trim() : "";
  if (!question) return reply(400, { error: "Please enter a question." });
  if (question.length > 6000) return reply(413, { error: "Please keep your question under 6,000 characters." });
  const profile = input.profile && typeof input.profile === "object" ? input.profile : {};
  const assessment = input.assessment && typeof input.assessment === "object" ? input.assessment : {};
  const instructions = [
    "You are SkillBridge AI, a friendly learning and career mentor for students.",
    "Give accurate, practical, age-appropriate educational guidance in clear language.",
    "Use numbered steps when helpful, and tailor advice to the student's goal and level.",
    "Do not promise jobs, grades, or guaranteed outcomes. State uncertainty where relevant.",
    "If asked for practice questions, provide answers with brief explanations.",
    "Keep the answer concise but useful."
  ].join(" ");
  const context = {
    studentProfile: { goal: profile.goal || null, course: profile.course || null, level: profile.level || null, hoursPerWeek: profile.hours || null, interests: profile.interests || [] },
    assessmentSummary: assessment.score != null ? { score: assessment.score, weakTopics: assessment.weak || [] } : null,
    question
  };
  try {
    const upstream = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://skillbridge-ai-nikhil.netlify.app/",
        "X-Title": "SkillBridge AI"
      },
      body: JSON.stringify({
        model: "openrouter/free",
        messages: [
          { role: "system", content: instructions },
          { role: "user", content: JSON.stringify(context) }
        ],
        max_tokens: 900
      })
    });
    const raw = await upstream.text();
    let data;
    try { data = raw ? JSON.parse(raw) : {}; }
    catch { return reply(502, { error: "The AI provider returned an unreadable response. Please try again." }); }
    if (!upstream.ok) {
      const providerMessage = data && data.error && data.error.message;
      return reply(upstream.status === 429 ? 429 : 502, {
        error: providerMessage ? `OpenRouter error: ${providerMessage}` : `AI request failed (HTTP ${upstream.status}). Check your OpenRouter key and free-model availability.`
      });
    }
    const answer = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    if (typeof answer !== "string" || !answer.trim()) return reply(502, { error: "The AI provider returned no text. Please try again." });
    return reply(200, { answer: answer.trim() });
  } catch {
    return reply(502, { error: "Could not reach the AI provider. Check the Netlify function logs and try again." });
  }
};
