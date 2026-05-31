import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Max-Age': '86400',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  try {
    const { message, systemPrompt, sessionId, visitorId, action } = await req.json();

    const API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!API_KEY) {
      return new Response(JSON.stringify({ error: 'Server configuration: GEMINI_API_KEY is not set' }), {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      });
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Helper to catch missing table errors — returns error in response, doesn't throw
    async function safeDbQuery<T>(fn: () => Promise<{ data: T | null; error: any }>): Promise<{ data: T | null; error: any }> {
      try {
        const r = await fn();
        if (r.error) {
          const msg = typeof r.error === 'string' ? r.error : r.error.message || '';
          if (msg.includes('relation') && msg.includes('does not exist')) {
            return { data: null, error: { message: 'TABLE_MISSING: chat_sessions table does not exist. Run SQL migration first.' } };
          }
          if (msg.includes('does not exist')) {
            return { data: null, error: { message: 'COLUMN_MISSING' } };
          }
        }
        return r;
      } catch (dbErr: any) {
        const msg = dbErr?.message || '';
        if (msg.includes('relation') && msg.includes('does not exist')) {
          return { data: null, error: { message: 'TABLE_MISSING: chat_sessions table does not exist. Run SQL migration first.' } };
        }
        if (msg.includes('does not exist')) {
          return { data: null, error: { message: 'COLUMN_MISSING' } };
        }
        return { data: null, error: dbErr };
      }
    }

    async function insertSession(data: Record<string, unknown>) {
      const result = await safeDbQuery(
        () => supabase.from('chat_sessions').insert(data).select('id').single()
      );
      if (result.error?.message?.startsWith('TABLE_MISSING') || result.error?.message?.startsWith('COLUMN_MISSING')) {
        return null;
      }
      if (result.error?.message === 'COLUMN_MISSING') {
        const { user_info, ...rest } = data;
        const retry = await safeDbQuery(
          () => supabase.from('chat_sessions').insert(rest).select('id').single()
        );
        return (retry.data as { id: string } | null) ?? null;
      }
      if (result.error) throw new Error(`DB insert error: ${result.error.message}`);
      return (result.data as { id: string } | null) ?? null;
    }

    async function updateSession(id: string, data: Record<string, unknown>) {
      const result = await safeDbQuery(
        () => supabase.from('chat_sessions').update(data).eq('id', id)
      );
      if (result.error?.message === 'COLUMN_MISSING') {
        const { user_info, ...rest } = data;
        await safeDbQuery(
          () => supabase.from('chat_sessions').update(rest).eq('id', id)
        );
      }
    }

    let currentSessionId = sessionId;
    let history: Array<{ role: string; content: string }> = [];
    let userInfo: Record<string, string> = {};

    // ── Load existing session ──
    if (currentSessionId) {
      const { data: session, error } = await safeDbQuery(
        () => supabase.from('chat_sessions').select('history, user_info').eq('id', currentSessionId).maybeSingle()
      );
      if (!error && session) {
        if (session.history) history = session.history as Array<{ role: string; content: string }>;
        if (session.user_info) userInfo = session.user_info as Record<string, string>;
      } else {
        currentSessionId = null;
      }
    }

    // ── LOAD action: return history + userInfo without calling Groq ──
    if (action === 'load') {
      if (!currentSessionId) {
        const { data: existingSessions } = await safeDbQuery(
          () => supabase.from('chat_sessions')
            .select('id, history, user_info')
            .eq('visitor_id', visitorId || 'anonymous')
            .order('updated_at', { ascending: false })
            .limit(1)
        );

        if (existingSessions && existingSessions.length > 0) {
          currentSessionId = existingSessions[0].id;
          if (existingSessions[0].history) history = existingSessions[0].history;
          if (existingSessions[0].user_info) userInfo = existingSessions[0].user_info;
        } else {
          const greeting = "Hello! 👋 I'm NEXi from NEXWAVE Solutions. May I know your name please?";
          history = [{ role: 'assistant', content: greeting }];
          const newSession = await insertSession({
            visitor_id: visitorId || 'anonymous',
            history,
            user_info: {}
          });
          if (newSession) currentSessionId = newSession.id;
        }
      }
      return new Response(JSON.stringify({ history, sessionId: currentSessionId, userInfo }), {
        status: 200,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      });
    }

    // ── Validate message for non-load actions ──
    if (!message || typeof message !== 'string' || !message.trim()) {
      return new Response(JSON.stringify({ error: 'User message is missing or empty' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      });
    }

    // ── Create new session if none exists (for normal messages) ──
    if (!currentSessionId) {
      const { data: existingSessions } = await safeDbQuery(
        () => supabase.from('chat_sessions')
          .select('id, history, user_info')
          .eq('visitor_id', visitorId || 'anonymous')
          .order('updated_at', { ascending: false })
          .limit(1)
      );

      if (existingSessions && existingSessions.length > 0) {
        currentSessionId = existingSessions[0].id;
        if (existingSessions[0].history) history = existingSessions[0].history;
        if (existingSessions[0].user_info) userInfo = existingSessions[0].user_info;
      } else {
        const newSession = await insertSession({
          visitor_id: visitorId || 'anonymous',
          history: [],
          user_info: {}
        });
        if (newSession) {
          currentSessionId = newSession.id;
        }
      }
    }

    // ── Build system prompt with remembered user context ──
    let enrichedPrompt = systemPrompt || '';

    const knownFields = Object.entries(userInfo).filter(([_, v]) => v && v.length > 0);
    if (knownFields.length > 0) {
      const contextLines = knownFields.map(([key, val]) => `- ${key}: ${val}`).join('\n');
      enrichedPrompt = `[REMEMBERED USER CONTEXT — you already know this information about the visitor, use it to personalise your responses]:\n${contextLines}\n\n---\n\n${enrichedPrompt}`;
    }

    // ── Call Groq API (with 7s timeout to prevent EarlyDrop) ──
    const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
    const GROQ_MODEL = 'llama-3.3-70b-versatile';

    const abortController = new AbortController();
    const abortTimer = setTimeout(() => abortController.abort(), 7000);

    let groqResponse;
    try {
      groqResponse = await fetch(GROQ_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: [
            { role: 'system', content: enrichedPrompt },
            ...history,
            { role: 'user', content: message }
          ]
        }),
        signal: abortController.signal
      });
    } catch (fetchErr: any) {
      clearTimeout(abortTimer);
      if (fetchErr.name === 'AbortError') {
        return new Response(JSON.stringify({ error: 'Groq API timed out. Please try again.' }), {
          status: 504,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
        });
      }
      throw fetchErr;
    }
    clearTimeout(abortTimer);

    const data = await groqResponse.json();
    if (!groqResponse.ok) {
      return new Response(JSON.stringify({ error: data.error?.message || 'API Error' }), {
        status: groqResponse.status,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      });
    }

    const reply = data.choices?.[0]?.message?.content || '';

    // ── Extract user info from conversation ──
    const allConversationText = [
      ...history.map(h => h.content),
      message,
      reply
    ].join(' ');

    const extractedInfo: Record<string, string> = { ...userInfo };

    const namePatterns = [
      /my name is ([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/,
      /I['']?m ([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/,
      /I am ([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/,
      /call me ([A-Z][a-z]+)/,
      /this is ([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)(?:\s+from|\s+,\s|$)/,
    ];
    if (!extractedInfo.name) {
      for (const pat of namePatterns) {
        const m = allConversationText.match(pat);
        if (m && m[1].length > 1 && !['I','My','The','This','That','It','We'].includes(m[1].split(' ')[0])) {
          extractedInfo.name = m[1];
          break;
        }
      }
    }

    const companyPatterns = [
      /(?:my|our)\s+company\s+(?:name\s+)?(?:is\s+)?['"]?([A-Za-z0-9][A-Za-z0-9\s.&'-]+?)(?:['"]|\.|,|$|\s+and)/,
      /(?:I|we)\s+(?:work\s+(?:for|at)|represent)\s+['"]?([A-Za-z0-9][A-Za-z0-9\s.&'-]+?)(?:['"]|\.|,|$|\s+and)/,
      /(?:from|at)\s+['"]?([A-Z][A-Za-z0-9]+(?:\s+[A-Z][A-Za-z0-9]+)*?)(?:['"]|\.|,|$)/,
      /company\s+(?:name\s+)?(?:is\s+)?['"]?([A-Za-z0-9][A-Za-z0-9\s.&'-]+?)(?:['"]|\.|,|$)/,
    ];
    if (!extractedInfo.company) {
      for (const pat of companyPatterns) {
        const m = allConversationText.match(pat);
        if (m && m[1].length > 2) {
          extractedInfo.company = m[1].trim();
          break;
        }
      }
    }

    const phonePattern = /(?:\+?\d{1,3}[-\s.]?)?\(?\d{2,4}\)?[-\s.]?\d{3,4}[-\s.]?\d{3,4}\b/;
    if (!extractedInfo.phone) {
      const m = allConversationText.match(phonePattern);
      if (m) extractedInfo.phone = m[0].trim();
    }

    const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
    if (!extractedInfo.email) {
      const m = allConversationText.match(emailPattern);
      if (m) extractedInfo.email = m[0];
    }

    const requirementPatterns = [
      /(?:I|we)\s+(?:need|require|want|am\s+looking\s+for)\s+([^.]+)/i,
      /(?:looking\s+for|interested\s+in)\s+([^.]+)/i,
      /project\s+(?:is\s+)?['"]?([^.]+)/i,
    ];
    if (!extractedInfo.project) {
      for (const pat of requirementPatterns) {
        const m = allConversationText.match(pat);
        if (m && m[1].length > 5) {
          extractedInfo.project = m[1].trim();
          break;
        }
      }
    }

    // ── Save updated history + user info to database ──
    const updatedHistory = [
      ...history,
      { role: 'user', content: message },
      { role: 'assistant', content: reply }
    ];

    await updateSession(currentSessionId, {
      history: updatedHistory,
      user_info: extractedInfo,
      updated_at: new Date().toISOString()
    });

    return new Response(JSON.stringify({ reply, sessionId: currentSessionId, userInfo: extractedInfo }), {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });

  } catch (err: any) {
    const msg = err?.message || 'Internal Error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  }
});
