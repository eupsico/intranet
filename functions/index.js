const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cors = require("cors")({ origin: true });

if (admin.apps.length === 0) {
  admin.initializeApp();
}
const db = admin.firestore();

// -----------------------------
// Função auxiliar para username
// -----------------------------
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
      if (dispoSnapshot.empty) return [];

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
      const assistentesAtivosMap = new Map();
      usuariosSnapshot.forEach((doc) => {
        const userData = doc.data();
        if (
          userData.funcoes?.includes("servico_social") &&
          userData.inativo === false
        ) {
          assistentesAtivosMap.set(doc.id, userData);
        }
      });

      const todasDisponibilidades = [];
      dispoSnapshot.forEach((doc) => {
        if (assistentesAtivosMap.has(doc.id)) {
          const assistenteInfo = assistentesAtivosMap.get(doc.id);
          todasDisponibilidades.push({
            id: doc.id,
            nome: assistenteInfo.nome,
            disponibilidade: doc.data().disponibilidade,
          });
        }
      });
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
// (ADMIN) Processa a configuração do admin e cria a agenda pública.
// -------------------------------------------------------------------
exports.abrirAgendaServicoSocial = onCall({ cors: true }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Você precisa estar autenticado.");
  }

  const adminUid = request.auth.uid;
  try {
    const adminUserDoc = await db.collection("usuarios").doc(adminUid).get();
    if (
      !adminUserDoc.exists ||
      !adminUserDoc.data().funcoes?.includes("admin")
    ) {
      throw new HttpsError(
        "permission-denied",
        "Você não tem permissão para executar esta ação."
      );
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
        "Dados insuficientes para abrir a agenda."
      );
    }

    const dispoDocRef = db
      .collection("disponibilidadeAssistentes")
      .doc(assistenteId);
    const assistenteDocRef = db.collection("usuarios").doc(assistenteId);

    const [dispoDoc, assistenteDoc] = await Promise.all([
      dispoDocRef.get(),
      assistenteDocRef.get(),
    ]);

    if (!dispoDoc.exists() || !assistenteDoc.exists()) {
      throw new HttpsError(
        "not-found",
        "Disponibilidade ou assistente não encontrada."
      );
    }
    const assistenteNome = assistenteDoc.data().nome;
    const dispoData = dispoDoc.data();

    if (!dispoData || !dispoData.disponibilidade) {
      throw new HttpsError(
        "not-found",
        `Nenhum registro de 'disponibilidade' encontrado para '${assistenteNome}'.`
      );
    }
    if (!dispoData.disponibilidade[mes]) {
      throw new HttpsError(
        "not-found",
        `Nenhuma configuração de disponibilidade para o mês '${mes}' encontrada para '${assistenteNome}'.`
      );
    }
    if (!dispoData.disponibilidade[mes][modalidade]) {
      throw new HttpsError(
        "not-found",
        `Nenhuma configuração para a modalidade '${modalidade}' no mês '${mes}' encontrada para '${assistenteNome}'.`
      );
    }

    const disponibilidade = dispoData.disponibilidade[mes][modalidade];

    if (
      typeof disponibilidade.inicio !== "string" ||
      typeof disponibilidade.fim !== "string" ||
      !disponibilidade.inicio.includes(":") ||
      !disponibilidade.fim.includes(":")
    ) {
      console.error("Dados de disponibilidade malformados:", {
        assistenteId,
        mes,
        modalidade,
        data: disponibilidade,
      });
      throw new HttpsError(
        "invalid-argument",
        `O formato do horário de início/fim para a assistente '${assistenteNome}' é inválido. Verifique o cadastro. O formato esperado é "HH:MM".`
      );
    }

    const batch = db.batch();
    let slotsCriados = 0;

    for (const configDia of dias) {
      const { dia, tipo } = configDia;

      let hInicio;
      let mInicio;
      let hFim;
      try {
        [hInicio, mInicio] = disponibilidade.inicio.split(":").map(Number);
        [hFim] = disponibilidade.fim.split(":").map(Number);
        if (isNaN(hInicio) || isNaN(mInicio) || isNaN(hFim)) {
          throw new Error(
            "Valor não numérico encontrado ao converter horário."
          );
        }
      } catch (e) {
        console.error("Não foi possível processar os horários:", {
          inicio: disponibilidade.inicio,
          fim: disponibilidade.fim,
          error: e,
        });
        throw new HttpsError(
          "invalid-argument",
          `Os horários '${disponibilidade.inicio}' ou '${disponibilidade.fim}' não puderam ser processados. Verifique o formato.`
        );
      }

      let hAtual = hInicio;
      let mAtual = mInicio;

      while (hAtual < hFim) {
        const horaSlot = `${String(hAtual).padStart(2, "0")}:${String(
          mAtual
        ).padStart(2, "0")}`;
        const slotData = {
          assistenteId,
          assistenteNome,
          data: dia,
          hora: horaSlot,
          modalidade: modalidade.charAt(0).toUpperCase() + modalidade.slice(1),
          tipo,
          agendado: false,
          createdAt: new Date(),
        };

        const slotRef = db.collection("agendaServicoSocial").doc();
        batch.set(slotRef, slotData);
        slotsCriados++;

        mAtual += 30;
        if (mAtual >= 60) {
          hAtual++;
          mAtual = 0;
        }
      }
    }

    await batch.commit();

    return {
      status: "success",
      message: `Agenda aberta com sucesso! ${slotsCriados} horários para ${assistenteNome} foram disponibilizados.`,
    };
  } catch (error) {
    console.error(
      "### ERRO GRAVE NA FUNÇÃO abrirAgendaServicoSocial ###:",
      error
    );
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError(
      "internal",
      "Ocorreu um erro inesperado no servidor ao processar sua solicitação.",
      { originalMessage: error.message }
    );
  }
});

// -------------------------------------------------------------------
// (PÚBLICO) Busca horários de TRIAGEM disponíveis na agenda aberta pelo admin.
// -------------------------------------------------------------------
exports.getHorariosTriagem = onCall({ cors: true }, async (request) => {
  try {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const hojeISO = hoje.toISOString().split("T")[0];

    const dataLimite = new Date(hoje);
    dataLimite.setDate(hoje.getDate() + 14); // Busca horários nos próximos 14 dias
    const dataLimiteISO = dataLimite.toISOString().split("T")[0];

    const agendaSnapshot = await db
      .collection("agendaServicoSocial")
      .where("tipo", "==", "triagem")
      .where("agendado", "==", false)
      .where("data", ">=", hojeISO)
      .where("data", "<=", dataLimiteISO)
      .orderBy("data")
      .orderBy("hora")
      .get();

    if (agendaSnapshot.empty) {
      return { horarios: [] };
    }

    const horariosDisponiveis = agendaSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        agendaId: doc.id,
        data: data.data,
        hora: data.hora,
        modalidade: data.modalidade,
        assistenteNome: data.assistenteNome,
        assistenteId: data.assistenteId,
        tipo: data.tipo,
      };
    });

    return { horarios: horariosDisponiveis };
  } catch (error) {
    console.error("### ERRO GRAVE NA FUNÇÃO getHorariosTriagem ###:", error);
    throw new HttpsError("internal", "Ocorreu um erro ao buscar os horários.", {
      originalMessage: error.message,
    });
  }
});

// -------------------------------------------------------------------
// (PÚBLICO) Agenda um horário de triagem, usando transação para garantir a vaga.
// -------------------------------------------------------------------
exports.agendarTriagemPublico = onCall({ cors: true }, async (request) => {
  const { pacienteExistenteId, cpf, nome, telefone, horarioSelecionado } =
    request.data;

  if (!horarioSelecionado || !horarioSelecionado.agendaId || !cpf || !nome) {
    throw new HttpsError(
      "invalid-argument",
      "Dados do agendamento estão incompletos."
    );
  }

  const { agendaId, ...horarioParaSalvar } = horarioSelecionado;

  try {
    await db.runTransaction(async (transaction) => {
      const agendaRef = db.collection("agendaServicoSocial").doc(agendaId);
      const agendaDoc = await transaction.get(agendaRef);

      if (!agendaDoc.exists) {
        throw new HttpsError(
          "not-found",
          "O horário selecionado não está mais disponível."
        );
      }
      if (agendaDoc.data().agendado) {
        throw new HttpsError(
          "already-exists",
          "Desculpe, este horário acabou de ser agendado por outra pessoa."
        );
      }

      transaction.update(agendaRef, {
        agendado: true,
        agendadoEm: new Date(),
        paciente: { nome, cpf },
      });

      const dadosAgendamento = {
        status: "triagem_agendada",
        dataTriagem: horarioParaSalvar.data,
        horaTriagem: horarioParaSalvar.hora,
        modalidadeTriagem: horarioParaSalvar.modalidade,
        assistenteSocialNome: horarioParaSalvar.assistenteNome,
        assistenteSocialId: horarioParaSalvar.assistenteId,
        lastUpdate: new Date(),
      };

      if (pacienteExistenteId) {
        const docRef = db.collection("trilhaPaciente").doc(pacienteExistenteId);
        transaction.update(docRef, dadosAgendamento);
      } else {
        const newDocRef = db.collection("trilhaPaciente").doc();
        transaction.set(newDocRef, {
          ...dadosAgendamento,
          nomeCompleto: nome,
          cpf,
          telefoneCelular: telefone,
          timestamp: new Date(),
        });
      }
    });

    return { success: true, message: "Agendamento confirmado com sucesso!" };
  } catch (error) {
    console.error("Erro grave ao salvar agendamento:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError(
      "internal",
      "Ocorreu um erro interno ao salvar o agendamento.",
      { originalMessage: error.message }
    );
  }
});
