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

/**
 * Gera um username único baseado no nome completo fornecido.
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

// FUNÇÃO ATUALIZADA: Buscar horários de triagem disponíveis
// -------------------------------------------------------------------
exports.getHorariosTriagem = onCall({ cors: true }, async (request) => {
  try {
    console.log("[LOG INICIAL] Função getHorariosTriagem iniciada.");

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const dataLimite = new Date(hoje);
    dataLimite.setDate(hoje.getDate() + 7); // Ajustado para 7 dias

    const assistentesSnapshot = await db
      .collection("usuarios")
      .where("funcoes", "array-contains", "servico_social")
      .where("inativo", "==", false)
      .get();

    if (assistentesSnapshot.empty) {
      console.log(
        "[LOG] Nenhum assistente social ativo encontrado. Retornando vazio."
      );
      return { horarios: [] };
    }

    const assistentesIds = assistentesSnapshot.docs.map((doc) => doc.id);
    const assistentesMap = new Map(
      assistentesSnapshot.docs.map((doc) => [doc.id, doc.data()])
    );
    console.log(`[LOG] Encontrados ${assistentesIds.length} assistentes.`);

    const disponibilidadesSnapshot = await db
      .collection("disponibilidadeAssistentes")
      .where(admin.firestore.FieldPath.documentId(), "in", assistentesIds)
      .get();

    const hojeISO = hoje.toISOString().split("T")[0];
    const dataLimiteISO = dataLimite.toISOString().split("T")[0];

    const agendamentosSnapshot = await db
      .collection("trilhaPaciente")
      .where("status", "==", "triagem_agendada")
      .where("dataTriagem", ">=", hojeISO)
      .where("dataTriagem", "<=", dataLimiteISO)
      .get();

    const agendamentosExistentes = new Set();
    agendamentosSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.dataTriagem && data.horaTriagem) {
        agendamentosExistentes.add(`${data.dataTriagem}T${data.horaTriagem}`);
      }
    });
    console.log(
      `[LOG] ${agendamentosExistentes.size} agendamentos existentes no período.`
    );

    const horariosDisponiveis = [];
    disponibilidadesSnapshot.forEach((doc) => {
      const userId = doc.id;
      const assistente = assistentesMap.get(userId);
      const dispoData = doc.data().disponibilidade;

      console.log(
        `[LOG] Processando assistente: ${assistente.nome} (ID: ${userId})`
      );

      if (assistente && dispoData) {
        for (const mesKey in dispoData) {
          console.log(`  [LOG] Mês: ${mesKey}`);
          const dadosDoMes = dispoData[mesKey];
          for (const modalidadeKey in dadosDoMes) {
            console.log(`    [LOG] Modalidade: ${modalidadeKey}`);
            const modalidadeNome =
              modalidadeKey.charAt(0).toUpperCase() + modalidadeKey.slice(1);
            const dispoModalidade = dadosDoMes[modalidadeKey];

            console.log(
              `      [LOG] Dados da Disponibilidade:`,
              JSON.stringify(dispoModalidade)
            );

            const inicioParts = dispoModalidade.inicio
              ? dispoModalidade.inicio.split(":")
              : [];
            const fimParts = dispoModalidade.fim
              ? dispoModalidade.fim.split(":")
              : [];

            if (
              dispoModalidade &&
              dispoModalidade.dias &&
              Array.isArray(dispoModalidade.dias) &&
              inicioParts.length === 2 && // Garante que tem hora e minuto
              fimParts.length === 2 // Garante que tem hora e minuto
            ) {
              const horaInicio = parseInt(inicioParts[0]);
              const minutoInicio = parseInt(inicioParts[1]);
              const horaFim = parseInt(fimParts[0]);

              if (isNaN(horaInicio) || isNaN(minutoInicio) || isNaN(horaFim)) {
                console.warn(
                  `      [AVISO] Formato de hora inválido para ${assistente.nome}, modalidade ${modalidadeKey}. Pulando.`
                );
                continue; // Pula para a próxima modalidade
              }

              dispoModalidade.dias.forEach((diaISO) => {
                const dataDisponivel = new Date(diaISO + "T03:00:00");
                if (dataDisponivel >= hoje && dataDisponivel <= dataLimite) {
                  let h = horaInicio;
                  let m = minutoInicio;
                  while (h < horaFim) {
                    const horaSlot = `${String(h).padStart(2, "0")}:${String(
                      m
                    ).padStart(2, "0")}`;
                    const chaveAgendamento = `${diaISO}T${horaSlot}`;
                    if (!agendamentosExistentes.has(chaveAgendamento)) {
                      horariosDisponiveis.push({
                        data: diaISO,
                        hora: horaSlot,
                        modalidade: modalidadeNome,
                        assistenteNome: assistente.nome,
                        assistenteId: userId,
                      });
                    }
                    m += 30;
                    if (m >= 60) {
                      h++;
                      m = 0;
                    }
                  }
                }
              });
            } else {
              console.warn(
                `      [AVISO] Dados de disponibilidade malformados para ${assistente.nome}, modalidade ${modalidadeKey}. Pulando.`
              );
            }
          }
        }
      }
    });

    horariosDisponiveis.sort(
      (a, b) =>
        new Date(`${a.data}T${a.hora}`) - new Date(`${b.data}T${b.hora}`)
    );
    console.log(
      `[LOG FINAL] Função concluída. ${horariosDisponiveis.length} horários encontrados.`
    );
    return { horarios: horariosDisponiveis };
  } catch (error) {
    console.error("### ERRO GRAVE NA FUNÇÃO getHorariosTriagem ###:", error);
    throw new HttpsError(
      "internal",
      "Ocorreu um erro inesperado ao processar os horários. Verifique os logs da função no Firebase.",
      error.message
    );
  }
});

exports.agendarTriagemPublico = onCall({ cors: true }, async (request) => {
  const dados = request.data;

  if (!dados || !dados.horarioSelecionado || !dados.cpf || !dados.nome) {
    console.error("Tentativa de agendamento com dados incompletos:", dados);
    throw new HttpsError(
      "invalid-argument",
      "Dados do agendamento estão incompletos."
    );
  }

  const { pacienteExistenteId, cpf, nome, telefone, horarioSelecionado } =
    dados;

  const dadosAgendamento = {
    status: "triagem_agendada",
    dataTriagem: horarioSelecionado.data,
    horaTriagem: horarioSelecionado.hora,
    modalidadeTriagem: horarioSelecionado.modalidade,
    assistenteSocialNome: horarioSelecionado.assistenteNome,
    assistenteSocialId: horarioSelecionado.assistenteId,
    lastUpdate: new Date(),
  };

  try {
    if (pacienteExistenteId) {
      const docRef = db.collection("trilhaPaciente").doc(pacienteExistenteId);
      await docRef.update(dadosAgendamento);
      console.log(
        `Agendamento atualizado para paciente existente: ${pacienteExistenteId}`
      );
    } else {
      const novoPaciente = {
        ...dadosAgendamento,
        nomeCompleto: nome,
        cpf: cpf,
        telefoneCelular: telefone,
        status: "triagem_agendada", // Garante o status inicial correto
        timestamp: new Date(),
      };
      await db.collection("trilhaPaciente").add(novoPaciente);
      console.log(`Novo agendamento criado para o paciente: ${nome}`);
    }

    return { success: true, message: "Agendamento confirmado com sucesso!" };
  } catch (error) {
    console.error("Erro grave ao salvar agendamento via função:", error);
    throw new HttpsError(
      "internal",
      "Ocorreu um erro interno ao salvar o agendamento.",
      error.message
    );
  }
});

// ===================================================================
// FUNÇÃO CORRIGIDA: getTodasDisponibilidadesAssistentes
// ===================================================================
exports.getTodasDisponibilidadesAssistentes = onCall(
  { cors: true },
  async (request) => {
    // LOG 1: Verifica se a função foi chamada e se há um contexto de autenticação.
    console.log("Função 'getTodasDisponibilidadesAssistentes' foi chamada.");
    if (!request.auth) {
      console.error(
        "[ERRO DE AUTENTICAÇÃO] A requisição não possui um token de autenticação."
      );
      throw new HttpsError(
        "unauthenticated",
        "Você precisa estar autenticado para acessar estes dados."
      );
    }

    // LOG 2: Identifica o usuário que está tentando acessar.
    const adminUid = request.auth.uid;
    console.log(`[INFO] UID do requisitante: ${adminUid}`);

    try {
      // 1. Busca o documento do usuário que está fazendo a chamada.
      const adminUserDoc = await db.collection("usuarios").doc(adminUid).get();

      // LOG 3: Verifica se o documento do usuário foi encontrado e quais são suas funções.
      if (!adminUserDoc.exists) {
        console.error(
          `[FALHA DE PERMISSÃO] Documento do usuário com UID ${adminUid} não encontrado.`
        );
        throw new HttpsError(
          "permission-denied",
          "Seu usuário não foi encontrado no banco de dados."
        );
      }
      const adminUserData = adminUserDoc.data();
      console.log(
        `[INFO] Funções do usuário ${adminUserData.nome}:`,
        adminUserData.funcoes || "Nenhuma"
      );

      // 2. Verifica se o usuário tem a função 'admin' no array 'funcoes'.
      if (!(adminUserData.funcoes || []).includes("admin")) {
        console.error(
          `[FALHA DE PERMISSÃO] O usuário ${adminUserData.nome} não possui a função 'admin'.`
        );
        throw new HttpsError(
          "permission-denied",
          "Você não tem permissão de administrador para acessar estes dados."
        );
      }

      // LOG 4: Se passou pela verificação, confirma que o acesso foi concedido.
      console.log(
        `[SUCESSO DE PERMISSÃO] Acesso concedido para o admin: ${adminUserData.nome}. Iniciando busca de dados...`
      );

      // 3. Lógica de negócio da função (agora segura)
      const dispoSnapshot = await db
        .collection("disponibilidadeAssistentes")
        .get();
      if (dispoSnapshot.empty) {
        console.log("Nenhum documento de disponibilidade encontrado.");
        return [];
      }

      const assistentesComDispoIds = dispoSnapshot.docs.map((doc) => doc.id);
      if (assistentesComDispoIds.length === 0) {
        return [];
      }

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
        const isAssistente = userData.funcoes?.includes("servico_social");
        const isAtivo = userData.inativo === false;
        if (isAssistente && isAtivo) {
          assistentesAtivosMap.set(doc.id, userData);
        }
      });

      const todasDisponibilidades = [];
      dispoSnapshot.forEach((doc) => {
        if (assistentesAtivosMap.has(doc.id)) {
          const assistenteInfo = assistentesAtivosMap.get(doc.id);
          todasDisponibilidades.push({
            nome: assistenteInfo.nome,
            disponibilidade: doc.data().disponibilidade,
          });
        }
      });

      // LOG 5: Informa o resultado final antes de retornar.
      console.log(
        `[INFO] Retornando ${todasDisponibilidades.length} registros de disponibilidade.`
      );
      return todasDisponibilidades;
    } catch (error) {
      console.error(
        "[ERRO GERAL] Erro na execução de getTodasDisponibilidadesAssistentes:",
        error
      );
      if (error instanceof HttpsError) {
        throw error; // Re-lança os erros de permissão que já tratamos.
      }
      throw new HttpsError(
        "internal",
        "Ocorreu um erro interno ao buscar as disponibilidades."
      );
    }
  }
);
// ===================================================================
// FIM DA FUNÇÃO: getTodasDisponibilidadesAssistentes
// ===================================================================
