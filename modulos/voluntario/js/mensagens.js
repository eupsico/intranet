// Arquivo: /modulos/voluntario/js/mensagens.js
// Versão: 2.0 (Código Refatorado para Melhor Legibilidade)
// Descrição: Módulo para a aba "Modelos de Mensagem".

export function init() {
  const container = document.querySelector("#mensagens");
  if (!container) return;

  // --- FUNÇÕES AUXILIARES ---
  const getGreeting = () => {
    const h = new Date().getHours();
    if (h >= 5 && h < 12) return "Bom dia";
    if (h >= 12 && h < 18) return "Boa tarde";
    return "Boa noite";
  };

  const getFutureDate = (days) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return `${String(d.getDate()).padStart(2, "0")}/${String(
      d.getMonth() + 1
    ).padStart(2, "0")}`;
  };

  const formatDateTimeLocalString = (str) => {
    if (!str) return "";
    const d = new Date(str);
    const week = [
      "Domingo",
      "Segunda-feira",
      "Terça-feira",
      "Quarta-feira",
      "Quinta-feira",
      "Sexta-feira",
      "Sábado",
    ];
    return `${week[d.getDay()]}, ${d.toLocaleDateString("pt-BR")} às ${String(
      d.getHours()
    ).padStart(2, "0")}h`;
  };

  const formatDateToDDMM = (str) =>
    !str ? "" : `${str.split("-")[2]}/${str.split("-")[1]}`;

  const generateAndCopy = (outputElementId, msg) => {
    const outputElement = container.querySelector(`#${outputElementId}`);
    if (!outputElement) return;

    outputElement.value = msg;
    outputElement.select();
    navigator.clipboard
      .writeText(msg)
      .then(() => alert("Mensagem copiada!"))
      .catch(() => alert("Falha ao copiar. Por favor, copie manualmente."));
  };

  // --- LÓGICA DE INICIALIZAÇÃO E EVENTOS ---

  /**
   * Preenche os selects de mês e hora com as opções.
   */
  function setupSelects() {
    const meses = [
      "Janeiro",
      "Fevereiro",
      "Março",
      "Abril",
      "Maio",
      "Junho",
      "Julho",
      "Agosto",
      "Setembro",
      "Outubro",
      "Novembro",
      "Dezembro",
    ];
    container.querySelector("#cobranca-mes").innerHTML = meses
      .map((m) => `<option value="${m}">${m}</option>`)
      .join("");

    let hoursOptions = "";
    for (let i = 8; i <= 21; i++) {
      const hour = String(i).padStart(2, "0");
      hoursOptions += `<option value="${hour}:00">${hour}:00</option>`;
    }
    container.querySelector("#agendada-hora").innerHTML = hoursOptions;
    container.querySelector("#agendar-hora").innerHTML = hoursOptions.replace(
      /:00/g,
      "h"
    );
  }

  /**
   * Configura o funcionamento do componente "accordion".
   */
  function setupAccordion() {
    const triggers = container.querySelectorAll(".accordion-trigger");
    triggers.forEach((trigger) => {
      trigger.addEventListener("click", function () {
        const isActive = this.classList.contains("active");

        // Fecha todos os accordions
        triggers.forEach((t) => {
          t.classList.remove("active");
          const content = t.nextElementSibling;
          content.classList.remove("active");
          content.style.maxHeight = null;
        });

        // Abre o accordion clicado (se não estava ativo)
        if (!isActive) {
          this.classList.add("active");
          const content = this.nextElementSibling;
          content.classList.add("active");
          content.style.maxHeight = content.scrollHeight + "px";
        }
      });
    });
  }

  /**
   * Adiciona os event listeners aos botões de gerar mensagem.
   */
  function setupButtonListeners() {
    container.querySelector("#btn-cobranca").addEventListener("click", () => {
      const p = container.querySelector("#cobranca-paciente").value;
      const d = container.querySelector("#cobranca-data").value;
      const m = container.querySelector("#cobranca-mes").value;
      const v = container.querySelector("#cobranca-valor").value;
      const px = container.querySelector("#cobranca-pix").value;
      const msg = `${getGreeting()}, ${p}!\n\nPassando para lembrar sobre a sua contribuição mensal, com vencimento em *${formatDateToDDMM(
        d
      )}*.\n\n*Ao contribuir, você garante a continuidade do seu atendimento e apoia o trabalho da EuPsico.* 😊\n\n*Mês de Referência:* ${m}\n*Valor:* R$ ${v}\n*Chave PIX:* ${px}\n\nQualquer dúvida, estou à disposição.`;
      generateAndCopy("output-cobranca", msg);
    });

    container.querySelector("#btn-agendada").addEventListener("click", () => {
      const tipo = container.querySelector("#agendada-tipo").value;
      const p = container.querySelector("#agendada-paciente").value;
      const t = container.querySelector("#agendada-terapeuta").value;
      const prof = container.querySelector("#agendada-profissao").value;
      const dia = container.querySelector("#agendada-diasemana").value;
      const data = container.querySelector("#agendada-data").value;
      const hora = container.querySelector("#agendada-hora").value;

      let intro =
        tipo === "plantao"
          ? `Meu nome é ${t} e sou o/a ${prof} da EuPsico que irá realizar seu atendimento no Plantão Psicológico.`
          : `Meu nome é ${t} e sou o/a ${prof} da EuPsico que irá realizar seu atendimento.`;

      let msg =
        tipo === "plantao"
          ? `${getGreeting()}, ${p}!\n\n${intro}\n\nEscrevo para confirmar nossa primeira sessão:\n✨ *${dia}, ${formatDateToDDMM(
              data
            )} às ${hora}* ✨\n\nPara que você se sinta mais confortável para o nosso encontro, gostaria de explicar como funciona este acolhimento inicial. O Plantão Psicológico é um *atendimento breve e focado* (de até quatro sessões), onde nosso objetivo será:\n\n➡️ *Identificar sua demanda principal:* Compreender as questões que levaram você a buscar ajuda neste momento.\n➡️ *Avaliar sua necessidade:* Analisar a urgência e a natureza da sua queixa.\n➡️ *Realizar o encaminhamento adequado:* Direcionar você para a modalidade de terapia mais indicada ao final do nosso processo.\n\nDois pontos importantes sobre este formato:\n1. O Plantão funciona como uma porta de entrada. Ele *não é um processo psicoterapêutico completo*, mas sim o primeiro passo para o cuidado contínuo.\n2. Como profissional do Plantão, meu papel é te acolher e direcionar da melhor forma. Por isso, a terapia contínua, se for o caso, será realizada por *outro colega*, garantindo um encaminhamento isento e focado no que é melhor para você.\n\nSou ${prof} com registro profissional, e nosso atendimento é totalmente protegido pelo sigilo e pela ética profissional.\n\nSe tiver qualquer dúvida antes da nossa sessão, pode me perguntar. Estou à disposição para te acolher nesta jornada.`
          : `${getGreeting()}, ${p}!\n\n${intro}\n\nEscrevo para confirmar nossa primeira sessão:\n✨ *${dia}, ${formatDateToDDMM(
              data
            )} às ${hora}* ✨\n\nCaso precise remarcar, por favor, me avise com no mínimo 24 horas de antecedência.\n\nAté lá!`;

      generateAndCopy("output-agendada", msg);
    });

    container.querySelector("#btn-agendar").addEventListener("click", () => {
      const p = container.querySelector("#agendar-paciente").value;
      const t = container.querySelector("#agendar-terapeuta").value;
      const prof = container.querySelector("#agendar-profissao").value;
      const mod = container.querySelector("#agendar-modalidade").value;
      const dia = container.querySelector("#agendar-diasemana").value;
      const hora = container.querySelector("#agendar-hora").value;
      const msg = `${getGreeting()}, ${p}!\n\nSou ${t}, ${prof} na EuPsico.\n\nTenho uma vaga disponível para você no seguinte horário:\n*- Modalidade:* ${mod}\n*- Dia e Hora:* ${dia}, às ${hora}.\n\nEste horário funciona para você?\n\nAguardo sua confirmação para darmos os próximos passos. 😉`;
      generateAndCopy("output-agendar", msg);
    });

    container.querySelector("#btn-primeira").addEventListener("click", () => {
      const p = container.querySelector("#primeira-paciente").value;
      const data = container.querySelector("#primeira-data-agendamento").value;
      const v = container.querySelector("#primeira-valor").value;
      const px = container.querySelector("#primeira-pix").value;
      const msg = `Olá, ${p}! Que bom que o horário funcionou para você.\n\nPara confirmarmos e garantirmos sua vaga, o próximo passo é realizar o pagamento da primeira contribuição.\n\n*Agendamento:* ${formatDateTimeLocalString(
        data
      )}\n*Valor:* R$ ${v}\n*Chave PIX:* ${px}\n\n*Prazo para envio do comprovante:* ${getFutureDate(
        2
      )}\n\nSeu horário será confirmado assim que recebermos o comprovante. Qualquer dúvida, é só chamar!`;
      generateAndCopy("output-primeira", msg);
    });
  }

  // --- PONTO DE ENTRADA ---
  setupSelects();
  setupAccordion();
  setupButtonListeners();
}
