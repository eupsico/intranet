// Arquivo: /assets/js/fichas-de-inscricao.js
// Versão Final: Simplificada, sem agendamento de triagem no formulário.

import { db, functions } from "./firebase-init.js";
import { httpsCallable } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-functions.js";

document.addEventListener("DOMContentLoaded", () => {
  // --- Mapeamento de Elementos ---
  const form = document.getElementById("inscricao-form");
  const cpfInput = document.getElementById("cpf");
  const cpfError = document.getElementById("cpf-error");
  const dataNascimentoInput = document.getElementById("data-nascimento");
  const initialFieldsContainer = document.getElementById("initial-fields");
  const formBody = document.getElementById("form-body");
  const updateSection = document.getElementById("update-section");
  const newRegisterSection = document.getElementById("new-register-section");
  const fullFormFields = document.getElementById("full-form-fields");
  const responsavelSection = document.getElementById(
    "responsavel-legal-section"
  );
  const responsavelCpfInput = document.getElementById("responsavel-cpf");
  const cepInput = document.getElementById("cep");
  const parentescoSelect = document.getElementById("responsavel-parentesco");
  const outroParentescoContainer = document.getElementById(
    "outro-parentesco-container"
  );
  // Elementos de agendamento removidos
  // const semAgendaAviso = document.getElementById("sem-agenda-aviso");
  // const loadingContainer = document.getElementById("loading-container");
  const formContent = document.getElementById("form-content");

  let pacienteExistenteData = null;

  // --- Instância da Cloud Function ---
  const verificarCpfExistente = httpsCallable(
    functions,
    "verificarCpfExistente"
  );

  // --- FUNÇÕES DE FORMATAÇÃO E VALIDAÇÃO (sem alterações) ---
  function formatarTelefone(input) {
    let value = input.value.replace(/\D/g, "");
    value = value.substring(0, 11);
    if (value.length > 10) {
      value = value.replace(/^(\d\d)(\d{5})(\d{4}).*/, "($1) $2-$3");
    } else if (value.length > 5) {
      value = value.replace(/^(\d\d)(\d{4})(\d{0,4}).*/, "($1) $2-$3");
    } else if (value.length > 2) {
      value = value.replace(/^(\d\d)(\d{0,5}).*/, "($1) $2");
    } else {
      value = value.replace(/^(\d*)/, "($1");
    }
    input.value = value;
  }

  function formatarMoeda(input) {
    let value = input.value.replace(/\D/g, "");
    if (value === "") {
      input.value = "";
      return;
    }
    value = (parseInt(value) / 100).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
    input.value = value;
  }

  document
    .querySelectorAll(
      "#update-valor-aluguel, #update-renda-mensal, #update-renda-familiar, #valor-aluguel, #renda-mensal, #renda-familiar"
    )
    .forEach((input) => {
      input.addEventListener("input", () => formatarMoeda(input));
    });

  document
    .querySelectorAll("#telefone-celular, #telefone-fixo, #responsavel-contato")
    .forEach((input) => {
      input.addEventListener("input", () => formatarTelefone(input));
    });

  function validarCPF(cpf) {
    cpf = cpf.replace(/[^\d]+/g, "");

    // Se começar com '99', considera válido como CPF temporário
    if (cpf.startsWith("99")) {
      return true;
    }

    // Validação padrão de CPF
    if (cpf === "" || cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
    let add = 0;
    for (let i = 0; i < 9; i++) add += parseInt(cpf.charAt(i)) * (10 - i);
    let rev = 11 - (add % 11);
    if (rev === 10 || rev === 11) rev = 0;
    if (rev !== parseInt(cpf.charAt(9))) return false;
    add = 0;
    for (let i = 0; i < 10; i++) add += parseInt(cpf.charAt(i)) * (11 - i);
    rev = 11 - (add % 11);
    if (rev === 10 || rev === 11) rev = 0;
    if (rev !== parseInt(cpf.charAt(10))) return false;
    return true;
  }

  // --- LÓGICA PRINCIPAL DO FORMULÁRIO ---

  cpfInput.addEventListener("blur", async () => {
    const cpf = cpfInput.value.replace(/\D/g, "");
    cpfError.style.display = "none";

    if (!validarCPF(cpf)) {
      cpfError.style.display = "block";
      resetForm();
      return;
    }

    try {
      const result = await verificarCpfExistente({ cpf: cpf });
      const data = result.data;

      if (data && data.exists) {
        pacienteExistenteData = data.dados;
        pacienteExistenteData.id = data.docId;

        initialFieldsContainer.classList.add("hidden-section");
        formBody.classList.remove("hidden-section");
        updateSection.classList.remove("hidden-section");
        newRegisterSection.classList.add("hidden-section");

        document.getElementById("update-nome-completo").value =
          pacienteExistenteData.nomeCompleto || "";
        document.getElementById("update-rua").value =
          pacienteExistenteData.rua || "";
        document.getElementById("update-numero").value =
          pacienteExistenteData.numeroCasa || "";
        document.getElementById("update-bairro").value =
          pacienteExistenteData.bairro || "";
        document.getElementById("update-cidade").value =
          pacienteExistenteData.cidade || "";
        document.getElementById("update-cep").value =
          pacienteExistenteData.cep || "";

        document.getElementById("update-pessoas-moradia").value = "";
        document.getElementById("update-casa-propria").value = "";
        document.getElementById("update-valor-aluguel").value = "";
        document.getElementById("update-renda-mensal").value = "";
        document.getElementById("update-renda-familiar").value = "";
      } else {
        pacienteExistenteData = null;
      }
    } catch (error) {
      console.error("Erro ao verificar CPF via Cloud Function:", error);
      alert(
        "Não foi possível verificar o CPF. Verifique sua conexão e tente novamente."
      );
    }
  });

  document
    .getElementById("btn-alterar-endereco")
    .addEventListener("click", () => {
      const camposEndereco = [
        "update-rua",
        "update-numero",
        "update-bairro",
        "update-cidade",
        "update-cep",
      ];
      camposEndereco.forEach((id) => {
        document.getElementById(id).disabled = false;
      });
      alert("Os campos de endereço foram desbloqueados para alteração.");
    });

  dataNascimentoInput.addEventListener("change", () => {
    const dataNasc = new Date(dataNascimentoInput.value);
    if (isNaN(dataNasc.getTime()) || pacienteExistenteData) {
      return;
    }

    formBody.classList.remove("hidden-section");
    newRegisterSection.classList.remove("hidden-section");
    updateSection.classList.add("hidden-section");
    fullFormFields.classList.remove("hidden-section");

    const hoje = new Date();
    let idade = hoje.getFullYear() - dataNasc.getFullYear();
    const m = hoje.getMonth() - dataNasc.getMonth();
    if (m < 0 || (m === 0 && hoje.getDate() < dataNasc.getDate())) {
      idade--;
    }

    if (idade < 18) {
      responsavelSection.classList.remove("hidden-section");
    } else {
      responsavelSection.classList.add("hidden-section");
    }
  });

  parentescoSelect.addEventListener("change", () => {
    outroParentescoContainer.classList.toggle(
      "hidden-section",
      parentescoSelect.value !== "Outro"
    );
  });

  responsavelCpfInput.addEventListener("blur", () => {
    if (responsavelCpfInput.value === cpfInput.value) {
      alert(
        "Atenção: O CPF do responsável é o mesmo do paciente. Será gerado um código temporário para o paciente."
      );
      const tempId = `99${Date.now()}`;
      cpfInput.value = tempId;
      cpfInput.readOnly = true;
      alert(
        `O CPF do paciente foi substituído por um código de identificação: ${tempId}. Guarde este código para futuras consultas.`
      );
    }
  });

  cepInput.addEventListener("blur", async () => {
    const cep = cepInput.value.replace(/\D/g, "");
    if (cep.length !== 8) return;
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();
      if (!data.erro) {
        document.getElementById("rua").value = data.logradouro;
        document.getElementById("bairro").value = data.bairro;
        document.getElementById("cidade").value = data.localidade;
        document.getElementById("numero-casa").focus();
      }
    } catch (error) {
      console.error("Erro ao buscar CEP:", error);
    }
  });

  const disponibilidadeSection = document.getElementById(
    "disponibilidade-section"
  );
  if (disponibilidadeSection) {
    const infoText = document.createElement("p");
    infoText.className = "info-note";
    // Texto ajustado, pois não há mais agendamento de triagem aqui
    infoText.textContent =
      "Esta disponibilidade refere-se aos seus horários para as sessões de PSICOTERAPIA.";
    const h3 = disponibilidadeSection.querySelector("h3");
    if (h3) h3.insertAdjacentElement("afterend", infoText);
  }

  const horariosCheckboxes = document.querySelectorAll('input[name="horario"]');
  horariosCheckboxes.forEach((checkbox) => {
    checkbox.addEventListener("change", (e) => {
      const periodo = e.target.value;
      const container = document.getElementById(`container-${periodo}`);
      if (e.target.checked) {
        gerarHorarios(periodo, container);
        container.classList.remove("hidden-section");
      } else {
        container.innerHTML = "";
        container.classList.add("hidden-section");
      }
    });
  });

  function gerarHorarios(periodo, container) {
    let horarios = [],
      label = "";
    switch (periodo) {
      case "manha-semana":
        label = "Manhã (Seg-Sex):";
        for (let i = 8; i < 12; i++) horarios.push(`${i}:00`);
        break;
      case "tarde-semana":
        label = "Tarde (Seg-Sex):";
        for (let i = 12; i < 18; i++) horarios.push(`${i}:00`);
        break;
      case "noite-semana":
        label = "Noite (Seg-Sex):";
        for (let i = 18; i < 21; i++) horarios.push(`${i}:00`);
        break;
      case "manha-sabado":
        label = "Manhã (Sábado):";
        for (let i = 8; i < 13; i++) horarios.push(`${i}:00`);
        break;
    }
    let html = `<label>${label}</label><div class="horario-detalhe-grid">`;
    horarios.forEach((hora) => {
      html += `<div><input type="checkbox" name="horario-especifico" value="${periodo}_${hora}"> ${hora}</div>`;
    });
    container.innerHTML = html + `</div>`;
  }

  function resetForm(keepCpf = false) {
    const cpfValue = cpfInput.value;
    form.reset();
    formBody.classList.add("hidden-section");
    initialFieldsContainer.classList.remove("hidden-section");
    fullFormFields.classList.add("hidden-section");
    cpfInput.readOnly = false;
    if (keepCpf) {
      cpfInput.value = cpfValue;
    }
  }

  // --- LÓGICA DE ENVIO DO FORMULÁRIO ---

  // **ALTERAÇÃO**: O submit agora chama diretamente a função de envio.
  form.addEventListener("submit", (e) => {
    e.preventDefault();

    if (!form.checkValidity()) {
      form.reportValidity();
      alert(
        "Por favor, preencha todos os campos obrigatórios (*) antes de enviar."
      );
      return;
    }
    // Chama a função de envio diretamente
    enviarFormulario();
  });

  // A função agora é chamada diretamente pelo submit do formulário
  async function enviarFormulario() {
    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = "Enviando...";

    try {
      if (pacienteExistenteData) {
        // MODO ATUALIZAÇÃO
        const dadosParaAtualizar = {
          rua: document.getElementById("update-rua").value,
          numeroCasa: document.getElementById("update-numero").value,
          bairro: document.getElementById("update-bairro").value,
          cidade: document.getElementById("update-cidade").value,
          cep: document.getElementById("update-cep").value,
          pessoasMoradia: document.getElementById("update-pessoas-moradia")
            .value,
          casaPropria: document.getElementById("update-casa-propria").value,
          valorAluguel: document.getElementById("update-valor-aluguel").value,
          rendaMensal: document.getElementById("update-renda-mensal").value,
          rendaFamiliar: document.getElementById("update-renda-familiar").value,
          lastUpdated: new Date(),
          // Campos de agendamento removidos
          status: "atualizacao_realizada", // Status alterado
        };
        await db
          .collection("inscricoes")
          .doc(pacienteExistenteData.id)
          .update(dadosParaAtualizar);
      } else {
        // MODO NOVO CADASTRO
        const horariosSelecionados = Array.from(
          document.querySelectorAll('input[name="horario-especifico"]:checked')
        ).map((cb) => cb.value);

        let parentescoFinal = document.getElementById(
          "responsavel-parentesco"
        ).value;
        if (parentescoFinal === "Outro") {
          parentescoFinal = document.getElementById(
            "responsavel-parentesco-outro"
          ).value;
        }

        const novoCadastro = {
          cpf: document.getElementById("cpf").value,
          nomeCompleto: document.getElementById("nome-completo").value,
          dataNascimento: document.getElementById("data-nascimento").value,
          rg: document.getElementById("rg").value,
          genero: document.getElementById("genero").value,
          estadoCivil: document.getElementById("estado-civil").value,
          escolaridade: document.getElementById("escolaridade").value,
          responsavel: {
            nome: document.getElementById("responsavel-nome").value,
            cpf: document.getElementById("responsavel-cpf").value,
            parentesco: parentescoFinal,
            contato: document.getElementById("responsavel-contato").value,
          },
          telefoneCelular: document.getElementById("telefone-celular").value,
          telefoneFixo: document.getElementById("telefone-fixo").value,
          email: document.getElementById("email").value,
          cep: document.getElementById("cep").value,
          cidade: document.getElementById("cidade").value,
          rua: document.getElementById("rua").value,
          numeroCasa: document.getElementById("numero-casa").value,
          bairro: document.getElementById("bairro").value,
          complemento: document.getElementById("complemento").value,
          pessoasMoradia: document.getElementById("pessoas-moradia").value,
          tipoMoradia: document.getElementById("tipo-moradia").value,
          casaPropria: document.getElementById("casa-propria").value,
          valorAluguel: document.getElementById("valor-aluguel").value,
          rendaMensal: document.getElementById("renda-mensal").value,
          rendaFamiliar: document.getElementById("renda-familiar").value,
          beneficioSocial: document.getElementById("beneficio-social").value,
          comoConheceu: document.getElementById("como-conheceu").value,
          tratamentoAnterior: document.getElementById("tratamento-anterior")
            .value,
          motivoBusca: document.getElementById("motivo-busca").value,
          disponibilidadeGeral: Array.from(
            document.querySelectorAll('input[name="horario"]:checked')
          ).map((cb) => cb.nextSibling.textContent.trim()),
          disponibilidadeEspecifica: horariosSelecionados,
          timestamp: new Date(),
          // Campos de agendamento removidos
          status: "inscricao_realizada", // Status alterado
        };
        await db.collection("inscricoes").add(novoCadastro);
      }
      // Mensagem de sucesso simplificada
      form.innerHTML = `<div style="text-align: center; padding: 30px;"><h2>Inscrição Enviada com Sucesso!</h2><p>Recebemos seus dados. Em breve, nossa equipe entrará em contato para os próximos passos.</p></div>`;
    } catch (error) {
      console.error("Erro ao salvar inscrição:", error);
      alert(
        "Ocorreu um erro ao enviar sua inscrição. Por favor, tente novamente."
      );
      submitButton.disabled = false;
      submitButton.textContent = "Enviar Inscrição";
    }
  }

  document.getElementById("loading-container").style.display = "none";
  document.getElementById("form-content").style.display = "block";
});
