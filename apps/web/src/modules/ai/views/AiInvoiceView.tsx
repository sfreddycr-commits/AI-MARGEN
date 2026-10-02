import { useRef } from 'react';
import { Actions, Button, Card, Icon, Notice } from '../../../core/ui';
import { Page } from '../../../core/shell/views/Page';
import { PageSkeleton } from '../../../core/shell/views/PageSkeleton';
import { MAX_UPLOAD_MB, useAiAccess, useInvoiceCapture } from '../js/use-ai';
import { AiDisabledState, SafetyNote } from './AiParts';
import styles from '../css/ai.module.css';

export default function AiInvoiceView() {
  const access = useAiAccess();
  if (access.loading) return <PageSkeleton />;
  const blocked = !access.enabled
    ? undefined
    : !access.invoice
      ? 'feature'
      : access.limitReached
        ? 'limit'
        : null;
  return (
    <Page
      title="Capturar factura"
      description="Tome una foto de la factura o suba el PDF. AImargen lee los datos y prepara la compra para que usted la revise."
      back="/app/ai"
    >
      {blocked !== null ? (
        <AiDisabledState isAdmin={access.isAdmin} reason={blocked} />
      ) : (
        <InvoiceForm />
      )}
    </Page>
  );
}

function InvoiceForm() {
  const cap = useInvoiceCapture();
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div className={styles.narrow}>
      <SafetyNote />
      <Card>
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="srOnly"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => {
            cap.pick(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
        <input
          ref={fileRef}
          type="file"
          accept="image/*,application/pdf"
          className="srOnly"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => {
            cap.pick(e.target.files?.[0]);
            e.target.value = '';
          }}
        />

        {cap.file ? (
          <div className={styles.filePreview}>
            {cap.previewUrl ? (
              <img
                src={cap.previewUrl}
                alt="Vista previa de la factura"
                className={styles.previewImage}
              />
            ) : (
              <div className={styles.pdfBox}>
                <Icon name="file" size={32} />
                <span>{cap.isPdf ? 'Documento PDF' : 'Archivo'}</span>
              </div>
            )}
            <div className={styles.fileMeta}>
              <span className={styles.fileName}>{cap.file.name}</span>
              <span className={styles.muted}>
                {(cap.file.size / 1024 / 1024).toFixed(1).replace('.', ',')} MB
              </span>
            </div>
          </div>
        ) : (
          <div className={styles.dropZone}>
            <span className={styles.dropIcon}>
              <Icon name="camera" size={28} />
            </span>
            <p>Asegúrese de que se lean bien el proveedor, la fecha, los productos y los montos.</p>
          </div>
        )}

        {cap.error && (
          <Notice tone="danger" title="No se pudo procesar la factura">
            {cap.error}
          </Notice>
        )}

        {cap.busy && (
          <div className={styles.progress} role="status">
            <span className={styles.progressBar} />
            <span>
              {cap.phase === 'preparing'
                ? 'Preparando la imagen…'
                : 'Enviando y leyendo la factura… puede tardar hasta un minuto.'}
            </span>
          </div>
        )}

        <Actions>
          {cap.file ? (
            <>
              <Button variant="secondary" icon="refresh" onClick={cap.clear} disabled={cap.busy}>
                Cambiar archivo
              </Button>
              <Button icon="ai" onClick={() => void cap.submit()} loading={cap.busy}>
                Leer factura
              </Button>
            </>
          ) : (
            <>
              <Button variant="secondary" icon="upload" onClick={() => fileRef.current?.click()}>
                Elegir archivo
              </Button>
              <Button icon="camera" onClick={() => cameraRef.current?.click()}>
                Tomar foto
              </Button>
            </>
          )}
        </Actions>
        <p className={styles.footnote}>Fotos JPG, PNG o WEBP, o PDF de hasta {MAX_UPLOAD_MB} MB.</p>
      </Card>
    </div>
  );
}
