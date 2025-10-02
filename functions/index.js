const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const functions = require("firebase-functions");
const admin = require("firebase-admin");
// A inicialização do admin só precisa acontecer uma vez.
if (admin.apps.length === 0) {
  admin.initializeApp();
}
const db = admin.firestore();

// -----------------------------
// Função auxiliar para username
// -----------------------------
/**
 * Gera um username único baseado no nome completo informado.
 * @param {string} nomeCompleto - O nome completo do usuário.
 * @return {Promise<string>} - Um username único.
 * @throws {HttpsError} - Se não for possível gerar um username único.
 */
async function gerarUsernameUnico(nomeCompleto) {
  const partesNome = nomeCompleto
    .trim()
    .split(/\s+/)
    .filter((p) => p);
  if (partesNome.length === 0) {
    throw new HttpsError(
      "invalid-argument",
      "O nome completo não pode estar vazio."
    );
  }

  const primeiroNome = partesNome[0];
  const ultimoNome =
    partesNome.length > 1 ? partesNome[partesNome.length - 1] : "";
  const nomesMeio = partesNome.slice(1, -1);

  const checkUsernameExists = async (username) => {
    const query = db
      .collection("usuarios")
      .where("username", "==", username)
      .limit(1);
    const snapshot = await query.get();
    return !snapshot.empty;
  };

  const usernameBase = `${primeiroNome} ${ultimoNome}`.trim();

  if (!(await checkUsernameExists(usernameBase))) return usernameBase;

  if (nomesMeio.length > 0) {
    const inicialMeio = nomesMeio[0].charAt(0).toUpperCase();
    const usernameComInicial =
      `${primeiroNome} ${inicialMeio}. ${ultimoNome}`.trim();
    if (!(await checkUsernameExists(usernameComInicial))) {
      return usernameComInicial;
    }
  }

  if (nomesMeio.length > 0) {
    const primeiroNomeMeio = nomesMeio[0];
    const usernameComNomeMeio =
      `${primeiroNome} ${primeiroNomeMeio} ${ultimoNome}`.trim();
    if (!(await checkUsernameExists(usernameComNomeMeio))) {
      return usernameComNomeMeio;
    }
  }

  let contador = 2;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const usernameNumerado = `${usernameBase} ${contador}`;
    if (!(await checkUsernameExists(usernameNumerado))) {
      return usernameNumerado;
    }
    contador++;
    if (contador > 100) {
      throw new HttpsError(
        "internal",
        "Não foi possível gerar um username único."
      );
    }
  }
}

// -----------------------------
// Função criarNovoProfissional
// -----------------------------
exports.criarNovoProfissional = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Você precisa estar autenticado.");
  }

  const adminUid = request.auth.uid;
  try {
    const adminUserDoc = await db.collection("usuarios").doc(adminUid).get();
    if (
      !adminUserDoc.exists ||
      !(adminUserDoc.data().funcoes || []).some((f) =>
        ["admin", "financeiro"].includes(f)
      )
    ) {
      throw new HttpsError(
        "permission-denied",
        "Você não tem permissão para criar usuários."
      );
    }

    const data = request.data;
    const usernameUnico = await gerarUsernameUnico(data.nome);
    const senhaPadrao = "eupsico@2025";

    const userRecord = await admin.auth().createUser({
      email: data.email,
      password: senhaPadrao,
      displayName: data.nome,
      disabled: false,
    });

    const uid = userRecord.uid;
    const dadosParaSalvar = {
      nome: data.nome,
      username: usernameUnico,
      email: data.email,
      contato: data.contato,
      profissao: data.profissao,
      funcoes: data.funcoes,
      inativo: data.inativo,
      recebeDireto: data.recebeDireto,
      primeiraFase: data.primeiraFase,
      fazAtendimento: data.fazAtendimento,
      uid: uid,
    };

    await db.collection("usuarios").doc(uid).set(dadosParaSalvar);

    return {
      status: "success",
      message: `Usuário ${data.nome} criado com sucesso!`,
    };
  } catch (error) {
    console.error("Erro detalhado ao criar profissional:", error);
    if (error instanceof HttpsError) throw error;
    if (error.code === "auth/email-already-exists") {
      throw new HttpsError(
        "already-exists",
        "O e-mail fornecido já está em uso."
      );
    }
    throw new HttpsError("internal", "Ocorreu um erro inesperado.");
  }
});

// -----------------------------
// Função verificarCpfExistente
// -----------------------------
exports.verificarCpfExistente = onCall({ cors: true }, async (request) => {
  const cpf = request.data.cpf;
  if (!cpf || cpf.length < 11) {
    throw new HttpsError("invalid-argument", "CPF inválido ou não fornecido.");
  }

  try {
    const trilhaRef = db.collection("trilhaPaciente");
    const snapshot = await trilhaRef.where("cpf", "==", cpf).limit(1).get();

    if (snapshot.empty) {
      return { exists: false };
    } else {
      const doc = snapshot.docs[0];
      const paciente = doc.data();
      return {
        exists: true,
        docId: doc.id,
        dados: {
          nomeCompleto: paciente.nomeCompleto || "Nome não encontrado",
          telefoneCelular: paciente.telefoneCelular || "",
        },
      };
    }
  } catch (error) {
    console.error("Erro ao verificar CPF na trilha:", error);
    throw new HttpsError(
      "internal",
      "Erro interno do servidor ao verificar CPF."
    );
  }
});

// -------------------------------------------------------------------
// Função para criar um card na Trilha do Paciente
// -------------------------------------------------------------------
exports.criarCardTrilhaPaciente = onDocumentCreated(
  "inscricoes/{inscricaoId}",
  async (event) => {
    const snap = event.data;
    if (!snap) {
      console.log("Nenhum dado associado ao evento.");
      return;
    }
    const inscricaoData = snap.data();

    const cardData = {
      inscricaoId: event.params.inscricaoId,
      nomeCompleto: inscricaoData.nomeCompleto || "",
      cpf: inscricaoData.cpf || "",
      dataNascimento: inscricaoData.dataNascimento || "",
      telefoneCelular: inscricaoData.telefoneCelular || "",
      email: inscricaoData.email || "",
      responsavel: inscricaoData.responsavel || {},
      disponibilidadeGeral: inscricaoData.disponibilidadeGeral || [],
      disponibilidadeEspecifica: inscricaoData.disponibilidadeEspecifica || [],
      timestamp: new Date(),
      status: "inscricao_documentos",
    };

    try {
      await db.collection("trilhaPaciente").add(cardData);
      console.log(
        `(v2) Card criado com sucesso na Trilha do Paciente para CPF: ${cardData.cpf}`
      );
    } catch (error) {
      console.error("(v2) Erro ao criar card na Trilha do Paciente:", error);
    }
  }
);

// -------------------------------------------------------------------
// (ADMIN) Busca todas as disponibilidades para o painel de gestão.
// -------------------------------------------------------------------
exports.getTodasDisponibilidadesAssistentes = onCall(
  { cors: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "Você precisa estar autenticado."
      );
    }
    const adminUid = request.auth.uid;
    try {
      const adminUserDoc = await db.collection("usuarios").doc(adminUid).get();
      if (
        !adminUserDoc.exists ||
        !(adminUserDoc.data().funcoes || []).includes("admin")
      ) {
        throw new HttpsError(
          "permission-denied",
          "Você não tem permissão para acessar estes dados."
        );
      }

      const dispoSnapshot = await db
        .collection("disponibilidadeAssistentes")
        .get();
      if (dispoSnapshot.empty) {
        console.log(
          "Nenhum documento encontrado em 'disponibilidadeAssistentes'."
        );
        return [];
      }

      const assistentesComDispoIds = dispoSnapshot.docs.map((doc) => doc.id);
      if (assistentesComDispoIds.length === 0) return [];

      const usuariosSnapshot = await db
        .collection("usuarios")
        .where(
          admin.firestore.FieldPath.documentId(),
          "in",
          assistentesComDispoIds
        )
        .get();
      const assistentesMap = new Map();
      usuariosSnapshot.forEach((doc) => {
        const userData = doc.data();
        // Lógica original de filtragem que você confirmou estar correta.
        if (
          userData.funcoes?.includes("servico_social") &&
          userData.inativo === false
        ) {
          assistentesMap.set(doc.id, userData);
        }
      });

      const todasDisponibilidades = [];
      dispoSnapshot.forEach((doc) => {
        // Apenas inclui na resposta se a assistente passou no filtro acima
        if (assistentesMap.has(doc.id)) {
          const assistenteInfo = assistentesMap.get(doc.id);
          // ** LÓGICA RESTAURADA PARA RETORNAR DADOS ANINHADOS **
          todasDisponibilidades.push({
            id: doc.id,
            nome: assistenteInfo.nome,
            disponibilidade: doc.data().disponibilidade,
          });
        }
      });

      console.log(
        `Retornando ${todasDisponibilidades.length} registros de disponibilidade.`
      );
      return todasDisponibilidades;
    } catch (error) {
      console.error("Erro em getTodasDisponibilidadesAssistentes:", error);
      if (error instanceof HttpsError) throw error;
      throw new HttpsError(
        "internal",
        "Não foi possível buscar as disponibilidades."
      );
    }
  }
);

// -------------------------------------------------------------------
// (ADMIN) Salva a configuração de tipo de atendimento (Triagem/Reavaliação).
// -------------------------------------------------------------------
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { getFirestore } = require("firebase-admin/firestore");
const db = getFirestore();

exports.definirTipoAgenda = onCall({ cors: true }, async (request) => {
  console.log("🔧 Iniciando definirTipoAgenda...");

  if (!request.auth) {
    console.error("❌ Requisição sem autenticação.");
    throw new HttpsError("unauthenticated", "Você precisa estar autenticado.");
  }

  const adminUid = request.auth.uid;
  console.log(`✅ Admin UID: ${adminUid}`);

  try {
    if (!request.data) {
      throw new HttpsError("invalid-argument", "Nenhum dado foi enviado.");
    }

    const { assistenteId, mes, modalidade, dias } = request.data;

    if (
      !assistenteId ||
      !mes ||
      !modalidade ||
      !Array.isArray(dias) ||
      dias.length === 0
    ) {
      throw new HttpsError(
        "invalid-argument",
        "Dados insuficientes para configurar a agenda."
      );
    }

    const adminDoc = await db.collection("usuarios").doc(adminUid).get();
    const adminData = adminDoc.data();

    if (!adminDoc.exists || !adminData?.funcoes?.includes("admin")) {
      throw new HttpsError(
        "permission-denied",
        "Apenas administradores podem executar esta ação."
      );
    }

    const dispoDoc = await db
      .collection("disponibilidadeAssistentes")
      .doc(assistenteId)
      .get();
    const assistenteDoc = await db
      .collection("usuarios")
      .doc(assistenteId)
      .get();

    if (!dispoDoc.exists || !assistenteDoc.exists()) {
      throw new HttpsError(
        "not-found",
        "Assistente ou sua disponibilidade não encontrada."
      );
    }

    const dispoData = dispoDoc.data();
    const assistenteData = assistenteDoc.data();

    if (
      !dispoData?.disponibilidade ||
      typeof dispoData.disponibilidade !== "object"
    ) {
      throw new HttpsError(
        "not-found",
        "Campo 'disponibilidade' ausente ou malformado."
      );
    }

    const modalidadeData = dispoData.disponibilidade?.[mes]?.[modalidade];
    if (!Array.isArray(modalidadeData) || modalidadeData.length === 0) {
      throw new HttpsError(
        "not-found",
        `Nenhuma disponibilidade encontrada para ${mes}/${modalidade}.`
      );
    }

    const inicio = "08:00"; // Pode ser dinâmico se quiser
    const fim = "18:00"; // Pode ser dinâmico se quiser
    const assistenteNome = assistenteData?.nome || "Assistente";

    const batch = db.batch();

    dias.forEach((configDia, index) => {
      const { dia, tipo } = configDia;
      if (
        !dia ||
        !tipo ||
        typeof dia !== "string" ||
        typeof tipo !== "string"
      ) {
        throw new HttpsError(
          "invalid-argument",
          `Item inválido em dias[${index}]: ${JSON.stringify(configDia)}`
        );
      }

      const docId = `${dia}_${assistenteId}`;
      const docRef = db.collection("agendaConfigurada").doc(docId);

      batch.set(
        docRef,
        {
          assistenteId,
          assistenteNome,
          data: dia,
          tipo,
          modalidade,
          inicio,
          fim,
          configuradoPor: adminUid,
          configuradoEm: new Date(),
        },
        { merge: true }
      );
    });

    await batch.commit();
    console.log("✅ Batch commitado com sucesso.");

    // Log da ação
    try {
      await db.collection("logsSistema").add({
        timestamp: new Date(),
        usuario: adminUid,
        acao: "Configuração de agenda",
        status: "success",
        detalhes: { assistenteId, mes, modalidade, dias },
      });
    } catch (logError) {
      console.warn("⚠️ Falha ao salvar log:", logError.message);
    }

    return {
      status: "success",
      message: `${dias.length} dia(s) configurado(s) com sucesso para ${assistenteNome}!`,
    };
  } catch (error) {
    console.error("🔥 ERRO GRAVE EM definirTipoAgenda:", {
      message: error.message,
      code: error.code,
      name: error.name,
      stack: error.stack,
    });

    // Log de erro
    try {
      await db.collection("logsSistema").add({
        timestamp: new Date(),
        usuario: request.auth?.uid || "desconhecido",
        acao: "Configuração de agenda",
        status: "error",
        detalhes: {
          assistenteId: request.data?.assistenteId,
          mes: request.data?.mes,
          modalidade: request.data?.modalidade,
          dias: request.data?.dias,
          mensagem: error.message,
        },
      });
    } catch (logError) {
      console.warn("⚠️ Falha ao salvar log de erro:", logError.message);
    }

    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError(
      "internal",
      "Ocorreu um erro interno ao salvar a configuração."
    );
  }
});

// -------------------------------------------------------------------
// (PÚBLICO) Busca horários de TRIAGEM disponíveis na agenda aberta pelo admin.
// -------------------------------------------------------------------
exports.getHorariosPublicos = onCall({ cors: true }, async (request) => {
  try {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const dataInicio = hoje.toISOString().split("T")[0];

    const dataFim = new Date(hoje);
    dataFim.setDate(hoje.getDate() + 7); // Busca horários para os próximos 7 dias
    const dataFimISO = dataFim.toISOString().split("T")[0];

    const configSnapshot = await db
      .collection("agendaConfigurada")
      .where("tipo", "==", "triagem")
      .where("data", ">=", dataInicio)
      .where("data", "<=", dataFimISO)
      .get();

    if (configSnapshot.empty) {
      return { horarios: [] };
    }

    const diasConfigurados = configSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    const slotsPotenciais = [];

    diasConfigurados.forEach((diaConfig) => {
      const [hInicio] = diaConfig.inicio.split(":").map(Number);
      const [hFim] = diaConfig.fim.split(":").map(Number);

      let hAtual = hInicio;
      let mAtual = 0;

      while (hAtual < hFim) {
        const horaSlot = `${String(hAtual).padStart(2, "0")}:${String(
          mAtual
        ).padStart(2, "0")}`;
        slotsPotenciais.push({
          id: `${diaConfig.data}_${horaSlot}_${diaConfig.assistenteId}`,
          data: diaConfig.data,
          hora: horaSlot,
          modalidade: diaConfig.modalidade,
          assistenteNome: diaConfig.assistenteNome,
          assistenteId: diaConfig.assistenteId,
        });

        mAtual += 30;
        if (mAtual >= 60) {
          hAtual++;
          mAtual = 0;
        }
      }
    });

    const agendadosSnapshot = await db
      .collection("agendamentos")
      .where("data", ">=", dataInicio)
      .where("data", "<=", dataFimISO)
      .get();

    const idsAgendados = new Set();
    agendadosSnapshot.forEach((doc) => {
      const agendamento = doc.data();
      idsAgendados.add(
        `${agendamento.data}_${agendamento.hora}_${agendamento.assistenteId}`
      );
    });

    const horariosDisponiveis = slotsPotenciais.filter(
      (slot) => !idsAgendados.has(slot.id)
    );

    return { horarios: horariosDisponiveis };
  } catch (error) {
    console.error("Erro em getHorariosPublicos:", error);
    throw new HttpsError("internal", "Ocorreu um erro ao buscar os horários.");
  }
});

// -------------------------------------------------------------------
// (PÚBLICO) Agenda um horário de triagem.
// -------------------------------------------------------------------
exports.agendarTriagemPublico = onCall({ cors: true }, async (request) => {
  const { pacienteExistenteId, cpf, nome, telefone, horarioSelecionado } =
    request.data;

  if (!horarioSelecionado || !horarioSelecionado.id || !cpf || !nome) {
    throw new HttpsError(
      "invalid-argument",
      "Dados do agendamento estão incompletos."
    );
  }

  const agendamentoId = horarioSelecionado.id;
  const agendamentoRef = db.collection("agendamentos").doc(agendamentoId);

  try {
    await db.runTransaction(async (transaction) => {
      const agendamentoDoc = await transaction.get(agendamentoRef);

      if (agendamentoDoc.exists) {
        throw new HttpsError(
          "already-exists",
          "Desculpe, este horário acabou de ser agendado por outra pessoa."
        );
      }

      const dadosAgendamento = {
        data: horarioSelecionado.data,
        hora: horarioSelecionado.hora,
        modalidade: horarioSelecionado.modalidade,
        assistenteId: horarioSelecionado.assistenteId,
        assistenteNome: horarioSelecionado.assistenteNome,
        tipo: "triagem",
        paciente: { nome, cpf, telefone },
        agendadoEm: new Date(),
      };
      transaction.set(agendamentoRef, dadosAgendamento);

      const dadosTrilha = {
        status: "triagem_agendada",
        dataTriagem: horarioSelecionado.data,
        horaTriagem: horarioSelecionado.hora,
        modalidadeTriagem: horarioSelecionado.modalidade,
        assistenteSocialNome: horarioSelecionado.assistenteNome,
        assistenteSocialId: horarioSelecionado.assistenteId,
        lastUpdate: new Date(),
      };

      if (pacienteExistenteId) {
        const docRef = db.collection("trilhaPaciente").doc(pacienteExistenteId);
        transaction.update(docRef, dadosTrilha);
      } else {
        const newDocRef = db.collection("trilhaPaciente").doc();
        transaction.set(newDocRef, {
          ...dadosTrilha,
          nomeCompleto: nome,
          cpf,
          telefoneCelular: telefone,
          timestamp: new Date(),
        });
      }
    });

    return { success: true, message: "Agendamento confirmado com sucesso!" };
  } catch (error) {
    console.error("Erro transacional ao agendar:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError(
      "internal",
      "Ocorreu um erro interno ao salvar o agendamento."
    );
  }
});
