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
// Função verificarCpfExistente (HTTP v1)
// -----------------------------
exports.verificarCpfExistente = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method !== "POST") {
      return res.status(405).send("Method Not Allowed");
    }

    const cpf = req.body.cpf;
    if (!cpf || cpf.length < 11) {
      return res.status(400).json({ error: "CPF inválido ou não fornecido." });
    }

    try {
      const inscricoesRef = db.collection("inscricoes");
      const snapshot = await inscricoesRef
        .where("cpf", "==", cpf)
        .limit(1)
        .get();

      if (snapshot.empty) {
        return res.status(200).json({ existe: false });
      } else {
        const paciente = snapshot.docs[0].data();
        return res.status(200).json({
          existe: true,
          nome: paciente.nomeCompleto || "Nome não encontrado",
        });
      }
    } catch (error) {
      console.error("Erro ao verificar CPF:", error);
      return res.status(500).json({ error: "Erro interno do servidor." });
    }
  });
});

// -------------------------------------------------------------------
// Função para criar um card na Trilha do Paciente (SINTAXE V2 CORRIGIDA)
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
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const fimDaProximaSemana = new Date(hoje);
    fimDaProximaSemana.setDate(hoje.getDate() + 7);

    // 1. Buscar assistentes sociais ativas
    const assistentesSnapshot = await db
      .collection("usuarios")
      .where("funcoes", "array-contains", "servico_social")
      .where("inativo", "==", false)
      .get();

    if (assistentesSnapshot.empty) {
      return { horarios: [] };
    }

    const assistentesIds = assistentesSnapshot.docs.map((doc) => doc.id);
    const assistentesMap = new Map(
      assistentesSnapshot.docs.map((doc) => [doc.id, doc.data()])
    );

    // 2. Buscar disponibilidades
    const disponibilidadesSnapshot = await db
      .collection("disponibilidadeAssistentes")
      .where(admin.firestore.FieldPath.documentId(), "in", assistentesIds)
      .get();

    // 3. Buscar agendamentos existentes
    const agendamentosSnapshot = await db
      .collection("trilhaPaciente")
      .where("status", "==", "triagem_agendada")
      .get();

    const agendamentosExistentes = new Set();
    agendamentosSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.dataTriagem && data.horaTriagem) {
        agendamentosExistentes.add(`${data.dataTriagem}T${data.horaTriagem}`);
      }
    });

    // 4. Processar e gerar os horários livres
    const horariosDisponiveis = [];
    disponibilidadesSnapshot.forEach((doc) => {
      const userId = doc.id;
      const assistente = assistentesMap.get(userId);
      const dispoData = doc.data().disponibilidade;

      if (assistente && dispoData) {
        for (const mesKey in dispoData) {
          const dadosDoMes = dispoData[mesKey];
          ["online", "presencial"].forEach((modalidade) => {
            const dispoModalidade = dadosDoMes[modalidade];
            if (dispoModalidade && dispoModalidade.dias) {
              const horaInicio = parseInt(dispoModalidade.inicio.split(":")[0]);
              const horaFim = parseInt(dispoModalidade.fim.split(":")[0]);

              dispoModalidade.dias.forEach((diaISO) => {
                const dataDisponivel = new Date(diaISO + "T03:00:00");

                if (
                  dataDisponivel >= hoje &&
                  dataDisponivel <= fimDaProximaSemana
                ) {
                  // **AQUI ESTÁ A ALTERAÇÃO PRINCIPAL**
                  // Gera os slots de 30 em 30 minutos
                  for (let h = horaInicio; h <= horaFim; h++) {
                    for (let m = 0; m < 60; m += 30) {
                      // Condição para não ultrapassar o horário final
                      if (h === horaFim && m > 0) continue;

                      const horaSlot = `${String(h).padStart(2, "0")}:${String(
                        m
                      ).padStart(2, "0")}`;
                      const chaveAgendamento = `${diaISO}T${horaSlot}`;

                      if (!agendamentosExistentes.has(chaveAgendamento)) {
                        horariosDisponiveis.push({
                          data: diaISO,
                          hora: horaSlot,
                          assistenteNome: assistente.nome,
                          assistenteId: userId,
                        });
                      }
                    }
                  }
                }
              });
            }
          });
        }
      }
    });

    // Ordena os horários
    horariosDisponiveis.sort(
      (a, b) =>
        new Date(`${a.data}T${a.hora}`) - new Date(`${b.data}T${b.hora}`)
    );

    return { horarios: horariosDisponiveis };
  } catch (error) {
    console.error("Erro ao buscar horários de triagem:", error);
    throw new HttpsError("internal", "Não foi possível buscar os horários.");
  }
});
