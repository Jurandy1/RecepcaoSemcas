import { forwardRef, useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { WHATSAPP_DEV } from '../../lib/theme'

export function Logo({ size = 40 }) {
  return (
    <img src="/logo.svg" alt="Recepção Semcas" width={size} height={size} style={{ display: 'block' }} />
  )
}

const ICON_SIZE = { xs: 14, sm: 16, md: 16, lg: 20, xl: 24 }

/**
 * variant: primary | secondary | outline | ghost | danger | dangerGhost
 * size: xs | sm | md | lg | xl
 */
export function Btn({
  variant = 'primary',
  size = 'md',
  children,
  icon: Icon,
  full,
  className = '',
  ...props
}) {
  const variants = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    outline: 'btn-outline',
    ghost: 'btn-ghost',
    danger: 'btn-danger',
    dangerGhost: 'btn-danger-ghost',
  }
  return (
    <button
      type="button"
      {...props}
      className={`btn ${variants[variant] || variants.primary} btn-${size} ${full ? 'w-full' : ''} ${className}`}
    >
      {Icon && <Icon size={ICON_SIZE[size] || 16} className="flex-shrink-0" />}
      {children}
    </button>
  )
}

export function PageTitle({ children, sub, size = 'md', actions }) {
  const sizes = {
    sm: 'text-xl sm:text-2xl',
    md: 'text-2xl sm:text-3xl',
  }
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className={`page-title ${sizes[size]}`}>{children}</h1>
        {sub && <p className="page-sub text-sm text-gray-20 mt-1.5">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2 flex-shrink-0">{actions}</div>}
    </div>
  )
}

export function Field({ label, required, hint, children, htmlFor }) {
  return (
    <div>
      <label className="field-label" htmlFor={htmlFor}>
        {label}
        {required && <span className="req">*</span>}
      </label>
      {children}
      {hint && <p className="field-hint">{hint}</p>}
    </div>
  )
}

export const Input = forwardRef(function Input({ large, className = '', ...props }, ref) {
  return <input ref={ref} {...props} className={`${large ? 'inp-l' : 'inp'} ${className}`} />
})

export const Select = forwardRef(function Select({ large, className = '', children, ...props }, ref) {
  return (
    <select ref={ref} {...props} className={`${large ? 'inp-l' : 'inp'} ${className}`}>
      {children}
    </select>
  )
})

export function Textarea({ large, className = '', ...props }) {
  return <textarea {...props} className={`${large ? 'inp-l' : 'inp'} ${className}`} />
}

export function Card({ children, className = '', hover, topbar }) {
  return (
    <div className={`card ${hover ? 'card-hover' : ''} ${className}`}>
      {topbar && <div className="card-topbar" />}
      {children}
    </div>
  )
}

export function Alert({ type = 'info', icon: Icon, title, children }) {
  const map = { info: 'alert-info', error: 'alert-error', success: 'alert-success', warn: 'alert-warn' }
  return (
    <div className={`alert ${map[type] || map.info}`} role={type === 'error' ? 'alert' : undefined}>
      {Icon && <Icon size={20} className="alert-icon" />}
      <div className="min-w-0 flex-1">
        {title && <div className="font-semibold">{title}</div>}
        {children && <div className={title ? 'text-sm mt-0.5' : ''}>{children}</div>}
      </div>
    </div>
  )
}

/** Chip de status: cor + ícone + texto (nunca só cor). */
export function Chip({ tone = 'gray', icon: Icon, dot, xs, children, className = '' }) {
  const tones = {
    blue: 'chip-blue',
    success: 'chip-success',
    warn: 'chip-warn',
    danger: 'chip-danger',
    gray: 'chip-gray',
    outline: 'chip-outline',
  }
  const dotColor = {
    success: 'bg-success',
    warn: 'bg-warning',
    danger: 'bg-danger',
    blue: 'bg-blue',
    gray: 'bg-gray-5',
    outline: 'bg-blue',
  }
  return (
    <span className={`chip ${tones[tone] || tones.gray} ${xs ? 'chip-xs' : ''} ${className}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColor[tone] || 'bg-gray-5'}`} />}
      {Icon && <Icon size={12} className="flex-shrink-0" />}
      {children}
    </span>
  )
}

/** Diferencia servidor municipal de visitante externo. */
export function BadgeOrigem({ servidor, orgao, children, className = '' }) {
  return (
    <span
      className={`badge-origem ${servidor ? 'badge-servidor' : 'badge-externo'} ${className}`}
    >
      {children || (servidor ? `Servidor${orgao ? ` · ${orgao}` : ''}` : 'Visitante')}
    </span>
  )
}

export function Avatar({ nome = '', size = 44, className = '' }) {
  const iniciais = nome
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
  return (
    <span
      className={`avatar ${className}`}
      style={{ width: size, height: size, fontSize: Math.max(11, Math.round(size * 0.32)) }}
      aria-hidden="true"
    >
      {iniciais || '—'}
    </span>
  )
}

export function TableWrap({ children }) {
  return <div className="table-wrap">{children}</div>
}

/** Filtro segmentado. opcoes: [{ value, label, contador }] */
export function Segmented({ valor, onChange, opcoes, className = '' }) {
  return (
    <div className={`segmented ${className}`}>
      {opcoes.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={valor === o.value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
          {typeof o.contador === 'number' && (
            <span className="text-gray-20 font-mono">{o.contador}</span>
          )}
        </button>
      ))}
    </div>
  )
}

export function Creditos({ tone = 'light' }) {
  const cor = tone === 'dark' ? 'text-white' : 'text-blue-dark'
  return (
    <a
      href={WHATSAPP_DEV}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 hover:underline decoration-yellow decoration-2 underline-offset-2"
    >
      Desenvolvido por <strong className={cor}>Jurandy Santana</strong>
      <IconeWhatsapp />
    </a>
  )
}

export function IconeWhatsapp({ size = 13, color = '#25D366' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.966-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.174.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  )
}

export function Empty({ icon: Icon, children, acao }) {
  return (
    <div className="py-12 px-6 text-center">
      {Icon && (
        <div className="w-12 h-12 rounded-full bg-gray-1 flex items-center justify-center mx-auto mb-3">
          <Icon size={22} className="text-gray-5" />
        </div>
      )}
      <div className="text-sm font-medium text-gray-20">{children}</div>
      {acao && <div className="mt-4 flex justify-center">{acao}</div>}
    </div>
  )
}

/** Miniatura clicável que abre a foto em tamanho normal. */
export function FotoAmpliavel({ src, alt = 'Foto', className = '', style, size }) {
  const [aberta, setAberta] = useState(false)

  useEffect(() => {
    if (!aberta) return undefined
    function onKey(e) {
      if (e.key === 'Escape') setAberta(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [aberta])

  if (!src) return null

  const boxStyle = size ? { width: size, height: size, ...style } : { width: '100%', height: '100%', ...style }

  return (
    <>
      <button
        type="button"
        onClick={() => setAberta(true)}
        className={`p-0 border border-gray-3 rounded overflow-hidden flex-shrink-0 cursor-zoom-in ${className}`}
        style={boxStyle}
        title="Clique para ampliar"
      >
        <img src={src} alt={alt} className="w-full h-full object-cover block" />
      </button>

      {aberta && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(7, 29, 65, 0.9)' }}
          onClick={() => setAberta(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Foto ampliada"
        >
          <button
            type="button"
            className="absolute top-4 right-4 p-2 text-white"
            onClick={() => setAberta(false)}
            title="Fechar"
            aria-label="Fechar foto"
          >
            <X size={28} />
          </button>
          <img
            src={src}
            alt={alt}
            className="max-w-full max-h-[90vh] object-contain rounded bg-white shadow-e3"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  )
}
