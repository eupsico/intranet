// Arquivo: /modulos/servico-social/js/agendamentos-triagem.js
export function init(db, user, userData) {
  const tableBody = document.getElementById("triagem-table-body");

  if (!tableBody) {
    console.error("Elemento 'triagem-table-body' não encontrado.");
    return;
  }

  function formatarData(dataString) {
    if (!dataString) return "N/A";
    // A data já vem no formato YYYY-MM-DD
    const [year, month, day] = dataString.split("-");
    return `${day}/${month}/${year}`;
  }

  async function carregarAgendamentos() {
    tableBody.innerHTML =
      '<tr><td colspan="10"><div class="loading-spinner"></div></td></tr>';

    try {
      let query = db
        .collection("trilhaPaciente")
        .where("status", "==", "triagem_agendada");

      // Se o usuário não for admin, filtra pela assistente social logada
      const isAdmin = userData.funcoes && userData.funcoes.includes("admin");
      if (!isAdmin) {
        query = query.where("assistenteSocialId", "==", user.uid);
      }

      const snapshot = await query.get();

      if (snapshot.empty) {
        tableBody.innerHTML =
          '<tr><td colspan="10">Nenhuma triagem agendada para você no momento.</td></tr>';
        return;
      }

      let linhasTabela = "";
      snapshot.forEach((doc) => {
        const data = doc.data();
        linhasTabela += `
                    <tr>
                        <td>${data.tipoTriagem || "N/A"}</td>
                        <td>${data.nomeCompleto || "Não informado"}</td>
                        <td>${
                          (data.responsavel && data.responsavel.nome) || "N/A"
                        }</td>
                        <td>${data.telefoneCelular || "Não informado"}</td>
                        <td>${formatarData(data.dataTriagem)} às ${
          data.horaTriagem
        }</td>
                        <td>-</td> <td>-</td> <td>${
                          data.assistenteSocialNome || "A designar"
                        }</td>
                        <td><a href="#fila-atendimento/${
                          data.inscricaoId
                        }" class="action-button">Abrir Ficha</a></td>
                        <td>${data.observacoes || ""}</td>
                    </tr>
                `;
      });
      tableBody.innerHTML = linhasTabela;
    } catch (error) {
      console.error("Erro ao carregar agendamentos de triagem:", error);
      tableBody.innerHTML =
        '<tr><td colspan="10" class="error-message">Erro ao carregar.</td></tr>';
    }
  }

  carregarAgendamentos();
}
