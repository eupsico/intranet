const { onCall, HttpsError } = require("firebase-functions/v2/https");
const {
  onDocumentCreated,
  onDocumentUpdated,
} = require("firebase-functions/v2/firestore");
const { logger } = require("firebase-functions");

// Importe as funções modulares do Admin SDK
const { initializeApp } = require("firebase-admin/app");
const {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
} = require("firebase-admin/firestore");

// Inicialize o app e o Firestore da maneira correta
initializeApp();
const db = getFirestore();

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
  while (true) {
    const usernameNumerado = `${usernameBase} ${contador}`;
    if (!(await checkUsernameExists(usernameNumerado))) return usernameNumerado;
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

  if (!cpf) {
    throw new HttpsError("invalid-argument", "CPF/ID não fornecido.");
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
          rua: paciente.rua || "",
          numeroCasa: paciente.numeroCasa || "",
          bairro: paciente.bairro || "",
          cidade: paciente.cidade || "",
          cep: paciente.cep || "",
        },
      };
    }
  } catch (error) {
    console.error("Erro ao verificar CPF na trilha:", error);
    throw new HttpsError(
      "internal",
      "Erro interno do servidor ao verificar CPF/ID."
    );
  }
});
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
      timestamp: new Date(),
      status: "inscricao_documentos",
      nomeCompleto: inscricaoData.nomeCompleto || "Não informado",
      cpf: inscricaoData.cpf || "Não informado",
      dataNascimento: inscricaoData.dataNascimento || "Não informado",
      telefoneCelular: inscricaoData.telefoneCelular || "Não informado",
      email: inscricaoData.email || "Não informado",
      rua: inscricaoData.rua || "Não informado",
      numeroCasa: inscricaoData.numeroCasa || "Não informado",
      bairro: inscricaoData.bairro || "Não informado",
      cidade: inscricaoData.cidade || "Não informado",
      cep: inscricaoData.cep || "Não informado",
      complemento: inscricaoData.complemento || "",
      responsavel: inscricaoData.responsavel || {},
      rendaMensal: inscricaoData.rendaMensal || "Não informado",
      rendaFamiliar: inscricaoData.rendaFamiliar || "Não informado",
      casaPropria: inscricaoData.casaPropria || "Não informado",
      pessoasMoradia: inscricaoData.pessoasMoradia || "Não informado",
      motivoBusca: inscricaoData.motivoBusca || "Não informado",
      disponibilidadeGeral: inscricaoData.disponibilidadeGeral || [],
      disponibilidadeEspecifica: inscricaoData.disponibilidadeEspecifica || [],
      comoSoube: inscricaoData.comoSoube || "Não informado",
    };

    try {
      await db.collection("trilhaPaciente").add(cardData);
      console.log(
        `(v2) Card completo criado com sucesso na Trilha para CPF: ${cardData.cpf}`
      );
    } catch (error) {
      console.error("(v2) Erro ao criar card completo na Trilha:", error);
    }
  }
);
exports.getTodasDisponibilidadesAssistentes = onCall(
  { cors: true },
  async (request) => {
    const adminUid = request.auth?.uid;
    if (!adminUid) {
      throw new HttpsError(
        "unauthenticated",
        "Você precisa estar autenticado."
      );
    }

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
        if (
          userData.funcoes?.includes("servico_social") &&
          userData.inativo === false
        ) {
          assistentesMap.set(doc.id, userData);
        }
      });

      const todasDisponibilidades = [];
      dispoSnapshot.forEach((doc) => {
        if (assistentesMap.has(doc.id)) {
          const assistenteInfo = assistentesMap.get(doc.id);
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
exports.definirTipoAgenda = onCall({ cors: true }, async (request) => {
  console.log("🔧 Iniciando definirTipoAgenda...");

  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Você precisa estar autenticado.");
  }

  const adminUid = request.auth.uid;

  try {
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
    if (!adminDoc.exists || !adminDoc.data()?.funcoes?.includes("admin")) {
      throw new HttpsError(
        "permission-denied",
        "Apenas administradores podem executar esta ação."
      );
    }

    const dispoSnap = await db
      .collection("disponibilidadeAssistentes")
      .doc(assistenteId)
      .get();
    const assistenteSnap = await db
      .collection("usuarios")
      .doc(assistenteId)
      .get();
    if (!dispoSnap.exists || !assistenteSnap.exists) {
      throw new HttpsError(
        "not-found",
        "Assistente ou disponibilidade não encontrada."
      );
    }

    const dispoData = dispoSnap.data();
    const assistenteData = assistenteSnap.data();
    const assistenteNome = assistenteData?.nome || "Assistente";

    const bloco = dispoData.disponibilidade?.[mes]?.[modalidade];
    if (!bloco || !Array.isArray(bloco.dias) || !bloco.inicio || !bloco.fim) {
      throw new HttpsError(
        "not-found",
        `Nenhuma disponibilidade encontrada para ${mes}/${modalidade}.`
      );
    }

    const { dias: diasDisponiveis, inicio, fim } = bloco;

    const batch = db.batch();
    dias.forEach(({ dia, tipo }, index) => {
      if (!dia || !tipo) {
        throw new HttpsError(
          "invalid-argument",
          `Item inválido em dias[${index}]`
        );
      }
      if (!diasDisponiveis.includes(dia)) {
        throw new HttpsError(
          "invalid-argument",
          `Dia ${dia} não está na disponibilidade cadastrada.`
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

    await db.collection("logsSistema").add({
      timestamp: new Date(),
      usuario: adminUid,
      acao: "Configuração de agenda",
      status: "success",
      detalhes: { assistenteId, mes, modalidade, dias },
    });

    return {
      status: "success",
      message: `${dias.length} dia(s) configurado(s) com sucesso para ${assistenteNome}!`,
    };
  } catch (error) {
    console.error("🔥 ERRO definirTipoAgenda:", error);

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

    if (error instanceof HttpsError) throw error;
    throw new HttpsError(
      "internal",
      "Ocorreu um erro interno ao salvar a configuração."
    );
  }
});

/**
 * Busca os horários de triagem disponíveis, combinando a agenda configurada
 * com os agendamentos já existentes.
 */
exports.getHorariosPublicos = onCall({ cors: true }, async (request) => {
  try {
    logger.info("Iniciando getHorariosPublicos...");
    const agora = new Date();
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const dataInicio = hoje.toISOString().split("T")[0];

    // 1. Busca as configurações do sistema
    const configuracoesRef = db.collection("configuracoesSistema");
    const configuracoesSnapshot = await getDocs(configuracoesRef);
    const configuracoes = {};
    configuracoesSnapshot.forEach((doc) => {
      configuracoes[doc.id] = doc.data().valor;
    });

    const minimoHorasAntecedencia =
      Number(configuracoes["minimoHorasAntecedencia"]) || 6;
    const quantidadeDiasBusca =
      Number(configuracoes["quantidadeDiasBusca"]) || 7;
    const dataFim = new Date(hoje);
    dataFim.setDate(hoje.getDate() + quantidadeDiasBusca);
    const dataFimISO = dataFim.toISOString().split("T")[0];
    logger.info(`Buscando agendas de ${dataInicio} a ${dataFimISO}.`);

    // 2. Busca os agendamentos já existentes para saber os horários ocupados
    const agendamentosQuery = query(
      collection(db, "trilhaPaciente"),
      where("status", "==", "triagem_agendada"),
      where("dataTriagem", ">=", dataInicio)
    );
    const agendamentosSnapshot = await getDocs(agendamentosQuery);

    const horariosOcupados = new Set();
    agendamentosSnapshot.forEach((doc) => {
      const agendamento = doc.data();
      if (
        agendamento.assistenteSocialId &&
        agendamento.dataTriagem &&
        agendamento.horaTriagem
      ) {
        const chave = `${agendamento.assistenteSocialId}-${agendamento.dataTriagem}-${agendamento.horaTriagem}`;
        horariosOcupados.add(chave);
      }
    });
    logger.info(`Encontrados ${horariosOcupados.size} horários já ocupados.`);

    // 3. Busca a configuração de agenda (horários de trabalho)
    const configQuery = query(
      collection(db, "agendaConfigurada"),
      where("tipo", "==", "triagem"),
      where("data", ">=", dataInicio),
      where("data", "<=", dataFimISO)
    );
    const configSnapshot = await getDocs(configQuery);

    if (configSnapshot.empty) {
      logger.warn("Nenhuma configuração de agenda encontrada para o período.");
      return { horarios: [] };
    }

    const diasConfigurados = configSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // 4. Gera os slots de horário disponíveis
    const slotsPotenciais = [];
    diasConfigurados.forEach((diaConfig) => {
      // VERIFICAÇÃO DE SEGURANÇA: Garante que os dados necessários existem e são do tipo string
      if (
        !diaConfig.inicio ||
        !diaConfig.fim ||
        typeof diaConfig.inicio !== "string" ||
        typeof diaConfig.fim !== "string"
      ) {
        logger.warn(
          `Documento ${diaConfig.id} ignorado por ter dados de início/fim inválidos ou ausentes.`
        );
        return; // Pula para o próximo item do loop
      }

      const [hInicio, mInicio] = diaConfig.inicio.split(":").map(Number);
      const [hFim, mFim] = diaConfig.fim.split(":").map(Number);

      if (isNaN(hInicio) || isNaN(mInicio) || isNaN(hFim) || isNaN(mFim)) {
        logger.warn(
          `Documento ${diaConfig.id} ignorado por ter formato de hora inválido.`
        );
        return; // Pula para o próximo item
      }

      const inicioEmMinutos = hInicio * 60 + mInicio;
      const fimEmMinutos = hFim * 60 + mFim;

      for (
        let minutos = inicioEmMinutos;
        minutos < fimEmMinutos;
        minutos += 30
      ) {
        const hAtual = Math.floor(minutos / 60);
        const mAtual = minutos % 60;
        const horaSlot = `${String(hAtual).padStart(2, "0")}:${String(
          mAtual
        ).padStart(2, "0")}`;
        const dataHoraSlot = new Date(`${diaConfig.data}T${horaSlot}:00`);

        const diffMs = dataHoraSlot - agora;
        const diffHoras = diffMs / (1000 * 60 * 60);

        if (diffHoras >= minimoHorasAntecedencia) {
          const chaveSlot = `${diaConfig.assistenteId}-${diaConfig.data}-${horaSlot}`;
          if (!horariosOcupados.has(chaveSlot)) {
            slotsPotenciais.push({
              id: `${diaConfig.data}_${horaSlot}_${diaConfig.assistenteId}`,
              data: diaConfig.data,
              hora: horaSlot,
              modalidade: diaConfig.modalidade,
              assistenteNome: diaConfig.assistenteNome,
              assistenteId: diaConfig.assistenteId,
            });
          }
        }
      }
    });

    logger.info(
      `Função concluída. ${slotsPotenciais.length} horários disponíveis encontrados.`
    );
    return { horarios: slotsPotenciais };
  } catch (error) {
    logger.error("❌ Erro crítico ao buscar horários públicos:", error);
    throw new HttpsError("internal", "Erro ao buscar horários públicos.", {
      originalError: error.message,
    });
  }
});

exports.agendarTriagemPublico = onCall({ cors: true }, async (request) => {
  const {
    cpf,
    assistenteSocialId,
    assistenteSocialNome,
    data: dataAgendamento,
    hora,
    nomeCompleto,
    telefone,
  } = request.data;

  if (
    !cpf ||
    !assistenteSocialId ||
    !assistenteSocialNome ||
    !dataAgendamento ||
    !hora ||
    !nomeCompleto ||
    !telefone
  ) {
    throw new HttpsError(
      "invalid-argument",
      "Todos os campos obrigatórios devem ser preenchidos."
    );
  }

  try {
    const trilhaRef = db.collection("trilhaPaciente");
    const q = trilhaRef
      .where("cpf", "==", cpf)
      .where("status", "==", "inscricao_documentos")
      .limit(1);

    const snapshot = await q.get();

    if (snapshot.empty) {
      throw new HttpsError(
        "not-found",
        "CPF não localizado na fila de inscrição. Por favor, entre em contato com a EuPsico para verificar seu cadastro antes de agendar."
      );
    }

    const pacienteDoc = snapshot.docs[0];

    const dadosDaTriagem = {
      status: "triagem_agendada",
      assistenteSocialNome,
      assistenteSocialId,
      dataTriagem: dataAgendamento,
      horaTriagem: hora,
      tipoTriagem: "Online",
      lastUpdate: admin.firestore.FieldValue.serverTimestamp(),
      lastUpdatedBy: "Agendamento Público",
    };

    await pacienteDoc.ref.update(dadosDaTriagem);

    return {
      success: true,
      message:
        "Agendamento realizado e card do paciente atualizado com sucesso!",
      pacienteId: pacienteDoc.id,
    };
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    console.error("Erro interno ao tentar agendar triagem:", error);
    throw new HttpsError(
      "internal",
      "Ocorreu um erro inesperado ao processar o agendamento. Tente novamente mais tarde."
    );
  }
});
exports.assinarContrato = onCall({ cors: true }, async (request) => {
  const { pacienteId, nomeSignatario, cpfSignatario, versaoContrato, ip } =
    request.data;

  if (!pacienteId || !nomeSignatario || !cpfSignatario) {
    throw new HttpsError("invalid-argument", "Dados obrigatórios ausentes.");
  }

  if (cpfSignatario.length !== 11) {
    throw new HttpsError("invalid-argument", "CPF inválido.");
  }

  const assinatura = {
    contratoAssinado: {
      assinadoEm: admin.firestore.Timestamp.now(),
      nomeSignatario,
      cpfSignatario,
      versaoContrato: versaoContrato || "1.0",
      ip: ip || "não identificado",
    },
    lastUpdate: admin.firestore.Timestamp.now(),
  };

  try {
    await db.collection("trilhaPaciente").doc(pacienteId).update(assinatura);
    return { success: true, message: "Contrato assinado com sucesso." };
  } catch (error) {
    console.error("Erro ao salvar assinatura:", error);
    throw new HttpsError(
      "internal",
      "Erro ao salvar assinatura no banco de dados."
    );
  }
});
exports.registrarDesfechoPb = onCall({ cors: true }, async (request) => {
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "A função só pode ser chamada por um usuário autenticado."
    );
  }

  const { pacienteId, atendimentoId, desfecho, motivo, encaminhamento } =
    request.data;
  const profissionalId = request.auth.uid;

  if (!pacienteId || !atendimentoId || !desfecho) {
    throw new HttpsError(
      "invalid-argument",
      "Faltam dados essenciais (pacienteId, atendimentoId, desfecho)."
    );
  }

  const pacienteRef = db.collection("trilhaPaciente").doc(pacienteId);

  try {
    const docSnap = await pacienteRef.get();
    if (!docSnap.exists) {
      throw new HttpsError("not-found", "Paciente não encontrado.");
    }

    const dadosDoPaciente = docSnap.data();
    const atendimentos = dadosDoPaciente.atendimentosPB || [];

    const indiceDoAtendimento = atendimentos.findIndex(
      (atendimento) =>
        atendimento.atendimentoId === atendimentoId &&
        atendimento.profissionalId === profissionalId
    );

    if (indiceDoAtendimento === -1) {
      throw new HttpsError(
        "permission-denied",
        "Atendimento não encontrado ou você não tem permissão para modificá-lo."
      );
    }

    atendimentos[indiceDoAtendimento].statusAtendimento = "encerrado";
    atendimentos[indiceDoAtendimento].desfecho = {
      tipo: desfecho,
      motivo: motivo || "",
      encaminhamento: encaminhamento || null,
      responsavelId: profissionalId,
      responsavelNome: atendimentos[indiceDoAtendimento].profissionalNome,
      data: new Date(),
    };

    await pacienteRef.update({
      atendimentosPB: atendimentos,
      lastUpdate: new Date(),
    });

    return { success: true, message: "Desfecho registrado com sucesso." };
  } catch (error) {
    console.error("Erro ao registrar desfecho no Firestore:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError(
      "internal",
      "Não foi possível salvar o desfecho do paciente."
    );
  }
});
exports.getSupervisorSlots = onCall(async (request) => {
  const supervisorUid = request.data.supervisorUid;
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "Você precisa estar autenticado para ver os horários."
    );
  }
  if (!supervisorUid) {
    throw new HttpsError(
      "invalid-argument",
      "O UID do supervisor é obrigatório."
    );
  }

  try {
    const configDoc = await db
      .collection("configuracoesSistema")
      .doc("minimoAgendaSupervisao")
      .get();

    let minimoHoras = 24;
    let quantidadeDiasSupervisao = 15;

    if (configDoc.exists) {
      const configData = configDoc.data();
      minimoHoras = parseInt(configData.minimoHoras, 10) || 24;
      quantidadeDiasSupervisao =
        parseInt(configData.quantidadeDiasSupervisao, 10) || 15;
    }

    const supervisorDoc = await db
      .collection("usuarios")
      .doc(supervisorUid)
      .get();
    if (!supervisorDoc.exists) {
      throw new HttpsError("not-found", "Supervisor não encontrado.");
    }

    const supervisorData = supervisorDoc.data();
    const diasHorarios = supervisorData.diasHorarios || [];

    const potentialSlots = [];
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

    for (let i = 0; i < quantidadeDiasSupervisao; i++) {
      const diaAtual = new Date();
      diaAtual.setDate(hoje.getDate() + i);
      diaAtual.setHours(0, 0, 0, 0);

      const nomeDiaSemana = diasDaSemana[diaAtual.getDay()];

      diasHorarios.forEach((horario) => {
        if (horario.dia && horario.dia.toLowerCase() === nomeDiaSemana) {
          const [h, m] = horario.inicio.split(":");
          const slotDate = new Date(diaAtual);
          slotDate.setHours(parseInt(h, 10), parseInt(m, 10), 0, 0);

          const diffMs = slotDate.getTime() - agora.getTime();
          const diffHoras = diffMs / (1000 * 60 * 60);

          if (diffHoras >= minimoHoras) {
            potentialSlots.push({
              date: slotDate.toISOString(),
              horario: horario,
            });
          }
        }
      });
    }

    const agendamentosRef = db.collection("agendamentos");
    const slotChecks = potentialSlots.map(async (slot) => {
      const q = agendamentosRef
        .where("supervisorUid", "==", supervisorUid)
        .where(
          "dataAgendamento",
          "==",
          admin.firestore.Timestamp.fromDate(new Date(slot.date))
        );

      const querySnapshot = await q.get();
      return {
        ...slot,
        booked: querySnapshot.size,
        capacity: calculateCapacity(slot.horario.inicio, slot.horario.fim),
      };
    });

    const finalSlots = await Promise.all(slotChecks);

    return { slots: finalSlots };
  } catch (error) {
    console.error("Erro em getSupervisorSlots:", error);
    throw new HttpsError(
      "internal",
      "Ocorreu um erro ao buscar os horários de supervisão."
    );
  }
});

/**
 * Calcula a capacidade de agendamentos em slots de 30 minutos.
 * @param {string} inicio - Hora de início (HH:mm).
 * @param {string} fim - Hora de fim (HH:mm).
 * @return {number} Quantidade de slots de 30 minutos entre inicio e fim.
 */
function calculateCapacity(inicio, fim) {
  try {
    const [startH, startM] = inicio.split(":").map(Number);
    const [endH, endM] = fim.split(":").map(Number);

    const startTotal = startH * 60 + startM;
    const endTotal = endH * 60 + endM;

    const diffMin = endTotal - startTotal;
    if (diffMin <= 0 || !Number.isFinite(diffMin)) return 0;

    return Math.floor(diffMin / 30);
  } catch {
    return 0;
  }
}
exports.gerenciarStatusGeralDoPaciente = onDocumentUpdated(
  "trilhaPaciente/{pacienteId}",
  async (event) => {
    const dadosAntes = event.data.before.data();
    const dadosDepois = event.data.after.data();
    const pacienteId = event.params.pacienteId;

    // Só continua se houve alteração nos atendimentosPB
    if (
      JSON.stringify(dadosDepois.atendimentosPB) ===
      JSON.stringify(dadosAntes.atendimentosPB)
    ) {
      logger.info(
        `(ID: ${pacienteId}) Nenhuma mudança nos atendimentos, a função será encerrada.`
      );
      return;
    }

    const atendimentos = dadosDepois.atendimentosPB;
    if (!atendimentos || atendimentos.length === 0) {
      logger.info(
        `(ID: ${pacienteId}) Lista de atendimentos vazia ou inexistente.`
      );
      return;
    }

    const todosEncerrados = atendimentos.every(
      (at) => at.statusAtendimento === "encerrado"
    );

    const statusAtuaisDePB = [
      "em_atendimento_pb",
      "aguardando_info_horarios",
      "cadastrar_horario_psicomanager",
    ];

    if (todosEncerrados && statusAtuaisDePB.includes(dadosDepois.status)) {
      logger.info(
        `(ID: ${pacienteId}) Todos os atendimentos de PB foram encerrados. Atualizando status para 'alta'.`
      );
      try {
        await event.data.after.ref.update({
          status: "alta",
          lastUpdate: new Date(),
          lastUpdatedBy: "Sistema (Gerenciador de Status)",
        });
        return {
          status: "sucesso",
          message: "Status geral atualizado para alta.",
        };
      } catch (error) {
        logger.error(
          `Erro ao atualizar status do paciente ${pacienteId}:`,
          error
        );
        return { status: "erro", message: "Falha ao atualizar status." };
      }
    }

    logger.info(
      `(ID: ${pacienteId}) Nem todos os atendimentos estão encerrados ou status atual não é de PB.`
    );
    return;
  }
);
