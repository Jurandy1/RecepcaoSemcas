import { C } from '../lib/theme'

export function Logo({ size = 40 }) {
  return (
    <img src="/logo.svg" alt="SEMCAS" width={size} height={size} style={{ display: 'block' }} />
  )
}

export function Btn({ variant = 'primary', size = 'md', children, icon: Icon, full, ...props }) {
  const styles = {
    primary: { bg: C.blue, fg: C.white, border: C.blue },
    secondary: { bg: C.white, fg: C.blue, border: C.blue },
    ghost: { bg: 'transparent', fg: C.blue, border: 'transparent' },
    danger: { bg: C.red, fg: C.white, border: C.red },
    success: { bg: C.green, fg: C.white, border: C.green },
  }
  const sizes = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-4 text-lg',
    xl: 'px-8 py-5 text-xl',
  }
  const s = styles[variant]
  return (
    <button
      {...props}
      className={`${sizes[size]} font-semibold inline-flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 ${full ? 'w-full' : ''}`}
      style={{ backgroundColor: s.bg, color: s.fg, border: `1px solid ${s.border}` }}
    >
      {Icon && <Icon size={size === 'xl' || size === 'lg' ? 22 : 16} />}
      {children}
    </button>
  )
}

export function Field({ label, required, hint, children }) {
  return (
    <div>
      <label className="block font-semibold mb-1.5" style={{ color: C.gray80, fontSize: 15 }}>
        {label} {required && <span style={{ color: C.red }}>*</span>}
      </label>
      {children}
      {hint && <p className="text-xs mt-1" style={{ color: C.gray20 }}>{hint}</p>}
    </div>
  )
}

export function Input({ large, ...props }) {
  return (
    <input
      {...props}
      className={`w-full border focus:outline-none focus:ring-2 ${large ? 'px-4 py-4 text-lg' : 'px-3 py-2.5 text-sm'}`}
      style={{ borderColor: C.gray5, ...props.style }}
    />
  )
}

export function Select({ large, children, ...props }) {
  return (
    <select
      {...props}
      className={`w-full border bg-white focus:outline-none focus:ring-2 ${large ? 'px-4 py-4 text-lg' : 'px-3 py-2.5 text-sm'}`}
      style={{ borderColor: C.gray5 }}
    >
      {children}
    </select>
  )
}

export function Textarea({ large, ...props }) {
  return (
    <textarea
      {...props}
      className={`w-full border focus:outline-none focus:ring-2 resize-none ${large ? 'px-4 py-3 text-lg' : 'px-3 py-2.5 text-sm'}`}
      style={{ borderColor: C.gray5 }}
    />
  )
}

export function Card({ children, className = '' }) {
  return (
    <div className={`bg-white border ${className}`} style={{ borderColor: C.gray3 }}>
      {children}
    </div>
  )
}

export function Alert({ type = 'info', children }) {
  const map = {
    info: { bg: C.blueBg, fg: C.blueDark },
    error: { bg: C.redBg, fg: C.red },
    success: { bg: C.greenBg, fg: C.green },
    warn: { bg: C.orangeBg, fg: C.orange },
  }
  const s = map[type]
  return (
    <div className="p-3 text-sm" style={{ backgroundColor: s.bg, color: s.fg }}>
      {children}
    </div>
  )
}

export function Creditos() {
  return (
    <span>Desenvolvido por <strong style={{ color: C.blueDark }}>Jurandy Santana</strong></span>
  )
}

export function Empty({ children }) {
  return (
    <div className="py-10 text-center text-sm" style={{ color: C.gray60 }}>
      {children}
    </div>
  )
}
