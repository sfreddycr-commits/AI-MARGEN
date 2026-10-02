import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { Button, Icon, Notice, Sheet, Skeleton } from '../../../core/ui';
import { Page } from '../../../core/shell/views/Page';
import { errorMessage } from '../../../core/js/api-client';
import {
  STARTER_QUESTIONS,
  useAiAccess,
  useAiInsights,
  useChat,
  useConversations,
} from '../js/use-ai';
import {
  AiDisabledState,
  HistoryList,
  InsightsCard,
  MessageBubble,
  TypingIndicator,
} from './AiParts';
import styles from '../css/ai.module.css';

export default function AiChatView() {
  const { uuid } = useParams();
  const navigate = useNavigate();
  const access = useAiAccess();
  const [historyOpen, setHistoryOpen] = useState(false);
  const conversations = useConversations(access.enabled && access.chat);
  const insights = useAiInsights(access.insights);
  const chatAvailable = access.enabled && access.chat && !access.limitReached;

  const history = (
    <HistoryList
      items={conversations.data ?? []}
      loading={conversations.isPending && access.enabled}
      activeUuid={uuid}
      onPick={() => setHistoryOpen(false)}
    />
  );

  return (
    <Page
      title="AImargen AI"
      description="Pregunte sobre sus costos, precios y márgenes. La IA interpreta; AImargen calcula."
      action={
        chatAvailable && (
          <Button
            variant="secondary"
            icon="history"
            className={styles.historyButton}
            onClick={() => setHistoryOpen(true)}
          >
            Historial
          </Button>
        )
      }
    >
      {access.loading ? (
        <div className={styles.stack}>
          <Skeleton height={120} radius={14} />
          <Skeleton height={48} />
        </div>
      ) : !chatAvailable ? (
        <div className={styles.stack}>
          {access.status.error && (
            <Notice tone="danger" title="No se pudo consultar el estado de la IA">
              {errorMessage(access.status.error)}
            </Notice>
          )}
          <AiDisabledState
            isAdmin={access.isAdmin}
            reason={!access.enabled ? undefined : !access.chat ? 'feature' : 'limit'}
          />
          {access.insights && (
            <InsightsCard
              data={insights.data}
              loading={insights.isPending}
              error={insights.error ? errorMessage(insights.error) : null}
            />
          )}
        </div>
      ) : (
        <div className={styles.chatLayout}>
          <aside className={styles.sideColumn} aria-label="Historial">
            <Button
              variant="secondary"
              icon="plus"
              block
              onClick={() => navigate('/app/ai')}
              disabled={!uuid}
            >
              Nueva conversación
            </Button>
            {history}
          </aside>
          <ChatPanel
            key={uuid ?? 'new'}
            uuid={uuid}
            intro={
              access.insights && (
                <InsightsCard
                  data={insights.data}
                  loading={insights.isPending}
                  error={insights.error ? errorMessage(insights.error) : null}
                />
              )
            }
            tools={
              (access.invoice || access.recipe) && (
                <div className={styles.toolCards}>
                  {access.invoice && (
                    <Link to="/app/ai/invoice" className={styles.toolCard}>
                      <span className={styles.toolCardIcon}>
                        <Icon name="camera" />
                      </span>
                      <span>
                        <strong>Capturar factura</strong>
                        <span className={styles.toolCardText}>
                          Tome una foto y AImargen prepara la compra.
                        </span>
                      </span>
                    </Link>
                  )}
                  {access.recipe && (
                    <Link to="/app/ai/recipe" className={styles.toolCard}>
                      <span className={styles.toolCardIcon}>
                        <Icon name="products" />
                      </span>
                      <span>
                        <strong>Receta desde texto</strong>
                        <span className={styles.toolCardText}>
                          Escríbala como la diría y revise el borrador.
                        </span>
                      </span>
                    </Link>
                  )}
                </div>
              )
            }
          />
        </div>
      )}
      <Sheet open={historyOpen} onClose={() => setHistoryOpen(false)} title="Conversaciones">
        <div className={styles.stack}>
          <Button
            variant="secondary"
            icon="plus"
            block
            onClick={() => {
              setHistoryOpen(false);
              navigate('/app/ai');
            }}
          >
            Nueva conversación
          </Button>
          {history}
        </div>
      </Sheet>
    </Page>
  );
}

function ChatPanel({
  uuid,
  intro,
  tools,
}: {
  uuid: string | undefined;
  intro: ReactNode;
  tools: ReactNode;
}) {
  const chat = useChat(uuid);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const count = chat.messages.length + (chat.pending ? 1 : 0);
  const empty = !uuid && !chat.pending;

  useEffect(() => {
    if (count > 0) endRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
  }, [count, chat.conversation.isSuccess]);

  // Textarea que crece con el contenido
  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [chat.text]);

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      chat.send();
    }
  };

  return (
    <section className={styles.chatPanel} aria-label="Conversación">
      {empty ? (
        <div className={styles.stack}>
          {intro}
          <div className={styles.starters}>
            <h2 className={styles.startersTitle}>Pregúntele a su negocio</h2>
            <div className={styles.chips}>
              {STARTER_QUESTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  className={styles.starter}
                  onClick={() => chat.send(q)}
                  disabled={chat.sending}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
          {tools}
        </div>
      ) : chat.conversation.isPending && uuid ? (
        <div className={styles.stack}>
          <Skeleton height={56} width="70%" radius={14} />
          <Skeleton height={96} width="85%" radius={14} />
        </div>
      ) : chat.conversation.error ? (
        <Notice tone="danger" title="No se pudo abrir la conversación">
          {errorMessage(chat.conversation.error)}
        </Notice>
      ) : (
        <ol className={styles.messages} aria-live="polite">
          {chat.messages.map((m, i) => (
            <MessageBubble key={i} message={m} />
          ))}
          {chat.pending && (
            <>
              <MessageBubble
                message={{
                  role: 'user',
                  text: chat.pending,
                  drafts: [],
                  unverified: [],
                  createdAt: null,
                }}
              />
              <TypingIndicator />
            </>
          )}
        </ol>
      )}
      <div ref={endRef} />

      <form
        className={styles.composer}
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          chat.send();
        }}
      >
        {chat.error && (
          <p className={styles.composerError} role="alert">
            <Icon name="alert" size={16} />
            {chat.error}
          </p>
        )}
        <div className={styles.composerRow}>
          <label htmlFor="ai-composer" className="srOnly">
            Escriba su pregunta
          </label>
          <textarea
            id="ai-composer"
            ref={inputRef}
            rows={1}
            className={styles.composerInput}
            placeholder="Escriba su pregunta…"
            value={chat.text}
            onChange={(e) => {
              chat.setText(e.target.value);
              if (chat.error) chat.clearError();
            }}
            onKeyDown={onKeyDown}
            enterKeyHint="send"
            maxLength={2000}
            disabled={chat.sending}
          />
          <button
            type="submit"
            className={styles.sendButton}
            aria-label="Enviar"
            title="Enviar"
            disabled={chat.sending || !chat.text.trim()}
          >
            <Icon name="send" size={20} />
          </button>
        </div>
        <p className={styles.composerHint}>
          La IA interpreta; AImargen calcula. Revise las cifras importantes.
        </p>
      </form>
    </section>
  );
}
