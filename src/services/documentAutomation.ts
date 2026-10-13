import {
  DocBatch,
  DocDraft,
  DocFile,
  DocStore,
  docStoreSchema,
  emptyDocStore,
  recordDocumentPdf,
} from '../domain/documentAutomation';

/** One session owns one state's journal. Publish only after durable storage succeeds. */
export class DocumentSession {
  store: DocStore = emptyDocStore();
  ready = false;
  busy = false;
  private stopped = false;
  constructor(
    private read: () => Promise<string | null>,
    private write: (value: string) => Promise<void>,
    private publish: (store: DocStore) => void,
  ) {}
  async load() {
    const raw = await this.read();
    this.store = raw ? docStoreSchema.parse(JSON.parse(raw)) : emptyDocStore();
    this.ready = true;
    this.publish(this.store);
  }
  async change(update: (store: DocStore) => DocStore) {
    if (!this.ready || this.busy)
      throw Error('Please wait for the current document operation.');
    this.busy = true;
    try {
      await this.commit(update(this.store));
    } finally {
      this.busy = false;
    }
  }
  private async commit(next: DocStore) {
    if (next.drafts.length > 200)
      throw Error(
        'The draft library is full (200). Remove an older draft first.',
      );
    if (next.profiles.length > 20)
      throw Error(
        'You can save 20 office profiles. Use an existing profile name to update it, or remove an old profile.',
      );
    if (next.files.length > 500)
      throw Error(
        'The PDF library is full (500). Remove older library entries first.',
      );
    const checked = docStoreSchema.parse(next);
    await this.write(JSON.stringify(checked));
    this.store = checked;
    this.publish(checked);
  }
  stop() {
    this.stopped = true;
  }
  async generate(
    generate: (draft: DocDraft) => Promise<DocFile>,
    batch?: DocBatch,
  ) {
    if (!this.ready || this.busy)
      throw Error('Please wait for the current document operation.');
    this.busy = true;
    this.stopped = false;
    try {
      const previous = this.store.batch;
      if (batch && previous && previous.next < previous.items.length)
        throw Error('Resume or discard the unfinished batch first.');
      const work = batch || previous;
      if (!work) throw Error('No saved batch to resume.');
      if (this.store.files.length + work.items.length - work.next > 500)
        throw Error(
          'The PDF library limit is 500. Remove older library entries first.',
        );
      if (batch) await this.commit({ ...this.store, batch });
      while (
        !this.stopped &&
        this.store.batch &&
        this.store.batch.next < this.store.batch.items.length
      ) {
        const current = this.store.batch;
        const file = await generate(current.items[current.next]);
        // Even after Stop, finish journalling the PDF already in flight; never start another.
        await this.commit(
          recordDocumentPdf(this.store, { ...file, batchId: current.id }),
        );
      }
    } finally {
      this.busy = false;
    }
  }
}
