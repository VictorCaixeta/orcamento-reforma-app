import { useState, useEffect, useMemo, useRef } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, onSnapshot, setDoc } from "firebase/firestore";

// ─── FIREBASE ────────────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyCYOCUQmFCbd57DSII80HMcCVVQCELud04",
  authDomain: "orcamento-carol-e-victor.firebaseapp.com",
  projectId: "orcamento-carol-e-victor",
  storageBucket: "orcamento-carol-e-victor.firebasestorage.app",
  messagingSenderId: "316581246156",
  appId: "1:316581246156:web:4b793820520cfdb0e2be69",
  measurementId: "G-YC6J03PWN8"
};
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);
const DOC_REF = doc(db, "reforma", "dados");

// ─── DADOS ───────────────────────────────────────────────────────────────────
const defaultData = { orcamentos: [], gastos: [] };

const COMODOS = [
  { id: "sala", label: "Sala", emoji: "🛋️" },
  { id: "cozinha", label: "Cozinha", emoji: "🍳" },
  { id: "varanda", label: "Varanda / Lavanderia", emoji: "🌿" },
  { id: "escritorio", label: "Escritório", emoji: "💻" },
  { id: "dormitorio", label: "Dormitório", emoji: "🛏️" },
  { id: "banheiro", label: "Banheiro", emoji: "🚿" },
  { id: "geral", label: "Geral / Apt. todo", emoji: "🏠" },
];

const CATEGORIAS = [
  { id: "marcenaria", label: "Marcenaria", color: "#C8A882" },
  { id: "marmoraria", label: "Marmoraria", color: "#A8A09A" },
  { id: "revestimentos", label: "Revestimentos", color: "#8B9E7A" },
  { id: "pintura", label: "Pintura", color: "#C8A04A" },
  { id: "eletrica", label: "Elétrica", color: "#D4A017" },
  { id: "hidraulica", label: "Hidráulica / Gás", color: "#7BB8CC" },
  { id: "forro_gesso", label: "Forro de Gesso", color: "#B0A9A2" },
  { id: "iluminacao", label: "Iluminação", color: "#C8B84A" },
  { id: "moveis_deco", label: "Móveis / Decoração", color: "#C39BD3" },
  { id: "obra_civil", label: "Obra Civil", color: "#E59866" },
  { id: "eletrodomesticos", label: "Eletrodomésticos", color: "#E8A090" },
  { id: "eletronicos", label: "Eletrônicos / TV", color: "#7A9EC0" },
  { id: "climatizacao", label: "Climatização", color: "#85D4C8" },
  { id: "loucas_metais", label: "Louças & Metais", color: "#A8C4C8" },
  { id: "vidros_esquadrias", label: "Vidros & Esquadrias", color: "#C8D8E8" },
  { id: "outros", label: "Outros", color: "#B2BABB" },
];

const FORNECEDORES = ["Empreiteiro", "Marceneiro", "Marmoraria", "Loja"];
const STATUS_OPTIONS = [
  { id: "pago", label: "Pago", color: "#5C7A5C", bg: "#EAF3EA" },
  { id: "pendente", label: "Pendente", color: "#C8843A", bg: "#FDF3E7" },
  { id: "parcelado", label: "Parcelado", color: "#4A6FA5", bg: "#EBF2FB" },
];
const MEIOS_PAGAMENTO = [
  { id: "pix", label: "Pix" },
  { id: "cartao", label: "Cartão de crédito" },
  { id: "boleto", label: "Boleto" },
  { id: "dinheiro", label: "Dinheiro" },
  { id: "transferencia", label: "Transferência" },
];
const RESPONSAVEIS = [
  { id: "victor", label: "Victor", color: "#4A6FA5", bg: "#EBF2FB" },
  { id: "carol", label: "Carol", color: "#9B6FA5", bg: "#F3EBF8" },
  { id: "presente", label: "Presente 🎁", color: "#5C7A5C", bg: "#EAF3EA" },
];
const DATE_LABEL = {
  pago: "Data do pagamento",
  pendente: "Data prevista",
  parcelado: "Data da 1ª parcela",
};

// ─── UTILS ───────────────────────────────────────────────────────────────────
const fmt = (v) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
const pct = (v, t) => (t > 0 ? Math.min(100, (v / t) * 100) : 0);
const genId = () => Math.random().toString(36).slice(2, 9);
const fmtDateFull = (d) => d ? new Date(d + "T12:00:00").toLocaleDateString("pt-BR") : "—";

const MESES_ABREV = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const MESES_FULL = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const monthKeyOf = (dateStr) => (dateStr ? dateStr.slice(0, 7) : null); // "YYYY-MM"
const currentMonthKey = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; };
const mesAbrev = (key) => MESES_ABREV[parseInt(key.slice(5, 7), 10) - 1];
const mesFullLabel = (key) => `${MESES_FULL[parseInt(key.slice(5, 7), 10) - 1]} ${key.slice(0, 4)}`;

// Gera todas as chaves de mês entre minKey e maxKey (inclusive), incluindo meses vazios
const rangeMeses = (minKey, maxKey) => {
  const arr = [];
  let y = parseInt(minKey.slice(0, 4), 10), m = parseInt(minKey.slice(5, 7), 10);
  const yf = parseInt(maxKey.slice(0, 4), 10), mf = parseInt(maxKey.slice(5, 7), 10);
  while (y < yf || (y === yf && m <= mf)) {
    arr.push(`${y}-${String(m).padStart(2, "0")}`);
    m++; if (m > 12) { m = 1; y++; }
  }
  return arr;
};

// Valor abreviado tipo "R$ 4,7k"
const fmtCompact = (v) => {
  if (!v) return "R$ 0";
  if (v >= 1000) return `R$ ${(v / 1000).toFixed(1).replace(".", ",")}k`;
  return `R$ ${Math.round(v)}`;
};

const gerarParcelas = (n, dataInicio) => {
  const arr = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(dataInicio + "T12:00:00");
    d.setMonth(d.getMonth() + i);
    arr.push({ num: i + 1, data: d.toISOString().split("T")[0], pago: false });
  }
  return arr;
};

const maskCurrency = (cents) => {
  if (!cents && cents !== 0) return "";
  return (cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const valorPago = (g) => {
  if (g.responsavel === "presente") return 0;
  if (g.status === "pago") return g.valor;
  if (g.status === "parcelado" && g.parcelas_lista?.length) {
    const pagas = g.parcelas_lista.filter(p => p.pago).length;
    return (g.valor / g.parcelas_lista.length) * pagas;
  }
  return 0;
};

const valorPendente = (g) => {
  if (g.responsavel === "presente") return 0;
  return g.valor - valorPago(g);
};

// ─── STYLES ──────────────────────────────────────────────────────────────────
const S = {
  app: { fontFamily: "'Inter', -apple-system, sans-serif", background: "#F5F0EB", minHeight: "100vh", color: "#2D2926" },
  header: { background: "#2D2926", padding: "0 20px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 58, position: "sticky", top: 0, zIndex: 100, boxShadow: "0 2px 12px rgba(0,0,0,0.2)" },
  headerLeft: { display: "flex", alignItems: "center", gap: 10 },
  headerDot: { width: 8, height: 8, borderRadius: "50%", background: "#C8A882", flexShrink: 0 },
  headerTitle: { color: "#F5F0EB", fontSize: 14, fontWeight: 700 },
  headerSub: { color: "#7A7470", fontSize: 11 },
  syncDot: (ok) => ({ width: 7, height: 7, borderRadius: "50%", background: ok ? "#5C7A5C" : "#C8843A", display: "inline-block", marginRight: 4 }),
  navWrap: { background: "#FAFAF8", borderBottom: "1px solid #EDE8E3", padding: "0 16px", display: "flex", gap: 0, overflowX: "auto", position: "sticky", top: 58, zIndex: 99 },
  navBtn: (active) => ({ background: "none", border: "none", borderBottom: active ? "2.5px solid #C8A882" : "2.5px solid transparent", color: active ? "#2D2926" : "#9A9490", padding: "12px 14px", fontSize: 13, fontWeight: active ? 700 : 500, cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.15s" }),
  main: { padding: "20px 16px 60px" },
  card: { background: "#FAFAF8", borderRadius: 14, padding: 18, boxShadow: "0 1px 4px rgba(45,41,38,0.07)", marginBottom: 14 },
  cardTitle: { fontSize: 10, fontWeight: 700, color: "#9A9490", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 },
  bigNum: { fontSize: "clamp(18px, 4vw, 26px)", fontWeight: 800, color: "#2D2926", lineHeight: 1 },
  bigNumSub: { fontSize: 11, color: "#9A9490", marginTop: 4 },
  progressWrap: { background: "#EDE8E3", borderRadius: 99, height: 7, overflow: "hidden", marginTop: 8 },
  progressFill: (p, over) => ({ height: "100%", width: `${Math.min(100, p)}%`, background: over ? "#C0392B" : p > 80 ? "#E67E22" : "#5C7A5C", borderRadius: 99, transition: "width 0.5s ease" }),
  row2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  sectionTitle: { fontSize: 17, fontWeight: 800, color: "#2D2926", marginBottom: 16 },
  label: { fontSize: 10, fontWeight: 700, color: "#7A7470", marginBottom: 5, display: "block", letterSpacing: "0.06em", textTransform: "uppercase" },
  input: { width: "100%", border: "1.5px solid #E0DBD6", borderRadius: 8, padding: "10px 12px", fontSize: 14, background: "#FAFAF8", color: "#2D2926", outline: "none", boxSizing: "border-box", fontFamily: "inherit" },
  select: { width: "100%", border: "1.5px solid #E0DBD6", borderRadius: 8, padding: "10px 12px", fontSize: 14, background: "#FAFAF8", color: "#2D2926", outline: "none", boxSizing: "border-box", fontFamily: "inherit" },
  formRow: { marginBottom: 14 },
  overlay: { position: "fixed", inset: 0, background: "rgba(45,41,38,0.5)", zIndex: 200, display: "flex", alignItems: "flex-end", justifyContent: "center" },
  modal: { background: "#FAFAF8", borderRadius: "20px 20px 0 0", padding: "24px 20px 36px", width: "100%", maxHeight: "90vh", overflowY: "auto" },
  modalHandle: { width: 40, height: 4, background: "#DDD8D3", borderRadius: 99, margin: "0 auto 20px", cursor: "pointer" },
  modalTitle: { fontSize: 16, fontWeight: 800, marginBottom: 20, color: "#2D2926" },
  btnPrimary: { background: "#2D2926", color: "#F5F0EB", border: "none", borderRadius: 10, padding: "13px 20px", fontSize: 14, fontWeight: 700, cursor: "pointer", width: "100%", marginTop: 8 },
  btnSecondary: { background: "transparent", color: "#7A7470", border: "1.5px solid #DDD8D3", borderRadius: 10, padding: "12px 20px", fontSize: 14, fontWeight: 500, cursor: "pointer", width: "100%", marginTop: 8 },
  btnDangerFull: { background: "#FEE8E8", color: "#C0392B", border: "none", borderRadius: 10, padding: "12px 20px", fontSize: 14, fontWeight: 700, cursor: "pointer", width: "100%", marginTop: 8 },
  itemCard: { background: "#FAFAF8", borderRadius: 12, padding: "14px 16px", marginBottom: 10, boxShadow: "0 1px 4px rgba(45,41,38,0.06)" },
};

// ─── COMPONENTS ──────────────────────────────────────────────────────────────
function CurrencyInput({ value, onChange, placeholder = "0,00" }) {
  const cents = value ? Math.round(parseFloat(value) * 100) : 0;
  const [display, setDisplay] = useState(value ? maskCurrency(cents) : "");
  const handleChange = (e) => {
    const digits = e.target.value.replace(/\D/g, "");
    const newCents = parseInt(digits || "0", 10);
    setDisplay(maskCurrency(newCents));
    onChange(newCents / 100);
  };
  return <input style={S.input} inputMode="numeric" value={display} placeholder={placeholder} onChange={handleChange} />;
}

// Barrinha do topo do modal — fecha ao tocar, com área de toque ampliada
function ModalHandle({ onClose }) {
  return (
    <div onClick={onClose} style={{ margin: "-8px auto 12px", padding: "10px 24px", width: "fit-content", cursor: "pointer" }}>
      <div style={{ width: 40, height: 4, background: "#DDD8D3", borderRadius: 99 }} />
    </div>
  );
}

function ConfirmModal({ msg, onConfirm, onCancel }) {
  return (
    <div style={S.overlay} onClick={onCancel}>
      <div style={{ ...S.modal, padding: "28px 20px 32px" }} onClick={e => e.stopPropagation()}>
        <ModalHandle onClose={onCancel} />
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>Confirmar exclusão</div>
        <div style={{ fontSize: 13, color: "#7A7470", marginBottom: 20 }}>{msg}</div>
        <button style={S.btnDangerFull} onClick={onConfirm}>Sim, excluir</button>
        <button style={S.btnSecondary} onClick={onCancel}>Cancelar</button>
      </div>
    </div>
  );
}

function ProgressBar({ value, total, label }) {
  const p = pct(value, total);
  const over = value > total && total > 0;
  return (
    <div>
      <div style={S.progressWrap}><div style={S.progressFill(p, over)} /></div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5, fontSize: 11, color: "#9A9490" }}>
        <span>{fmt(value)}{label ? ` ${label}` : ""}</span>
        <span style={{ color: over ? "#C0392B" : p > 80 ? "#E67E22" : "#9A9490", fontWeight: 600 }}>{p.toFixed(0)}%</span>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const s = STATUS_OPTIONS.find(x => x.id === status) || STATUS_OPTIONS[1];
  return <span style={{ display: "inline-flex", alignItems: "center", background: s.bg, color: s.color, borderRadius: 99, padding: "3px 9px", fontSize: 11, fontWeight: 700 }}>{s.label}</span>;
}

function CatDot({ catId }) {
  const cat = CATEGORIAS.find(c => c.id === catId);
  if (!cat) return null;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, color: "#7A7470" }}>
      <span style={{ width: 8, height: 8, borderRadius: 2, background: cat.color, display: "inline-block", flexShrink: 0 }} />
      {cat.label}
    </span>
  );
}

// ─── MODAL GASTO ─────────────────────────────────────────────────────────────
const gerarRecorrencias = (n, descricao, valor, dataInicio) => {
  const arr = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(dataInicio + "T12:00:00");
    d.setMonth(d.getMonth() + i);
    arr.push({
      descricao: `${descricao} — ${i + 1}/${n}`,
      valor: valor,
      data: d.toISOString().split("T")[0],
    });
  }
  return arr;
};

function ModalGasto({ onClose, onSave, onDelete, initial }) {
  const blank = {
    comodo: "", categoria: "", fornecedor: "Loja", loja: "", descricao: "",
    valor: "", status: "pendente", meio_pagamento: "", parcelas: "",
    data: new Date().toISOString().split("T")[0], parcelas_lista: [],
    responsavel: "", presenteador: "", recorrencias: "", recorrencias_lista: [],
  };
  const [form, setForm] = useState(() => ({ ...blank, ...(initial || {}) }));
  const [confirmDel, setConfirmDel] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const isPresente = form.responsavel === "presente";
  const showParcelas = form.status === "parcelado" && ["cartao", "boleto"].includes(form.meio_pagamento);
  const isParcelado = form.status === "parcelado" && form.parcelas_lista?.length > 0;
  const dateLabel = DATE_LABEL[form.status] || "Data";
  const isRecorrente = !initial?.id && parseInt(form.recorrencias) >= 2 && form.recorrencias_lista?.length > 0;

  // Valida campos obrigatórios incluindo responsavel e meio_pagamento
  const ok = form.comodo && form.categoria && form.valor && form.descricao
    && form.responsavel
    && (isPresente || form.meio_pagamento);

  // Parcelas do cartão
  const handleParcelasChange = (n) => {
    setForm(f => {
      const num = parseInt(n);
      if (!n || isNaN(num) || num < 2 || !f.data) return { ...f, parcelas: n };
      const novas = gerarParcelas(num, f.data);
      const antigas = f.parcelas_lista || [];
      novas.forEach((p, i) => { if (antigas[i]) p.pago = antigas[i].pago; });
      return { ...f, parcelas: n, parcelas_lista: novas };
    });
  };

  const handleDataChange = (novaData) => {
    setForm(f => {
      const num = parseInt(f.parcelas);
      if (!isNaN(num) && num >= 2 && f.status === "parcelado") {
        const novas = gerarParcelas(num, novaData);
        const antigas = f.parcelas_lista || [];
        novas.forEach((p, i) => { if (antigas[i]) p.pago = antigas[i].pago; });
        return { ...f, data: novaData, parcelas_lista: novas };
      }
      return { ...f, data: novaData };
    });
  };

  const toggleParcela = (idx) => {
    const lista = form.parcelas_lista.map((p, i) => i === idx ? { ...p, pago: !p.pago } : p);
    set("parcelas_lista", lista);
  };

  // Recorrências
  const handleRecorrenciasChange = (n) => {
    setForm(f => {
      const num = parseInt(n);
      if (!n || isNaN(num) || num < 2) return { ...f, recorrencias: n, recorrencias_lista: [] };
      const novas = gerarRecorrencias(num, f.descricao || "", parseFloat(f.valor) || 0, f.data);
      const antigas = f.recorrencias_lista || [];
      novas.forEach((r, i) => { if (antigas[i]) { r.descricao = antigas[i].descricao; r.valor = antigas[i].valor; r.data = antigas[i].data; } });
      return { ...f, recorrencias: n, recorrencias_lista: novas };
    });
  };

  const updateRecorrencia = (idx, campo, valor) => {
    setForm(f => {
      const lista = f.recorrencias_lista.map((r, i) => i === idx ? { ...r, [campo]: valor } : r);
      return { ...f, recorrencias_lista: lista };
    });
  };

  const pagas = form.parcelas_lista?.filter(p => p.pago).length || 0;
  const totalP = form.parcelas_lista?.length || 0;
  const valorParcela = totalP > 0 ? parseFloat(form.valor || 0) / totalP : 0;

  const handleSave = () => {
    if (!ok) return;
    const base = { ...blank, ...form, valor: parseFloat(form.valor), id: form.id || genId() };

    if (isRecorrente) {
      // Salva N lançamentos independentes
      const lançamentos = form.recorrencias_lista.map(r => ({
        ...base,
        id: genId(),
        descricao: r.descricao,
        valor: parseFloat(r.valor) || base.valor,
        data: r.data,
        recorrencias: "", recorrencias_lista: [],
      }));
      onSave(lançamentos);
    } else {
      onSave(base);
    }
  };

  // Duplicar
  const handleDuplicar = () => {
    const copia = { ...form, id: undefined, descricao: `${form.descricao} (cópia)` };
    onClose();
    onSave({ ...blank, ...copia, valor: parseFloat(copia.valor), id: genId() });
  };

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modal} onClick={e => e.stopPropagation()}>
        <ModalHandle onClose={onClose} />
        <div style={S.modalTitle}>{initial?.id ? "✏️ Editar lançamento" : "➕ Novo lançamento"}</div>

        <div style={S.formRow}><label style={S.label}>Cômodo *</label>
          <select style={S.select} value={form.comodo} onChange={e => set("comodo", e.target.value)}>
            <option value="">Selecione…</option>
            {COMODOS.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
          </select></div>

        <div style={S.formRow}><label style={S.label}>Categoria *</label>
          <select style={S.select} value={form.categoria} onChange={e => set("categoria", e.target.value)}>
            <option value="">Selecione…</option>
            {CATEGORIAS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select></div>

        <div style={S.formRow}><label style={S.label}>Descrição *</label>
          <input style={S.input} value={form.descricao} placeholder="ex: Entrada marcenaria" onChange={e => set("descricao", e.target.value)} /></div>

        <div style={{ ...S.row2, marginBottom: 14 }}>
          <div><label style={S.label}>Tipo</label>
            <select style={S.select} value={form.fornecedor} onChange={e => set("fornecedor", e.target.value)}>
              {FORNECEDORES.map(f => <option key={f} value={f}>{f}</option>)}
            </select></div>
          <div><label style={S.label}>{form.fornecedor === "Loja" ? "Loja" : "Nome"}</label>
            <input style={S.input} value={form.loja} placeholder="ex: Leroy…" onChange={e => set("loja", e.target.value)} /></div>
        </div>

        <div style={{ ...S.row2, marginBottom: 14 }}>
          <div><label style={S.label}>Responsável * </label>
            <select style={S.select} value={form.responsavel} onChange={e => set("responsavel", e.target.value)}>
              <option value="">Selecione…</option>
              {RESPONSAVEIS.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
            </select></div>
          {isPresente && (
            <div><label style={S.label}>Nome do presenteador</label>
              <input style={S.input} value={form.presenteador} placeholder="ex: Tia Maria" onChange={e => set("presenteador", e.target.value)} /></div>
          )}
        </div>

        {isPresente && (
          <div style={{ background: "#EAF3EA", borderRadius: 8, padding: "10px 12px", marginBottom: 14, fontSize: 12, color: "#5C7A5C" }}>
            🎁 Presente — este valor não será contabilizado no orçamento de vocês.
          </div>
        )}

        <div style={{ ...S.row2, marginBottom: 14 }}>
          <div><label style={S.label}>Valor (R$) *</label>
            <CurrencyInput value={form.valor} onChange={v => set("valor", v)} /></div>
          <div><label style={S.label}>Status</label>
            <select style={S.select} value={form.status} onChange={e => set("status", e.target.value)}>
              {STATUS_OPTIONS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select></div>
        </div>

        {!isPresente && (
          <div style={{ ...S.row2, marginBottom: 14 }}>
            <div><label style={S.label}>Meio de pagamento *</label>
              <select style={S.select} value={form.meio_pagamento} onChange={e => set("meio_pagamento", e.target.value)}>
                <option value="">Selecione…</option>
                {MEIOS_PAGAMENTO.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select></div>
            <div><label style={S.label}>{dateLabel}</label>
              <input style={S.input} type="date" value={form.data} onChange={e => handleDataChange(e.target.value)} /></div>
          </div>
        )}

        {isPresente && (
          <div style={S.formRow}><label style={S.label}>Data</label>
            <input style={S.input} type="date" value={form.data} onChange={e => handleDataChange(e.target.value)} /></div>
        )}

        {/* Parcelas cartão/boleto */}
        {showParcelas && !isPresente && (
          <div style={S.formRow}><label style={S.label}>Nº de parcelas</label>
            <input style={S.input} type="number" min="2" max="60" value={form.parcelas} placeholder="ex: 12" onChange={e => handleParcelasChange(e.target.value)} /></div>
        )}

        {form.status === "parcelado" && !["cartao", "boleto"].includes(form.meio_pagamento) && !isPresente && (
          <div style={{ background: "#FDF3E7", borderRadius: 8, padding: "10px 12px", marginBottom: 14, fontSize: 12, color: "#C8843A" }}>
            💡 Para parcelamento via Pix ou Transferência, use a Recorrência abaixo.
          </div>
        )}

        {isParcelado && !isPresente && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <label style={S.label}>Parcelas do cartão</label>
              <span style={{ fontSize: 12, fontWeight: 700, color: pagas === totalP ? "#5C7A5C" : "#4A6FA5" }}>
                {pagas}/{totalP} pagas · {fmt(valorParcela * pagas)} pago
              </span>
            </div>
            <div style={{ background: "#F0EBE6", borderRadius: 10, overflow: "hidden" }}>
              {form.parcelas_lista.map((p, i) => (
                <div key={i} onClick={() => toggleParcela(i)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", borderBottom: i < form.parcelas_lista.length - 1 ? "1px solid #E8E2DC" : "none", cursor: "pointer", background: p.pago ? "#EAF3EA" : "transparent", transition: "background 0.15s" }}>
                  <div style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${p.pago ? "#5C7A5C" : "#C8C0B8"}`, background: p.pago ? "#5C7A5C" : "white", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.15s" }}>
                    {p.pago && <span style={{ color: "white", fontSize: 13, fontWeight: 800, lineHeight: 1 }}>✓</span>}
                  </div>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: p.pago ? "#5C7A5C" : "#2D2926" }}>Parcela {p.num}/{totalP}</span>
                    <span style={{ fontSize: 11, color: "#9A9490", marginLeft: 8 }}>{fmtDateFull(p.data)}</span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: p.pago ? "#5C7A5C" : "#2D2926" }}>{fmt(valorParcela)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recorrência — só em novos lançamentos */}
        {!initial?.id && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ height: 1, background: "#EDE8E3", margin: "6px 0 14px" }} />
            <label style={S.label}>🔁 Recorrência (opcional)</label>
            <input style={S.input} type="number" min="2" max="36" value={form.recorrencias}
              placeholder="Nº de repetições (ex: 6 para 6 meses)"
              onChange={e => handleRecorrenciasChange(e.target.value)} />
            {isRecorrente && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 11, color: "#9A9490", marginBottom: 8 }}>
                  Ajuste descrição, valor ou data de cada recorrência se necessário:
                </div>
                <div style={{ background: "#F0EBE6", borderRadius: 10, overflow: "hidden" }}>
                  {form.recorrencias_lista.map((r, i) => (
                    <div key={i} style={{ padding: "12px 14px", borderBottom: i < form.recorrencias_lista.length - 1 ? "1px solid #E8E2DC" : "none" }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#9A9490", marginBottom: 8 }}>
                        {i + 1}/{form.recorrencias_lista.length}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <input style={{ ...S.input, fontSize: 12, padding: "7px 10px" }}
                          value={r.descricao}
                          onChange={e => updateRecorrencia(i, "descricao", e.target.value)} />
                        <div style={S.row2}>
                          <CurrencyInput value={r.valor} onChange={v => updateRecorrencia(i, "valor", v)} />
                          <input style={{ ...S.input, fontSize: 12, padding: "7px 10px" }} type="date"
                            value={r.data} onChange={e => updateRecorrencia(i, "data", e.target.value)} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <button style={{ ...S.btnPrimary, opacity: ok ? 1 : 0.5 }} onClick={handleSave}>
          {initial?.id ? "Salvar alterações" : isRecorrente ? `Lançar ${form.recorrencias_lista.length} lançamentos` : "Lançar gasto"}
        </button>
        {initial?.id && (
          <button style={{ ...S.btnPrimary, background: "#4A6FA5", marginTop: 8 }} onClick={handleDuplicar}>
            📋 Duplicar lançamento
          </button>
        )}
        {initial?.id && <button style={S.btnDangerFull} onClick={() => setConfirmDel(true)}>Excluir lançamento</button>}
        <button style={S.btnSecondary} onClick={onClose}>Cancelar</button>
      </div>
      {confirmDel && <ConfirmModal msg={`Excluir "${form.descricao}"?`} onConfirm={() => onDelete(form.id)} onCancel={() => setConfirmDel(false)} />}
    </div>
  );
}

// ─── MODAL ORÇAMENTO ─────────────────────────────────────────────────────────
function ModalOrcamento({ onClose, onSave, onDelete, initial }) {
  const blank = { comodo: "", categoria: "", fornecedor: "", descricao: "", valor: "" };
  const [form, setForm] = useState(initial || blank);
  const [confirmDel, setConfirmDel] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const ok = form.comodo && form.categoria && form.valor;

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modal} onClick={e => e.stopPropagation()}>
        <ModalHandle onClose={onClose} />
        <div style={S.modalTitle}>{initial?.id ? "✏️ Editar orçamento" : "📋 Novo orçamento previsto"}</div>
        <div style={S.formRow}><label style={S.label}>Cômodo *</label>
          <select style={S.select} value={form.comodo} onChange={e => set("comodo", e.target.value)}>
            <option value="">Selecione…</option>
            {COMODOS.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
          </select></div>
        <div style={S.formRow}><label style={S.label}>Categoria *</label>
          <select style={S.select} value={form.categoria} onChange={e => set("categoria", e.target.value)}>
            <option value="">Selecione…</option>
            {CATEGORIAS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select></div>
        <div style={S.formRow}><label style={S.label}>Descrição</label>
          <input style={S.input} value={form.descricao} placeholder="ex: Marcenaria cozinha + sala" onChange={e => set("descricao", e.target.value)} /></div>
        <div style={S.formRow}><label style={S.label}>Fornecedor (opcional)</label>
          <select style={S.select} value={form.fornecedor} onChange={e => set("fornecedor", e.target.value)}>
            <option value="">—</option>
            {FORNECEDORES.map(f => <option key={f} value={f}>{f}</option>)}
          </select></div>
        <div style={S.formRow}><label style={S.label}>Valor previsto (R$) *</label>
          <CurrencyInput value={form.valor} onChange={v => set("valor", v)} /></div>
        <button style={{ ...S.btnPrimary, opacity: ok ? 1 : 0.5 }} onClick={() => ok && onSave({ ...form, valor: parseFloat(form.valor), id: form.id || genId() })}>
          {initial?.id ? "Salvar" : "Adicionar orçamento"}
        </button>
        {initial?.id && <button style={S.btnDangerFull} onClick={() => setConfirmDel(true)}>Excluir orçamento</button>}
        <button style={S.btnSecondary} onClick={onClose}>Cancelar</button>
      </div>
      {confirmDel && <ConfirmModal msg={`Excluir "${form.descricao || "este orçamento"}"?`} onConfirm={() => onDelete(form.id)} onCancel={() => setConfirmDel(false)} />}
    </div>
  );
}

// ─── MODAL FATURA (extrato do mês) ───────────────────────────────────────────
function ModalFatura({ monthKey, mesData, onClose, onSelectGasto }) {
  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modal} onClick={e => e.stopPropagation()}>
        <ModalHandle onClose={onClose} />
        <div style={{ ...S.modalTitle, display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
          <span>📅 {mesFullLabel(monthKey)}</span>
          <span>{fmt(mesData.total)}</span>
        </div>
        <div style={{ background: "#F0EBE6", borderRadius: 10, overflow: "hidden", marginBottom: 16 }}>
          {mesData.items.map((it, i) => {
            const resp = RESPONSAVEIS.find(r => r.id === it.gasto.responsavel);
            const meio = MEIOS_PAGAMENTO.find(m => m.id === it.gasto.meio_pagamento);
            return (
              <div key={i} onClick={() => onSelectGasto(it.gasto)} style={{ padding: "12px 14px", borderBottom: i < mesData.items.length - 1 ? "1px solid #E8E2DC" : "none", cursor: "pointer" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, flex: 1 }}>
                    {it.gasto.descricao}
                    {it.parcelaInfo && <span style={{ fontWeight: 500, color: "#9A9490" }}> · parcela {it.parcelaInfo.num}/{it.parcelaInfo.total}</span>}
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 800, flexShrink: 0 }}>{fmt(it.valor)}</span>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginTop: 6 }}>
                  <StatusBadge status={it.gasto.status} />
                  {resp && <span style={{ fontSize: 11, fontWeight: 700, background: resp.bg, color: resp.color, borderRadius: 99, padding: "2px 9px" }}>{resp.label}{it.gasto.responsavel === "presente" && it.gasto.presenteador ? ` · ${it.gasto.presenteador}` : ""}</span>}
                  {meio && it.gasto.responsavel !== "presente" && <span style={{ fontSize: 11, color: "#7A9490", background: "#FAFAF8", borderRadius: 99, padding: "2px 8px" }}>{meio.label}</span>}
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 4px" }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#9A9490", letterSpacing: "0.05em" }}>TOTAL DO MÊS</span>
          <span style={{ fontWeight: 800, fontSize: 17 }}>{fmt(mesData.total)}</span>
        </div>
        <button style={S.btnSecondary} onClick={onClose}>Fechar</button>
      </div>
    </div>
  );
}

// ─── CARROSSEL DE MESES ──────────────────────────────────────────────────────
const arrowStyle = (disabled) => ({ background: "none", border: "none", fontSize: 16, color: disabled ? "#E0DBD6" : "#7A7470", cursor: disabled ? "default" : "pointer", padding: "8px 4px", flexShrink: 0, lineHeight: 1 });

function GastosPorMes({ data, setData }) {
  const [centerKey, setCenterKey] = useState(currentMonthKey);
  const [faturaKey, setFaturaKey] = useState(null);
  const [editGasto, setEditGasto] = useState(null);
  const touchX = useRef(null);

  // Agrega valores por mês. Parcelas contam individualmente; presentes não entram.
  const mesesData = useMemo(() => {
    const map = {};
    const add = (key, gasto, valor, parcelaInfo) => {
      if (!key) return;
      if (!map[key]) map[key] = { total: 0, items: [] };
      map[key].total += valor;
      map[key].items.push({ gasto, valor, parcelaInfo });
    };
    data.gastos.forEach(g => {
      if (g.responsavel === "presente") return;
      if (g.status === "parcelado" && g.parcelas_lista?.length) {
        const vParc = g.valor / g.parcelas_lista.length;
        g.parcelas_lista.forEach(p => add(monthKeyOf(p.data), g, vParc, { num: p.num, total: g.parcelas_lista.length }));
      } else {
        add(monthKeyOf(g.data), g, g.valor, null);
      }
    });
    return map;
  }, [data]);

  const range = useMemo(() => {
    const keys = Object.keys(mesesData);
    if (keys.length === 0) return [];
    keys.push(currentMonthKey()); // garante o mês atual no range para poder centralizar
    keys.sort();
    return rangeMeses(keys[0], keys[keys.length - 1]);
  }, [mesesData]);

  if (range.length === 0) return null;

  const maxVal = Math.max(...range.map(k => mesesData[k]?.total || 0), 1);
  const curKey = currentMonthKey();

  let centerIdx = range.indexOf(centerKey);
  if (centerIdx === -1) centerIdx = range.indexOf(curKey);
  if (centerIdx === -1) centerIdx = range.length - 1;

  const go = (dir) => {
    const ni = centerIdx + dir;
    if (ni >= 0 && ni < range.length) setCenterKey(range[ni]);
  };

  const onTouchStart = (e) => { touchX.current = e.touches[0].clientX; };
  const onTouchEnd = (e) => {
    if (touchX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
    touchX.current = null;
  };

  const barColor = (key, isCenter) => {
    const isPast = key < curKey;
    if (isCenter) return isPast ? "#7A7470" : "#2D2926";
    return isPast ? "#DAD5D0" : "#D8CBB4";
  };

  const handleBar = (key) => {
    if (!key) return;
    if (mesesData[key]?.items?.length) setFaturaKey(key);
    else setCenterKey(key);
  };

  const saveGasto = (item) => {
    setData(d => ({ ...d, gastos: d.gastos.find(g => g.id === item.id) ? d.gastos.map(g => g.id === item.id ? item : g) : [...d.gastos, item] }));
    setEditGasto(null);
  };
  const delGasto = (id) => { setData(d => ({ ...d, gastos: d.gastos.filter(g => g.id !== id) })); setEditGasto(null); };

  const slots = [centerIdx - 1, centerIdx, centerIdx + 1];
  const MAXBAR = 96;

  return (
    <div style={S.card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ ...S.cardTitle, marginBottom: 0 }}>Gastos por mês</div>
        {range[centerIdx] !== curKey && range.includes(curKey) && (
          <button onClick={() => setCenterKey(curKey)} style={{ background: "#F0EBE6", border: "none", borderRadius: 99, padding: "4px 12px", fontSize: 11, fontWeight: 700, color: "#7A6A50", cursor: "pointer" }}>
            ← Voltar ao mês atual
          </button>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 2 }}>
        <button onClick={() => go(-1)} disabled={centerIdx <= 0} style={arrowStyle(centerIdx <= 0)}>◀</button>
        <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} style={{ flex: 1, display: "flex", alignItems: "flex-end", justifyContent: "space-around", gap: 6, touchAction: "pan-y" }}>
          {slots.map((idx, si) => {
            const key = range[idx];
            const isCenter = si === 1;
            if (!key) return <div key={si} style={{ flex: 1 }} />;
            const total = mesesData[key]?.total || 0;
            const h = total > 0 ? Math.max(6, (total / maxVal) * MAXBAR) : 4;
            return (
              <div key={si} onClick={() => handleBar(key)} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", cursor: "pointer" }}>
                <div style={{ height: MAXBAR, display: "flex", alignItems: "flex-end", width: "100%", justifyContent: "center" }}>
                  <div style={{ width: isCenter ? "72%" : "54%", height: h, background: barColor(key, isCenter), borderRadius: "6px 6px 0 0", transition: "height 0.3s ease, background 0.2s", opacity: total > 0 ? 1 : 0.5 }} />
                </div>
                <div style={{ marginTop: 8, fontSize: isCenter ? 13 : 12, fontWeight: isCenter ? 800 : 600, color: isCenter ? "#2D2926" : "#9A9490" }}>{mesAbrev(key)}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: isCenter ? "#2D2926" : "#B0A9A2", marginTop: 2 }}>{fmtCompact(total)}</div>
              </div>
            );
          })}
        </div>
        <button onClick={() => go(1)} disabled={centerIdx >= range.length - 1} style={arrowStyle(centerIdx >= range.length - 1)}>▶</button>
      </div>
      {faturaKey && mesesData[faturaKey] && (
        <ModalFatura monthKey={faturaKey} mesData={mesesData[faturaKey]}
          onClose={() => setFaturaKey(null)}
          onSelectGasto={(g) => { setFaturaKey(null); setEditGasto(g); }} />
      )}
      {editGasto && (
        <ModalGasto initial={editGasto} onClose={() => setEditGasto(null)} onSave={saveGasto} onDelete={delGasto} />
      )}
    </div>
  );
}

// ─── DASHBOARD ───────────────────────────────────────────────────────────────
function Dashboard({ data, setData }) {
  const totalOrc = data.orcamentos.reduce((s, o) => s + o.valor, 0);
  const totalGasto = data.gastos.filter(g => g.responsavel !== "presente").reduce((s, g) => s + g.valor, 0);
  const totalPago = data.gastos.reduce((s, g) => s + valorPago(g), 0);
  const totalPendente = data.gastos.reduce((s, g) => s + valorPendente(g), 0);
  const totalPresentes = data.gastos.filter(g => g.responsavel === "presente").reduce((s, g) => s + g.valor, 0);
  const over = totalGasto > totalOrc && totalOrc > 0;

  // Por responsável — total, pago e pendente
  const statsVictor = {
    total: data.gastos.filter(g => g.responsavel === "victor").reduce((s, g) => s + g.valor, 0),
    pago: data.gastos.filter(g => g.responsavel === "victor").reduce((s, g) => s + valorPago(g), 0),
    pendente: data.gastos.filter(g => g.responsavel === "victor").reduce((s, g) => s + valorPendente(g), 0),
  };
  const statsCarol = {
    total: data.gastos.filter(g => g.responsavel === "carol").reduce((s, g) => s + g.valor, 0),
    pago: data.gastos.filter(g => g.responsavel === "carol").reduce((s, g) => s + valorPago(g), 0),
    pendente: data.gastos.filter(g => g.responsavel === "carol").reduce((s, g) => s + valorPendente(g), 0),
  };

  const comodoStats = COMODOS.map(c => ({
    ...c,
    orc: data.orcamentos.filter(o => o.comodo === c.id).reduce((s, o) => s + o.valor, 0),
    gasto: data.gastos.filter(g => g.comodo === c.id && g.responsavel !== "presente").reduce((s, g) => s + g.valor, 0),
    pago: data.gastos.filter(g => g.comodo === c.id).reduce((s, g) => s + valorPago(g), 0),
  })).filter(c => c.orc > 0 || c.gasto > 0);

  if (totalOrc === 0 && totalGasto === 0 && totalPresentes === 0) return (
    <div style={{ ...S.card, textAlign: "center", padding: "48px 20px" }}>
      <div style={{ fontSize: 40, marginBottom: 14 }}>🏗️</div>
      <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Bem-vindos à reforma, Carol e Victor!</div>
      <div style={{ color: "#9A9490", fontSize: 13 }}>Comecem pela aba <strong>Orçamento</strong> para cadastrar os valores previstos.</div>
    </div>
  );

  return (
    <div>
      <div style={{ ...S.row2, alignItems: "stretch" }}>
        <div style={{ ...S.card, borderTop: "3px solid #C8A882", marginBottom: 0, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div style={S.cardTitle}>Orçamento</div>
          <div>
            <div style={S.bigNum}>{fmt(totalOrc)}</div>
            <div style={S.bigNumSub}>total previsto</div>
          </div>
        </div>
        <div style={{ ...S.card, borderTop: `3px solid ${over ? "#C0392B" : "#C8A882"}`, marginBottom: 0, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div style={S.cardTitle}>Comprometido</div>
          <div>
            <div style={{ ...S.bigNum, color: over ? "#C0392B" : "#2D2926" }}>{fmt(totalGasto)}</div>
            <div style={S.bigNumSub}>{pct(totalGasto, totalOrc).toFixed(0)}% do orçamento</div>
          </div>
        </div>
      </div>
      <div style={{ height: 12 }} />
      <div style={{ ...S.row2, alignItems: "stretch" }}>
        <div style={{ ...S.card, borderTop: "3px solid #5C7A5C", marginBottom: 0, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div style={S.cardTitle}>Já pago</div>
          <div>
            <div style={{ ...S.bigNum, color: "#5C7A5C" }}>{fmt(totalPago)}</div>
            <div style={S.bigNumSub}>à vista + parcelas pagas</div>
          </div>
        </div>
        <div style={{ ...S.card, borderTop: "3px solid #C8843A", marginBottom: 0, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div style={S.cardTitle}>A pagar</div>
          <div>
            <div style={{ ...S.bigNum, color: "#C8843A" }}>{fmt(totalPendente)}</div>
            <div style={S.bigNumSub}>pendente + parcelas restantes</div>
          </div>
        </div>
      </div>
      <div style={{ height: 16 }} />

      {totalOrc > 0 && (
        <div style={S.card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <div style={S.cardTitle}>Progresso geral</div>
            <span style={{ fontSize: 11, fontWeight: 700, color: over ? "#C0392B" : "#5C7A5C" }}>
              {over ? `⚠️ ${fmt(totalGasto - totalOrc)} acima do orçamento` : `${fmt(totalOrc - totalGasto)} disponível`}
            </span>
          </div>
          <ProgressBar value={totalGasto} total={totalOrc} label="gasto" />
        </div>
      )}

      {(statsVictor.total > 0 || statsCarol.total > 0 || totalPresentes > 0) && (
        <div style={S.card}>
          <div style={S.cardTitle}>Por responsável</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {statsVictor.total > 0 && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#4A6FA5" }}>👤 Victor</span>
                  <span style={{ fontSize: 14, fontWeight: 800 }}>{fmt(statsVictor.total)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#9A9490" }}>
                  <span style={{ color: "#5C7A5C" }}>✓ {fmt(statsVictor.pago)} pago</span>
                  {statsVictor.pendente > 0 && <span style={{ color: "#C8843A" }}>⏳ {fmt(statsVictor.pendente)} pendente</span>}
                </div>
              </div>
            )}
            {statsCarol.total > 0 && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#9B6FA5" }}>👤 Carol</span>
                  <span style={{ fontSize: 14, fontWeight: 800 }}>{fmt(statsCarol.total)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#9A9490" }}>
                  <span style={{ color: "#5C7A5C" }}>✓ {fmt(statsCarol.pago)} pago</span>
                  {statsCarol.pendente > 0 && <span style={{ color: "#C8843A" }}>⏳ {fmt(statsCarol.pendente)} pendente</span>}
                </div>
              </div>
            )}
            {totalPresentes > 0 && (
              <div style={{ paddingTop: 10, borderTop: "1px solid #EDE8E3" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#5C7A5C" }}>🎁 Presentes</span>
                  <span style={{ fontSize: 14, fontWeight: 800, color: "#5C7A5C" }}>{fmt(totalPresentes)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <GastosPorMes data={data} setData={setData} />

      {comodoStats.length > 0 && (
        <>
          <div style={S.sectionTitle}>Por cômodo</div>
          {comodoStats.map(c => (
            <div key={c.id} style={S.card}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 18 }}>{c.emoji}</span>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>{c.label}</span>
                </div>
                <span style={{ fontSize: 12, color: "#9A9490" }}>de {fmt(c.orc)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                <span style={{ fontSize: 20, fontWeight: 800 }}>{fmt(c.gasto)}</span>
                <span style={{ fontSize: 12, color: "#5C7A5C", fontWeight: 600, alignSelf: "flex-end" }}>✓ {fmt(c.pago)} pago</span>
              </div>
              <ProgressBar value={c.gasto} total={c.orc} />
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// ─── ABA ORÇAMENTO ───────────────────────────────────────────────────────────
function AbaOrcamento({ data, setData, onLancarGasto }) {
  const [modal, setModal] = useState(null);
  const save = (item) => { setData(d => ({ ...d, orcamentos: d.orcamentos.find(o => o.id === item.id) ? d.orcamentos.map(o => o.id === item.id ? item : o) : [...d.orcamentos, item] })); setModal(null); };
  const del = (id) => { setData(d => ({ ...d, orcamentos: d.orcamentos.filter(o => o.id !== id) })); setModal(null); };
  const total = data.orcamentos.reduce((s, o) => s + o.valor, 0);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <div style={S.sectionTitle}>Orçamento previsto</div>
          <div style={{ fontSize: 12, color: "#9A9490", marginTop: -10 }}>Total: <strong style={{ color: "#2D2926" }}>{fmt(total)}</strong></div>
        </div>
        <button style={{ ...S.btnPrimary, width: "auto", marginTop: 0, padding: "10px 16px", borderRadius: 10 }} onClick={() => setModal("new")}>＋ Adicionar</button>
      </div>
      {data.orcamentos.length === 0 ? (
        <div style={{ ...S.card, textAlign: "center", padding: "36px 16px", color: "#9A9490" }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>📋</div>
          <div>Nenhum orçamento ainda.</div>
        </div>
      ) : data.orcamentos.map(o => {
        const comodo = COMODOS.find(c => c.id === o.comodo);
        const gastoRelacionado = data.gastos.filter(g => g.comodo === o.comodo && g.categoria === o.categoria && g.responsavel !== "presente").reduce((s, g) => s + g.valor, 0);
        const p = pct(gastoRelacionado, o.valor);
        const over = gastoRelacionado > o.valor;
        return (
          <div key={o.id} style={{ ...S.itemCard, borderLeft: "3px solid #C8A882" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", cursor: "pointer" }} onClick={() => setModal(o)}>
              <div style={{ flex: 1, marginRight: 10 }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 5 }}>{o.descricao || "—"}</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <span style={{ fontSize: 11, color: "#9A9490" }}>{comodo?.emoji} {comodo?.label}</span>
                  <CatDot catId={o.categoria} />
                  {o.fornecedor && <span style={{ fontSize: 11, color: "#9A9490" }}>· {o.fornecedor}</span>}
                </div>
              </div>
              <span style={{ fontWeight: 800, fontSize: 15, flexShrink: 0 }}>{fmt(o.valor)}</span>
            </div>
            <div style={{ marginTop: 10 }}>
              <div style={S.progressWrap}><div style={S.progressFill(p, over)} /></div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
                <span style={{ fontSize: 11, color: over ? "#C0392B" : "#9A9490" }}>{gastoRelacionado > 0 ? `${fmt(gastoRelacionado)} lançado` : "Nenhum lançamento ainda"}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: over ? "#C0392B" : "#9A9490" }}>{p.toFixed(0)}%</span>
              </div>
            </div>
            <button style={{ marginTop: 10, width: "100%", background: "#F0EBE6", border: "1.5px dashed #C8A882", borderRadius: 8, padding: "8px 0", fontSize: 12, fontWeight: 700, color: "#7A6A50", cursor: "pointer" }}
              onClick={() => onLancarGasto({ comodo: o.comodo, categoria: o.categoria, fornecedor: o.fornecedor || "Loja", descricao: o.descricao || "" })}>
              ➕ Lançar gasto deste orçamento
            </button>
          </div>
        );
      })}
      {data.orcamentos.length > 0 && (
        <div style={{ ...S.card, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#9A9490", letterSpacing: "0.05em" }}>TOTAL PREVISTO</span>
          <span style={{ fontWeight: 800, fontSize: 17 }}>{fmt(total)}</span>
        </div>
      )}
      {modal && <ModalOrcamento onClose={() => setModal(null)} onSave={save} onDelete={del} initial={modal === "new" ? null : modal} />}
    </div>
  );
}

// ─── ABA GASTOS ──────────────────────────────────────────────────────────────
function AbaGastos({ data, setData, gastoInicial, onClearGastoInicial }) {
  const [modal, setModal] = useState(null);
  const [filtro, setFiltro] = useState({ comodo: "", status: "", responsavel: "" });
  const setF = (k, v) => setFiltro(f => ({ ...f, [k]: v }));
  const [prevInicial, setPrevInicial] = useState(null);

  if (gastoInicial && gastoInicial !== prevInicial) {
    setPrevInicial(gastoInicial);
    setTimeout(() => { setModal({ ...gastoInicial, _prefill: true }); onClearGastoInicial(); }, 50);
  }

  const save = (item) => {
    if (Array.isArray(item)) {
      // Recorrência: salva múltiplos lançamentos de uma vez
      setData(d => ({ ...d, gastos: [...d.gastos, ...item] }));
    } else {
      setData(d => ({ ...d, gastos: d.gastos.find(g => g.id === item.id) ? d.gastos.map(g => g.id === item.id ? item : g) : [...d.gastos, item] }));
    }
    setModal(null);
  };
  const del = (id) => { setData(d => ({ ...d, gastos: d.gastos.filter(g => g.id !== id) })); setModal(null); };

  const lista = data.gastos.filter(g => {
    if (filtro.comodo && g.comodo !== filtro.comodo) return false;
    if (filtro.status && g.status !== filtro.status) return false;
    if (filtro.responsavel && g.responsavel !== filtro.responsavel) return false;
    return true;
  }).sort((a, b) => (b.data || "").localeCompare(a.data || ""));

  const totalLista = lista.reduce((s, g) => s + g.valor, 0);
  const statusColors = { pago: "#5C7A5C", pendente: "#C8843A", parcelado: "#4A6FA5" };
  const temFiltro = filtro.comodo || filtro.status || filtro.responsavel;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div>
          <div style={S.sectionTitle}>Gastos</div>
          <div style={{ fontSize: 12, color: "#9A9490", marginTop: -10 }}>{lista.length} lançamentos · <strong style={{ color: "#2D2926" }}>{fmt(totalLista)}</strong></div>
        </div>
        <button style={{ ...S.btnPrimary, width: "auto", marginTop: 0, padding: "10px 16px", borderRadius: 10 }} onClick={() => setModal("new")}>➕ Lançar</button>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        <select style={{ ...S.select, width: "auto", fontSize: 12, padding: "8px 10px", flex: 1 }} value={filtro.comodo} onChange={e => setF("comodo", e.target.value)}>
          <option value="">Todos cômodos</option>
          {COMODOS.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
        </select>
        <select style={{ ...S.select, width: "auto", fontSize: 12, padding: "8px 10px", flex: 1 }} value={filtro.status} onChange={e => setF("status", e.target.value)}>
          <option value="">Todos status</option>
          {STATUS_OPTIONS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
        <select style={{ ...S.select, width: "auto", fontSize: 12, padding: "8px 10px", flex: 1 }} value={filtro.responsavel} onChange={e => setF("responsavel", e.target.value)}>
          <option value="">Todos</option>
          {RESPONSAVEIS.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
        </select>
        {temFiltro && (
          <button style={{ ...S.btnSecondary, width: "auto", marginTop: 0, padding: "8px 12px", fontSize: 12 }} onClick={() => setFiltro({ comodo: "", status: "", responsavel: "" })}>✕</button>
        )}
      </div>

      {lista.length === 0 ? (
        <div style={{ ...S.card, textAlign: "center", padding: "36px 16px", color: "#9A9490" }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>🧾</div>
          <div>{data.gastos.length === 0 ? "Nenhum gasto ainda." : "Sem resultados."}</div>
        </div>
      ) : lista.map(g => {
        const comodo = COMODOS.find(c => c.id === g.comodo);
        const meio = MEIOS_PAGAMENTO.find(m => m.id === g.meio_pagamento);
        const resp = RESPONSAVEIS.find(r => r.id === g.responsavel);
        const pagas = g.parcelas_lista?.filter(p => p.pago).length || 0;
        const totalP = g.parcelas_lista?.length || 0;
        const isParcelado = g.status === "parcelado" && totalP > 0;

        return (
          <div key={g.id} style={{ ...S.itemCard, borderLeft: `3px solid ${statusColors[g.status] || "#C8A882"}`, cursor: "pointer" }} onClick={() => setModal(g)}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ flex: 1, marginRight: 10 }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 5 }}>{g.descricao}</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <span style={{ fontSize: 11, color: "#9A9490" }}>{comodo?.emoji} {comodo?.label}</span>
                  <CatDot catId={g.categoria} />
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6, flexWrap: "wrap" }}>
                  <StatusBadge status={g.status} />
                  {resp && <span style={{ fontSize: 11, fontWeight: 700, background: resp.bg, color: resp.color, borderRadius: 99, padding: "2px 9px" }}>{resp.label}{g.responsavel === "presente" && g.presenteador ? ` · ${g.presenteador}` : ""}</span>}
                  {meio && g.responsavel !== "presente" && <span style={{ fontSize: 11, color: "#7A9490", background: "#F0EBE6", borderRadius: 99, padding: "2px 8px" }}>{meio.label}</span>}
                  {g.data && <span style={{ fontSize: 11, color: "#7A7470", background: "#F0EBE6", borderRadius: 99, padding: "2px 8px" }}>{fmtDateFull(g.data)}</span>}
                  {isParcelado && <span style={{ fontSize: 11, fontWeight: 700, color: pagas === totalP ? "#5C7A5C" : "#4A6FA5" }}>{pagas}/{totalP} pagas</span>}
                  {g.loja && g.loja !== "—" && <span style={{ fontSize: 11, color: "#B0A9A0" }}>· {g.loja}</span>}
                </div>
                {isParcelado && (
                  <div style={{ ...S.progressWrap, marginTop: 8, height: 5 }}>
                    <div style={{ ...S.progressFill(pct(pagas, totalP), false), background: pagas === totalP ? "#5C7A5C" : "#4A6FA5" }} />
                  </div>
                )}
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 15 }}>{fmt(g.valor)}</div>
                {isParcelado && <div style={{ fontSize: 11, color: "#5C7A5C", marginTop: 2 }}>✓ {fmt(valorPago(g))}</div>}
              </div>
            </div>
          </div>
        );
      })}

      {lista.length > 0 && (
        <div style={{ ...S.card, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#9A9490", letterSpacing: "0.05em" }}>TOTAL</span>
          <span style={{ fontWeight: 800, fontSize: 17 }}>{fmt(totalLista)}</span>
        </div>
      )}
      {modal && <ModalGasto onClose={() => setModal(null)} onSave={save} onDelete={del} initial={modal === "new" ? null : modal} />}
    </div>
  );
}

// ─── ABA COMPARATIVO ─────────────────────────────────────────────────────────
function AbaComparativo({ data }) {
  const rows = useMemo(() => {
    const result = [];
    COMODOS.forEach(com => {
      CATEGORIAS.forEach(cat => {
        const orc = data.orcamentos.filter(o => o.comodo === com.id && o.categoria === cat.id).reduce((s, o) => s + o.valor, 0);
        const gasto = data.gastos.filter(g => g.comodo === com.id && g.categoria === cat.id && g.responsavel !== "presente").reduce((s, g) => s + g.valor, 0);
        if (orc > 0 || gasto > 0) result.push({ comodo: com, cat, orc, gasto });
      });
    });
    return result;
  }, [data]);

  const totOrc = rows.reduce((s, r) => s + r.orc, 0);
  const totGasto = rows.reduce((s, r) => s + r.gasto, 0);

  return (
    <div>
      <div style={S.sectionTitle}>Previsto × Realizado</div>
      {rows.length === 0 ? (
        <div style={{ ...S.card, textAlign: "center", padding: "36px 16px", color: "#9A9490" }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>📊</div>
          <div>Adicione orçamentos e gastos para ver o comparativo.</div>
        </div>
      ) : (
        <>
          {rows.map((r, i) => {
            const over = r.gasto > r.orc && r.orc > 0;
            const diff = r.orc - r.gasto;
            return (
              <div key={i} style={S.card}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{r.comodo.emoji} {r.comodo.label}</div>
                    <CatDot catId={r.cat.id} />
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 800, fontSize: 15 }}>{fmt(r.gasto)}</div>
                    <div style={{ fontSize: 11, color: "#9A9490" }}>de {fmt(r.orc)}</div>
                  </div>
                </div>
                {r.orc > 0 && <ProgressBar value={r.gasto} total={r.orc} />}
                {r.orc > 0 && (
                  <div style={{ marginTop: 6, fontSize: 12, fontWeight: 700, color: over ? "#C0392B" : "#5C7A5C" }}>
                    {over ? `⚠️ Estouro de ${fmt(Math.abs(diff))}` : `${fmt(diff)} restante`}
                  </div>
                )}
              </div>
            );
          })}
          <div style={{ ...S.card, display: "flex", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#9A9490", letterSpacing: "0.05em" }}>TOTAL PREVISTO</div>
              <div style={{ fontWeight: 800, fontSize: 17 }}>{fmt(totOrc)}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#9A9490", letterSpacing: "0.05em" }}>TOTAL GASTO</div>
              <div style={{ fontWeight: 800, fontSize: 17, color: totGasto > totOrc ? "#C0392B" : "#2D2926" }}>{fmt(totGasto)}</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── APP ROOT ────────────────────────────────────────────────────────────────
export default function App() {
  const [aba, setAba] = useState("dashboard");
  const [data, setData] = useState(defaultData);
  const [synced, setSynced] = useState(false);
  const [saving, setSaving] = useState(false);
  const [gastoInicial, setGastoInicial] = useState(null);

  useEffect(() => {
    const unsub = onSnapshot(DOC_REF, (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        setData({ orcamentos: d.orcamentos || [], gastos: d.gastos || [] });
      }
      setSynced(true);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!synced) return;
    setSaving(true);
    const t = setTimeout(async () => {
      try { await setDoc(DOC_REF, data); } catch (e) { console.error(e); }
      setSaving(false);
    }, 600);
    return () => clearTimeout(t);
  }, [data, synced]);

  const handleLancarGasto = (prefill) => {
    setGastoInicial(prefill);
    setAba("gastos");
  };

  const abas = [
    { id: "dashboard", label: "📊 Visão geral" },
    { id: "orcamento", label: "📋 Orçamento" },
    { id: "gastos", label: "🧾 Gastos" },
    { id: "comparativo", label: "⚖️ Comparativo" },
  ];

  return (
    <div style={S.app}>
      <header style={S.header}>
        <div style={S.headerLeft}>
          <div style={S.headerDot} />
          <div>
            <div style={S.headerTitle}>Reforma Carol & Victor</div>
            <div style={S.headerSub}>
              <span style={S.syncDot(!saving && synced)} />
              {saving ? "Salvando…" : synced ? "Sincronizado" : "Conectando…"}
            </div>
          </div>
        </div>
      </header>
      <nav style={S.navWrap}>
        {abas.map(a => <button key={a.id} style={S.navBtn(aba === a.id)} onClick={() => setAba(a.id)}>{a.label}</button>)}
      </nav>
      <main style={S.main}>
        {!synced && (
          <div style={{ ...S.card, textAlign: "center", padding: 32, color: "#9A9490" }}>
            Conectando ao banco de dados…
          </div>
        )}
        {synced && aba === "dashboard" && <Dashboard data={data} setData={setData} />}
        {synced && aba === "orcamento" && <AbaOrcamento data={data} setData={setData} onLancarGasto={handleLancarGasto} />}
        {synced && aba === "gastos" && <AbaGastos data={data} setData={setData} gastoInicial={gastoInicial} onClearGastoInicial={() => setGastoInicial(null)} />}
        {synced && aba === "comparativo" && <AbaComparativo data={data} />}
      </main>
    </div>
  );
}