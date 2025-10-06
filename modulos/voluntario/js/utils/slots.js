/**
 * Busca configurações no Firestore e calcula os slots válidos de supervisão.
 * @param {object} db Instância do Firestore.
 * @param {Array} diasHorarios Lista de objetos com dia, inicio e fim.
 * @returns {Promise<Array>} Lista de objetos { date, horario } válidos.
 */
export async function obterSlotsValidos(db, diasHorarios) {
  let minimoAgendaSupervisao = 24;
  let quantidadeDiasSupervisao = 15;

  try {
    const docMinimo = await db
      .collection("configuracoesSistema")
      .doc("minimoAgendaSupervisao")
      .get();
    const docDias = await db
      .collection("configuracoesSistema")
      .doc("quantidadeDiasSupervisao")
      .get();

    if (docMinimo.exists) {
      const dataMinimo = docMinimo.data();
      if (dataMinimo?.valor !== undefined) {
        minimoAgendaSupervisao = parseInt(dataMinimo.valor, 10);
      }
    }

    if (docDias.exists) {
      const dataDias = docDias.data();
      if (dataDias?.valor !== undefined) {
        quantidadeDiasSupervisao = parseInt(dataDias.valor, 10);
      }
    }
  } catch (e) {
    console.warn("Erro ao buscar configuração de agendamento:", e);
  }

  const diasDaSemana = [
    "domingo",
    "segunda-feira",
    "terça-feira",
    "quarta-feira",
    "quinta-feira",
    "sexta-feira",
    "sábado",
  ];

  const hoje = new Date();
  const agora = new Date();
  const slots = [];

  for (let i = 0; i < quantidadeDiasSupervisao; i++) {
    const diaAtual = new Date();
    diaAtual.setDate(hoje.getDate() + i);
    diaAtual.setHours(0, 0, 0, 0);

    const nomeDiaSemana = diasDaSemana[diaAtual.getDay()];

    diasHorarios.forEach((horario) => {
      if (horario.dia && horario.dia.toLowerCase() === nomeDiaSemana) {
        const [h, m] = horario.inicio.split(":").map(Number);
        const slotDate = new Date(diaAtual);
        slotDate.setHours(h, m, 0, 0);

        const diffMs = slotDate - agora;
        const diffHoras = diffMs / (1000 * 60 * 60);

        if (diffHoras >= minimoAgendaSupervisao) {
          slots.push({ date: slotDate, horario });
        }
      }
    });
  }

  return slots;
}
