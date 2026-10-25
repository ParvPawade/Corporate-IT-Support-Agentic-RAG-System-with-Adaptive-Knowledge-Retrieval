const $ = id => document.getElementById(id);
const messages = $('messages'), form = $('form'), input = $('question'), send = $('send');

const LABELS = {
  private_kb: 'Company knowledge base',
  web_search: 'External web search',
  direct: 'No lookup needed',
  insufficient_evidence: 'Not enough evidence'
};

function addMessage(role, text, source) {
  const msg = document.createElement('div');
  msg.className = 'msg ' + role;
  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.textContent = text;
  if (source && LABELS[source]) {
    bubble.appendChild(document.createElement('br'));
    const tag = document.createElement('span');
    tag.className = 'tag ' + source;
    tag.textContent = LABELS[source];
    bubble.appendChild(tag);
  }
  msg.appendChild(bubble);
  messages.appendChild(msg);
  messages.scrollTop = messages.scrollHeight;
  return bubble;
}

function stepClass(step) {
  const s = step.toLowerCase();
  if (s.startsWith('stopped')) return 'stop';
  if (s.includes('web')) return 'web';
  if (s.includes('kb')) return 'kb';
  return '';
}

function showTrace(trace = [], citations = []) {
  $('traceHint').hidden = trace.length > 0;
  const list = $('trace');
  list.innerHTML = '';
  trace.forEach(step => {
    const li = document.createElement('li');
    li.className = stepClass(step);
    li.textContent = step;
    list.appendChild(li);
  });
  const ul = $('sources');
  ul.innerHTML = '';
  citations.forEach(c => {
    const li = document.createElement('li');
    if (c.url && /^https?:\/\//.test(c.url)) {
      const a = document.createElement('a');
      a.href = c.url; a.target = '_blank'; a.rel = 'noopener';
      a.textContent = c.title || c.url;
      li.appendChild(a);
    } else {
      li.textContent = c.title || 'Private KB';
    }
    ul.appendChild(li);
  });
  $('sourceBox').hidden = citations.length === 0;
}

// Pretend backend so the UI works on its own.
function demoAnswer(q) {
  const t = q.toLowerCase();
  const wait = ms => new Promise(r => setTimeout(r, ms));
  return wait(700).then(() => {
    if (/^(hi|hello|hey|thanks|thank you)\b/.test(t)) {
      return { answer: 'Hello! Tell me what IT issue you are facing.', source_used: 'direct',
        citations: [], trace: ['Router → DIRECT', 'Direct response → no retrieval'] };
    }
    if (/password|vpn|mfa|laptop|email/.test(t)) {
      const topic = t.match(/password|vpn|mfa|laptop|email/)[0];
      return {
        answer: 'Based on the company knowledge base:\n1. Open the self-service portal.\n2. Choose "' + topic + '" and follow the prompts.\n3. If it still fails, raise a ticket with the help desk.',
        source_used: 'private_kb',
        citations: [{ title: topic + '-guide.pdf', url: '', type: 'private_kb' }],
        trace: ['Router → KB', 'Private KB retrieval → 4 chunks', 'KB evidence grade → GOOD', 'Answer generation → PRIVATE KB']
      };
    }
    return {
      answer: 'The company knowledge base had nothing useful, so this comes from external web sources. Check with IT before changing company-managed systems.',
      source_used: 'web_search',
      citations: [{ title: 'Vendor documentation', url: 'https://example.com', type: 'web' }],
      trace: ['Router → KB', 'Private KB retrieval → 4 chunks', 'KB evidence grade → WEAK',
              'Web fallback → Tavily search', 'Web evidence grade → GOOD', 'Answer generation → WEB SEARCH']
    };
  });
}

async function ask(question) {
  if ($('demo').checked) return demoAnswer(question);
  const res = await fetch($('apiUrl').value.trim(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question })
  });
  if (!res.ok) throw new Error('Server returned ' + res.status);
  return res.json();
}

async function handle(question) {
  addMessage('user', question);
  input.value = '';
  send.disabled = true;
  showTrace([], []);
  const pending = addMessage('bot', 'Looking this up…');
  try {
    const data = await ask(question);
    pending.parentElement.remove();
    addMessage('bot', data.answer, data.source_used);
    showTrace(data.trace, data.citations);
  } catch (err) {
    pending.textContent = 'Could not reach the backend (' + err.message + '). Check the API URL in Backend settings or switch on Demo mode.';
  } finally {
    send.disabled = false;
    input.focus();
  }
}

form.addEventListener('submit', e => {
  e.preventDefault();
  const q = input.value.trim();
  if (q) handle(q);
});

$('examples').addEventListener('click', e => {
  if (e.target.tagName === 'BUTTON') handle(e.target.textContent);
});
