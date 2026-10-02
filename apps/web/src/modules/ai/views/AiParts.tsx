import { Fragment, useMemo, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  Button,
  Card,
  EmptyState,
  Icon,
  Skeleton,
  StatusBadge,
  type IconName,
} from '../../../core/ui';
import { formatDateTime } from '../../../core/js/format';
import { parseMarkdown, type Inline } from '../js/markdown';
import type {
  AiDraft,
  AiInsights,
  ChatMessage,
  ConversationSummary,
  ToolCall,
} from '../js/ai.service';
import styles from '../css/ai.module.css';

/** Piezas de presentación compartidas por las pantallas de AImargen AI. */

// ------------------------------------------------------------------ Markdown seguro
function renderInline(nodes: Inline[]): ReactNode {
  return nodes.map((n, i) => {
    switch (n.t) {
      case 'text':
        return <Fragment key={i}>{n.v}</Fragment>;
      case 'strong':
        return <strong key={i}>{renderInline(n.children)}</strong>;
      case 'em':
        return <em key={i}>{renderInline(n.children)}</em>;
      case 'code':
        return (
          <code key={i} className={styles.code}>
            {n.v}
          </code>
        );
    }
  });
}

export function Markdown({ text }: { text: string }) {
  const blocks = useMemo(() => parseMarkdown(text), [text]);
  return (
    <div className={styles.markdown}>
      {blocks.map((b, i) => {
        if (b.type === 'h')
          return (
            <p key={i} className={styles.mdHeading}>
              {renderInline(b.inline)}
            </p>
          );
        if (b.type === 'ul')
          return (
            <ul key={i}>
              {b.items.map((it, j) => (
                <li key={j}>{renderInline(it)}</li>
              ))}
            </ul>
          );
        if (b.type === 'ol')
          return (
            <ol key={i} start={b.start}>
              {b.items.map((it, j) => (
                <li key={j}>{renderInline(it)}</li>
              ))}
            </ol>
          );
        return (
          <p key={i}>
            {b.lines.map((l, j) => (
              <Fragment key={j}>
                {j > 0 && <br />}
                {renderInline(l)}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}

// ------------------------------------------------------------------ Mensajes
const TOOL_LABELS: Record<string, string> = {
  get_tenant_summary: 'Resumen del negocio',
  search_ingredients: 'Ingredientes',
  get_ingredient: 'Detalle de ingrediente',
  get_ingredient_price_history: 'Historial de precios',
  search_products: 'Productos',
  get_product: 'Detalle de producto',
  get_product_cost_breakdown: 'Desglose de costo',
  get_product_margin: 'Margen del producto',
  get_purchase_history: 'Compras',
  get_supplier_history: 'Proveedores',
  get_scenario: 'Escenario',
  calculate_break_even: 'Punto de equilibrio',
  simulate_scenario: 'Simulación',
  compare_margin_options: 'Opciones de margen',
  list_low_margin_products: 'Productos con margen bajo',
  draft_recipe: 'Borrador de receta',
  create_scenario: 'Borrador de escenario',
};

function ToolCalls({ calls }: { calls: ToolCall[] }) {
  if (!calls.length) return null;
  return (
    <div className={styles.tools}>
      <span className={styles.toolsLabel}>Consultó sus datos:</span>
      <ul className={styles.toolList}>
        {calls.map((c, i) => (
          <li key={i} className={`${styles.tool} ${c.status !== 'ok' ? styles.toolFailed : ''}`}>
            <Icon name={c.status === 'ok' ? 'check' : 'alert'} size={14} />
            {TOOL_LABELS[c.name] ?? c.name}
            {c.status === 'denied' && ' (sin permiso)'}
            {c.status === 'error' && ' (no disponible)'}
          </li>
        ))}
      </ul>
    </div>
  );
}

const DRAFT_KIND: Record<string, { label: string; icon: IconName }> = {
  recipe: { label: 'Borrador de receta', icon: 'products' },
  purchase: { label: 'Borrador de compra', icon: 'purchases' },
  scenario: { label: 'Borrador de escenario', icon: 'scenarios' },
};

export function DraftStatusBadge({ draft }: { draft: Pick<AiDraft, 'status' | 'expired'> }) {
  if (draft.status === 'confirmed') return <StatusBadge tone="positive">Confirmado</StatusBadge>;
  if (draft.status === 'discarded') return <StatusBadge tone="neutral">Descartado</StatusBadge>;
  if (draft.expired) return <StatusBadge tone="warning">Vencido</StatusBadge>;
  return <StatusBadge tone="info">Pendiente de confirmar</StatusBadge>;
}

export function DraftCard({ draft }: { draft: AiDraft }) {
  const navigate = useNavigate();
  const kind = DRAFT_KIND[draft.kind] ?? { label: 'Borrador', icon: 'file' as IconName };
  const name = typeof draft.payload.name === 'string' ? draft.payload.name : null;
  const pending = draft.status === 'pending' && !draft.expired;
  return (
    <div className={styles.draftCard}>
      <span className={styles.draftIcon}>
        <Icon name={kind.icon} size={20} />
      </span>
      <div className={styles.draftMain}>
        <span className={styles.draftKind}>{kind.label}</span>
        {name && <span className={styles.draftName}>{name}</span>}
        <DraftStatusBadge draft={draft} />
      </div>
      <Button
        variant={pending ? 'primary' : 'secondary'}
        onClick={() => navigate(`/app/ai/drafts/${draft.uuid}`)}
      >
        {pending ? 'Revisar y confirmar' : 'Ver'}
      </Button>
    </div>
  );
}

export function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  return (
    <li className={`${styles.msg} ${isUser ? styles.msgUser : styles.msgAssistant}`}>
      <span className="srOnly">{isUser ? 'Usted dijo:' : 'AImargen AI respondió:'}</span>
      <div className={`${styles.bubble} ${isUser ? styles.bubbleUser : styles.bubbleAssistant}`}>
        {isUser ? (
          <p className={styles.userText}>{message.text}</p>
        ) : (
          <Markdown text={message.text} />
        )}
      </div>
      {!isUser && message.toolCalls && <ToolCalls calls={message.toolCalls} />}
      {!isUser && message.unverified.length > 0 && (
        <p className={styles.unverified}>
          <Icon name="alert" size={16} />
          <span>
            Verifique {message.unverified.length === 1 ? 'esta cifra' : 'estas cifras'}; no salen
            directamente de sus datos: <strong>{message.unverified.join(', ')}</strong>
          </span>
        </p>
      )}
      {message.drafts.map((d) => (
        <DraftCard key={d.uuid} draft={d} />
      ))}
    </li>
  );
}

export function TypingIndicator() {
  return (
    <li className={`${styles.msg} ${styles.msgAssistant}`} aria-live="polite">
      <div className={`${styles.bubble} ${styles.bubbleAssistant} ${styles.typing}`}>
        <span className={styles.dot} />
        <span className={styles.dot} />
        <span className={styles.dot} />
        <span className="srOnly">AImargen AI está consultando sus datos…</span>
      </div>
    </li>
  );
}

// ------------------------------------------------------------------ Historial
export function HistoryList({
  items,
  loading,
  activeUuid,
  onPick,
}: {
  items: ConversationSummary[];
  loading: boolean;
  activeUuid?: string;
  onPick?: () => void;
}) {
  if (loading) {
    return (
      <div className={styles.historySkeleton}>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} height={40} />
        ))}
      </div>
    );
  }
  if (!items.length) {
    return <p className={styles.historyEmpty}>Sus conversaciones aparecerán aquí.</p>;
  }
  return (
    <ul className={styles.history} aria-label="Conversaciones anteriores">
      {items.map((c) => (
        <li key={c.uuid}>
          <Link
            to={`/app/ai/conversations/${c.uuid}`}
            className={`${styles.historyLink} ${c.uuid === activeUuid ? styles.historyActive : ''}`}
            aria-current={c.uuid === activeUuid ? 'page' : undefined}
            onClick={onPick}
          >
            <span className={styles.historyTitle}>{c.title}</span>
            <span className={styles.historyDate}>{formatDateTime(c.updatedAt)}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

// ------------------------------------------------------------------ Insights
export function InsightsCard({
  data,
  loading,
  error,
}: {
  data: AiInsights | undefined;
  loading: boolean;
  error: string | null;
}) {
  const insights = data?.insights ?? [];
  const alerts = (data?.alerts ?? []).filter((a) => a.severity !== 'info').slice(0, 3);
  return (
    <Card title="Análisis de su negocio">
      {loading ? (
        <div className={styles.historySkeleton}>
          <Skeleton width="80%" />
          <Skeleton width="65%" />
        </div>
      ) : error ? (
        <p className={styles.muted}>No se pudo cargar el análisis: {error}</p>
      ) : insights.length === 0 && alerts.length === 0 ? (
        <p className={styles.muted}>
          Todo en orden por ahora. Cuando registre compras y recetas, aquí verá cambios de costos y
          productos que conviene revisar.
        </p>
      ) : (
        <ul className={styles.insights}>
          {insights.map((i, n) => (
            <li key={`i${n}`} className={styles.insight}>
              <Icon name={i.code === 'COST_INCREASE' ? 'trendUp' : 'pulse'} size={18} />
              {i.link ? <Link to={i.link}>{i.text}</Link> : <span>{i.text}</span>}
            </li>
          ))}
          {alerts.map((a, n) => (
            <li key={`a${n}`} className={styles.insight}>
              <StatusBadge tone={a.severity === 'danger' ? 'danger' : 'warning'}>
                {a.severity === 'danger' ? 'Urgente' : 'Revisar'}
              </StatusBadge>
              {a.link ? <Link to={a.link}>{a.title}</Link> : <span>{a.title}</span>}
            </li>
          ))}
        </ul>
      )}
      <p className={styles.footnote}>Cifras calculadas por AImargen con sus datos reales.</p>
    </Card>
  );
}

// ------------------------------------------------------------------ IA desactivada
export function AiDisabledState({
  isAdmin,
  reason,
}: {
  isAdmin: boolean;
  reason?: 'feature' | 'limit';
}) {
  const navigate = useNavigate();
  if (reason === 'feature') {
    return (
      <EmptyState
        icon="lock"
        title="Esta función no está habilitada"
        description="Su plan o la configuración de su negocio no incluye esta función de IA. Puede seguir registrando todo de forma manual."
        action={
          <Button variant="secondary" onClick={() => navigate('/app')}>
            Ir al inicio
          </Button>
        }
      />
    );
  }
  if (reason === 'limit') {
    return (
      <EmptyState
        icon="ai"
        title="Llegó al límite de consultas del mes"
        description="El asistente vuelve a estar disponible el próximo mes. El resto de AImargen funciona normalmente."
        action={
          <Button variant="secondary" onClick={() => navigate('/app')}>
            Ir al inicio
          </Button>
        }
      />
    );
  }
  return (
    <EmptyState
      icon="ai"
      title={
        isAdmin ? 'La IA no está activada en este servidor' : 'El asistente no está disponible'
      }
      description={
        isAdmin
          ? 'Para usar AImargen AI, quien administra la plataforma debe configurar un proveedor de IA. Todo lo demás de AImargen funciona con normalidad.'
          : 'Por ahora no puede usar AImargen AI. Todo lo demás de AImargen funciona con normalidad; consulte con el dueño del negocio.'
      }
      action={
        <Button variant="secondary" icon="products" onClick={() => navigate('/app/products')}>
          Ver mis productos
        </Button>
      }
    />
  );
}

export function SafetyNote() {
  return (
    <p className={styles.safety}>
      <Icon name="shield" size={18} />
      <span>
        <strong>La IA propone; usted confirma.</strong> Nada se guarda sin su confirmación.
      </span>
    </p>
  );
}
