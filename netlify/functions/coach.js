// SkillBridge AI Mentor — resilient OpenRouter backend
// Keep OPENROUTER_API_KEY in Netlify environment variables only.
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
  if (!process.env.OPENROUTER_API_KEY) return reply(503, { error: "AI Mentor is not configured. Please contact the site administrator." });

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
    "Give accurate, practical educational guidance in clear language.",
    "Use numbered steps when helpful and tailor advice to the student's goal and level.",
    "Do not promise jobs, grades, or guaranteed outcomes. State uncertainty where relevant.",
    "If asked for practice questions, provide answers with brief explanations.",
    "Keep the answer concise but useful. Return a plain-text answer."
  ].join(" ");
  const context = {
    studentProfile: {
      goal: profile.goal || null, course: profile.course || null, level: profile.level || null,
      hoursPerWeek: profile.hours || null, interests: Array.isArray(profile.interests) ? profile.interests : []
    },
    assessmentSummary: assessment.score != null
      ? { score: assessment.score, weakTopics: Array.isArray(assessment.weak) ? assessment.weak : [] }
      : null,
    question
  };

  for (let attempt = 1; attempt <= 2; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4200);
    try {
      const upstream = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://dainty-maamoul-8c0ac8.netlify.app/",
          "X-Title": "SkillBridge AI"
        },
        body: JSON.stringify({
          model: "openrouter/free",
          messages: [
            { role: "system", content: instructions },
            { role: "user", content: JSON.stringify(context) }
          ],
          max_tokens: 700,
          temperature: 0.4
        })
      });
      const raw = await upstream.text();
      let data;
      try { data = raw ? JSON.parse(raw) : {}; }
      catch {
        if (attempt === 1) continue;
        return reply(502, { error: "The AI provider returned an unreadable response. Please try again." });
      }

      if (!upstream.ok) {
        if ((upstream.status === 429 || upstream.status >= 500) && attempt === 1) continue;
        return reply(upstream.status === 429 ? 429 : 502, {
          error: upstream.status === 429
            ? "The free AI service is busy right now. Wait a moment and try again."
            : "The AI service could not complete this request. Please try again."
        });
      }

      const answer = data?.choices?.[0]?.message?.content;
      if (typeof answer === "string" && answer.trim()) return reply(200, { answer: answer.trim() });
    } catch (error) {
      if (attempt === 2) return reply(502, {
        error: error?.name === "AbortError"
          ? "The AI Mentor took too long to respond. Please try again."
          : "The AI Mentor is temporarily unavailable. Please try again in a few seconds."
      });
    } finally {
      clearTimeout(timeout);
    }
    if (attempt === 1) await new Promise(resolve => setTimeout(resolve, 200));
  }
  return reply(502, { error: "The AI Mentor is temporarily unavailable after retrying. Please try again in a few seconds." });
};
