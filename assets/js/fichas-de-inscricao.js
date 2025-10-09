// Arquivo: /assets/js/fichas-de-inscricao.js
// Versão: 3.0 (Modernizado, com verificação de agenda e Firebase v9)

import {
  db,
  functions,
  addDoc,
  updateDoc,
  doc,
  collection,
  serverTimestamp,
} from "./firebase-init.js";
import { httpsCallable } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-functions.js";

// --- Ponto de Entrada ---
document.addEventListener("DOMContentLoaded", init);

// --- Mapeamento de Elementos do DOM ---
// ( Centralize a busca de elementos aqui para organizar o código )
const elements = {
  form: document.getElementById("inscricao-form"),
  semAgendaAviso: document.getElementById("sem-agenda-aviso"),
  loadingContainer: document.getElementById("loading-container"),
  formContent: document.getElementById("form-content"),
  formBody: document.getElementById("form-body"),
  buttonBar: document.querySelector(".button-bar"),
  // Adicione outros elementos que você usa frequentemente aqui...
};

let pacienteExistenteData = null;
const verificarCpfExistente = httpsCallable(functions, "verificarCpfExistente");

/**
 * Função principal que inicializa a página.
 */
async function init() {
  const agendasAbertas = await verificarStatusAgenda();

  elements.loadingContainer.style.display = "none";

  if (agendasAbertas) {
    elements.formContent.style.display = "block";
    inicializarEventListeners();
  } else {
    elements.semAgendaAviso.style.display = "block";
  }
}

/**
 * Verifica no Firestore se há agendas abertas para triagem.
 * @returns {Promise<boolean>} - Retorna true se houver agendas, false caso contrário.
 */
async function verificarStatusAgenda() {
  console.log("Verificando status da agenda de triagem...");
  // ==============================================================================
  // NOTA: Substitua esta lógica de simulação pela sua regra de negócio real.
  // Exemplo: Buscar um documento de configuração no Firestore.
  //
  // try {
  //   const configRef = doc(db, 'configuracoes', 'agendaTriagem');
  //   const docSnap = await getDoc(configRef);
  //   if (docSnap.exists() && docSnap.data().aberta === true) {
  //     return true; // Agenda está aberta
  //   }
  //   return false; // Agenda está fechada
  // } catch (error) {
  //   console.error("Erro ao verificar agenda:", error);
  //   return false;
  // }
  // ==============================================================================

  // Lógica de simulação (remover em produção)
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(true); // Simula que a agenda está sempre aberta. Mude para 'false' para testar o aviso.
    }, 500);
  });
}

/**
 * Configura todos os event listeners do formulário.
 */
function inicializarEventListeners() {
  const cpfInput = document.getElementById("cpf");
  const dataNascimentoInput = document.getElementById("data-nascimento");

  cpfInput.addEventListener("blur", handleCpfBlur);
  dataNascimentoInput.addEventListener("change", handleDataNascimentoChange);

  // Adicione outros listeners aqui (formatação de moeda, telefone, etc.)

  elements.form.addEventListener("submit", handleFormSubmit);
}

/**
 * Lida com o evento de sair do campo CPF.
 */
async function handleCpfBlur(event) {
  const cpfInput = event.target;
  const cpf = cpfInput.value.replace(/\D/g, "");
  const cpfError = document.getElementById("cpf-error");

  cpfError.style.display = "none";

  if (!validarCPF(cpf)) {
    cpfError.style.display = "block";
    return;
  }

  try {
    const result = await verificarCpfExistente({ cpf: cpf });
    if (result.data && result.data.exists) {
      pacienteExistenteData = { ...result.data.dados, id: result.data.docId };
      mostrarSecaoAtualizacao(pacienteExistenteData);
    } else {
      pacienteExistenteData = null;
      // Apenas libera os próximos campos se não houver cadastro
      document.getElementById("initial-fields").style.display = "block";
    }
  } catch (error) {
    console.error("Erro ao verificar CPF via Cloud Function:", error);
    alert("Não foi possível verificar o CPF. Tente novamente.");
  }
}

/**
 * Lida com a mudança na data de nascimento para mostrar o resto do formulário.
 */
function handleDataNascimentoChange() {
  if (pacienteExistenteData) return; // Não faz nada se for uma atualização

  const dataNascimentoInput = document.getElementById("data-nascimento");
  if (!dataNascimentoInput.value) return;

  elements.formBody.classList.remove("hidden-section");
  elements.buttonBar.classList.remove("hidden-section");
  // Carrega o conteúdo do formulário para um novo cadastro
  document
    .getElementById("new-register-section")
    .classList.remove("hidden-section");
  document
    .getElementById("full-form-fields")
    .classList.remove("hidden-section");

  // Lógica de menor de idade
  const idade = calcularIdade(dataNascimentoInput.value);
  const responsavelSection = document.getElementById(
    "responsavel-legal-section"
  );
  if (idade < 18) {
    responsavelSection.classList.remove("hidden-section");
    setRequired(responsavelSection, true);
  } else {
    responsavelSection.classList.add("hidden-section");
    setRequired(responsavelSection, false);
  }
}

/**
 * Lida com o envio do formulário.
 */
async function handleFormSubmit(event) {
  event.preventDefault();

  if (!elements.form.checkValidity()) {
    elements.form.reportValidity();
    alert("Por favor, preencha todos os campos obrigatórios (*).");
    return;
  }

  const submitButton = elements.form.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  submitButton.textContent = "Enviando...";

  try {
    if (pacienteExistenteData) {
      // MODO DE ATUALIZAÇÃO
      const dadosAtualizados = coletarDadosFormulario("update");
      dadosAtualizados.lastUpdated = serverTimestamp();
      dadosAtualizados.status = "atualizacao_realizada";

      const docRef = doc(db, "inscricoes", pacienteExistenteData.id);
      await updateDoc(docRef, dadosAtualizados);
    } else {
      // MODO DE NOVO CADASTRO
      const novoCadastro = coletarDadosFormulario("new");
      novoCadastro.timestamp = serverTimestamp();
      novoCadastro.status = "inscricao_realizada";

      await addDoc(collection(db, "inscricoes"), novoCadastro);
    }

    elements.form.innerHTML = `<div style="text-align: center; padding: 30px;"><h2>Inscrição Enviada com Sucesso!</h2><p>Recebemos seus dados. Em breve, nossa equipe entrará em contato.</p></div>`;
  } catch (error) {
    console.error("Erro ao salvar inscrição:", error);
    alert("Ocorreu um erro ao enviar sua inscrição. Tente novamente.");
    submitButton.disabled = false;
    submitButton.textContent = "Enviar Inscrição";
  }
}

// --- Funções Auxiliares ---

function mostrarSecaoAtualizacao(dados) {
  document.getElementById("initial-fields").style.display = "none";
  elements.formBody.classList.remove("hidden-section");
  elements.buttonBar.classList.remove("hidden-section");
  document.getElementById("update-section").classList.remove("hidden-section");
  document
    .getElementById("new-register-section")
    .classList.add("hidden-section");

  // Preenche os campos de atualização
  document.getElementById("update-nome-completo").value =
    dados.nomeCompleto || "";
  // Preencha outros campos de endereço aqui...
}

function coletarDadosFormulario(modo) {
  const formData = new FormData(elements.form);
  const dados = {};

  if (modo === "update") {
    // Coleta apenas os campos da seção de atualização
    // Exemplo:
    dados.rua = formData.get("update-rua");
    dados.pessoasMoradia = formData.get("update-pessoas-moradia");
    // Adicione os outros campos de atualização...
  } else {
    // Coleta todos os campos do novo formulário
    for (let [key, value] of formData.entries()) {
      dados[key] = value;
    }
    // Lógica para disponibilidade
    dados.disponibilidadeGeral = formData.getAll("horario");
    dados.disponibilidadeEspecifica = formData.getAll("horario-especifico");
  }
  return dados;
}

function calcularIdade(dataNascimento) {
  const hoje = new Date();
  const nasc = new Date(dataNascimento);
  let idade = hoje.getFullYear() - nasc.getFullYear();
  const m = hoje.getMonth() - nasc.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) {
    idade--;
  }
  return idade;
}

function setRequired(section, isRequired) {
  const inputs = section.querySelectorAll("input, select, textarea");
  inputs.forEach((input) => {
    input.required = isRequired;
  });
}

function validarCPF(cpf) {
  cpf = cpf.replace(/[^\d]+/g, "");
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
