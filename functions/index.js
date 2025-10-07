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
  // Apenas verifica se o campo não está vazio. A lógica de validação mais complexa
  // foi movida para o frontend. O backend confia que recebeu um CPF válido ou um ID TEMP.
  if (!cpf) {
    throw new HttpsError("invalid-argument", "CPF/ID não fornecido.");
  }

  try {
    const trilhaRef = db.collection("trilhaPaciente");
    // Esta consulta agora funcionará para ambos os casos
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

    // Objeto de dados completo para o novo card na trilha do paciente
    const cardData = {
      // IDs e Timestamps
      inscricaoId: event.params.inscricaoId,
      timestamp: new Date(),
      status: "inscricao_documentos",

      // Dados Pessoais
      nomeCompleto: inscricaoData.nomeCompleto || "Não informado",
      cpf: inscricaoData.cpf || "Não informado",
      dataNascimento: inscricaoData.dataNascimento || "Não informado",

      // Contato e Endereço
      telefoneCelular: inscricaoData.telefoneCelular || "Não informado",
      email: inscricaoData.email || "Não informado",
      rua: inscricaoData.rua || "Não informado",
      numeroCasa: inscricaoData.numeroCasa || "Não informado",
      bairro: inscricaoData.bairro || "Não informado",
      cidade: inscricaoData.cidade || "Não informado",
      cep: inscricaoData.cep || "Não informado",
      complemento: inscricaoData.complemento || "",

      // Dados do Responsável (se houver)
      responsavel: inscricaoData.responsavel || {},

      // Dados Socioeconômicos
      rendaMensal: inscricaoData.rendaMensal || "Não informado",
      rendaFamiliar: inscricaoData.rendaFamiliar || "Não informado",
      casaPropria: inscricaoData.casaPropria || "Não informado",
      pessoasMoradia: inscricaoData.pessoasMoradia || "Não informado",

      // Motivo e Disponibilidade
      motivoBusca: inscricaoData.motivoBusca || "Não informado",
      disponibilidadeGeral: inscricaoData.disponibilidadeGeral || [],
      disponibilidadeEspecifica: inscricaoData.disponibilidadeEspecifica || [],

      // Outros
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

    // Verifica se é admin
    const adminDoc = await db.collection("usuarios").doc(adminUid).get();
    if (!adminDoc.exists || !adminDoc.data()?.funcoes?.includes("admin")) {
      throw new HttpsError(
        "permission-denied",
        "Apenas administradores podem executar esta ação."
      );
    }

    // Busca disponibilidade e dados do assistente
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

    // 🔑 Aqui está o formato certo
    const bloco = dispoData.disponibilidade?.[mes]?.[modalidade];
    if (!bloco || !Array.isArray(bloco.dias) || !bloco.inicio || !bloco.fim) {
      throw new HttpsError(
        "not-found",
        `Nenhuma disponibilidade encontrada para ${mes}/${modalidade}.`
      );
    }

    const { dias: diasDisponiveis, inicio, fim } = bloco;

    // Monta batch
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

    // Log no servidor
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

// -------------------------------------------------------------------
// (PÚBLICO) Busca horários de TRIAGEM disponíveis na agenda aberta pelo admin.
// -------------------------------------------------------------------
/**
 * @summary Busca horários de triagem disponíveis para o público.
 * @description Retorna uma lista de horários de assistentes sociais,
 * excluindo aqueles que já foram agendados na coleção 'agendamentosTriagem'.
 * @returns {Promise<{horarios: Array<object>}>}
 * Uma lista de objetos, cada um representando um horário disponível.
 * @throws {functions.https.HttpsError} Se ocorrer um erro na consulta.
 */
exports.getHorariosPublicos = onCall({ cors: true }, async (request) => {
  try {
    const agora = new Date();
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const dataInicio = hoje.toISOString().split("T")[0];

    const configuracoesSnapshot = await db
      .collection("configuracoesSistema")
      .get();
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

    // --- INÍCIO DA CORREÇÃO ---

    // 1. Buscar todos os agendamentos de triagem JÁ REALIZADOS que ainda vão acontecer.
    const agendamentosSnapshot = await db
      .collection("trilhaPaciente")
      .where("status", "==", "triagem_agendada")
      .where("dataTriagem", ">=", dataInicio)
      .get();

    // 2. Criar um conjunto (Set) de chaves únicas para os horários ocupados para verificação rápida.
    const horariosOcupados = new Set();
    agendamentosSnapshot.forEach((doc) => {
      const agendamento = doc.data();
      if (
        agendamento.assistenteSocialId &&
        agendamento.dataTriagem &&
        agendamento.horaTriagem
      ) {
        // A chave única combina ID do assistente, data e hora.
        const chave = `${agendamento.assistenteSocialId}-${agendamento.dataTriagem}-${agendamento.horaTriagem}`;
        horariosOcupados.add(chave);
      }
    });

    // --- FIM DA CORREÇÃO ---

    console.log(
      `📅 Buscando horários de triagem entre ${dataInicio} e ${dataFimISO}`
    );

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
      if (!diaConfig.inicio || !diaConfig.fim) {
        console.warn(`Documento ${diaConfig.id} sem horários definidos`);
        return;
      }

      const [hInicio, mInicio = 0] = diaConfig.inicio.split(":").map(Number);
      const [hFim, mFim = 0] = diaConfig.fim.split(":").map(Number);

      let hAtual = hInicio;
      let mAtual = mInicio;

      while (hAtual < hFim || (hAtual === hFim && mAtual <= mFim)) {
        const horaSlot = `${String(hAtual).padStart(2, "0")}:${String(
          mAtual
        ).padStart(2, "0")}`;
        const dataHoraSlot = new Date(`${diaConfig.data}T${horaSlot}:00`);
        const diffMs = dataHoraSlot - agora;
        const diffHoras = diffMs / (1000 * 60 * 60);

        if (diffHoras >= minimoHorasAntecedencia) {
          // --- INÍCIO DA CORREÇÃO ---

          // 3. VERIFICAR se o slot NÃO está no conjunto de horários ocupados.
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
          // --- FIM DA CORREÇÃO ---
        }

        mAtual += 30;
        if (mAtual >= 60) {
          hAtual++;
          mAtual = 0;
        }
      }
    });

    return { horarios: slotsPotenciais };
  } catch (error) {
    console.error("❌ Erro ao buscar horários públicos:", error);
    return { error: "Erro ao buscar horários públicos." };
  }
});

/**
 * Agenda a triagem para um paciente já inscrito, atualizando seu card na Trilha do Paciente.
 * A função busca por um paciente com o CPF fornecido que esteja na etapa 'inscricao_documentos'.
 * Se encontrado, atualiza o card com os dados do agendamento e o move para 'triagem_agendada'.
 * Se não for encontrado, retorna um erro instruindo o usuário a contatar a EuPsico.
 *
 * @param {object} request - O objeto da requisição da Cloud Function.
 * @param {object} request.data - Os dados do agendamento enviados pelo cliente.
 * @param {string} request.data.cpf - O CPF do paciente.
 * @param {string} request.data.assistenteSocialId - O ID do assistente social.
 * @param {string} request.data.assistenteSocialNome - O nome do assistente social.
 * @param {string} request.data.data - A data do agendamento (YYYY-MM-DD).
 * @param {string} request.data.hora - A hora do agendamento (HH:mm).
 * @returns {Promise<object>} - Uma promessa que resolve com uma mensagem de sucesso.
 * @throws {functions.https.HttpsError} - Lança um erro se o paciente não for encontrado ou se os dados forem inválidos.
 */
exports.agendarTriagemPublico = onCall({ cors: true }, async (request) => {
  // Extrai o CPF e os dados do agendamento do corpo da requisição
  const {
    cpf,
    assistenteSocialId,
    assistenteSocialNome,
    data: dataAgendamento,
    hora,
    nomeCompleto,
    email,
    telefone,
    comoConheceu,
  } = request.data;

  // Validação para garantir que todos os dados essenciais foram enviados
  if (
    !cpf ||
    !assistenteSocialId ||
    !assistenteSocialNome ||
    !dataAgendamento ||
    !hora ||
    !nomeCompleto ||
    !email ||
    !telefone
  ) {
    throw new HttpsError(
      "invalid-argument",
      "Todos os campos obrigatórios devem ser preenchidos."
    );
  }

  try {
    const trilhaRef = db.collection("trilhaPaciente");
    // Cria uma consulta para encontrar o paciente pelo CPF na etapa correta
    const q = trilhaRef
      .where("cpf", "==", cpf)
      .where("status", "==", "inscricao_documentos")
      .limit(1);

    const snapshot = await q.get();

    // REGRA DE NEGÓCIO: Se não encontrar o paciente, retorna um erro claro
    if (snapshot.empty) {
      throw new HttpsError(
        "not-found",
        "CPF não localizado na fila de inscrição. Por favor, entre em contato com a EuPsico para verificar seu cadastro antes de agendar."
      );
    }

    // Se encontrou, pega a referência do documento
    const pacienteDoc = snapshot.docs[0];

    // Prepara os dados que serão ATUALIZADOS no card do paciente
    const dadosDaTriagem = {
      status: "triagem_agendada", // Move o card para a nova coluna
      assistenteSocialNome: assistenteSocialNome,
      assistenteSocialId: assistenteSocialId,
      dataTriagem: dataAgendamento,
      horaTriagem: hora,
      tipoTriagem: "Online", // Valor padrão para agendamento público
      lastUpdate: admin.firestore.FieldValue.serverTimestamp(),
      lastUpdatedBy: "Agendamento Público",
    };

    // Atualiza o documento existente na coleção 'trilhaPaciente'
    await pacienteDoc.ref.update(dadosDaTriagem);

    return {
      success: true,
      message:
        "Agendamento realizado e card do paciente atualizado com sucesso!",
      pacienteId: pacienteDoc.id,
    };
  } catch (error) {
    // Se o erro for o que criamos (not-found), apenas o repassa para o cliente
    if (error instanceof HttpsError) {
      throw error;
    }
    // Para qualquer outro erro inesperado, loga e retorna uma mensagem genérica
    console.error("Erro interno ao tentar agendar triagem:", error);
    throw new HttpsError(
      "internal",
      "Ocorreu um erro inesperado ao processar o agendamento. Tente novamente mais tarde."
    );
  }
});

// -------------------------------------------------------------------
// (PÚBLICO) Assinatura do contrato terapêutico.
// -------------------------------------------------------------------
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
// -------------------------------------------------------------------
// REGISTRA O DESFECHO DE UM ATENDIMENTO DE PB (LÓGICA ATUALIZADA)
// -------------------------------------------------------------------
exports.registrarDesfechoPb = onCall({ cors: true }, async (request) => {
  // Verifica se o usuário que está chamando a função está autenticado
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "A função só pode ser chamada por um usuário autenticado."
    );
  }

  // Coleta os dados enviados pelo frontend
  const { pacienteId, atendimentoId, desfecho, motivo, encaminhamento } =
    request.data;
  const profissionalId = request.auth.uid; // Pega o ID do profissional que está logado

  // Valida se os dados essenciais foram recebidos
  if (!pacienteId || !atendimentoId || !desfecho) {
    throw new HttpsError(
      "invalid-argument",
      "Faltam dados essenciais (pacienteId, atendimentoId, desfecho)."
    );
  }

  const pacienteRef = db.collection("trilhaPaciente").doc(pacienteId);

  try {
    // Busca os dados atuais do paciente no banco de dados
    const docSnap = await pacienteRef.get();
    if (!docSnap.exists) {
      throw new HttpsError("not-found", "Paciente não encontrado.");
    }

    const dadosDoPaciente = docSnap.data();
    const atendimentos = dadosDoPaciente.atendimentosPB || [];

    // Encontra o índice (a posição) do atendimento específico que precisa ser modificado
    const indiceDoAtendimento = atendimentos.findIndex(
      (atendimento) =>
        atendimento.atendimentoId === atendimentoId &&
        atendimento.profissionalId === profissionalId
    );

    // Se não encontrar o atendimento, significa que algo está errado ou o profissional não tem permissão
    if (indiceDoAtendimento === -1) {
      throw new HttpsError(
        "permission-denied",
        "Atendimento não encontrado ou você não tem permissão para modificá-lo."
      );
    }

    // Atualiza apenas o atendimento correto na lista
    atendimentos[indiceDoAtendimento].statusAtendimento = "encerrado";
    atendimentos[indiceDoAtendimento].desfecho = {
      tipo: desfecho,
      motivo: motivo || "",
      encaminhamento: encaminhamento || null,
      responsavelId: profissionalId,
      responsavelNome: atendimentos[indiceDoAtendimento].profissionalNome,
      data: new Date(),
    };

    // Salva a lista de atendimentos modificada de volta no documento do paciente
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
/**
 * Calcula a capacidade de agendamentos em slots de 30 minutos.
 * @param {string} inicio - Hora de início (HH:mm).
 * @param {string} fim - Hora de fim (HH:mm).
 * @return {number} A quantidade de slots.
 */
function calculateCapacity(inicio, fim) {
  try {
    const [startH, startM] = inicio.split(":").map(Number);
    const [endH, endM] = fim.split(":").map(Number);
    return Math.floor((endH * 60 + endM - (startH * 60 + startM)) / 30);
  } catch (e) {
    return 0;
  }
}

/**
 * Cloud Function para buscar horários de supervisão disponíveis.
 * É chamada pelo cliente e executa com permissões de administrador.
 */
exports.getSupervisorSlots = functions.https.onCall(async (data, context) => {
  // Verifica se o usuário está autenticado
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Você precisa estar autenticado para ver os horários."
    );
  }

  const supervisorUid = data.supervisorUid;
  if (!supervisorUid) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "O UID do supervisor é obrigatório."
    );
  }

  try {
    // 1. Busca as configurações do sistema
    const configDoc = await db
      .collection("configuracoesSistema")
      .doc("minimoAgendaSupervisao")
      .get();

    let minimoHoras = 24; // Valor padrão
    let quantidadeDiasSupervisao = 15; // Valor padrão

    if (configDoc.exists) {
      const configData = configDoc.data();
      minimoHoras = parseInt(configData.minimoHoras, 10) || 24;
      quantidadeDiasSupervisao =
        parseInt(configData.quantidadeDiasSupervisao, 10) || 15;
    }

    // 2. Busca os dados do supervisor (horários de trabalho)
    const supervisorDoc = await db
      .collection("usuarios")
      .doc(supervisorUid)
      .get();
    if (!supervisorDoc.exists) {
      throw new functions.https.HttpsError(
        "not-found",
        "Supervisor não encontrado."
      );
    }
    const supervisorData = supervisorDoc.data();
    const diasHorarios = supervisorData.diasHorarios || [];

    // 3. Calcula os slots potenciais
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
              date: slotDate.toISOString(), // Envia como string ISO para o cliente
              horario: horario,
            });
          }
        }
      });
    }

    // 4. Verifica a ocupação de cada slot
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

    // 5. Retorna os slots calculados
    return { slots: finalSlots };
  } catch (error) {
    console.error("Erro em getSupervisorSlots:", error);
    throw new functions.https.HttpsError(
      "internal",
      "Ocorreu um erro ao buscar os horários de supervisão."
    );
  }
});
// -------------------------------------------------------------------
// NOVA FUNÇÃO: GERENCIA O STATUS GERAL DO PACIENTE AUTOMATICamente
// -------------------------------------------------------------------
exports.gerenciarStatusGeralDoPaciente = onDocumentUpdated(
  "trilhaPaciente/{pacienteId}",
  async (event) => {
    // Pega os dados do documento ANTES e DEPOIS da atualização
    const dadosDepois = event.data.after.data();
    const dadosAntes = event.data.before.data();

    // Para evitar execuções desnecessárias, a função só continua se a lista de atendimentos foi realmente modificada.
    if (
      JSON.stringify(dadosDepois.atendimentosPB) ===
      JSON.stringify(dadosAntes.atendimentosPB)
    ) {
      console.log(
        `(ID do Paciente: ${event.params.pacienteId}) Nenhuma mudança nos atendimentos, a função será encerrada.`
      );
      return null; // Encerra a execução
    }

    const atendimentos = dadosDepois.atendimentosPB;
    // Se não houver uma lista de atendimentos, não há o que fazer.
    if (!atendimentos || atendimentos.length === 0) {
      return null;
    }

    // A função verifica se TODOS os atendimentos na lista têm o status 'encerrado'
    const todosOsAtendimentosForamEncerrados = atendimentos.every(
      (atendimento) => atendimento.statusAtendimento === "encerrado"
    );

    // Lista de status que indicam que o paciente está em alguma fase ativa de PB
    const statusAtuaisDePB = [
      "em_atendimento_pb",
      "aguardando_info_horarios",
      "cadastrar_horario_psicomanager",
    ];

    // CONDIÇÃO PRINCIPAL:
    // Se todos os atendimentos foram encerrados E o status atual do paciente ainda é um dos status de PB,
    // então o status geral do paciente será atualizado para 'alta'.
    if (
      todosOsAtendimentosForamEncerrados &&
      statusAtuaisDePB.includes(dadosDepois.status)
    ) {
      console.log(
        `(ID do Paciente: ${event.params.pacienteId}) Todos os atendimentos de PB foram encerrados. Atualizando status geral para 'alta'.`
      );
      try {
        // Atualiza o documento do paciente
        await event.data.after.ref.update({
          status: "alta",
          lastUpdate: new Date(),
          lastUpdatedBy: "Sistema (Gerenciador de Status Automático)",
        });
        return {
          status: "sucesso",
          message: "Status geral do paciente foi atualizado para alta.",
        };
      } catch (error) {
        console.error(
          `Erro ao tentar atualizar o status geral do paciente ${event.params.pacienteId}:`,
          error
        );
        return {
          status: "erro",
          message: "Falha ao atualizar o status do paciente.",
        };
      }
    }

    // Se as condições não forem atendidas, a função não faz nada.
    return null;
  }
);
