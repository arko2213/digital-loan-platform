import { useEffect, useState } from 'react'; import { Link } from 'react-router-dom'; import { ArrowLeft, ArrowRight, Bot, CircleHelp, Landmark, MessageCircle, Send, ShieldCheck, Sparkles, Users, WalletCards } from 'lucide-react'; import api, { friendlyError } from '../services/api'; import { useAuth } from '../context/AuthContext'; import { Notice, PageHeader } from '../components/UI';
const ADMIN_TYPES=[['personal','Personal'],['home','Home'],['education','Education'],['car','Car'],['business','Business']];
export function Advisor() {
  const { user, demoLogin } = useAuth();
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi, I’m LoanAI Advisor. Ask me about loan costs, product details or repayment concepts. I’ll use the available sample product data and tell you when something is an estimate.' }
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  async function handleQuickLogin() {
    setLoggingIn(true);
    try {
      await demoLogin('user');
      setError('');
    } catch {
      setError('Could not complete demo login.');
    } finally {
      setLoggingIn(false);
    }
  }

  async function send(e) {
    e.preventDefault();
    const message = input.trim();
    if (!message) return;

    setMessages(m => [...m, { role: 'user', content: message }]);
    setInput('');
    setBusy(true);
    setError('');

    try {
      const r = await api.post('/ai/chat', { message });
      if (r.data?.answer) {
        setMessages(m => [...m, { role: 'assistant', content: r.data.answer }]);
      } else {
        setError('Sorry, I couldn’t get a response from the AI service.');
        setMessages(m => [...m, { role: 'assistant', content: 'Sorry, I couldn’t get a response right now. Please try again.' }]);
      }
    } catch (err) {
      console.error('[LoanAI] Error:', err);
      const msg = err?.response?.data?.message || 'Sorry, I couldn’t get a response from the AI service. Please try again.';
      setError(msg);
      setMessages(m => [...m, { role: 'assistant', content: msg }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="container content-page advisor-page">
      <PageHeader
        eyebrow="Your borrowing co-pilot"
        title="Meet LoanAI Advisor"
        subtitle={user ? `Get helpful explanations tailored to your profile (Income: ₹${(user.monthlyIncome || 0).toLocaleString('en-IN')}/mo).` : "Get instant answers about loan terms, costs, EMI calculation, and repayment strategies."}
      />
      <div className="advisor-layout">
        <aside className="advisor-aside">
          <div className="advisor-brand">
            <span><Sparkles/></span>
            <div>
              <strong>LoanAI Advisor</strong>
              <small>Powered by NVIDIA NIM</small>
            </div>
            <i/>
          </div>
          <p className="muted">Ask about the numbers, the terms, or the concepts behind your options.</p>
          <div className="prompt-list">
            <span>Try asking</span>
            {[
              'How does tenure affect total interest?',
              'Explain fixed vs floating rates',
              'What details should I compare?'
            ].map(q => (
              <button key={q} onClick={() => setInput(q)}>
                {q}<ArrowRight size={14}/>
              </button>
            ))}
          </div>
          <Notice type="warning">
            AI responses are educational and may be imperfect. Always confirm product terms with the lender.
          </Notice>
        </aside>

        <section className="chat-panel">
          <div className="chat-top">
            <div className="chat-avatar"><Bot/></div>
            <div>
              <strong>LoanAI Advisor</strong>
              <small><i className="online-dot"/> Ready to help</small>
            </div>
            {user ? (
              <span className="secure-chat"><ShieldCheck size={14}/> {user.name.split(' ')[0]}’s session</span>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="secure-chat"><ShieldCheck size={14}/> Guest mode</span>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  style={{ padding: '4px 10px', fontSize: '12px' }}
                  onClick={handleQuickLogin}
                  disabled={loggingIn}
                >
                  {loggingIn ? 'Signing in…' : '1-Click Demo Login'}
                </button>
              </div>
            )}
          </div>

          <div className="chat-messages">
            {messages.map((m, i) => (
              <div key={i} className={`chat-message ${m.role}`}>
                <span className="message-avatar">
                  {m.role === 'assistant' ? <Sparkles size={15}/> : (user?.name?.[0] || 'Y')}
                </span>
                <div>
                  <div className="message-name">{m.role === 'assistant' ? 'LoanAI Advisor' : (user?.name || 'You')}</div>
                  <div className="message-bubble" style={{ whiteSpace: 'pre-wrap' }}>{m.content}</div>
                </div>
              </div>
            ))}
            {busy && (
              <div className="chat-message assistant">
                <span className="message-avatar"><Sparkles size={15}/></span>
                <div>
                  <div className="message-name">LoanAI Advisor</div>
                  <div className="message-bubble typing"><i/><i/><i/></div>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="chat-error" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
              <span>{error}</span>
              {(error.toLowerCase().includes('expired') || error.toLowerCase().includes('sign in') || error.toLowerCase().includes('session')) && (
                <button
                  type="button"
                  className="btn btn-dark btn-sm"
                  style={{ whiteSpace: 'nowrap', padding: '4px 12px', fontSize: '12px' }}
                  onClick={handleQuickLogin}
                  disabled={loggingIn}
                >
                  {loggingIn ? 'Signing in…' : 'Re-login Demo'}
                </button>
              )}
            </div>
          )}

          <form className="chat-input" onSubmit={send}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask about a loan or repayment…"
              maxLength="1200"
            />
            <button className="btn btn-dark" disabled={busy || !input.trim()} aria-label="Send message">
              <Send size={17}/>
            </button>
          </form>
          <div className="chat-foot">LoanAI can explain, but it can't approve or replace professional advice.</div>
        </section>
      </div>
    </main>
  );
}
export function About(){return <main className="container content-page"><PageHeader eyebrow="About DigitalLoan" title="Make borrowing easier to understand." subtitle="A final-year B.Tech CSE demonstration exploring how transparent comparison tools can support better-informed financial decisions."/><Notice>Academic demonstration only. All displayed products are illustrative, and no lender approvals are provided.</Notice><div className="about-grid"><article className="panel"><span className="about-icon"><WalletCards/></span><h2>The challenge</h2><p>Loan terms often present interest rates, fees, tenure and eligibility in separate places. It can be difficult for people to compare the full cost and understand whether an option could suit their stated needs.</p></article><article className="panel"><span className="about-icon"><Landmark/></span><h2>Our approach</h2><p>DigitalLoan brings product details together with EMI estimates and a transparent, rule-based recommendation score. Every match includes the factors that contributed to it.</p></article><article className="panel"><span className="about-icon"><ShieldCheck/></span><h2>Designed for clarity</h2><p>Sample terms are labeled clearly. Eligibility is preliminary, AI responses are bounded by supplied product data, and users remain in control of their decision.</p></article></div><div className="about-cta"><h2>Ready to explore?</h2><p>Start with a side-by-side look at illustrative options.</p><Link to="/compare" className="btn btn-dark">Compare loans <ArrowRight size={16}/></Link></div></main>}
export function NotFound(){return <main className="container content-page"><div className="not-found"><div className="notfound-code">404</div><div className="eyebrow">Page not found</div><h1>We couldn’t find that page.</h1><p>It may have moved or the link may be incorrect.</p><Link to="/" className="btn btn-dark"><ArrowLeft size={16}/> Back to home</Link></div></main>}
export function Admin(){
 const empty={lender:'',loanName:'',loanType:'personal',interestRate:'',minAmount:'',maxAmount:'',minTenure:'12',maxTenure:'60',processingFee:'0',minIncome:'0',minCreditScore:'0'};
 const [stats,setStats]=useState(null),[products,setProducts]=useState([]),[users,setUsers]=useState([]),[draft,setDraft]=useState(empty),[editing,setEditing]=useState(''),[error,setError]=useState(''),[notice,setNotice]=useState(''),[syncing,setSyncing]=useState(false);
 async function refresh(){const [o,l,u]=await Promise.all([api.get('/admin/overview'),api.get('/loans',{params:{limit:50}}),api.get('/admin/users')]);setStats(o.data);setProducts(l.data.loans);setUsers(u.data.users)}
 useEffect(()=>{refresh().catch(e=>setError(friendlyError(e)))},[]);
 async function syncRates(){setSyncing(true);setError('');setNotice('');try{const res=await api.post('/admin/sync-live-rates',{clearDemo:true});setNotice(`Live Bank Rates Synced: ${res.data.total} Indian bank products active (RBI Repo: ${res.data.rbiRepoRate}%).`);await refresh()}catch(e){setError(friendlyError(e))}finally{setSyncing(false)}}
 async function save(e){e.preventDefault();setError('');try{if(editing)await api.put(`/loans/${editing}`,draft);else await api.post('/loans',draft);setDraft(empty);setEditing('');setNotice('Product saved.');await refresh()}catch(e){setError(friendlyError(e))}}
 function edit(product){setEditing(product._id);setDraft(Object.fromEntries(Object.keys(empty).map(k=>[k,product[k]??''])));window.scrollTo({top:0,behavior:'smooth'})}
 async function remove(id){if(!window.confirm('Delete this loan product?'))return;try{await api.delete(`/loans/${id}`);setNotice('Product deleted.');await refresh()}catch(e){setError(friendlyError(e))}}
 async function toggleUser(user){try{await api.patch(`/admin/users/${user._id}/status`,{disabled:!user.disabled});await refresh()}catch(e){setError(friendlyError(e))}}
 return <main className="container content-page"><PageHeader eyebrow="Administration" title="Platform overview" subtitle="Manage live rate feeds, products and user accounts, and review platform activity." action={<button className="btn btn-lime btn-sm" disabled={syncing} onClick={syncRates}>{syncing?'Syncing Live Feeds…':'🔄 Sync Live Indian Bank Rates'}</button>}/>{error&&<Notice type="warning">{error}</Notice>}{notice&&<Notice type="success">{notice}</Notice>}{stats?<><div className="admin-stats">{[['Registered users',stats.users],['Active products',stats.loans],['Comparisons',stats.comparisons],['Eligibility checks',stats.checks],['AI conversations',stats.chats]].map(([l,v])=><div className="panel" key={l}><small>{l}</small><strong>{v}</strong></div>)}</div><section className="panel admin-panel"><h2>{editing?'Edit loan product':'Add a loan product'}</h2><form className="admin-form" onSubmit={save}><label>Lender<input required value={draft.lender} onChange={e=>setDraft({...draft,lender:e.target.value})}/></label><label>Product name<input required value={draft.loanName} onChange={e=>setDraft({...draft,loanName:e.target.value})}/></label><label>Loan type<select value={draft.loanType} onChange={e=>setDraft({...draft,loanType:e.target.value})}>{ADMIN_TYPES.map(([v,l])=><option value={v} key={v}>{l}</option>)}</select></label><label>Rate (% p.a.)<input type="number" step="0.01" min="0" max="60" required value={draft.interestRate} onChange={e=>setDraft({...draft,interestRate:e.target.value})}/></label><label>Min amount<input type="number" min="0" required value={draft.minAmount} onChange={e=>setDraft({...draft,minAmount:e.target.value})}/></label><label>Max amount<input type="number" min="1" required value={draft.maxAmount} onChange={e=>setDraft({...draft,maxAmount:e.target.value})}/></label><label>Min tenure (months)<input type="number" min="1" required value={draft.minTenure} onChange={e=>setDraft({...draft,minTenure:e.target.value})}/></label><label>Max tenure (months)<input type="number" min="1" required value={draft.maxTenure} onChange={e=>setDraft({...draft,maxTenure:e.target.value})}/></label><label>Processing fee (%)<input type="number" step="0.01" min="0" required value={draft.processingFee} onChange={e=>setDraft({...draft,processingFee:e.target.value})}/></label><label>Min income<input type="number" min="0" required value={draft.minIncome} onChange={e=>setDraft({...draft,minIncome:e.target.value})}/></label><label>Min credit score<input type="number" min="0" max="900" required value={draft.minCreditScore} onChange={e=>setDraft({...draft,minCreditScore:e.target.value})}/></label><div className="admin-form-actions"><button className="btn btn-dark btn-sm">{editing?'Update product':'Add product'} <ArrowRight size={14}/></button>{editing&&<button type="button" className="btn btn-outline btn-sm" onClick={()=>{setEditing('');setDraft(empty)}}>Cancel</button>}</div></form></section><section className="panel admin-panel"><h2>Loan products</h2><div className="table-scroll"><table className="compare-table"><thead><tr><th>Product / lender</th><th>Type</th><th>Rate</th><th>Fee</th><th>Manage</th></tr></thead><tbody>{products.map(p=><tr key={p._id}><td><strong>{p.loanName}</strong><small>{p.lender}{p.isDemo?' · demo':p.isLiveVerified?' · Live Verified':''}</small></td><td className="capitalize">{p.loanType}</td><td>{p.interestRate}%</td><td>{p.processingFee}%</td><td><button className="btn btn-outline btn-sm" onClick={()=>edit(p)}>Edit</button> <button className="btn btn-quiet btn-sm" onClick={()=>remove(p._id)}>Delete</button></td></tr>)}</tbody></table></div></section><section className="panel admin-panel"><h2>User accounts</h2><div className="table-scroll"><table className="compare-table"><thead><tr><th>Name / email</th><th>Role</th><th>Joined</th><th>Status</th></tr></thead><tbody>{users.map(u=><tr key={u._id}><td><strong>{u.name}</strong><small>{u.email}</small></td><td>{u.role}</td><td>{new Date(u.createdAt).toLocaleDateString()}</td><td>{u.role==='admin'?'Admin':<button className="btn btn-outline btn-sm" onClick={()=>toggleUser(u)}>{u.disabled?'Enable':'Disable'}</button>}</td></tr>)}</tbody></table></div></section><section className="panel admin-panel"><h2>Most compared products</h2>{stats.popular?.map(p=><div className="history-row" key={p._id}><span className="lender-mark">{p.loan.lender[0]}</span><div><strong>{p.loan.loanName}</strong><small>{p.loan.lender}</small></div><strong>{p.count} comparisons</strong></div>)}</section></>:<div className="loading">Loading platform data…</div>}</main>
}
