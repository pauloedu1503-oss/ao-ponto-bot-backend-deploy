export function somenteNumero(jid) {
  return jid?.split('@')[0]?.replace(/\D/g, '') ?? '';
}

export function desembrulharMensagem(message) {
  let atual = message;
  while (atual) {
    if (atual.ephemeralMessage?.message) {
      atual = atual.ephemeralMessage.message;
      continue;
    }
    if (atual.viewOnceMessage?.message) {
      atual = atual.viewOnceMessage.message;
      continue;
    }
    if (atual.viewOnceMessageV2?.message) {
      atual = atual.viewOnceMessageV2.message;
      continue;
    }
    if (atual.documentWithCaptionMessage?.message) {
      atual = atual.documentWithCaptionMessage.message;
      continue;
    }
    break;
  }
  return atual ?? {};
}

export function extrairTexto(message) {
  const m = desembrulharMensagem(message);
  return m.conversation ??
    m.extendedTextMessage?.text ??
    m.imageMessage?.caption ??
    m.videoMessage?.caption ??
    m.buttonsResponseMessage?.selectedDisplayText ??
    m.listResponseMessage?.title ??
    m.templateButtonReplyMessage?.selectedDisplayText ??
    '';
}

export function jidParaEnvio(telefone, contatos) {
  const salvo = contatos[telefone];
  if (salvo) return salvo;
  return /^\d{10,15}$/.test(telefone)
    ? `${telefone}@s.whatsapp.net`
    : null;
}

export function transformarInterativoEmTexto(payload) {
  const interactive = payload.interactive;
  if (!interactive) return '';

  const linhas = [];
  const pergunta = interactive.body?.text?.trim() ?? '';
  if (pergunta) linhas.push(pergunta, '');

  if (pergunta.split('\n').some((linha) => /^\s*\d+\s*-\s+\S/.test(linha))) {
    return pergunta;
  }

  if (interactive.type === 'button') {
    (interactive.action?.buttons ?? []).forEach((botao, indice) => {
      linhas.push(`${indice + 1} - ${botao.reply?.title ?? ''}`);
    });
  }
  if (interactive.type === 'list') {
    let indice = 1;
    for (const secao of interactive.action?.sections ?? []) {
      for (const linha of secao.rows ?? []) {
        linhas.push(`${indice} - ${linha.title ?? ''}`);
        indice++;
      }
    }
  }
  return linhas.filter((linha, indice, array) =>
    linha !== '' || (indice > 0 && indice < array.length - 1),
  ).join('\n');
}
