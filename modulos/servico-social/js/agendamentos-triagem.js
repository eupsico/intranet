// Arquivo: /modulos/servico-social/js/agendamentos-triagem.js
// Versão: 2.0 (Integração com a Trilha do Paciente)

export function init(db, user, userData) {
  const tableBody = document.getElementById("triagem-table-body");
  if (!tableBody) return;

  const isAdmin = (userData.funcoes || []).includes("admin");

  async function carregarAgendamentos() {
    tableBody.innerHTML =
      '<tr><td colspan="10"><div class="loading-spinner"></div></td></tr>';

    try {
      // **CORREÇÃO PRINCIPAL**: A consulta agora busca na coleção 'trilhaPaciente'.
      let query = db
        .collection("trilhaPaciente")
        .where("status", "==", "triagem_agendada")
        .orderBy("lastUpdate", "asc");

      // Se o usuário não for admin, filtra para ver apenas os agendamentos atribuídos a ele.
      if (!isAdmin) {
        query = query.where("assistenteSocialNome", "==", userData.nome);
      }

      const snapshot = await query.get();

      if (snapshot.empty) {
        tableBody.innerHTML =
          '<tr><td colspan="10">Nenhum paciente com triagem agendada no momento.</td></tr>';
        return;
      }

      let rowsHtml = "";
      snapshot.forEach((doc) => {
        const data = doc.data();
        const dataAgendamento = data.dataTriagem
          ? new Date(data.dataTriagem + "T03:00:00").toLocaleDateString("pt-BR")
          : "Não definida";

        rowsHtml += `
                    <tr>
                        <td>${data.tipoTriagem || "N/A"}</td>
                        <td>${data.nomeCompleto || "N/A"}</td>
                        <td>${data.responsavel?.nome || "N/A"}</td>
                        <td>${data.telefoneCelular || "N/A"}</td>
                        <td>${dataAgendamento}</td>
                        <td>${data.horaTriagem || "N/A"}</td>
                        <td>${data.assistenteSocialNome || "N/A"}</td>
                        <td>
                            <a href="#fila-atendimento/${
                              data.inscricaoId
                            }" class="action-button">
                                Preencher Ficha
                            </a>
                        </td>
                    </tr>
                `;
      });
      tableBody.innerHTML = rowsHtml;
    } catch (error) {
      console.error("Erro ao carregar agendamentos da trilha:", error);
      tableBody.innerHTML =
        '<tr><td colspan="10">Ocorreu um erro ao carregar os agendamentos.</td></tr>';
    }
  }

  carregarAgendamentos();
}
