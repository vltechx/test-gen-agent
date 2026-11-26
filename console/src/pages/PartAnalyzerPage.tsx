import { useState } from 'react';
import {
  MATERIALS,
  MAX_QUANTITY,
  MIN_QUANTITY,
  PartAnalyzerError,
  useAnalyzePart,
  type AnalyzeResponse,
  type Material,
  type Quote,
  type Severity,
} from '../api/partAnalyzer';
import { PageHeader } from '../components/PageHeader';
import { Chip } from '../components/StatusChip';
import ui from '../components/ui.module.css';
import styles from './PartAnalyzerPage.module.css';

// Reuse the chip colours: red for errors, amber for warnings.
const SEVERITY_TONE = { error: 'failed', warning: 'limit_reached' } as const satisfies Record<Severity, string>;

const number = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 2 });
const usd = (n: number) => n.toLocaleString(undefined, { style: 'currency', currency: 'USD' });

export function PartAnalyzerPage() {
  const [file, setFile] = useState<File | null>(null);
  const [material, setMaterial] = useState<Material>('PA12');
  const [quantity, setQuantity] = useState('1');
  const analyze = useAnalyzePart();

  return (
    <>
      <PageHeader
        title="Part Analyzer"
        subtitle="Upload an STL to get its measurements, manufacturability checks and a fake quote."
      />
      <form
        className={styles.form}
        onSubmit={(e) => {
          e.preventDefault();
          if (file) analyze.mutate({ file, material, quantity: Number(quantity) });
        }}
      >
        <label className={styles.field}>
          STL file
          <input type="file" accept=".stl" required onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </label>
        <div className={styles.row}>
          <label className={styles.field}>
            Material
            <select className={ui.select} value={material} onChange={(e) => setMaterial(e.target.value as Material)}>
              {MATERIALS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            Quantity
            <input
              className={`${ui.input} ${styles.quantity}`}
              type="number"
              min={MIN_QUANTITY}
              max={MAX_QUANTITY}
              step={1}
              required
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </label>
        </div>
        <button type="submit" className={`${ui.primaryButton} ${styles.submit}`} disabled={!file || analyze.isPending}>
          {analyze.isPending ? 'Analyzing…' : 'Analyze part'}
        </button>
      </form>

      {analyze.error && <ErrorMessage error={analyze.error} />}

      {analyze.data && (
        <>
          <h2 className={ui.sectionTitle}>Results for {analyze.variables?.file.name}</h2>
          <div className={styles.panels}>
            <MeasurementsPanel result={analyze.data} />
            <DfmPanel result={analyze.data} />
            <QuotePanel quote={analyze.data.quote} />
          </div>
        </>
      )}
    </>
  );
}

function ErrorMessage({ error }: { error: Error }) {
  const messages = error instanceof PartAnalyzerError ? error.messages : [error.message];
  return (
    <div className={`${ui.error} ${styles.error}`} role="alert">
      <strong>Could not analyze the part.</strong>
      {messages.length === 1 ? (
        <p>{messages[0]}</p>
      ) : (
        <ul>
          {messages.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function MeasurementsPanel({ result }: { result: AnalyzeResponse }) {
  const [x, y, z] = result.bounding_box.size;
  return (
    <section className={ui.card}>
      <h3 className={styles.panelTitle}>Measurements</h3>
      <dl className={styles.rows}>
        <dt>Size</dt>
        <dd>
          {number(x)} × {number(y)} × {number(z)} mm
        </dd>
        <dt>Volume</dt>
        <dd>
          {number(result.volume_mm3)} mm³ <span className={ui.muted}>({number(result.volume_mm3 / 1000)} cm³)</span>
        </dd>
        <dt>Surface area</dt>
        <dd>{number(result.surface_area_mm2)} mm²</dd>
        <dt>Watertight</dt>
        <dd>
          <Chip tone={result.watertight ? 'passed' : 'limit_reached'}>{result.watertight ? 'Yes' : 'No'}</Chip>
        </dd>
        <dt>Triangles</dt>
        <dd>{number(result.triangle_count)}</dd>
      </dl>
    </section>
  );
}

function DfmPanel({ result }: { result: AnalyzeResponse }) {
  return (
    <section className={ui.card}>
      <h3 className={styles.panelTitle}>DFM checklist</h3>
      {result.warnings.length === 0 ? (
        <p className={styles.ok}>
          <span aria-hidden="true">✓</span> No problems found. The part fits the build volume and is watertight.
        </p>
      ) : (
        <ul className={styles.warnings}>
          {result.warnings.map((w) => (
            <li key={w.code}>
              <Chip tone={SEVERITY_TONE[w.severity]}>{w.severity === 'error' ? 'Error' : 'Warning'}</Chip>
              <p>{w.message}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function QuotePanel({ quote }: { quote: Quote | null }) {
  if (!quote) {
    return (
      <section className={ui.card}>
        <h3 className={styles.panelTitle}>Quote</h3>
        <p className={styles.total}>No quote</p>
        <p className={ui.muted}>Fix the errors in the DFM checklist to get a quote.</p>
      </section>
    );
  }
  return (
    <section className={ui.card}>
      <div className={styles.quoteHeader}>
        <h3 className={styles.panelTitle}>Quote</h3>
        <Chip tone="limit_reached">Fake quote</Chip>
      </div>
      <p className={styles.total}>{usd(quote.total_usd)}</p>
      <p className={ui.muted}>
        {quote.quantity} × {quote.material_name}
      </p>
      <dl className={styles.rows}>
        <dt>Unit price</dt>
        <dd>{usd(quote.unit_price_usd)}</dd>
        <dt>Setup fee</dt>
        <dd>{usd(quote.setup_fee_usd)}</dd>
        <dt>Lead time</dt>
        <dd>
          {quote.lead_time_days} {quote.lead_time_days === 1 ? 'day' : 'days'}
        </dd>
      </dl>
      <p className={styles.disclaimer}>{quote.disclaimer}</p>
    </section>
  );
}
