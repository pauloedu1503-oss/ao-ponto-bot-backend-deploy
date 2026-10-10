export class AckTracker {
  #pending = new Map();

  constructor({ timeoutMs = 8000, timeoutError } = {}) {
    this.timeoutMs = timeoutMs;
    this.timeoutError = timeoutError ?? (() => new Error(
      `O WhatsApp não confirmou o envio em ${Math.ceil(timeoutMs / 1000)} segundos.`,
    ));
  }

  registrar(id) {
    if (!id || this.#pending.has(id)) {
      throw new Error('ID de confirmação inválido ou duplicado.');
    }
    let resolver;
    let rejeitar;
    const promise = new Promise((resolve, reject) => {
      resolver = resolve;
      rejeitar = reject;
    });
    const timer = setTimeout(() => {
      this.#pending.delete(id);
      rejeitar(this.timeoutError());
    }, this.timeoutMs);
    this.#pending.set(id, { resolver, rejeitar, timer });
    return promise;
  }

  cancelar(id) {
    const pendente = this.#pending.get(id);
    if (!pendente) return false;
    clearTimeout(pendente.timer);
    this.#pending.delete(id);
    return true;
  }

  processar({ id, status, errorStatus, serverAck, errorCode }) {
    const pendente = this.#pending.get(id);
    if (!pendente) return false;
    if (status === errorStatus) {
      this.cancelar(id);
      const erro = new Error(errorCode
        ? `WhatsApp recusou a mensagem (erro ${errorCode}).`
        : 'WhatsApp recusou a mensagem.');
      if (errorCode) erro.codigo = String(errorCode);
      pendente.rejeitar(erro);
      return true;
    }
    if (typeof status === 'number' && status >= serverAck) {
      this.cancelar(id);
      pendente.resolver();
      return true;
    }
    return false;
  }

  get pendentes() { return this.#pending.size; }
}
