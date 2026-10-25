SKILLBRIDGE AI — FREE-MODEL VERSION (OPENROUTER)

Included:
- index.html: SkillBridge AI interface.
- netlify/functions/coach.js: secure server-side AI Mentor function using OpenRouter's free-model router.
- netlify.toml: Netlify deployment configuration.

SET UP THE FREE AI MENTOR
1. Create an account at https://openrouter.ai/ and create an API key at https://openrouter.ai/settings/keys.
2. In Netlify, open your site -> Project configuration (or Site configuration) -> Environment variables.
3. Add variable name OPENROUTER_API_KEY and paste your OpenRouter key as the value. Keep it secret.
4. Save, then redeploy the site so the function receives the new variable.
5. Open the live site and test AI Mentor.

DEPLOY THE ZIP
1. Extract this ZIP on your computer.
2. Upload the extracted folder contents to the existing Netlify site using the site's manual deploy/Netlify Drop workflow, or update the connected Git repository. Make sure index.html, netlify.toml, and the netlify/functions folder are included.
3. Add OPENROUTER_API_KEY as described above, then trigger a fresh deploy.

IMPORTANT
- This package does not include an API key.
- The function uses model `openrouter/free`. Free model availability and limits can change; OpenRouter currently lists a free plan with a daily request limit.
- Never put the API key in index.html, a public GitHub repository, or a chat message.
- OpenAI API credits are not needed for this version.
