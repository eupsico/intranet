// Arquivo: /modulos/servico-social/js/agendamento-publico.js
import { db, functions } from "../../../assets/js/firebase-init.js";

document.addEventListener("DOMContentLoaded", () => {
  const horariosContainer = document.getElementById("horarios-container");
  const agendamentoSection = document.getElementById("agendamento-section");
  const confirmacaoSection = document.getElementById("confirmacao-section");

  async function carregarHorarios() {
    try {
      const getHorarios = functions.httpsCallable("getHorariosTriagem");
      const result = await getHorarios();
      const horarios = result.data.horarios;

      if (!horarios || horarios.length === 0) {
        horariosContainer.innerHTML =
          "<p>Não há horários disponíveis no momento. Por favor, tente novamente mais tarde.</p>";
        return;
      }

      // Agrupar por data
      const horariosAgrupados = horarios.reduce((acc, horario) => {
        const dataFormatada = new Date(
          horario.data + "T03:00:00"
        ).toLocaleDateString("pt-BR", {
          weekday: "long",
          day: "2-digit",
          month: "long",
        });
        if (!acc[dataFormatada]) {
          acc[dataFormatada] = [];
        }
        acc[dataFormatada].push(horario);
        return acc;
      }, {});

      let html = "";
      for (const data in horariosAgrupados) {
        html += `<div class="data-grupo"><h4>${data}</h4><div class="horarios-botoes">`;
        horariosAgrupados[data].forEach((horario) => {
          const horarioDataString = JSON.stringify(horario);
          html += `<button type="button" class="horario-btn" data-horario='${horarioDataString}'>${horario.hora}</button>`;
        });
        html += `</div></div>`;
      }
      horariosContainer.innerHTML = html;

      horariosContainer.querySelectorAll(".horario-btn").forEach((btn) => {
        btn.addEventListener("click", () =>
          handleAgendamento(JSON.parse(btn.dataset.horario))
        );
      });
    } catch (error) {
      console.error("Erro ao carregar horários:", error);
      horariosContainer.innerHTML =
        '<p style="color: red;">Ocorreu um erro ao buscar os horários. Tente recarregar a página.</p>';
    }
  }

  async function handleAgendamento(horario) {
    if (
      !confirm(
        `Confirmar agendamento para ${new Date(
          horario.data + "T03:00:00"
        ).toLocaleDateString("pt-BR")} às ${horario.hora} com ${
          horario.assistenteNome
        }?`
      )
    ) {
      return;
    }

    horariosContainer.innerHTML =
      '<div class="loading-spinner" style="border-top-color: white;"></div><p>Salvando seu agendamento...</p>';

    try {
      // Aqui, estamos assumindo que os dados do paciente (nome, email, etc.)
      // foram coletados em uma etapa anterior e estão disponíveis.
      // Para este exemplo, vamos usar dados fictícios.
      const dadosPaciente = {
        nomeCompleto: "Paciente Agendado Online",
        email: "paciente.online@example.com",
        // ... outros dados coletados em um formulário anterior
      };

      const novoAgendamento = {
        ...dadosPaciente,
        status: "triagem_agendada",
        dataTriagem: horario.data,
        horaTriagem: horario.hora,
        assistenteSocialNome: horario.assistenteNome,
        assistenteSocialId: horario.assistenteId,
        tipoTriagem: "Online", // ou baseado na disponibilidade
        lastUpdate: new Date(),
      };

      // Salva diretamente na coleção trilhaPaciente
      await db.collection("trilhaPaciente").add(novoAgendamento);

      // Exibe a confirmação
      document.getElementById("confirm-assistente").textContent =
        horario.assistenteNome;
      document.getElementById("confirm-data").textContent = new Date(
        horario.data + "T03:00:00"
      ).toLocaleDateString("pt-BR");
      document.getElementById("confirm-horario").textContent = horario.hora;

      agendamentoSection.style.display = "none";
      confirmacaoSection.style.display = "block";
    } catch (error) {
      console.error("Erro ao salvar agendamento:", error);
      horariosContainer.innerHTML =
        '<p style="color: red;">Não foi possível salvar seu agendamento. Por favor, tente novamente.</p>';
    }
  }

  carregarHorarios();
});
