import {
  db,
  collection,
  query,
  orderBy,
  getDocs,
} from "../../../assets/js/firebase-init.js";

export async function init(user, userData) {
  const tableBody = document.getElementById("supervisao-table-body");
  if (!tableBody) {
    console.error("Elemento 'supervisao-table-body' não encontrado.");
    return;
  }

  tableBody.innerHTML =
    '<tr><td colspan="5"><div class="loading-spinner"></div></td></tr>';

  try {
    // 1. Criar a query para buscar os agendamentos, ordenados por data
    const agendamentosRef = collection(db, "agendamentos");
    const q = query(agendamentosRef, orderBy("dataAgendamento", "desc")); // Mais recentes primeiro

    // 2. Executar a query
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      tableBody.innerHTML =
        '<tr><td colspan="5" style="text-align: center;">Nenhum agendamento de supervisão encontrado.</td></tr>';
      return;
    }

    let rowsHtml = "";
    querySnapshot.forEach((doc) => {
      const agendamento = doc.data();

      // 3. Formatar a data e hora do Timestamp do Firebase
      let dataFormatada = "Data inválida";
      let horaFormatada = "";
      if (agendamento.dataAgendamento && agendamento.dataAgendamento.toDate) {
        const data = agendamento.dataAgendamento.toDate();
        dataFormatada = data.toLocaleDateString("pt-BR");
        horaFormatada = data.toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
        });
      }

      // 4. Formatar o valor da supervisão
      const valorSupervisao = (agendamento.valorSupervisao || 0).toLocaleString(
        "pt-BR",
        { style: "currency", currency: "BRL" }
      );

      // 5. Montar a linha da tabela
      rowsHtml += `
                <tr>
                    <td>${agendamento.profissionalNome || "Não informado"}</td>
                    <td>${agendamento.supervisorNome || "Não informado"}</td>
                    <td>${dataFormatada}</td>
                    <td>${horaFormatada}</td>
                    <td>${valorSupervisao}</td>
                </tr>
            `;
    });

    tableBody.innerHTML = rowsHtml;
  } catch (error) {
    console.error("Erro ao carregar agendamentos de supervisão:", error);
    tableBody.innerHTML =
      '<tr><td colspan="5" style="text-align: center; color: var(--cor-erro);">Ocorreu um erro ao carregar os dados. Tente novamente mais tarde.</td></tr>';
  }
}
