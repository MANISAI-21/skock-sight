import React, { useState } from 'react';
import { registerUser, loginUser, logoutUser } from '../api/authApi';
import { X, LogOut, User as UserIcon, Mail, Phone, Shield, Eye, EyeOff } from 'lucide-react';

/* ─── Internal Styles ───────────────────────────────────────────────────── */
const S = {
    overlay: {
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000,
    },
    modal: {
        background: 'linear-gradient(145deg, #12152a, #1a1f38)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 20,
        padding: '36px 32px',
        width: '90%',
        maxWidth: 420,
        position: 'relative',
        boxShadow: '0 24px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)',
        animation: 'slideUpIn 0.25s cubic-bezier(0.16,1,0.3,1)',
    },
    closeBtn: {
        position: 'absolute', top: 16, right: 16,
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 10, padding: 6,
        color: '#64748b', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.2s',
    },
    /* ── Auth form ── */
    brandRow: {
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 10, marginBottom: 6,
    },
    brandIcon: {
        width: 42, height: 42, borderRadius: 12,
        background: 'linear-gradient(135deg,#10b981,#3b82f6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
    },
    brandName: { fontSize: 22, fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.5px' },
    brandAccent: { color: '#10b981' },
    subtitle: {
        fontSize: 13, color: '#64748b', textAlign: 'center', marginBottom: 28,
    },
    tabs: {
        display: 'flex', background: 'rgba(0,0,0,0.25)',
        borderRadius: 12, padding: 4, marginBottom: 24,
        border: '1px solid rgba(255,255,255,0.06)',
    },
    tab: (active) => ({
        flex: 1, padding: '9px 0', border: 'none', cursor: 'pointer',
        borderRadius: 9, fontSize: 13, fontWeight: 600, transition: 'all 0.2s',
        background: active ? 'linear-gradient(135deg,#10b981,#059669)' : 'transparent',
        color: active ? '#fff' : '#64748b',
        boxShadow: active ? '0 2px 10px rgba(16,185,129,0.35)' : 'none',
    }),
    inputWrap: {
        position: 'relative', marginBottom: 14,
    },
    inputIcon: {
        position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
        color: '#475569', pointerEvents: 'none',
    },
    input: {
        width: '100%', boxSizing: 'border-box',
        background: 'rgba(0,0,0,0.25)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 12, padding: '12px 14px 12px 40px',
        color: '#f1f5f9', fontSize: 14, outline: 'none',
        transition: 'border-color 0.2s, box-shadow 0.2s',
    },
    inputFocus: {
        borderColor: '#10b981',
        boxShadow: '0 0 0 3px rgba(16,185,129,0.15)',
    },
    eyeBtn: {
        position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
        background: 'none', border: 'none', color: '#475569', cursor: 'pointer',
        display: 'flex', alignItems: 'center',
    },
    submitBtn: {
        width: '100%', padding: '13px 0', marginTop: 6,
        background: 'linear-gradient(135deg,#10b981,#059669)',
        border: 'none', borderRadius: 12,
        color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer',
        boxShadow: '0 4px 20px rgba(16,185,129,0.35)',
        transition: 'opacity 0.2s, transform 0.1s',
        letterSpacing: 0.2,
    },
    divider: {
        display: 'flex', alignItems: 'center', gap: 10, margin: '18px 0',
        color: '#334155', fontSize: 12,
    },
    dividerLine: { flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' },
    switchRow: {
        textAlign: 'center', fontSize: 13, color: '#64748b',
    },
    switchBtn: {
        background: 'none', border: 'none', color: '#10b981',
        fontWeight: 600, cursor: 'pointer', fontSize: 13, padding: '0 4px',
    },
    errorBox: {
        background: 'rgba(239,68,68,0.08)',
        border: '1px solid rgba(239,68,68,0.2)',
        borderRadius: 10, padding: '10px 14px',
        color: '#f87171', fontSize: 13, marginBottom: 16,
        display: 'flex', alignItems: 'center', gap: 8,
    },
    /* ── Profile ── */
    avatar: {
        width: 70, height: 70, borderRadius: '50%', margin: '0 auto 16px',
        background: 'linear-gradient(135deg,#10b981,#3b82f6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 28, fontWeight: 800, color: '#fff',
        boxShadow: '0 0 30px rgba(16,185,129,0.4)',
    },
    profileName: {
        fontSize: 20, fontWeight: 700, color: '#f1f5f9',
        textAlign: 'center', marginBottom: 4,
    },
    profileEmail: {
        fontSize: 13, color: '#64748b', textAlign: 'center', marginBottom: 24,
    },
    infoCard: {
        background: 'rgba(0,0,0,0.2)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 14, overflow: 'hidden', marginBottom: 20,
    },
    infoRow: {
        display: 'flex', alignItems: 'center',
        padding: '14px 18px', gap: 12,
        borderBottom: '1px solid rgba(255,255,255,0.04)',
    },
    infoRowLast: {
        display: 'flex', alignItems: 'center',
        padding: '14px 18px', gap: 12,
    },
    infoIcon: {
        width: 34, height: 34, borderRadius: 9,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
    },
    infoLabel: { fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 500 },
    infoValue: { fontSize: 14, color: '#f1f5f9', fontWeight: 600, marginTop: 1 },
    logoutBtn: {
        width: '100%', padding: '12px 0',
        background: 'rgba(239,68,68,0.08)',
        border: '1px solid rgba(239,68,68,0.2)',
        borderRadius: 12, color: '#f87171',
        fontSize: 14, fontWeight: 600, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        transition: 'all 0.2s',
    },
};

/* ─── Input with icon + optional eye toggle ─────────────────────────────── */
function FormInput({ icon: Icon, type = 'text', placeholder, name, value, onChange, autoComplete }) {
    const [focused, setFocused] = useState(false);
    const [showPw, setShowPw]   = useState(false);
    const isPw = type === 'password';

    return (
        <div style={S.inputWrap}>
            <span style={{ ...S.inputIcon, top: '50%' }}><Icon size={15} /></span>
            <input
                type={isPw && showPw ? 'text' : type}
                name={name}
                placeholder={placeholder}
                value={value}
                onChange={onChange}
                autoComplete={autoComplete}
                required
                style={{ ...S.input, ...(focused ? S.inputFocus : {}) }}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
            />
            {isPw && (
                <button type="button" style={S.eyeBtn} onClick={() => setShowPw(p => !p)}>
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
            )}
        </div>
    );
}

/* ─── Main Component ────────────────────────────────────────────────────── */
const AuthModal = ({ onClose, user, onUserUpdate }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [formData, setFormData] = useState({ name: '', phonenumber: '', email: '', password: '' });
    const [error, setError]   = useState(null);
    const [loading, setLoading] = useState(false);

    const { name, phonenumber, email, password } = formData;

    const onChange = (e) =>
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

    const onSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        const result = isLogin
            ? await loginUser({ email, password })
            : await registerUser({ name, phonenumber, email, password });
        if (result.success) {
            onUserUpdate(result.data);
        } else {
            setError(result.message);
            setLoading(false);
        }
    };

    const handleLogout = () => { logoutUser(); onUserUpdate(null); };

    return (
        <div style={S.overlay} onClick={onClose}>
            <style>{`
                @keyframes slideUpIn {
                    from { opacity:0; transform:translateY(20px) scale(0.97); }
                    to   { opacity:1; transform:translateY(0)    scale(1);    }
                }
                .auth-close:hover { background:rgba(255,255,255,0.1) !important; color:#f1f5f9 !important; }
                .auth-submit:hover:not(:disabled) { opacity:0.88; transform:translateY(-1px); }
                .auth-submit:active { transform:translateY(0); }
                .auth-logout:hover { background:rgba(239,68,68,0.15) !important; border-color:rgba(239,68,68,0.4) !important; }
            `}</style>

            <div style={S.modal} onClick={e => e.stopPropagation()}>
                {/* Close button */}
                <button className="auth-close" style={S.closeBtn} onClick={onClose} aria-label="Close">
                    <X size={18} />
                </button>

                {user ? (
                    /* ── Profile View ────────────────────────────────── */
                    <div>
                        <div style={S.avatar}>
                            {user.name?.charAt(0).toUpperCase()}
                        </div>
                        <p style={S.profileName}>{user.name}</p>
                        <p style={S.profileEmail}>{user.email}</p>

                        <div style={S.infoCard}>
                            <div style={S.infoRow}>
                                <div style={{ ...S.infoIcon, background: 'rgba(59,130,246,0.12)' }}>
                                    <Mail size={16} color="#3b82f6" />
                                </div>
                                <div>
                                    <div style={S.infoLabel}>Email Address</div>
                                    <div style={S.infoValue}>{user.email}</div>
                                </div>
                            </div>
                            <div style={S.infoRowLast}>
                                <div style={{ ...S.infoIcon, background: 'rgba(16,185,129,0.12)' }}>
                                    <Phone size={16} color="#10b981" />
                                </div>
                                <div>
                                    <div style={S.infoLabel}>Phone Number</div>
                                    <div style={S.infoValue}>{user.phonenumber || '—'}</div>
                                </div>
                            </div>
                        </div>

                        <button className="auth-logout" style={S.logoutBtn} onClick={handleLogout}>
                            <LogOut size={16} />Sign Out
                        </button>
                    </div>
                ) : (
                    /* ── Auth Form ───────────────────────────────────── */
                    <div>
                        {/* Brand */}
                        <div style={S.brandRow}>
                            <div style={S.brandIcon}>
                                <Shield size={20} color="#fff" />
                            </div>
                            <span style={S.brandName}>
                                Stock<span style={S.brandAccent}>Sight</span>
                            </span>
                        </div>
                        <p style={S.subtitle}>
                            {isLogin ? 'Sign in to access your account' : 'Create your trading account'}
                        </p>

                        {/* Tab switcher */}
                        <div style={S.tabs}>
                            <button style={S.tab(isLogin)}  onClick={() => { setIsLogin(true);  setError(null); }}>Sign In</button>
                            <button style={S.tab(!isLogin)} onClick={() => { setIsLogin(false); setError(null); }}>Sign Up</button>
                        </div>

                        {/* Error */}
                        {error && (
                            <div style={S.errorBox}>
                                <span>⚠</span>{error}
                            </div>
                        )}

                        <form onSubmit={onSubmit}>
                            {!isLogin && (
                                <>
                                    <FormInput icon={UserIcon} type="text"   name="name"        placeholder="Full name"     value={name}        onChange={onChange} autoComplete="name" />
                                    <FormInput icon={Phone}    type="tel"    name="phonenumber"  placeholder="Phone number"  value={phonenumber} onChange={onChange} autoComplete="tel" />
                                </>
                            )}
                            <FormInput icon={Mail}     type="email"    name="email"       placeholder="Email address"  value={email}    onChange={onChange} autoComplete="email" />
                            <FormInput icon={Shield}   type="password" name="password"    placeholder="Password"       value={password} onChange={onChange} autoComplete={isLogin ? 'current-password' : 'new-password'} />

                            <button
                                type="submit"
                                className="auth-submit"
                                style={{ ...S.submitBtn, opacity: loading ? 0.7 : 1 }}
                                disabled={loading}
                            >
                                {loading ? 'Please wait…' : (isLogin ? 'Sign In' : 'Create Account')}
                            </button>
                        </form>

                        <div style={S.divider}>
                            <span style={S.dividerLine} />
                            <span>or</span>
                            <span style={S.dividerLine} />
                        </div>

                        <div style={S.switchRow}>
                            {isLogin ? "Don't have an account? " : 'Already have an account? '}
                            <button
                                style={S.switchBtn}
                                onClick={() => { setIsLogin(p => !p); setError(null); }}
                            >
                                {isLogin ? 'Sign Up' : 'Sign In'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AuthModal;
