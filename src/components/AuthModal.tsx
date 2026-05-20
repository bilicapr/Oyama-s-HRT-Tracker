import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../contexts/LanguageContext';

// Turnstile site key — if not set, captcha is disabled entirely
const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || '';
const TURNSTILE_ENABLED = !!TURNSTILE_SITE_KEY;

declare global {
    interface Window {
        turnstile?: {
            render: (container: string | HTMLElement, options: any) => string;
            reset: (widgetId: string) => void;
            remove: (widgetId: string) => void;
        };
    }
}

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

    const { login, register } = useAuth();
    const { t } = useTranslation();

    const turnstileRef = useRef<HTMLDivElement>(null);
    const widgetIdRef = useRef<string | null>(null);

    const renderTurnstile = useCallback(() => {
        if (!TURNSTILE_ENABLED) return;
        if (!turnstileRef.current || !window.turnstile) return;

        // Remove existing widget if any
        if (widgetIdRef.current) {
            try { window.turnstile.remove(widgetIdRef.current); } catch (e) { }
            widgetIdRef.current = null;
        }

        setTurnstileToken(null);

        widgetIdRef.current = window.turnstile.render(turnstileRef.current, {
            sitekey: TURNSTILE_SITE_KEY,
            callback: (token: string) => {
                setTurnstileToken(token);
            },
            'expired-callback': () => {
                setTurnstileToken(null);
            },
            'error-callback': () => {
                setTurnstileToken(null);
            },
            theme: document.documentElement.classList.contains('dark') ? 'dark' : 'light',
            size: 'flexible',
        });
    }, []);

    // Render Turnstile when modal opens
    useEffect(() => {
        if (!isOpen || !TURNSTILE_ENABLED) return;

        // Wait for turnstile script to load
        const tryRender = () => {
            if (window.turnstile && turnstileRef.current) {
                renderTurnstile();
            } else {
                setTimeout(tryRender, 200);
            }
        };
        const timer = setTimeout(tryRender, 100);

        return () => {
            clearTimeout(timer);
            if (widgetIdRef.current && window.turnstile) {
                try { window.turnstile.remove(widgetIdRef.current); } catch (e) { }
                widgetIdRef.current = null;
            }
        };
    }, [isOpen, renderTurnstile]);

    // Reset turnstile when switching between login/register
    useEffect(() => {
        if (!isOpen || !TURNSTILE_ENABLED) return;
        if (widgetIdRef.current && window.turnstile) {
            window.turnstile.reset(widgetIdRef.current);
            setTurnstileToken(null);
        }
    }, [isLogin, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (TURNSTILE_ENABLED && !turnstileToken) return;
        setError(null);
        setLoading(true);
        try {
            const captchaToken = TURNSTILE_ENABLED ? turnstileToken : undefined;
            if (isLogin) {
                await login(username, password, captchaToken || undefined);
            } else {
                await register(username, password, captchaToken || undefined);
                window.location.reload();
                return;
            }
            onClose();
            setUsername('');
            setPassword('');
            setTurnstileToken(null);
        } catch (err: any) {
            setError(err.message || 'An error occurred');
            // Reset turnstile on error
            if (TURNSTILE_ENABLED && widgetIdRef.current && window.turnstile) {
                window.turnstile.reset(widgetIdRef.current);
                setTurnstileToken(null);
            }
        } finally {
            setLoading(false);
        }
    };

    const isButtonDisabled = loading || (TURNSTILE_ENABLED && !turnstileToken);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[var(--color-m3-surface-container-high)] dark:bg-[var(--color-m3-dark-surface-container-high)] rounded-[var(--radius-xl)] shadow-[var(--shadow-m3-3)] w-full max-w-sm overflow-hidden animate-m3-decelerate">
                <div className="flex items-center justify-between px-6 pt-6 pb-3">
                    <h2 className="font-display text-base font-bold text-[var(--color-m3-on-surface)] dark:text-[var(--color-m3-dark-on-surface)]">
                        {isLogin ? t('auth.sign_in') : t('auth.create_account')}
                    </h2>
                    <button onClick={onClose} className="p-1.5 -mr-1 text-[var(--color-m3-on-surface-variant)] dark:text-[var(--color-m3-dark-on-surface-variant)] rounded-[var(--radius-full)] hover:bg-[var(--color-m3-surface-container-highest)] dark:hover:bg-[var(--color-m3-dark-surface-container-highest)] transition-colors">
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="px-6 pb-6 pt-2 space-y-3">
                    {error && (
                        <div className="p-2.5 text-xs text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-[var(--radius-sm)] border border-red-200 dark:border-red-900/30">
                            {error}
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-[var(--color-m3-on-surface-variant)] dark:text-[var(--color-m3-dark-on-surface-variant)]">{t('auth.username')}</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full px-3 py-2.5 text-sm bg-[var(--color-m3-surface-container-lowest)] dark:bg-[var(--color-m3-dark-surface-container-low)] border border-[var(--color-m3-outline)] dark:border-[var(--color-m3-dark-outline)] rounded-[var(--radius-md)] focus:outline-none focus:ring-2 focus:ring-[var(--color-m3-primary-container)] focus:border-[var(--color-m3-primary)] dark:focus:border-teal-400 transition-all text-[var(--color-m3-on-surface)] dark:text-[var(--color-m3-dark-on-surface)]"
                            placeholder={t('auth.username_placeholder')}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-[var(--color-m3-on-surface-variant)] dark:text-[var(--color-m3-dark-on-surface-variant)]">{t('auth.password')}</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-3 py-2.5 text-sm bg-[var(--color-m3-surface-container-lowest)] dark:bg-[var(--color-m3-dark-surface-container-low)] border border-[var(--color-m3-outline)] dark:border-[var(--color-m3-dark-outline)] rounded-[var(--radius-md)] focus:outline-none focus:ring-2 focus:ring-[var(--color-m3-primary-container)] focus:border-[var(--color-m3-primary)] dark:focus:border-teal-400 transition-all text-[var(--color-m3-on-surface)] dark:text-[var(--color-m3-dark-on-surface)]"
                            placeholder={t('auth.password_placeholder')}
                            required
                        />
                    </div>

                    {/* Turnstile Widget — only rendered when site key is configured */}
                    {TURNSTILE_ENABLED && (
                        <div className="flex justify-center py-1">
                            <div ref={turnstileRef} />
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isButtonDisabled}
                        className={`w-full py-2.5 mt-1 text-sm rounded-[var(--radius-full)] font-bold transition-all flex items-center justify-center gap-2 shadow-[var(--shadow-m3-1)] ${isButtonDisabled
                            ? 'bg-gray-300 dark:bg-zinc-700 text-gray-500 dark:text-zinc-500 cursor-not-allowed'
                            : 'bg-[var(--color-m3-primary)] dark:bg-teal-600 text-[var(--color-m3-on-primary)] hover:opacity-90'
                            }`}
                    >
                        {loading && <Loader2 size={16} className="animate-spin" />}
                        {isLogin ? t('auth.sign_in') : t('auth.sign_up')}
                    </button>

                    <div className="pt-2 text-center text-sm text-[var(--color-m3-on-surface-variant)] dark:text-[var(--color-m3-dark-on-surface-variant)]">
                        {isLogin ? t('auth.no_account') : t('auth.has_account')}
                        <button
                            type="button"
                            onClick={() => { setIsLogin(!isLogin); setError(null); }}
                            className="text-[var(--color-m3-primary)] dark:text-teal-400 font-bold hover:underline"
                        >
                            {isLogin ? t('auth.sign_up') : t('auth.sign_in')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AuthModal;
