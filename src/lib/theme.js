/**
 * Paleta do sistema — padrão gov.br refinado.
 * Os mesmos valores existem como tokens Tailwind em src/index.css (@theme);
 * este objeto serve para os poucos pontos que precisam da cor em JS.
 */
export const C = {
  blue10: '#F0F5FC',
  blue20: '#D4E5FA',
  blue30: '#A2C5F0',
  blue: '#1351B4',
  blueDark: '#0C326F',
  blueDeep: '#071D41',

  yellow: '#FFCD07',

  gray1: '#F8F8F8',
  gray2: '#EDEDED',
  gray3: '#CCCCCC',
  gray5: '#888888',
  gray20: '#636363',
  gray60: '#333333',
  gray80: '#1B1B1B',

  success: '#168821',
  successBg: '#E3F5E1',
  successDark: '#0C6B15',
  warning: '#D26F00',
  warningBg: '#FDECC1',
  warningDark: '#8A4900',
  danger: '#D04437',
  dangerBg: '#FBEEED',
  dangerDark: '#9F1F14',

  canvas: '#F5F7FA',
  card: '#FFFFFF',
  white: '#FFFFFF',
  sidebar: '#0C326F',
}

export const PAPEIS = {
  admin: 'Administrador',
  coordenadora: 'Coordenadora',
  recepcionista: 'Recepcionista',
  setor: 'Setor (agendamento)',
}

export const PAPEIS_CONVITE = [
  { value: 'coordenadora', label: 'Coordenadora — acesso completo' },
  { value: 'admin', label: 'Administrador — acesso completo' },
  { value: 'recepcionista', label: 'Recepcionista — cadastro de visitantes' },
  { value: 'setor', label: 'Setor (agendamento) — agenda visitas do próprio setor' },
]

export const WHATSAPP_DEV = 'https://wa.me/5598984016496'
