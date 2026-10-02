import { useCallback, useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router';
import { emailInput, loginInput, registerInput, resetPasswordInput } from '@aimargen/schemas';
import { ApiRequestError, errorMessage } from '../../../core/js/api-client';
import { serverFieldErrors, validate, type FieldErrors } from '../../../core/js/form';
import { useSession } from '../../../core/session/js/session-context';
import type { Me } from '../../../core/session/js/session-types';
import { authService } from './auth.service';

/** Controlador del módulo de acceso: estado de formularios, validación y navegación. */

const RATE_LIMIT_MESSAGE = 'Demasiados intentos seguidos. Espere un minuto e intente de nuevo.';

/** Mensaje para errores que no son de un campo (red, límite de intentos, etc.). */
function friendlyError(e: unknown): string {
  if (e instanceof ApiRequestError && e.status === 429) return RATE_LIMIT_MESSAGE;
  return errorMessage(e);
}

/** Destino tras iniciar sesión: `next` solo si apunta dentro de la app. */
export function loginDestination(me: Me, next: string | null): string {
  if (!me.tenant && me.user.role !== 'super_admin') return '/onboarding';
  return next && next.startsWith('/app') ? next : '/app';
}

// ---------------------------------------------------------------------------
// Contraseña: reglas visibles mientras se escribe
// ---------------------------------------------------------------------------

export interface PasswordRule {
  label: string;
  met: boolean;
}

/** Mismas reglas que el esquema `password` de la API, expresadas para mostrarlas. */
export function passwordRules(value: string): PasswordRule[] {
  return [
    { label: 'Al menos 8 caracteres', met: value.length >= 8 },
    { label: 'Al menos una letra', met: /[A-Za-zÁÉÍÓÚáéíóúÑñ]/.test(value) },
    { label: 'Al menos un número', met: /\d/.test(value) },
  ];
}

// ---------------------------------------------------------------------------
// Reenvío de correo de confirmación con espera
// ---------------------------------------------------------------------------

/** Cuenta regresiva en segundos (para limitar reenvíos). */
export function useCooldown(initial = 0) {
  const [seconds, setSeconds] = useState(initial);
  useEffect(() => {
    if (seconds <= 0) return;
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);
  return { seconds, start: (s: number) => setSeconds(s) };
}

/** Reenvía el correo de confirmación. La API no revela si la cuenta existe. */
export function useResendVerification(initialCooldown = 0) {
  const cooldown = useCooldown(initialCooldown);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: (email: string) => authService.resendVerification(email),
  });
  const resend = (email: string) => {
    setError(null);
    setSent(false);
    mutation.mutate(email, {
      onSuccess: () => {
        setSent(true);
        cooldown.start(60);
      },
      onError: (e) => setError(friendlyError(e)),
    });
  };
  return {
    resend,
    sent,
    error,
    sending: mutation.isPending,
    cooldown: cooldown.seconds,
  };
}

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------

export interface LoginValues {
  email: string;
  password: string;
  remember: boolean;
}

export type LoginProblem =
  | { kind: 'unverified'; message: string }
  | { kind: 'locked'; message: string }
  | { kind: 'other'; message: string };

export function useLogin() {
  const { setMe } = useSession();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [values, setValues] = useState<LoginValues>({ email: '', password: '', remember: false });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [problem, setProblem] = useState<LoginProblem | null>(null);
  const mutation = useMutation({ mutationFn: authService.login });

  const set = useCallback(<K extends keyof LoginValues>(key: K, value: LoginValues[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => (e[key] ? { ...e, [key]: '' } : e));
  }, []);

  const submit = () => {
    setProblem(null);
    const v = validate(loginInput, values);
    if (!v.ok) {
      setErrors(v.errors);
      return;
    }
    setErrors({});
    mutation.mutate(v.data, {
      onSuccess: (me) => {
        setMe(me);
        navigate(loginDestination(me, params.get('next')), { replace: true });
      },
      onError: (e) => {
        const fields = serverFieldErrors(e);
        if (fields) {
          setErrors(fields);
          return;
        }
        if (e instanceof ApiRequestError && e.code === 'EMAIL_NOT_VERIFIED') {
          setProblem({ kind: 'unverified', message: e.message });
        } else if (e instanceof ApiRequestError && e.status === 423) {
          setProblem({ kind: 'locked', message: e.message });
        } else {
          setProblem({ kind: 'other', message: friendlyError(e) });
        }
      },
    });
  };

  return { values, set, errors, problem, submit, submitting: mutation.isPending };
}

// ---------------------------------------------------------------------------
// Registro
// ---------------------------------------------------------------------------

export interface RegisterValues {
  name: string;
  email: string;
  password: string;
  confirm: string;
  accept: boolean;
}

export function useRegister() {
  const [values, setValues] = useState<RegisterValues>({
    name: '',
    email: '',
    password: '',
    confirm: '',
    accept: false,
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);
  const mutation = useMutation({ mutationFn: authService.register });

  const set = useCallback(<K extends keyof RegisterValues>(key: K, value: RegisterValues[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => (e[key] ? { ...e, [key]: '' } : e));
  }, []);

  const submit = () => {
    setFormError(null);
    const v = validate(registerInput, values);
    const next: FieldErrors = v.ok ? {} : { ...v.errors };
    if (values.confirm !== values.password) next.confirm = 'Las contraseñas no coinciden.';
    if (!values.confirm) next.confirm = 'Repita la contraseña.';
    if (!values.accept) next.accept = 'Debe aceptar los términos y la política de privacidad.';
    if (!v.ok || Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }
    setErrors({});
    mutation.mutate(v.data, {
      onSuccess: (r) => setRegisteredEmail(r.email),
      onError: (e) => {
        const fields = serverFieldErrors(e);
        if (fields) setErrors(fields);
        else if (e instanceof ApiRequestError && e.code === 'EMAIL_TAKEN')
          setErrors({ email: e.message });
        else setFormError(friendlyError(e));
      },
    });
  };

  return {
    values,
    set,
    errors,
    formError,
    submit,
    submitting: mutation.isPending,
    registeredEmail,
    rules: passwordRules(values.password),
  };
}

// ---------------------------------------------------------------------------
// Recuperar contraseña
// ---------------------------------------------------------------------------

export function useForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const mutation = useMutation({ mutationFn: authService.forgotPassword });

  const submit = () => {
    setFormError(null);
    const v = validate(emailInput, { email });
    if (!v.ok) {
      setError(v.errors.email);
      return;
    }
    setError(undefined);
    mutation.mutate(v.data.email, {
      // Siempre el mismo mensaje: nunca se revela si la cuenta existe.
      onSuccess: () => setSentTo(v.data.email),
      onError: (e) => setFormError(friendlyError(e)),
    });
  };

  return { email, setEmail, error, formError, submit, submitting: mutation.isPending, sentTo };
}

// ---------------------------------------------------------------------------
// Crear contraseña desde un enlace (restablecer o aceptar invitación)
// ---------------------------------------------------------------------------

export function useTokenParam(): string {
  const [params] = useSearchParams();
  return params.get('token') ?? '';
}

export function useSetPassword(mode: 'reset' | 'invite', token: string) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const mutation = useMutation({
    mutationFn: (pw: string) =>
      mode === 'reset' ? authService.resetPassword(token, pw) : authService.acceptInvite(token, pw),
  });

  const submit = () => {
    setFormError(null);
    const v = validate(resetPasswordInput, { token, password });
    const next: FieldErrors = v.ok ? {} : { ...v.errors };
    if (next.token) {
      setFormError(
        mode === 'reset'
          ? 'El enlace no es válido o está incompleto. Solicite uno nuevo.'
          : 'La invitación no es válida o está incompleta. Pida una nueva.',
      );
      delete next.token;
    }
    if (confirm !== password) next.confirm = 'Las contraseñas no coinciden.';
    if (!confirm) next.confirm = 'Repita la contraseña.';
    if (!v.ok || Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }
    setErrors({});
    mutation.mutate(v.data.password, {
      onSuccess: () => setDone(true),
      onError: (e) => {
        const fields = serverFieldErrors(e);
        if (fields && fields.password) setErrors({ password: fields.password });
        else setFormError(friendlyError(e));
      },
    });
  };

  return {
    password,
    setPassword,
    confirm,
    setConfirm,
    errors,
    formError,
    submit,
    submitting: mutation.isPending,
    done,
    rules: passwordRules(password),
    hasToken: token.length > 0,
  };
}

// ---------------------------------------------------------------------------
// Verificar correo (se envía solo al abrir el enlace)
// ---------------------------------------------------------------------------

export function useVerifyEmail(token: string) {
  // Consulta (no mutación) para que el envío sea único aunque la vista se monte dos veces.
  const query = useQuery({
    queryKey: ['auth', 'verify-email', token],
    queryFn: () => authService.verifyEmail(token),
    enabled: token.length > 0,
    retry: false,
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  const status: 'verifying' | 'success' | 'error' = !token
    ? 'error'
    : query.isSuccess
      ? 'success'
      : query.isError
        ? 'error'
        : 'verifying';
  const message = !token
    ? 'El enlace está incompleto. Solicite uno nuevo.'
    : query.error
      ? friendlyError(query.error)
      : null;
  return { status, message };
}

/** Formulario de reenvío (pantalla de error de verificación y aviso del login). */
export function useResendForm(initialEmail = '') {
  const [email, setEmail] = useState(initialEmail);
  const [error, setError] = useState<string | undefined>();
  const r = useResendVerification();
  const submit = () => {
    const v = validate(emailInput, { email });
    if (!v.ok) {
      setError(v.errors.email);
      return;
    }
    setError(undefined);
    r.resend(v.data.email);
  };
  return {
    email,
    setEmail,
    error,
    submit,
    sent: r.sent,
    sending: r.sending,
    cooldown: r.cooldown,
    requestError: r.error,
  };
}
