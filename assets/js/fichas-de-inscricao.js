// Arquivo: /assets/js/fichas-de-inscricao.js
// Versão Final: Implementada a lógica de envio para o Firestore.

import { db } from "./firebase-init.js";

document.addEventListener("DOMContentLoaded", () => {
  // --- Mapeamento de Elementos ---
  const form = document.getElementById("inscricao-form");
  const cpfInput = document.getElementById("cpf");
  const cpfError = document.getElementById("cpf-error");
  const cepInput = document.getElementById("cep");
  const dataNascimentoInput = document.getElementById("data-nascimento");
  const formBody = document.getElementById("form-body");
  const updateSection = document.getElementById("update-section");
  const newRegisterSection = document.getElementById("new-register-section");
  const fullFormFields = document.getElementById("full-form-fields");
  const responsavelSection = document.getElementById(
    "responsavel-legal-section"
  );
  const responsavelCpfInput = document.getElementById("responsavel-cpf");

  let pacienteExistenteId = null; // Armazena o ID do documento para atualização

  // --- Validação de CPF ---
  function validarCPF(cpf) {
    cpf = cpf.replace(/[^\d]+/g, "");
    if (cpf == "" || cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
    let add = 0;
    for (let i = 0; i < 9; i++) add += parseInt(cpf.charAt(i)) * (10 - i);
    let rev = 11 - (add % 11);
    if (rev == 10 || rev == 11) rev = 0;
    if (rev != parseInt(cpf.charAt(9))) return false;
    add = 0;
    for (let i = 0; i < 10; i++) add += parseInt(cpf.charAt(i)) * (11 - i);
    rev = 11 - (add % 11);
    if (rev == 10 || rev == 11) rev = 0;
    if (rev != parseInt(cpf.charAt(10))) return false;
    return true;
  }

  // --- Verificação de CPF (no banco) ---
  cpfInput.addEventListener("blur", async () => {
    const cpf = cpfInput.value.replace(/\D/g, "");
    cpfError.style.display = "none";

    if (!validarCPF(cpf)) {
      cpfError.style.display = "block";
      resetForm();
      return;
    }

    try {
      const snapshot = await db
        .collection("inscricoes")
        .where("cpf", "==", cpf)
        .limit(1)
        .get();
      if (!snapshot.empty) {
        pacienteExistenteId = snapshot.docs[0].id;
        const pacienteData = snapshot.docs[0].data();
        const nome = pacienteData.nomeCompleto || "Nome não encontrado";
        if (
          confirm(
            `Já existe um cadastro para ${nome}. Deseja apenas atualizar as informações socioeconômicas e de contato?`
          )
        ) {
          formBody.classList.remove("hidden-section");
          updateSection.classList.remove("hidden-section");
          newRegisterSection.classList.add("hidden-section");
        } else {
          resetForm(true);
        }
      } else {
        pacienteExistenteId = null;
        formBody.classList.remove("hidden-section");
        updateSection.classList.add("hidden-section");
        newRegisterSection.classList.remove("hidden-section");
      }
    } catch (error) {
      console.error("Erro ao verificar CPF:", error);
      alert(
        "Não foi possível verificar o CPF. Verifique sua conexão e as regras de segurança do Firestore."
      );
    }
  });

  // --- Lógica de Menor de Idade ---
  dataNascimentoInput.addEventListener("change", () => {
    const dataNasc = new Date(dataNascimentoInput.value);
    if (isNaN(dataNasc.getTime())) return;
    const hoje = new Date();
    let idade = hoje.getFullYear() - dataNasc.getFullYear();
    const m = hoje.getMonth() - dataNasc.getMonth();
    if (m < 0 || (m === 0 && hoje.getDate() < dataNasc.getDate())) {
      idade--;
    }

    fullFormFields.classList.remove("hidden-section");
    if (idade < 18) {
      responsavelSection.classList.remove("hidden-section");
    } else {
      responsavelSection.classList.add("hidden-section");
    }
  });

  responsavelCpfInput.addEventListener("blur", () => {
    if (responsavelCpfInput.value === cpfInput.value) {
      alert(
        "Atenção: O CPF do responsável é o mesmo do paciente. Será gerado um código temporário para o paciente."
      );
      const tempId = `TEMP-${Date.now()}`;
      cpfInput.value = tempId;
      cpfInput.readOnly = true;
      alert(
        `O CPF do paciente foi substituído por um código de identificação: ${tempId}. Guarde este código para futuras consultas.`
      );
    }
  });

  // --- Busca de Endereço por CEP ---
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

  // --- Lógica de Disponibilidade de Horário ---
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
    if (keepCpf) cpfInput.value = cpfValue;
  }

  // --- LÓGICA DE ENVIO DO FORMULÁRIO ---
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = "Enviando...";

    try {
      if (pacienteExistenteId) {
        // MODO ATUALIZAÇÃO
        const dadosParaAtualizar = {
          endereco: document.getElementById("update-endereco").value,
          pessoasMoradia: document.getElementById("update-pessoas-moradia")
            .value,
          casaPropria: document.getElementById("update-casa-propria").value,
          valorAluguel:
            document.getElementById("update-valor-aluguel").value || 0,
          rendaMensal: document.getElementById("update-renda-mensal").value,
          rendaFamiliar: document.getElementById("update-renda-familiar").value,
          lastUpdated: new Date(),
        };
        await db
          .collection("inscricoes")
          .doc(pacienteExistenteId)
          .update(dadosParaAtualizar);
        alert("Cadastro atualizado com sucesso!");
      } else {
        // MODO NOVO CADASTRO
        const horariosSelecionados = Array.from(
          document.querySelectorAll('input[name="horario-especifico"]:checked')
        ).map((cb) => cb.value);

        const novoCadastro = {
          // Dados Pessoais e Responsável
          cpf: document.getElementById("cpf").value,
          dataNascimento: document.getElementById("data-nascimento").value,
          nomeCompleto: document.getElementById("nome-completo").value,
          rg: document.getElementById("rg").value,
          genero: document.getElementById("genero").value,
          estadoCivil: document.getElementById("estado-civil").value,
          escolaridade: document.getElementById("escolaridade").value,
          responsavel: {
            nome: document.getElementById("responsavel-nome").value,
            cpf: document.getElementById("responsavel-cpf").value,
            parentesco: document.getElementById("responsavel-parentesco").value,
            contato: document.getElementById("responsavel-contato").value,
          },
          // Contato e Endereço
          telefoneCelular: document.getElementById("telefone-celular").value,
          email: document.getElementById("email").value,
          cep: document.getElementById("cep").value,
          cidade: document.getElementById("cidade").value,
          rua: document.getElementById("rua").value,
          numeroCasa: document.getElementById("numero-casa").value,
          bairro: document.getElementById("bairro").value,
          complemento: document.getElementById("complemento").value,
          // Sociodemográficos
          pessoasMoradia: document.getElementById("pessoas-moradia").value,
          tipoMoradia: document.getElementById("tipo-moradia").value,
          casaPropria: document.getElementById("casa-propria").value,
          valorAluguel: document.getElementById("valor-aluguel").value || 0,
          rendaMensal: document.getElementById("renda-mensal").value,
          rendaFamiliar: document.getElementById("renda-familiar").value,
          beneficioSocial: document.getElementById("beneficio-social").value,
          comoConheceu: document.getElementById("como-conheceu").value,
          // Queixa e Disponibilidade
          tratamentoAnterior: document.getElementById("tratamento-anterior")
            .value,
          motivoBusca: document.getElementById("motivo-busca").value,
          disponibilidadeGeral: Array.from(
            document.querySelectorAll('input[name="horario"]:checked')
          ).map((cb) => cb.nextSibling.textContent.trim()),
          disponibilidadeEspecifica: horariosSelecionados,
          // Metadados
          timestamp: new Date(),
          status: "aguardando_documentos", // Status inicial
        };
        await db.collection("inscricoes").add(novoCadastro);
        alert(
          "Inscrição realizada com sucesso! Por favor, siga os próximos passos informados no início da página."
        );
      }
      resetForm();
    } catch (error) {
      console.error("Erro ao salvar inscrição:", error);
      alert(
        "Ocorreu um erro ao enviar sua inscrição. Por favor, tente novamente."
      );
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "Enviar Inscrição";
    }
  });
});
