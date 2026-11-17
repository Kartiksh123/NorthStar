import { useState } from 'react';
import { ArrowUpRight, Database, Eye, EyeOff, LockKeyhole, Sparkles } from 'lucide-react';
import { api } from '../services/api.js';

export default function AuthPage({ onAuthenticated }) {
  const [mode, setMode] = useState('login');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', email: '', password: '' });

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function submitForm(event) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const result = mode === 'login'
        ? await api.login({ email: form.email, password: form.password })
        : await api.register(form);
      await onAuthenticated(result);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="auth-layout">
      <section className="auth-story">
        <div className="brand-lockup brand-lockup-light"><span className="brand-mark"><Database size={19} strokeWidth={2.4} /></span><span>northstar<span className="brand-period">.</span></span></div>
        <div className="story-copy">
          <div className="eyebrow eyebrow-light"><Sparkles size={14} /> INTELLIGENCE, BUILT IN</div>
          <h1>Your data has<br />a lot to say.</h1>
          <p>Bring your databases together. Ask better questions. Find the signal in all that noise.</p>
          <div className="story-stats">
            <div><strong>01</strong><span>Connect your data</span></div>
            <i />
            <div><strong>02</strong><span>Ask in plain English</span></div>
            <i />
            <div><strong>03</strong><span>Get the full picture</span></div>
          </div>
        </div>
        <div className="story-orbit orbit-one" /><div className="story-orbit orbit-two" />
        <div className="story-footer"><span>DATA, WITHOUT THE DETOURS.</span><span>© 2026 NORTHSTAR</span></div>
      </section>

      <section className="auth-panel">
        <div className="auth-card-wrap">
          <div className="mobile-brand brand-lockup"><span className="brand-mark"><Database size={18} /></span><span>northstar<span className="brand-period">.</span></span></div>
          <div className="auth-heading">
            <span className="auth-kicker">{mode === 'login' ? 'WELCOME BACK' : 'GET STARTED'}</span>
            <h2>{mode === 'login' ? 'Sign in to your workspace' : 'Create your workspace'}</h2>
            <p>{mode === 'login' ? 'Pick up where your data left off.' : 'A clearer view of your data starts here.'}</p>
          </div>

          <form className="auth-form" onSubmit={submitForm}>
            {mode === 'register' && (
              <label className="field-label">Your name
                <input name="name" autoComplete="name" placeholder="Alex Morgan" value={form.name} onChange={updateField} required />
              </label>
            )}
            <label className="field-label">Work email
              <input name="email" type="email" autoComplete="email" placeholder="you@company.com" value={form.email} onChange={updateField} required />
            </label>
            <label className="field-label">Password
              <span className="password-input-wrap">
                <input name="password" type={showPassword ? 'text' : 'password'} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} placeholder="At least 8 characters" value={form.password} onChange={updateField} minLength={mode === 'register' ? 8 : undefined} required />
                <button className="icon-button password-toggle" type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button>
              </span>
            </label>
            {error && <div className="form-error"><LockKeyhole size={16} />{error}</div>}
            <button className="button button-primary auth-submit" disabled={isSubmitting}>
              {isSubmitting ? 'One moment…' : mode === 'login' ? 'Sign in' : 'Create account'}
              {!isSubmitting && <ArrowUpRight size={17} />}
            </button>
          </form>

          <div className="auth-switch">
            {mode === 'login' ? 'New to Northstar?' : 'Already have an account?'}
            <button type="button" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}>
              {mode === 'login' ? 'Create an account' : 'Sign in'}
            </button>
          </div>
          <div className="auth-security"><LockKeyhole size={14} />Database credentials are encrypted at rest.</div>
        </div>
      </section>
    </div>
  );
}
