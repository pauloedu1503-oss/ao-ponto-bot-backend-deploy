/**
 * Processa saídas em ordem. Uma falha de envio é tratada como resultado
 * incerto; interrompe o lote para não duplicar nem ultrapassar uma mensagem
 * cujo resultado o backend ainda não conseguiu registrar.
 */
export async function processarFilaSaidas(mensagens, dependencias) {
  const { enviar, informarResultado, aoIgnorar = () => {}, aoFalhar = () => {} } = dependencias;

  for (const item of mensagens) {
    const id = Number(item?.id);
    if (!Number.isInteger(id) || id <= 0 || !item?.payload) {
      aoIgnorar(item);
      continue;
    }

    try {
      await enviar(item.payload);
    } catch (erroEnvio) {
      aoFalhar(id, erroEnvio);
      try {
        await informarResultado(id, 'incerto', erroEnvio.message);
      } catch (erroRegistro) {
        aoFalhar(id, erroRegistro);
      }
      return { status: 'interrompida', id, motivo: 'envio_incerto' };
    }

    try {
      await informarResultado(id, 'enviado');
    } catch (erroRegistro) {
      aoFalhar(id, erroRegistro);
      try {
        await informarResultado(id, 'incerto', erroRegistro.message);
      } catch (erroIncerto) {
        aoFalhar(id, erroIncerto);
      }
      return { status: 'interrompida', id, motivo: 'resultado_nao_registrado' };
    }
  }

  return { status: 'concluida' };
}
