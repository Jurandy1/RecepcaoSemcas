import { useState, useEffect, useRef } from 'react';
import {
  User, Lock, Bell, LogOut, Users, Calendar, MessageSquare,
  Building2, Camera, Search, Home, Clock, UserPlus, FileText,
  X, Send, CheckCircle2, AlertCircle, MoreVertical,
  Filter, Download, ChevronRight, Eye, EyeOff, Plus,
  TrendingUp, ArrowUpRight, Settings,
  HelpCircle
} from 'lucide-react';

const C = {
  blueDark: '#0B3A6E',
  blue: '#1565C0',
  blueLight: '#1E88E5',
  blueBg: '#E8F1FB',
  green: '#2E7D32',
  greenBg: '#E8F5E9',
  orange: '#EF6C00',
  orangeBg: '#FFF3E0',
  red: '#C62828',
  gray1: '#F5F7FA',
  gray2: '#EEF1F5',
  gray3: '#E0E5EC',
  gray5: '#C5CDD8',
  gray20: '#8A94A6',
  gray60: '#5A6577',
  gray80: '#1A2332',
  white: '#FFFFFF'
};

const VISITAS_HOJE = [
  { id: 1, nome: 'Ana Silva Santos', cpf: '123.456.789-00', setor: 'Recursos Humanos', telefone: '(98) 98111-2233', horario: '08:12', status: 'atendido', tipo: 'espontanea' },
  { id: 2, nome: 'Bruno Costa Lima', cpf: '234.567.890-11', setor: 'CMDCA', telefone: '(98) 99222-3344', horario: '08:34', status: 'atendido', tipo: 'agendada' },
  { id: 3, nome: 'Carla Oliveira Rocha', cpf: '345.678.901-22', setor: 'Gabinete', telefone: '', horario: '09:05', status: 'em_atendimento', tipo: 'agendada' },
  { id: 4, nome: 'Daniel Rodrigues Alves', cpf: '456.789.012-33', setor: 'Almoxarifado e Patrimônio', telefone: '(98) 98333-4455', horario: '09:20', status: 'em_atendimento', tipo: 'espontanea' },
  { id: 5, nome: 'Eduarda Ferreira Sá', cpf: '567.890.123-44', setor: 'Financeiro', telefone: '(98) 98444-5566', horario: '10:00', status: 'aguardando', tipo: 'espontanea' },
  { id: 6, nome: 'Felipe Martins Souza', cpf: '678.901.234-55', setor: 'Proteção Social Especial', telefone: '', horario: '10:30', status: 'agendado', tipo: 'agendada' },
  { id: 7, nome: 'Gabriela Nunes Dias', cpf: '789.012.345-66', setor: 'Alta Complexidade', telefone: '(98) 99555-6677', horario: '11:00', status: 'agendado', tipo: 'agendada' },
];

const CONVERSAS_DEMO = [
  { id: 1, setor: 'Recursos Humanos', ultima: 'Vou receber a Ana Silva às 08h...', hora: '07:58', naoLidas: 0, online: true },
  { id: 2, setor: 'Gabinete', ultima: 'Pode subir com a Carla', hora: '09:05', naoLidas: 2, online: true },
  { id: 3, setor: 'Almoxarifado e Patrimônio', ultima: 'Confirmado, sala 302', hora: '09:18', naoLidas: 0, online: true },
  { id: 4, setor: 'CMDCA', ultima: 'Agendamento cancelado, obrigado', hora: '10:12', naoLidas: 1, online: false },
];

const MENSAGENS_DEMO = [
  { id: 1, autor: 'setor', texto: 'Bom dia! Vou receber a Ana Silva às 08h.', hora: '07:58', tipo: 'texto' },
  { id: 2, autor: 'recepcao', texto: 'Bom dia, recebido!', hora: '07:59', tipo: 'texto' },
  { id: 3, autor: 'setor', texto: '', hora: '08:00', tipo: 'aviso_visita', payload: { nome: 'Ana Silva Santos', hora: '08:00', sala: '204', atendente: 'Ana Caroline' } },
  { id: 4, autor: 'recepcao', texto: 'Ana Silva chegou. Liberando para subir.', hora: '08:12', tipo: 'texto' },
];

const Logo = ({ size = 40 }) => (
  <img src="/logo.svg" alt="SEMCAS" width={size} height={size} style={{ display: 'block' }} />
);

const StatusBadge = ({ status }) => {
  const map = {
    atendido:        { label: 'Atendido',       bg: C.greenBg,  fg: C.green },
    em_atendimento:  { label: 'Em atendimento', bg: C.blueBg,   fg: C.blue },
    aguardando:      { label: 'Aguardando',     bg: C.orangeBg, fg: C.orange },
    agendado:        { label: 'Agendado',       bg: C.gray2,    fg: C.gray80 },
  };
  const s = map[status];
  return (
    <span className="inline-block px-2 py-0.5 text-xs font-medium"
          style={{ backgroundColor: s.bg, color: s.fg }}>
      {s.label}
    </span>
  );
};

const Btn = ({ variant = 'primary', size = 'md', children, icon: Icon, ...props }) => {
  const styles = {
    primary:   { bg: C.blue, fg: C.white, border: C.blue },
    secondary: { bg: C.white, fg: C.blue, border: C.blue },
    ghost:     { bg: 'transparent', fg: C.blue, border: 'transparent' },
    danger:    { bg: C.red, fg: C.white, border: C.red },
  };
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base',
  };
  const s = styles[variant];
  return (
    <button
      {...props}
      className={`${sizes[size]} font-semibold inline-flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50`}
      style={{ backgroundColor: s.bg, color: s.fg, border: `1px solid ${s.border}` }}
    >
      {Icon && <Icon size={size === 'sm' ? 14 : 16} />}
      {children}
    </button>
  );
};

const Creditos = () => (
  <span>Desenvolvido por <strong style={{ color: C.blueDark }}>Jurandy Santana</strong></span>
);

const LoginScreen = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [showSenha, setShowSenha] = useState(false);

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: C.gray1 }}>
      <header className="bg-white border-b" style={{ borderColor: C.gray3 }}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-3">
          <Logo size={48} />
          <div>
            <div className="text-xs font-semibold tracking-wide uppercase" style={{ color: C.gray60 }}>
              Secretaria Municipal da Criança e Assistência Social
            </div>
            <div className="text-lg font-bold" style={{ color: C.blueDark }}>SEMCAS</div>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <h1 className="text-2xl font-bold mb-1" style={{ color: C.blueDark }}>
              Controle de Atendimento
            </h1>
            <p className="text-sm" style={{ color: C.gray60 }}>
              Acesse com suas credenciais.
            </p>
          </div>

          <div className="bg-white p-8 border" style={{ borderColor: C.gray3 }}>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: C.gray80 }}>E-mail</label>
                <div className="relative">
                  <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: C.gray20 }} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu.email@exemplo.com"
                    className="w-full pl-10 pr-4 py-2.5 border text-sm focus:outline-none focus:ring-2"
                    style={{ borderColor: C.gray5 }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: C.gray80 }}>Senha</label>
                <div className="relative">
                  <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: C.gray20 }} />
                  <input
                    type={showSenha ? 'text' : 'password'}
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    placeholder="Digite sua senha"
                    className="w-full pl-10 pr-10 py-2.5 border text-sm focus:outline-none focus:ring-2"
                    style={{ borderColor: C.gray5 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowSenha(!showSenha)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    style={{ color: C.gray20 }}
                  >
                    {showSenha ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <button type="button" className="text-xs font-semibold mt-2" style={{ color: C.blue }}>
                  Esqueci minha senha
                </button>
              </div>

              <button
                onClick={() => onLogin('recepcao')}
                className="w-full py-2.5 font-semibold text-white inline-flex items-center justify-center gap-2"
                style={{ backgroundColor: C.blue }}
              >
                Entrar <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <button onClick={() => onLogin('recepcao')}
                    className="py-2 border text-xs font-semibold"
                    style={{ borderColor: C.gray3, color: C.blueDark, backgroundColor: C.white }}>
              Recepção
            </button>
            <button onClick={() => onLogin('setor')}
                    className="py-2 border text-xs font-semibold"
                    style={{ borderColor: C.gray3, color: C.blueDark, backgroundColor: C.white }}>
              Setor
            </button>
            <button onClick={() => onLogin('admin')}
                    className="py-2 border text-xs font-semibold"
                    style={{ borderColor: C.gray3, color: C.blueDark, backgroundColor: C.white }}>
              Admin
            </button>
          </div>
        </div>
      </main>

      <footer className="border-t py-5 px-6" style={{ backgroundColor: C.white, borderColor: C.gray3 }}>
        <div className="max-w-6xl mx-auto flex items-center justify-between text-xs" style={{ color: C.gray60 }}>
          <Creditos />
          <span>SEMCAS · Controle de Atendimento</span>
        </div>
      </footer>
    </div>
  );
};

const Header = ({ perfil, onLogout, onToggleChat, chatOpen, unreadCount }) => {
  const nomes = { recepcao: 'Jurandy Santana', setor: 'Ana Caroline', admin: 'Administrador' };
  const cargos = { recepcao: 'Recepção · SEMCAS', setor: 'Almoxarifado e Patrimônio', admin: 'Administração' };

  return (
    <header className="bg-white border-b sticky top-0 z-30" style={{ borderColor: C.gray3 }}>
      <div className="px-6 py-3 flex items-center gap-4">
        <div className="flex items-center gap-3">
          <Logo size={40} />
          <div>
            <div className="text-[10px] font-semibold tracking-wide uppercase" style={{ color: C.gray60 }}>SEMCAS</div>
            <div className="text-sm font-bold" style={{ color: C.blueDark }}>Controle de Atendimento</div>
          </div>
        </div>

        <div className="flex-1 max-w-lg mx-6">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: C.gray20 }} />
            <input
              type="text"
              placeholder="Buscar visitante por nome ou CPF..."
              className="w-full pl-9 pr-4 py-2 border text-sm focus:outline-none focus:ring-2"
              style={{ borderColor: C.gray3, backgroundColor: C.gray1 }}
            />
          </div>
        </div>

        <button
          onClick={onToggleChat}
          className="relative p-2"
          style={{ color: chatOpen ? C.blue : C.gray60 }}
          title="Chat"
        >
          <MessageSquare size={20} />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 text-[10px] font-bold flex items-center justify-center text-white px-1"
                  style={{ backgroundColor: C.red }}>
              {unreadCount}
            </span>
          )}
        </button>

        <button className="relative p-2" style={{ color: C.gray60 }} title="Notificações">
          <Bell size={20} />
        </button>

        <div className="flex items-center gap-3 pl-4 border-l" style={{ borderColor: C.gray3 }}>
          <div className="w-9 h-9 flex items-center justify-center font-bold text-white text-sm"
               style={{ backgroundColor: C.blue }}>
            {nomes[perfil].split(' ').map(n => n[0]).slice(0, 2).join('')}
          </div>
          <div className="hidden md:block">
            <div className="text-sm font-semibold" style={{ color: C.blueDark }}>{nomes[perfil]}</div>
            <div className="text-xs" style={{ color: C.gray60 }}>{cargos[perfil]}</div>
          </div>
          <button onClick={onLogout} className="p-2" style={{ color: C.gray60 }} title="Sair">
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  );
};

const Sidebar = ({ perfil, ativa, onNav }) => {
  const menus = {
    recepcao: [
      { id: 'home', label: 'Painel', icon: Home },
      { id: 'agenda', label: 'Agenda do dia', icon: Calendar },
      { id: 'visitantes', label: 'Visitantes', icon: Users },
      { id: 'historico', label: 'Histórico', icon: FileText },
      { id: 'relatorios', label: 'Relatórios', icon: TrendingUp },
    ],
    setor: [
      { id: 'home', label: 'Minhas visitas', icon: Home },
      { id: 'agenda', label: 'Nova visita', icon: Plus },
      { id: 'historico', label: 'Histórico do setor', icon: FileText },
    ],
    admin: [
      { id: 'home', label: 'Visão geral', icon: Home },
      { id: 'usuarios', label: 'Usuários', icon: Users },
      { id: 'setores', label: 'Setores', icon: Building2 },
      { id: 'relatorios', label: 'Relatórios', icon: TrendingUp },
      { id: 'config', label: 'Configurações', icon: Settings },
    ],
  };

  return (
    <aside className="w-56 border-r flex-shrink-0 flex flex-col" style={{ backgroundColor: C.white, borderColor: C.gray3 }}>
      <nav className="flex-1 py-3">
        {menus[perfil].map(item => {
          const Icon = item.icon;
          const active = ativa === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNav(item.id)}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm relative"
              style={{
                color: active ? C.blue : C.gray80,
                backgroundColor: active ? C.blueBg : 'transparent',
                fontWeight: active ? 600 : 500,
              }}
            >
              {active && <span className="absolute left-0 top-0 bottom-0 w-0.5" style={{ backgroundColor: C.blue }} />}
              <Icon size={17} />
              {item.label}
            </button>
          );
        })}
      </nav>
      <div className="border-t p-4 space-y-2" style={{ borderColor: C.gray3 }}>
        <button className="w-full flex items-center gap-2 text-xs font-semibold" style={{ color: C.gray60 }}>
          <HelpCircle size={14} /> Ajuda
        </button>
        <div className="text-[10px]" style={{ color: C.gray20 }}>
          <Creditos />
        </div>
      </div>
    </aside>
  );
};

const StatCard = ({ label, valor, icon: Icon, cor, delta }) => (
  <div className="bg-white p-5 border" style={{ borderColor: C.gray3 }}>
    <div className="flex items-start justify-between mb-3">
      <div className="w-9 h-9 flex items-center justify-center" style={{ backgroundColor: cor + '18' }}>
        <Icon size={18} style={{ color: cor }} />
      </div>
      {delta && (
        <div className="flex items-center gap-1 text-xs font-semibold" style={{ color: C.green }}>
          <ArrowUpRight size={12} /> {delta}
        </div>
      )}
    </div>
    <div className="text-2xl font-bold mb-1" style={{ color: C.blueDark }}>{valor}</div>
    <div className="text-sm" style={{ color: C.gray60 }}>{label}</div>
  </div>
);

const DashboardRecepcao = ({ onNovoVisitante }) => (
  <div className="p-6 space-y-6">
    <div className="flex items-end justify-between">
      <div>
        <h1 className="text-xl font-bold" style={{ color: C.blueDark }}>Painel da Recepção</h1>
        <p className="text-sm mt-1" style={{ color: C.gray60 }}>
          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>
      <Btn variant="primary" size="lg" icon={UserPlus} onClick={onNovoVisitante}>
        Registrar visitante
      </Btn>
    </div>

    <div className="grid grid-cols-4 gap-4">
      <StatCard label="Visitas hoje" valor="14" icon={Users} cor={C.blue} delta="+3" />
      <StatCard label="Aguardando" valor="2" icon={Clock} cor={C.orange} />
      <StatCard label="Agendadas" valor="8" icon={Calendar} cor={C.green} />
      <StatCard label="Setores ativos" valor="12" icon={Building2} cor={C.blueLight} />
    </div>

    <div className="bg-white border" style={{ borderColor: C.gray3 }}>
      <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: C.gray3 }}>
        <div>
          <h2 className="font-bold" style={{ color: C.blueDark }}>Controle de Atendimento Diário</h2>
          <p className="text-xs mt-0.5" style={{ color: C.gray60 }}>Registros do dia</p>
        </div>
        <div className="flex items-center gap-2">
          <Btn variant="ghost" size="sm" icon={Filter}>Filtrar</Btn>
          <Btn variant="ghost" size="sm" icon={Download}>Exportar</Btn>
        </div>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr style={{ backgroundColor: C.gray1 }}>
            <th className="text-left px-5 py-3 font-semibold text-xs uppercase tracking-wide" style={{ color: C.gray60 }}>Nome</th>
            <th className="text-left px-3 py-3 font-semibold text-xs uppercase tracking-wide" style={{ color: C.gray60 }}>CPF</th>
            <th className="text-left px-3 py-3 font-semibold text-xs uppercase tracking-wide" style={{ color: C.gray60 }}>Setor</th>
            <th className="text-left px-3 py-3 font-semibold text-xs uppercase tracking-wide" style={{ color: C.gray60 }}>Telefone</th>
            <th className="text-left px-3 py-3 font-semibold text-xs uppercase tracking-wide" style={{ color: C.gray60 }}>Horário</th>
            <th className="w-8"></th>
          </tr>
        </thead>
        <tbody>
          {VISITAS_HOJE.map((v) => (
            <tr key={v.id} className="border-t" style={{ borderColor: C.gray3 }}>
              <td className="px-5 py-3">
                <div className="font-semibold" style={{ color: C.blueDark }}>{v.nome}</div>
                {v.tipo === 'agendada' && (
                  <div className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: C.blue }}>Agendada</div>
                )}
              </td>
              <td className="px-3 py-3 font-mono text-xs" style={{ color: C.gray80 }}>{v.cpf}</td>
              <td className="px-3 py-3" style={{ color: C.gray80 }}>{v.setor}</td>
              <td className="px-3 py-3 font-mono text-xs" style={{ color: v.telefone ? C.gray80 : C.gray20 }}>
                {v.telefone || '—'}
              </td>
              <td className="px-3 py-3 font-mono text-xs" style={{ color: C.gray80 }}>{v.horario}</td>
              <td className="px-3 py-3">
                <button className="p-1" style={{ color: C.gray60 }}>
                  <MoreVertical size={14} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const DashboardSetor = ({ onAvisarVisita }) => (
  <div className="p-6 space-y-6">
    <div className="flex items-end justify-between">
      <div>
        <h1 className="text-xl font-bold" style={{ color: C.blueDark }}>Almoxarifado e Patrimônio</h1>
        <p className="text-sm mt-1" style={{ color: C.gray60 }}>Agendamentos e visitantes do seu setor</p>
      </div>
      <Btn variant="primary" size="lg" icon={Send} onClick={onAvisarVisita}>
        Avisar visita à recepção
      </Btn>
    </div>

    <div className="grid grid-cols-3 gap-4">
      <StatCard label="Agendadas hoje" valor="3" icon={Calendar} cor={C.blue} />
      <StatCard label="Aguardando" valor="1" icon={Clock} cor={C.orange} />
      <StatCard label="Atendidas" valor="5" icon={CheckCircle2} cor={C.green} />
    </div>

    <div className="bg-white border" style={{ borderColor: C.gray3 }}>
      <div className="px-5 py-4 border-b" style={{ borderColor: C.gray3 }}>
        <h2 className="font-bold" style={{ color: C.blueDark }}>Suas visitas de hoje</h2>
      </div>
      <div>
        {VISITAS_HOJE.filter(v => v.setor === 'Almoxarifado e Patrimônio').concat([
          { id: 99, nome: 'Helena Barros', cpf: '890.123.456-77', horario: '14:00', status: 'agendado', sala: '302', atendente: 'Jurandy' },
          { id: 100, nome: 'Igor Sampaio', cpf: '901.234.567-88', horario: '15:30', status: 'agendado', sala: '302', atendente: 'Ana Caroline' },
        ]).map((v) => (
          <div key={v.id} className="px-5 py-4 flex items-center gap-4 border-t" style={{ borderColor: C.gray3 }}>
            <div className="flex-1">
              <div className="font-semibold" style={{ color: C.blueDark }}>{v.nome}</div>
              <div className="text-xs" style={{ color: C.gray60 }}>
                {v.horario} · Sala {v.sala || '302'} · Atendente: {v.atendente || 'Jurandy'}
              </div>
            </div>
            <StatusBadge status={v.status} />
          </div>
        ))}
      </div>
    </div>
  </div>
);

const DashboardAdmin = () => (
  <div className="p-6 space-y-6">
    <div>
      <h1 className="text-xl font-bold" style={{ color: C.blueDark }}>Visão geral · Administração</h1>
      <p className="text-sm mt-1" style={{ color: C.gray60 }}>Uso do sistema pelos setores da SEMCAS</p>
    </div>

    <div className="grid grid-cols-4 gap-4">
      <StatCard label="Usuários ativos" valor="47" icon={Users} cor={C.blue} delta="+2" />
      <StatCard label="Setores" valor="12" icon={Building2} cor={C.blueLight} />
      <StatCard label="Visitas no mês" valor="284" icon={Calendar} cor={C.green} delta="+18%" />
      <StatCard label="Tempo médio de espera" valor="7min" icon={Clock} cor={C.orange} />
    </div>

    <div className="bg-white border p-6" style={{ borderColor: C.gray3 }}>
      <h2 className="font-bold mb-4" style={{ color: C.blueDark }}>Setores com mais visitas este mês</h2>
      <div className="space-y-3">
        {[
          { setor: 'Recursos Humanos', visitas: 82, pct: 90 },
          { setor: 'Gabinete', visitas: 54, pct: 60 },
          { setor: 'Almoxarifado e Patrimônio', visitas: 41, pct: 45 },
          { setor: 'CMDCA', visitas: 38, pct: 42 },
          { setor: 'Financeiro', visitas: 29, pct: 32 },
        ].map(s => (
          <div key={s.setor}>
            <div className="flex items-center justify-between text-sm mb-1">
              <span style={{ color: C.gray80 }}>{s.setor}</span>
              <span className="font-semibold" style={{ color: C.blueDark }}>{s.visitas}</span>
            </div>
            <div className="h-1.5 overflow-hidden" style={{ backgroundColor: C.gray2 }}>
              <div className="h-full" style={{ width: `${s.pct}%`, backgroundColor: C.blue }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const ModalNovoVisitante = ({ onClose }) => {
  const [fotoTirada, setFotoTirada] = useState(false);
  const [form, setForm] = useState({ nome: '', cpf: '', setor: '', telefone: '' });

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl max-h-[90vh] overflow-auto">
        <div className="px-6 py-4 border-b flex items-center justify-between sticky top-0 bg-white z-10" style={{ borderColor: C.gray3 }}>
          <div>
            <h2 className="text-lg font-bold" style={{ color: C.blueDark }}>Registrar visitante</h2>
            <p className="text-xs" style={{ color: C.gray60 }}>Controle de Atendimento Diário</p>
          </div>
          <button onClick={onClose} className="p-1" style={{ color: C.gray60 }}><X size={20} /></button>
        </div>

        <div className="p-6 grid grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: C.gray80 }}>Foto do visitante</label>
            <div className="aspect-square border flex flex-col items-center justify-center gap-3 relative overflow-hidden"
                 style={{ borderColor: fotoTirada ? C.green : C.gray5, backgroundColor: fotoTirada ? C.greenBg : C.gray1 }}>
              {fotoTirada ? (
                <>
                  <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: C.blueDark }}>
                    <User size={64} style={{ color: C.white, opacity: 0.4 }} />
                  </div>
                  <button onClick={() => setFotoTirada(false)}
                          className="absolute top-2 right-2 p-1.5 bg-white border"
                          style={{ color: C.red, borderColor: C.gray3 }}>
                    <X size={14} />
                  </button>
                </>
              ) : (
                <>
                  <Camera size={36} style={{ color: C.gray20 }} />
                  <span className="text-xs text-center px-3" style={{ color: C.gray60 }}>Nenhuma foto capturada</span>
                </>
              )}
            </div>
            <button onClick={() => setFotoTirada(true)}
                    className="w-full mt-3 py-2 text-sm font-semibold inline-flex items-center justify-center gap-2 border"
                    style={{ borderColor: C.blue, color: C.blue, backgroundColor: C.white }}>
              <Camera size={14} /> {fotoTirada ? 'Refazer foto' : 'Tirar foto'}
            </button>
          </div>

          <div className="col-span-2 space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-1.5" style={{ color: C.gray80 }}>
                Nome completo <span style={{ color: C.red }}>*</span>
              </label>
              <input
                type="text"
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                placeholder="Nome completo"
                className="w-full px-3 py-2 border text-sm focus:outline-none focus:ring-2"
                style={{ borderColor: C.gray5 }}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-1.5" style={{ color: C.gray80 }}>
                  CPF <span style={{ color: C.red }}>*</span>
                </label>
                <input
                  type="text"
                  value={form.cpf}
                  onChange={(e) => setForm({ ...form, cpf: e.target.value })}
                  placeholder="000.000.000-00"
                  className="w-full px-3 py-2 border text-sm focus:outline-none focus:ring-2 font-mono"
                  style={{ borderColor: C.gray5 }}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5" style={{ color: C.gray80 }}>Telefone</label>
                <input
                  type="text"
                  value={form.telefone}
                  onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                  placeholder="(98) 9xxxx-xxxx"
                  className="w-full px-3 py-2 border text-sm focus:outline-none focus:ring-2 font-mono"
                  style={{ borderColor: C.gray5 }}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1.5" style={{ color: C.gray80 }}>
                Setor procurado <span style={{ color: C.red }}>*</span>
              </label>
              <input
                type="text"
                value={form.setor}
                onChange={(e) => setForm({ ...form, setor: e.target.value })}
                placeholder="Digite o setor"
                className="w-full px-3 py-2 border text-sm focus:outline-none focus:ring-2"
                style={{ borderColor: C.gray5 }}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1.5" style={{ color: C.gray80 }}>Motivo da visita</label>
              <textarea
                rows="2"
                placeholder="Opcional"
                className="w-full px-3 py-2 border text-sm focus:outline-none focus:ring-2 resize-none"
                style={{ borderColor: C.gray5 }}
              />
            </div>
            <div className="p-3 flex items-start gap-3" style={{ backgroundColor: C.blueBg }}>
              <AlertCircle size={16} style={{ color: C.blue }} className="mt-0.5 flex-shrink-0" />
              <p className="text-xs" style={{ color: C.blueDark }}>
                Ao registrar, o setor informado receberá notificação pelo chat interno.
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t flex items-center justify-end gap-3" style={{ borderColor: C.gray3, backgroundColor: C.gray1 }}>
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn variant="primary" icon={CheckCircle2} onClick={onClose}>Registrar e notificar setor</Btn>
        </div>
      </div>
    </div>
  );
};

const ChatPanel = ({ onClose, perfil }) => {
  const [conversaAtiva, setConversaAtiva] = useState(2);
  const [msgs, setMsgs] = useState(MENSAGENS_DEMO);
  const [texto, setTexto] = useState('');
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [msgs, conversaAtiva]);

  const enviar = () => {
    if (!texto.trim()) return;
    setMsgs([...msgs, {
      id: Date.now(),
      autor: perfil === 'recepcao' ? 'recepcao' : 'setor',
      texto,
      hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      tipo: 'texto'
    }]);
    setTexto('');
  };

  return (
    <div className="w-96 border-l flex flex-col flex-shrink-0" style={{ backgroundColor: C.white, borderColor: C.gray3 }}>
      <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: C.gray3 }}>
        <div>
          <h3 className="font-bold text-sm" style={{ color: C.blueDark }}>Chat interno</h3>
          <p className="text-[10px]" style={{ color: C.gray60 }}>
            {perfil === 'recepcao' ? 'Setores conectados' : 'Comunicação com a Recepção'}
          </p>
        </div>
        <button onClick={onClose} className="p-1" style={{ color: C.gray60 }}><X size={16} /></button>
      </div>

      <div className="flex flex-1 min-h-0">
        {perfil === 'recepcao' && (
          <div className="w-36 border-r overflow-y-auto flex-shrink-0" style={{ borderColor: C.gray3 }}>
            {CONVERSAS_DEMO.map(c => (
              <button
                key={c.id}
                onClick={() => setConversaAtiva(c.id)}
                className="w-full text-left px-3 py-3 border-b"
                style={{
                  borderColor: C.gray3,
                  backgroundColor: conversaAtiva === c.id ? C.blueBg : 'transparent'
                }}
              >
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="w-1.5 h-1.5 flex-shrink-0"
                        style={{ backgroundColor: c.online ? C.green : C.gray5 }} />
                  <span className="text-xs font-semibold truncate flex-1" style={{ color: C.blueDark }}>{c.setor}</span>
                  {c.naoLidas > 0 && (
                    <span className="min-w-[14px] h-3.5 text-[9px] font-bold flex items-center justify-center text-white px-1"
                          style={{ backgroundColor: C.red }}>
                      {c.naoLidas}
                    </span>
                  )}
                </div>
                <p className="text-[10px] truncate" style={{ color: C.gray60 }}>{c.ultima}</p>
                <p className="text-[9px] mt-0.5" style={{ color: C.gray20 }}>{c.hora}</p>
              </button>
            ))}
          </div>
        )}

        <div className="flex-1 flex flex-col min-w-0">
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3" style={{ backgroundColor: C.gray1 }}>
            {msgs.map(m => {
              const eu = m.autor === (perfil === 'recepcao' ? 'recepcao' : 'setor');
              if (m.tipo === 'aviso_visita') {
                return (
                  <div key={m.id} className={`flex ${eu ? 'justify-end' : 'justify-start'}`}>
                    <div className="max-w-[90%] p-3 border" style={{ borderColor: C.blue, backgroundColor: C.white }}>
                      <div className="flex items-center gap-1.5 mb-2">
                        <UserPlus size={12} style={{ color: C.blue }} />
                        <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: C.blue }}>
                          Aviso de visita
                        </span>
                      </div>
                      <div className="text-sm font-semibold mb-1" style={{ color: C.blueDark }}>{m.payload.nome}</div>
                      <div className="text-xs space-y-0.5" style={{ color: C.gray60 }}>
                        <div>Previsto para {m.payload.hora}</div>
                        <div>Sala {m.payload.sala}</div>
                        <div>Atende: {m.payload.atendente}</div>
                      </div>
                      {perfil === 'recepcao' && (
                        <button className="w-full mt-3 py-1.5 text-xs font-semibold text-white inline-flex items-center justify-center gap-1"
                                style={{ backgroundColor: C.blue }}>
                          <CheckCircle2 size={12} /> Registrar agendamento
                        </button>
                      )}
                      <div className="text-[9px] mt-2 text-right" style={{ color: C.gray20 }}>{m.hora}</div>
                    </div>
                  </div>
                );
              }
              return (
                <div key={m.id} className={`flex ${eu ? 'justify-end' : 'justify-start'}`}>
                  <div className="max-w-[80%] px-3 py-2"
                       style={{
                         backgroundColor: eu ? C.blue : C.white,
                         color: eu ? C.white : C.gray80,
                         border: eu ? 'none' : `1px solid ${C.gray3}`
                       }}>
                    <div className="text-sm">{m.texto}</div>
                    <div className="text-[9px] mt-0.5 text-right" style={{ opacity: 0.7 }}>{m.hora}</div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="border-t p-2 flex items-center gap-2" style={{ borderColor: C.gray3 }}>
            {perfil === 'setor' && (
              <button className="p-2" style={{ color: C.blue }} title="Avisar visita">
                <UserPlus size={16} />
              </button>
            )}
            <input
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && enviar()}
              placeholder="Digite uma mensagem..."
              className="flex-1 px-3 py-2 border text-sm focus:outline-none focus:ring-2"
              style={{ borderColor: C.gray3 }}
            />
            <button onClick={enviar} className="p-2 text-white" style={{ backgroundColor: C.blue }}>
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ModalAvisarVisita = ({ onClose }) => (
  <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
    <div className="bg-white w-full max-w-lg">
      <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: C.gray3 }}>
        <div>
          <h2 className="text-lg font-bold" style={{ color: C.blueDark }}>Avisar visita à recepção</h2>
          <p className="text-xs" style={{ color: C.gray60 }}>A recepção receberá esse aviso</p>
        </div>
        <button onClick={onClose} className="p-1" style={{ color: C.gray60 }}><X size={20} /></button>
      </div>
      <div className="p-6 space-y-4">
        <div>
          <label className="block text-sm font-semibold mb-1.5" style={{ color: C.gray80 }}>
            Nome do visitante <span style={{ color: C.red }}>*</span>
          </label>
          <input placeholder="Nome completo" className="w-full px-3 py-2 border text-sm" style={{ borderColor: C.gray5 }} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-1.5" style={{ color: C.gray80 }}>Data</label>
            <input type="date" className="w-full px-3 py-2 border text-sm" style={{ borderColor: C.gray5 }} />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1.5" style={{ color: C.gray80 }}>Hora prevista</label>
            <input type="time" className="w-full px-3 py-2 border text-sm" style={{ borderColor: C.gray5 }} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-1.5" style={{ color: C.gray80 }}>Sala</label>
            <input placeholder="Ex.: 302" className="w-full px-3 py-2 border text-sm" style={{ borderColor: C.gray5 }} />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1.5" style={{ color: C.gray80 }}>Atendente</label>
            <input placeholder="Quem vai receber" className="w-full px-3 py-2 border text-sm" style={{ borderColor: C.gray5 }} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1.5" style={{ color: C.gray80 }}>Observação</label>
          <textarea rows="2" placeholder="Opcional" className="w-full px-3 py-2 border text-sm resize-none" style={{ borderColor: C.gray5 }} />
        </div>
      </div>
      <div className="px-6 py-4 border-t flex items-center justify-end gap-3" style={{ borderColor: C.gray3, backgroundColor: C.gray1 }}>
        <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
        <Btn variant="primary" icon={Send} onClick={onClose}>Enviar aviso</Btn>
      </div>
    </div>
  </div>
);

export default function App() {
  const [perfil, setPerfil] = useState(null);
  const [ativa, setAtiva] = useState('home');
  const [chatOpen, setChatOpen] = useState(false);
  const [modalVisitante, setModalVisitante] = useState(false);
  const [modalAviso, setModalAviso] = useState(false);

  if (!perfil) {
    return <LoginScreen onLogin={setPerfil} />;
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: C.gray1 }}>
      <Header
        perfil={perfil}
        onLogout={() => setPerfil(null)}
        onToggleChat={() => setChatOpen(!chatOpen)}
        chatOpen={chatOpen}
        unreadCount={3}
      />
      <div className="flex-1 flex min-h-0">
        <Sidebar perfil={perfil} ativa={ativa} onNav={setAtiva} />
        <main className="flex-1 overflow-y-auto">
          {perfil === 'recepcao' && <DashboardRecepcao onNovoVisitante={() => setModalVisitante(true)} />}
          {perfil === 'setor' && <DashboardSetor onAvisarVisita={() => setModalAviso(true)} />}
          {perfil === 'admin' && <DashboardAdmin />}
        </main>
        {chatOpen && <ChatPanel onClose={() => setChatOpen(false)} perfil={perfil} />}
      </div>

      {modalVisitante && <ModalNovoVisitante onClose={() => setModalVisitante(false)} />}
      {modalAviso && <ModalAvisarVisita onClose={() => setModalAviso(false)} />}
    </div>
  );
}
