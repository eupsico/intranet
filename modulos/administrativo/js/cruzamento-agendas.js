// Arquivo: /modulos/administrativo/js/cruzamento-agendas.js

export function init(db, user, userData) {
  const profissionalSelect = document.getElementById("profissional-select");
  const pacienteSelect = document.getElementById("paciente-select");
  const buscarBtn = document.getElementById("buscar-horarios-btn");
  const calendarioResultado = document.getElementById("calendario-resultado");
  const resultadoDiv = document.getElementById("resultado-cruzamento");
  const spinner = document.getElementById("loading-spinner");
  const nenhumHorarioMsg = document.getElementById("nenhum-horario-comum");

  async function carregarSeletores() {
    // Carregar Profissionais
    const profissionaisSnapshot = await db.collection("profissionais").get();
    profissionaisSnapshot.forEach((doc) => {
      const option = new Option(doc.data().nome, doc.id);
      profissionalSelect.add(option);
    });

    // Carregar Pacientes
    const pacientesSnapshot = await db.collection("pacientes").get();
    pacientesSnapshot.forEach((doc) => {
      const option = new Option(doc.data().nome, doc.id);
      pacienteSelect.add(option);
    });
  }

  async function buscarEExibirHorarios() {
    const profissionalId = profissionalSelect.value;
    const pacienteId = pacienteSelect.value;

    if (!profissionalId || !pacienteId) {
      window.showToast(
        "Por favor, selecione um profissional e um paciente.",
        "error"
      );
      return;
    }

    spinner.style.display = "block";
    resultadoDiv.style.display = "none";
    calendarioResultado.innerHTML = "";
    nenhumHorarioMsg.style.display = "none";

    try {
      const profDispoPromise = db
        .collection("disponibilidade_profissionais")
        .doc(profissionalId)
        .get();
      const pacDispoPromise = db
        .collection("disponibilidade_pacientes")
        .doc(pacienteId)
        .get();

      const [profDoc, pacDoc] = await Promise.all([
        profDispoPromise,
        pacDispoPromise,
      ]);

      const profHorarios = profDoc.exists ? profDoc.data().horarios || [] : [];
      const pacHorarios = pacDoc.exists ? pacDoc.data().horarios || [] : [];

      const horariosComuns = profHorarios.filter((profH) =>
        pacHorarios.some(
          (pacH) => profH.dia === pacH.dia && profH.hora === pacH.hora
        )
      );

      exibirResultados(horariosComuns);
    } catch (error) {
      console.error("Erro ao buscar disponibilidades:", error);
      window.showToast("Erro ao buscar dados. Tente novamente.", "error");
    } finally {
      spinner.style.display = "none";
      resultadoDiv.style.display = "block";
    }
  }

  function exibirResultados(horarios) {
    if (horarios.length === 0) {
      nenhumHorarioMsg.style.display = "block";
      return;
    }

    const horariosPorDia = horarios.reduce((acc, horario) => {
      (acc[horario.dia] = acc[horario.dia] || []).push(horario.hora);
      return acc;
    }, {});

    const diasDaSemana = [
      "Domingo",
      "Segunda",
      "Terça",
      "Quarta",
      "Quinta",
      "Sexta",
      "Sábado",
    ];

    diasDaSemana.forEach((dia) => {
      if (horariosPorDia[dia]) {
        const diaColuna = document.createElement("div");
        diaColuna.className = "dia-coluna";

        const diaHeader = document.createElement("div");
        diaHeader.className = "dia-header";
        diaHeader.textContent = dia;
        diaColuna.appendChild(diaHeader);

        const horariosLista = document.createElement("div");
        horariosLista.className = "horarios-lista";

        horariosPorDia[dia].sort().forEach((hora) => {
          const horarioDiv = document.createElement("div");
          horarioDiv.className = "horario-comum";
          horarioDiv.textContent = hora;
          horariosLista.appendChild(horarioDiv);
        });

        diaColuna.appendChild(horariosLista);
        calendarioResultado.appendChild(diaColuna);
      }
    });
  }

  buscarBtn.addEventListener("click", buscarEExibirHorarios);
  carregarSeletores();
}
