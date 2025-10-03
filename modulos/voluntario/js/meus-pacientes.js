//_v4.1 - Versão com inicializador Firebase Auth e logs detalhados
document.addEventListener("DOMContentLoaded", function () {
  console.log(
    "[LOG] Evento DOMContentLoaded disparado. Aguardando inicialização do Firebase..."
  );

  // A função initApp é o ponto de entrada que garante que o Firebase foi inicializado.
  // Ela será chamada pelo firebase-init.js ou similar.
  // Por segurança, vamos usar o onAuthStateChanged para garantir que o usuário está logado.

  firebase.auth().onAuthStateChanged(function (user) {
    console.log("[LOG] onAuthStateChanged callback executado.");
    if (user) {
      // Se o usuário estiver logado, 'user' será um objeto com as informações dele.
      const userId = user.uid;
      console.log(`[LOG] Usuário autenticado. ID: ${userId}`);

      // Adiciona o ID do usuário ao corpo do documento se não estiver lá, para consistência
      if (!document.body.getAttribute("data-user-id")) {
        document.body.setAttribute("data-user-id", userId);
      }

      // Inicia a lógica principal da página
      carregarMeusPacientes(userId);
    } else {
      // Se o usuário não estiver logado.
      console.error(
        "[ERRO] Nenhum usuário autenticado encontrado. O usuário precisa fazer login."
      );
      const container = document.getElementById("patient-cards-container");
      if (container) {
        container.innerHTML =
          '<div class="col-12"><p>Sessão expirada ou usuário não autenticado. Por favor, <a href="/">faça login</a> novamente.</p></div>';
      }
    }
  });
});

function carregarMeusPacientes(userId) {
  console.log(
    `[LOG] Função carregarMeusPacientes iniciada para o usuário ID: ${userId}`
  );

  const container = document.getElementById("patient-cards-container");
  if (!container) {
    console.error(
      "[ERRO] O contêiner 'patient-cards-container' não foi encontrado na página."
    );
    return;
  }

  // Limpa o contêiner para evitar duplicatas em recarregamentos
  container.innerHTML =
    '<div class="col-12"><p>Carregando pacientes...</p></div>';
  console.log(
    '[LOG] Contêiner de pacientes limpo e mensagem de "carregando" exibida.'
  );

  const trilhaPacienteRef = db.collection("trilhaPaciente");

  // --- Consulta 1: Pacientes de Plantão ---
  const statusPlantao = [
    "agendamento_confirmado_plantao",
    "em_atendimento_plantao",
  ];
  console.log(
    `[LOG] Definindo consulta para PLANTÃO com os status: ${statusPlantao.join(
      ", "
    )}`
  );
  const queryPlantao = trilhaPacienteRef
    .where("plantaoInfo.profissionalId", "==", userId)
    .where("status", "in", statusPlantao);

  // --- Consulta 2: Pacientes de Psicoterapia Breve (PB) ---
  console.log(
    `[LOG] Definindo consulta para PSICOTERAPIA BREVE (PB) que não sejam 'alta' ou 'desistencia'.`
  );
  const queryPb = trilhaPacienteRef
    .where("pbInfo.profissionalId", "==", userId)
    .where("status", "!=", "alta")
    .where("status", "!=", "desistencia");

  let todosPacientes = [];
  let pacientesProcessados = new Set(); // Para garantir que não haja pacientes duplicados

  const processarQuery = (querySnapshot, tipo) => {
    console.log(
      `[LOG] Processando resultados da consulta de ${tipo}. Documentos encontrados: ${querySnapshot.size}.`
    );
    querySnapshot.forEach((doc) => {
      if (!pacientesProcessados.has(doc.id)) {
        const pacienteData = doc.data();
        todosPacientes.push({ id: doc.id, ...pacienteData });
        pacientesProcessados.add(doc.id);
        console.log(
          `[LOG] Paciente adicionado da busca de ${tipo}: ID=${doc.id}, Nome=${pacienteData.nomeCompleto}`
        );
      } else {
        console.log(
          `[LOG] Paciente duplicado ignorado (já listado via outra consulta): ID=${doc.id}`
        );
      }
    });
  };

  // Executa as duas consultas de forma assíncrona
  Promise.all([queryPlantao.get(), queryPb.get()])
    .then((results) => {
      const [plantaoSnapshot, pbSnapshot] = results;

      console.log(
        "[LOG] Execução das consultas finalizada. Processando snapshots..."
      );
      processarQuery(plantaoSnapshot, "Plantão");
      processarQuery(pbSnapshot, "PB");

      // Limpa o container antes de renderizar os cards
      container.innerHTML = "";

      if (todosPacientes.length > 0) {
        console.log(
          `[LOG] Total de ${todosPacientes.length} paciente(s) únicos encontrados. Ordenando e renderizando cards...`
        );

        // Ordena os pacientes por nome para uma exibição consistente
        todosPacientes.sort((a, b) =>
          a.nomeCompleto.localeCompare(b.nomeCompleto)
        );

        todosPacientes.forEach((paciente) => {
          console.log(
            `[LOG] Criando card para: ${paciente.nomeCompleto} (Status: ${paciente.status})`
          );
          const statusFormatado = paciente.status
            ? paciente.status.replace(/_/g, " ")
            : "Não definido";
          const cardHtml = `
                        <div class="col-md-4 mb-4">
                            <div class="card card-paciente h-100">
                                <div class="card-body d-flex flex-column">
                                    <h5 class="card-title">${paciente.nomeCompleto}</h5>
                                    <p class="card-text mb-1"><small class="text-muted">ID: ${paciente.id}</small></p>
                                    <p class="card-text"><strong>Status:</strong> <span class="text-capitalize">${statusFormatado}</span></p>
                                    <a href="/modulos/trilha-paciente/page/trilha-paciente.html?prontuarioId=${paciente.id}" class="btn btn-primary mt-auto">Ver Prontuário</a>
                                </div>
                            </div>
                        </div>
                    `;
          container.innerHTML += cardHtml;
        });
        console.log("[LOG] Renderização dos cards concluída.");
      } else {
        console.log(
          "[LOG] NENHUM paciente encontrado para este profissional após ambas as consultas."
        );
        container.innerHTML =
          '<div class="col-12"><p>Nenhum paciente encontrado sob sua responsabilidade nos estágios de atendimento ativo.</p></div>';
      }
    })
    .catch((error) => {
      console.error(
        "[ERRO FATAL] Falha ao executar as consultas no Firestore:",
        error
      );
      container.innerHTML =
        '<div class="col-12"><p class="text-danger">Ocorreu um erro crítico ao buscar os pacientes. Verifique o console para mais detalhes e, se o erro persistir, contate o suporte.</p></div>';
    });
}
