import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  aiChatInput,
  aiRecipeDraftInput,
  productInput,
  purchaseInput,
  scenarioInput,
  UNIT_CODES,
  type PurchaseInput,
} from '@aimargen/schemas';
import { useSession } from '../../../core/session/js/session-context';
import { useLocalList, type SyncEntity } from '../../../core/data/js/use-entity';
import { ApiRequestError, errorMessage } from '../../../core/js/api-client';
import {
  formatInputNumber,
  inputToDecimal,
  serverFieldErrors,
  todayIso,
  validate,
  type FieldErrors,
} from '../../../core/js/form';
import {
  aiService,
  type AiDraft,
  type ChatMessage,
  type Conversation,
  type IngredientOption,
  type PurchaseDraftPayload,
  type RecipeDraftPayload,
  type ScenarioDraftPayload,
  type ScenarioResult,
  type SupplierOption,
} from './ai.service';

/** Controlador de AImargen AI: estado de pantalla, validación y mutaciones. */

const KEY = ['api', 'ai'] as const;
const NIL_UUID = '00000000-0000-4000-8000-000000000000';
export const NEW = '__new__';
export const SKIP = '__skip__';

// ------------------------------------------------------------------ Acceso
export function useAiAccess() {
  const { can, feature, me } = useSession();
  const status = useQuery({
    queryKey: [...KEY, 'status'],
    queryFn: aiService.status,
    staleTime: 60_000,
  });
  const enabled = status.data?.enabled ?? me?.aiEnabled ?? false;
  const limit = status.data?.monthlyLimit ?? 0;
  const used = status.data?.usedThisMonth ?? 0;
  const role = me?.user.role ?? '';
  return {
    status,
    loading: status.isPending,
    enabled,
    limitReached: limit > 0 && used >= limit,
    isAdmin: ['tenant_owner', 'tenant_admin', 'super_admin'].includes(role),
    chat: feature('ai.chat'),
    invoice: feature('ai.invoice_capture') && can('purchases.write'),
    recipe: feature('ai.recipe_draft') && can('products.write'),
    insights: feature('ai.insights'),
    confirm: can('ai.confirm_actions'),
  };
}

export function useAiInsights(enabled: boolean) {
  return useQuery({
    queryKey: [...KEY, 'insights'],
    queryFn: aiService.insights,
    enabled,
    staleTime: 60_000,
  });
}

// ------------------------------------------------------------------ Conversaciones
export function useConversations(enabled = true) {
  return useQuery({
    queryKey: [...KEY, 'conversations'],
    queryFn: aiService.conversations,
    enabled,
  });
}

export const STARTER_QUESTIONS = [
  '¿Qué productos tienen margen bajo?',
  '¿Cuánto subió el queso este mes?',
  '¿Cuántas unidades debo vender para cubrir costos?',
  '¿Qué recetas tienen datos incompletos?',
];

export function useChat(uuid: string | undefined) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const conversation = useQuery({
    queryKey: [...KEY, 'conversation', uuid],
    queryFn: () => aiService.conversation(uuid!),
    enabled: !!uuid,
    staleTime: 5 * 60_000,
  });
  const [text, setText] = useState('');
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({ mutationFn: aiService.chat });

  const send = (override?: string) => {
    if (mutation.isPending) return;
    const message = (override ?? text).trim();
    const v = validate(aiChatInput, { conversationUuid: uuid ?? null, message });
    if (!v.ok) {
      setError(v.errors.message ?? Object.values(v.errors)[0] ?? null);
      return;
    }
    setError(null);
    setPending(message);
    setText('');
    mutation.mutate(
      { conversationUuid: uuid ?? null, message: v.data.message },
      {
        onSuccess: (res) => {
          const now = new Date().toISOString();
          const user: ChatMessage = {
            role: 'user',
            text: message,
            drafts: [],
            unverified: [],
            createdAt: now,
          };
          const assistant: ChatMessage = {
            role: 'assistant',
            text: res.reply,
            drafts: res.drafts,
            unverified: res.unverified,
            toolCalls: res.toolCalls,
            createdAt: now,
          };
          qc.setQueryData<Conversation>([...KEY, 'conversation', res.conversationUuid], (old) => ({
            uuid: res.conversationUuid,
            title: old?.title ?? message.slice(0, 80),
            messages: [...(old?.messages ?? []), user, assistant],
          }));
          void qc.invalidateQueries({ queryKey: [...KEY, 'conversations'] });
          void qc.invalidateQueries({ queryKey: [...KEY, 'status'] });
          setPending(null);
          if (!uuid) navigate(`/app/ai/conversations/${res.conversationUuid}`);
        },
        onError: (e) => {
          setPending(null);
          setText(message);
          setError(errorMessage(e));
          if (e instanceof ApiRequestError && e.code === 'AI_NOT_CONFIGURED') {
            void qc.invalidateQueries({ queryKey: [...KEY, 'status'] });
          }
        },
      },
    );
  };

  return {
    conversation,
    messages: conversation.data?.messages ?? [],
    text,
    setText,
    pending,
    sending: mutation.isPending,
    error,
    clearError: () => setError(null),
    send,
  };
}

// ------------------------------------------------------------------ Receta por texto
export const RECIPE_PLACEHOLDER =
  'Latte: 200 ml de leche, 18 g de café, 15 ml de jarabe de vainilla y un vaso de ₡180.';

export function useRecipeFromText() {
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: aiService.draftRecipe,
    onSuccess: (d) => navigate(`/app/ai/drafts/${d.uuid}`),
    onError: (e) => setError(errorMessage(e)),
  });
  const submit = () => {
    const v = validate(aiRecipeDraftInput, { text });
    if (!v.ok) {
      setError(v.errors.text ?? 'Describa la receta.');
      return;
    }
    setError(null);
    mutation.mutate(v.data.text);
  };
  return { text, setText, error, submit, loading: mutation.isPending };
}

// ------------------------------------------------------------------ Captura de facturas
export const MAX_UPLOAD_MB = 10;
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

/** Reduce fotos grandes del celular antes de subirlas (menos datos, misma legibilidad). */
async function shrinkImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/') || file.size < 2.5 * 1024 * 1024) return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 2200 / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext('2d')?.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.85));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' });
  } catch {
    return file;
  }
}

export type InvoicePhase = 'idle' | 'preparing' | 'sending';

export function useInvoiceCapture() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<InvoicePhase>('idle');
  const mutation = useMutation({ mutationFn: aiService.analyzeInvoice });

  // Vista previa: la URL se crea al elegir el archivo y se libera al cambiarlo o salir.
  const urlRef = useRef<string | null>(null);
  const setPreview = (f: File | null) => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = f && f.type.startsWith('image/') ? URL.createObjectURL(f) : null;
    setPreviewUrl(urlRef.current);
  };
  useEffect(
    () => () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    },
    [],
  );

  const pick = (f: File | null | undefined) => {
    setError(null);
    if (!f) return;
    const okType = ACCEPTED.includes(f.type) || f.type.startsWith('image/');
    if (!okType) {
      setError('Suba una foto (JPG, PNG o WEBP) o un PDF de la factura.');
      return;
    }
    if (f.type === 'application/pdf' && f.size > MAX_UPLOAD_MB * 1024 * 1024) {
      setError(`El archivo supera ${MAX_UPLOAD_MB} MB. Use uno más liviano.`);
      return;
    }
    setFile(f);
    setPreview(f);
  };

  const submit = async () => {
    if (!file) {
      setError('Tome una foto o elija el archivo de la factura.');
      return;
    }
    setError(null);
    setPhase('preparing');
    const ready = await shrinkImage(file);
    if (ready.size > MAX_UPLOAD_MB * 1024 * 1024) {
      setPhase('idle');
      setError(`El archivo supera ${MAX_UPLOAD_MB} MB. Use uno más liviano.`);
      return;
    }
    setPhase('sending');
    mutation.mutate(ready, {
      onSuccess: (d) => navigate(`/app/ai/drafts/${d.uuid}`),
      onError: (e) => setError(errorMessage(e)),
      onSettled: () => setPhase('idle'),
    });
  };

  return {
    file,
    previewUrl,
    isPdf: file?.type === 'application/pdf',
    pick,
    clear: () => {
      setFile(null);
      setPreview(null);
      setError(null);
    },
    error,
    phase,
    busy: phase !== 'idle',
    submit,
  };
}

// ------------------------------------------------------------------ Borradores
export function useDraft(uuid: string | undefined) {
  return useQuery({
    queryKey: [...KEY, 'draft', uuid],
    queryFn: () => aiService.draft(uuid!),
    enabled: !!uuid,
  });
}

/** Archivo original de la factura como URL local (imagen o PDF). */
export function useDraftDocument(documentUuid: string | null | undefined, enabled: boolean) {
  const [doc, setDoc] = useState<{ url: string; isPdf: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!documentUuid || !enabled) return;
    let url: string | null = null;
    let cancelled = false;
    aiService
      .documentUrl(documentUuid)
      .then(async (u) => {
        url = u;
        const type = (await fetch(u).then((r) => r.blob())).type;
        if (!cancelled) setDoc({ url: u, isPdf: type === 'application/pdf' });
      })
      .catch((e: unknown) => !cancelled && setError(errorMessage(e)));
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [documentUuid, enabled]);
  return { doc, error };
}

/** Tras confirmar: refresca el cache local y las consultas afectadas. */
function useAfterConfirm() {
  const qc = useQueryClient();
  const { engine } = useSession();
  return (entities: SyncEntity[], draftUuid: string) => {
    for (const e of entities) {
      void qc.invalidateQueries({ queryKey: ['local', e] });
      void qc.invalidateQueries({ queryKey: ['api', e] });
    }
    void qc.invalidateQueries({ queryKey: ['api', 'dashboard'] });
    void qc.invalidateQueries({ queryKey: ['api', 'purchases'] });
    void qc.invalidateQueries({ queryKey: [...KEY, 'draft', draftUuid] });
    void qc.invalidateQueries({ queryKey: [...KEY, 'conversation'] });
    void engine?.sync('manual');
  };
}

export function useDiscardDraft(uuid: string, onDone: () => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => aiService.discard(uuid),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...KEY, 'draft', uuid] });
      void qc.invalidateQueries({ queryKey: [...KEY, 'conversation'] });
      onDone();
    },
  });
}

const UNIT_SET = new Set<string>(UNIT_CODES);
const validUnit = (u: string | null | undefined, fallback = 'unidad') =>
  u && UNIT_SET.has(u) ? u : fallback;

/** Agrupa errores "items.N.campo" por la clave de la línea correspondiente. */
function lineErrors(errors: FieldErrors, keys: string[]) {
  const byLine: Record<string, FieldErrors> = {};
  const rest: FieldErrors = {};
  for (const [k, msg] of Object.entries(errors)) {
    const m = /^items\.(\d+)\.(\w+)$/.exec(k);
    const key = m ? keys[Number(m[1])] : undefined;
    if (m && key) (byLine[key] ??= {})[m[2]!] = msg;
    else rest[k] = msg;
  }
  return { byLine, rest };
}

// ---------- Compra (factura)
export interface PurchaseLineForm {
  key: string;
  description: string;
  rawUnit: string | null;
  match: PurchaseDraftPayload['lines'][number]['match'];
  unitCompatible: boolean;
  ingredient: string; // uuid | NEW | SKIP | ''
  newName: string;
  quantity: string;
  unit: string;
  lineTotal: string;
}

export function usePurchaseDraftForm(
  draft: AiDraft<PurchaseDraftPayload>,
  onSaved: (uuid: string) => void,
) {
  const p = draft.payload;
  const ingredients = useLocalList<IngredientOption>('ingredients');
  const suppliers = useLocalList<SupplierOption>('suppliers');
  const [supplier, setSupplier] = useState(
    () => p.supplier.match?.uuid ?? (p.supplier.name ? NEW : ''),
  );
  const [supplierName, setSupplierName] = useState(p.supplier.name ?? '');
  const [purchasedAt, setPurchasedAt] = useState(p.date ?? todayIso());
  const [reference, setReference] = useState(p.reference ?? '');
  const [lines, setLines] = useState<PurchaseLineForm[]>(() =>
    p.lines.map((l, i) => ({
      key: `l${i}`,
      description: l.description,
      rawUnit: l.rawUnit,
      match: l.match,
      unitCompatible: l.unitCompatible,
      ingredient: l.match?.ingredientUuid ?? '',
      newName: l.description,
      quantity: formatInputNumber(l.quantity),
      unit: validUnit(l.unit, l.match?.unit ?? 'unidad'),
      lineTotal: formatInputNumber(l.lineTotal),
    })),
  );
  const [errors, setErrors] = useState<FieldErrors>({});
  const [lineErrs, setLineErrs] = useState<Record<string, FieldErrors>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const created = useRef<{ supplier?: string; lines: Record<string, string> }>({ lines: {} });
  const afterConfirm = useAfterConfirm();

  const setLine = (key: string, patch: Partial<PurchaseLineForm>) =>
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const mutation = useMutation({
    mutationFn: async (input: { body: PurchaseInput; newLines: PurchaseLineForm[] }) => {
      const body = { ...input.body, items: [...input.body.items] };
      if (supplier === NEW && supplierName.trim()) {
        created.current.supplier ??= (
          await aiService.createSupplier({ name: supplierName.trim() })
        ).uuid;
        body.supplierUuid = created.current.supplier;
      }
      for (const l of input.newLines) {
        created.current.lines[l.key] ??= (
          await aiService.createIngredient({ name: l.newName.trim(), unit: l.unit })
        ).uuid;
      }
      const included = lines.filter((l) => l.ingredient !== SKIP);
      body.items = body.items.map((it, i) => {
        const l = included[i]!;
        return l.ingredient === NEW ? { ...it, ingredientUuid: created.current.lines[l.key]! } : it;
      });
      return aiService.confirmPurchase(draft.uuid, body);
    },
    onSuccess: (res) => {
      afterConfirm(['ingredients', 'suppliers', 'products'], draft.uuid);
      onSaved(res.uuid);
    },
  });

  function buildBody() {
    const included = lines.filter((l) => l.ingredient !== SKIP);
    return {
      supplierUuid: supplier && supplier !== NEW ? supplier : null,
      purchasedAt,
      reference: reference.trim() || null,
      notes: 'Registrada desde una factura con AImargen AI',
      items: included.map((l) => ({
        ingredientUuid: l.ingredient === NEW ? NIL_UUID : l.ingredient,
        quantity: inputToDecimal(l.quantity) ?? '',
        unit: l.unit,
        lineTotal: inputToDecimal(l.lineTotal) ?? '',
      })),
    };
  }

  const submit = () => {
    setFormError(null);
    const included = lines.filter((l) => l.ingredient !== SKIP);
    const manual: Record<string, FieldErrors> = {};
    for (const l of included) {
      if (!l.ingredient)
        manual[l.key] = { ingredientUuid: 'Elija un ingrediente, créelo u omita la línea.' };
      if (l.ingredient === NEW && !l.newName.trim())
        manual[l.key] = { newName: 'Escriba el nombre del ingrediente nuevo.' };
    }
    const top: FieldErrors = {};
    if (supplier === NEW && !supplierName.trim())
      top.supplierName = 'Escriba el nombre del proveedor.';
    const body = buildBody();
    const v = validate(purchaseInput, {
      ...body,
      items: body.items.map((it) => ({ ...it, ingredientUuid: it.ingredientUuid || NIL_UUID })),
    });
    const split = v.ok
      ? { byLine: {}, rest: {} }
      : lineErrors(
          v.errors,
          included.map((l) => l.key),
        );
    const merged: Record<string, FieldErrors> = { ...split.byLine };
    for (const [k, e] of Object.entries(manual)) merged[k] = { ...merged[k], ...e };
    const restErrors = { ...split.rest, ...top };
    if (!included.length) restErrors.items = 'Incluya al menos una línea.';
    if (!v.ok || Object.keys(merged).length || Object.keys(restErrors).length) {
      setLineErrs(merged);
      setErrors(restErrors);
      setFormError('Revise los campos marcados.');
      return;
    }
    setLineErrs({});
    setErrors({});
    mutation.mutate(
      { body: v.data, newLines: included.filter((l) => l.ingredient === NEW) },
      {
        onError: (e) => {
          const f = serverFieldErrors(e);
          if (f) {
            const s = lineErrors(
              f,
              included.map((l) => l.key),
            );
            setLineErrs(s.byLine);
            setErrors(s.rest);
          }
          setFormError(errorMessage(e));
        },
      },
    );
  };

  return {
    ingredients: ingredients.data ?? [],
    suppliers: suppliers.data ?? [],
    supplier,
    setSupplier,
    supplierName,
    setSupplierName,
    purchasedAt,
    setPurchasedAt,
    reference,
    setReference,
    lines,
    setLine,
    errors,
    lineErrs,
    formError,
    submit,
    saving: mutation.isPending,
  };
}

// ---------- Receta
export interface RecipeLineForm {
  key: string;
  text: string;
  original: string;
  matchName: string | null;
  missingCost: boolean;
  unitCompatible: boolean;
  ingredient: string; // uuid | SKIP | ''
  quantity: string;
  unit: string;
}

export function useRecipeDraftForm(
  draft: AiDraft<RecipeDraftPayload>,
  onSaved: (uuid: string) => void,
) {
  const p = draft.payload;
  const ingredients = useLocalList<IngredientOption>('ingredients');
  const [name, setName] = useState(p.name);
  const [portions, setPortions] = useState(formatInputNumber(p.portions) || '1');
  const [packaging, setPackaging] = useState(formatInputNumber(p.packaging?.value ?? null));
  const [currentPrice, setCurrentPrice] = useState('');
  const [lines, setLines] = useState<RecipeLineForm[]>(() =>
    p.items.map((it, i) => ({
      key: `r${i}`,
      text: it.text,
      original: [formatInputNumber(it.quantity), it.rawUnit, it.text].filter(Boolean).join(' '),
      matchName: it.match?.name ?? null,
      missingCost: !!it.match && it.match.unitCost === null,
      unitCompatible: it.unitCompatible,
      ingredient: it.match?.ingredientUuid ?? '',
      quantity: formatInputNumber(it.quantity),
      unit: validUnit(it.unit, it.match?.unit ?? 'unidad'),
    })),
  );
  const [errors, setErrors] = useState<FieldErrors>({});
  const [lineErrs, setLineErrs] = useState<Record<string, FieldErrors>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const afterConfirm = useAfterConfirm();
  const setLine = (key: string, patch: Partial<RecipeLineForm>) =>
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const mutation = useMutation({
    mutationFn: (body: Parameters<typeof aiService.confirmRecipe>[1]) =>
      aiService.confirmRecipe(draft.uuid, body),
    onSuccess: (res) => {
      afterConfirm(['products'], draft.uuid);
      onSaved(res.uuid);
    },
  });

  const submit = () => {
    setFormError(null);
    const included = lines.filter((l) => l.ingredient !== SKIP);
    const manual: Record<string, FieldErrors> = {};
    for (const l of included)
      if (!l.ingredient) manual[l.key] = { ingredientUuid: 'Elija un ingrediente u omítalo.' };
    const v = validate(productInput, {
      name,
      portions: inputToDecimal(portions) ?? '',
      currentPrice: inputToDecimal(currentPrice),
      packaging: { mode: 'fixed', value: inputToDecimal(packaging) ?? '0' },
      items: included.map((l) => ({
        ingredientUuid: l.ingredient || NIL_UUID,
        quantity: inputToDecimal(l.quantity) ?? '',
        unit: l.unit,
      })),
    });
    const split = v.ok
      ? { byLine: {}, rest: {} }
      : lineErrors(
          v.errors,
          included.map((l) => l.key),
        );
    const merged: Record<string, FieldErrors> = { ...split.byLine };
    for (const [k, e] of Object.entries(manual)) merged[k] = { ...merged[k], ...e };
    if (!v.ok || Object.keys(merged).length) {
      setLineErrs(merged);
      setErrors(split.rest);
      setFormError('Revise los campos marcados.');
      return;
    }
    setLineErrs({});
    setErrors({});
    mutation.mutate(v.data, {
      onError: (e) => {
        const f = serverFieldErrors(e);
        if (f) setErrors(f);
        setFormError(errorMessage(e));
      },
    });
  };

  return {
    ingredients: ingredients.data ?? [],
    name,
    setName,
    portions,
    setPortions,
    packaging,
    setPackaging,
    currentPrice,
    setCurrentPrice,
    lines,
    setLine,
    errors,
    lineErrs,
    formError,
    submit,
    saving: mutation.isPending,
  };
}

// ---------- Escenario
function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export function useScenarioDraftForm(
  draft: AiDraft<ScenarioDraftPayload>,
  onSaved: (uuid: string) => void,
) {
  const p = draft.payload;
  const [name, setName] = useState(p.name);
  const [price, setPrice] = useState(formatInputNumber(p.price));
  const [unitsPerDay, setUnitsPerDay] = useState(formatInputNumber(p.unitsPerDay));
  const [daysPerMonth, setDaysPerMonth] = useState(String(p.daysPerMonth));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const afterConfirm = useAfterConfirm();

  const values = useMemo(
    () => ({
      name,
      productUuid: p.productUuid,
      price: inputToDecimal(price) ?? '',
      unitsPerDay: inputToDecimal(unitsPerDay) ?? '',
      daysPerMonth: daysPerMonth.trim(),
      fixedCosts: p.fixedCosts,
      variableUnitCost: p.variableUnitCost,
      variableSource: p.variableSource,
      notes: p.notes ?? 'Creado con AImargen AI',
    }),
    [name, price, unitsPerDay, daysPerMonth, p],
  );
  const debounced = useDebounced(values, 400);
  const changed =
    debounced.price !== p.price ||
    debounced.unitsPerDay !== p.unitsPerDay ||
    debounced.daysPerMonth !== String(p.daysPerMonth);
  const calcInput = useMemo(() => {
    const v = validate(scenarioInput, debounced);
    if (!v.ok) return null;
    const { name: _n, notes: _no, rowVersion: _r, ...rest } = v.data;
    return rest;
  }, [debounced]);
  const preview = useQuery({
    queryKey: [...KEY, 'scenario-preview', calcInput],
    queryFn: () => aiService.calculateScenario(calcInput!),
    enabled: changed && !!calcInput,
    staleTime: 60_000,
  });
  const result: ScenarioResult | null = changed ? (preview.data ?? null) : p.result;

  const mutation = useMutation({
    mutationFn: (body: Parameters<typeof aiService.confirmScenario>[1]) =>
      aiService.confirmScenario(draft.uuid, body),
    onSuccess: (res) => {
      afterConfirm(['scenarios'], draft.uuid);
      onSaved(res.uuid);
    },
  });

  const submit = () => {
    setFormError(null);
    const v = validate(scenarioInput, values);
    if (!v.ok) {
      setErrors(v.errors);
      setFormError('Revise los campos marcados.');
      return;
    }
    setErrors({});
    mutation.mutate(v.data, {
      onError: (e) => {
        const f = serverFieldErrors(e);
        if (f) setErrors(f);
        setFormError(errorMessage(e));
      },
    });
  };

  return {
    name,
    setName,
    price,
    setPrice,
    unitsPerDay,
    setUnitsPerDay,
    daysPerMonth,
    setDaysPerMonth,
    result,
    recalculating: changed && (preview.isFetching || values !== debounced),
    previewError: preview.error ? errorMessage(preview.error) : null,
    errors,
    formError,
    submit,
    saving: mutation.isPending,
  };
}
