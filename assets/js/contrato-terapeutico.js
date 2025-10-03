import { db, functions } from "./firebase-init.js";
import { httpsCallable } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-functions.js";

// Instância da Cloud Function
const assinarContrato = httpsCallable(functions, "assinarContrato");

document.addEventListener("DOMContentLoaded", () => {
  const urlParams = new URLSearchParams(window.location.search);
  const pacienteId = urlParams.get("id");

  const loadingDiv = document.getElementById("contract-loading");
  const contentDiv = document.getElementById("contract-content");

  if (!pacienteId) {
    loadingDiv.style.display = "none";
    contentDiv.innerHTML =
      '<div class="error-message">Link inválido. O identificador do paciente não foi encontrado.</div>';
    contentDiv.classList.remove("hidden");
    return;
  }

  loadContractData(pacienteId);
});

async function loadContractData(pacienteId) {
  const loadingDiv = document.getElementById("contract-loading");
  const contentDiv = document.getElementById("contract-content");

  try {
    const docRef = db.collection("trilhaPaciente").doc(pacienteId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      throw new Error(
        "Paciente não encontrado. Verifique se o link está correto."
      );
    }

    const data = docSnap.data();

    if (data.contratoAssinado && data.contratoAssinado.assinadoEm) {
      displayAlreadySigned(data);
      return;
    }

    populateContractFields(data);
    setupSignatureForm(pacienteId, data);

    loadingDiv.style.display = "none";
    contentDiv.classList.remove("hidden");
  } catch (error) {
    console.error("Erro ao carregar dados do contrato:", error);
    loadingDiv.style.display = "none";
    contentDiv.innerHTML = `<div class="error-message">${error.message}</div>`;
    contentDiv.classList.remove("hidden");
  }
}

function populateContractFields(data) {
  const pbInfo = data.pbInfo || {};
  const horarioInfo = pbInfo.horarioSessao || {};

  const formatDate = (dateString) => {
    if (!dateString) return "Não informado";
    return new Date(dateString + "T03:00:00").toLocaleDateString("pt-BR");
  };

  const calculateAge = (birthDate) => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate + "T03:00:00");
    let age = today.getFullYear() - birth.getFullYear();
    const month = today.getMonth() - birth.getMonth();
    if (month < 0 || (month === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const idade = calculateAge(data.dataNascimento);
  const isMenor = idade !== null && idade < 18;

  document.getElementById("data-terapeuta").textContent =
    pbInfo.profissionalNome || "A definir";
  document.getElementById("data-paciente-nome").textContent =
    data.nomeCompleto || "Não informado";
  document.getElementById("data-paciente-nascimento").textContent = formatDate(
    data.dataNascimento
  );

  const valor = data.valorContribuicao
    ? data.valorContribuicao
        .replace("R$", "")
        .replace(/\s/g, "")
        .replace(/\./g, "")
        .replace(",", ".")
    : null;

  const exibicao = valor
    ? "R$ " + parseFloat(valor).toFixed(2).replace(".", ",")
    : "";
  document.getElementById("data-contribuicao").textContent = exibicao;

  document.getElementById("data-dia-sessao").textContent =
    horarioInfo.diaSemana || "A definir";
  document.getElementById("data-horario-sessao").textContent =
    horarioInfo.horario || "A definir";
  document.getElementById("data-tipo-atendimento").textContent =
    horarioInfo.tipoAtendimento || "A definir";

  const responsavelSection = document.getElementById("responsavel-section");
  const signerNameLabel = document.getElementById("signer-name-label");
  const signerCpfLabel = document.getElementById("signer-cpf-label");

  if (isMenor && data.responsavel && data.responsavel.nome) {
    responsavelSection.classList.remove("hidden");
    document.getElementById("data-responsavel-nome").textContent =
      data.responsavel.nome;
    signerNameLabel.textContent = "Nome Completo do RESPONSÁVEL LEGAL:";
    signerCpfLabel.textContent = "CPF do RESPONSÁVEL LEGAL:";
  } else {
    signerNameLabel.textContent = "Nome Completo do PACIENTE:";
    signerCpfLabel.textContent = "CPF do PACIENTE:";
  }
}

function setupSignatureForm(pacienteId, pacienteData) {
  const form = document.getElementById("signature-form");
  const feedbackDiv = document.getElementById("signature-feedback");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    feedbackDiv.textContent = "Processando assinatura...";
    feedbackDiv.style.color = "var(--cor-primaria)";

    const agreement = form.querySelector(
      'input[name="agreement"]:checked'
    ).value;

    if (agreement === "nao-concordo") {
      feedbackDiv.textContent =
        "A assinatura foi cancelada. Você pode fechar esta página.";
      feedbackDiv.style.color = "var(--cor-alerta)";
      button.disabled = true;
      return;
    }

    const signerName = document.getElementById("signer-name").value.trim();
    const signerCpf = document.getElementById("signer-cpf").value.trim();

    if (!pacienteId || !signerName || !signerCpf) {
      console.warn("Dados ausentes:", { pacienteId, signerName, signerCpf });
      feedbackDiv.textContent =
        "Erro interno: dados obrigatórios não foram capturados corretamente.";
      feedbackDiv.style.color = "var(--cor-erro)";
      button.disabled = false;
      return;
    }

    const versaoContrato = "1.0";
    const ip = "cliente"; // ou use uma lib para tentar capturar IP real

    console.log("Dados enviados para a função:", {
      pacienteId,
      nomeSignatario: signerName,
      cpfSignatario: signerCpf,
      versaoContrato,
      ip,
    });

    try {
      const result = await assinarContrato({
        pacienteId,
        nomeSignatario: signerName,
        cpfSignatario: signerCpf,
        versaoContrato,
        ip,
      });

      console.log(result.data.message);

      document
        .getElementById("acceptance-form-section")
        .classList.add("hidden");
      document.getElementById("thank-you-section").classList.remove("hidden");
    } catch (error) {
      console.error("Erro ao assinar o contrato:", error);
      feedbackDiv.textContent =
        "Ocorreu um erro ao processar a assinatura. Tente novamente.";
      feedbackDiv.style.color = "var(--cor-erro)";
      button.disabled = false;
    }
  });
}

function displayAlreadySigned(data) {
  const loadingDiv = document.getElementById("contract-loading");
  const contentDiv = document.getElementById("contract-content");
  const formSection = document.getElementById("acceptance-form-section");
  const thankYouSection = document.getElementById("thank-you-section");

  populateContractFields(data);

  formSection.innerHTML = `
        <div class="confirmation-box" style="border-color: var(--cor-sucesso); text-align: center;">
            <h4>Contrato Assinado</h4>
            <p>Este contrato foi assinado digitalmente em <strong>${new Date(
              data.contratoAssinado.assinadoEm.seconds * 1000
            ).toLocaleDateString("pt-BR")}</strong> 
            às <strong>${new Date(
              data.contratoAssinado.assinadoEm.seconds * 1000
            ).toLocaleTimeString("pt-BR")}</strong>.</p>
        </div>
    `;

  loadingDiv.style.display = "none";
  contentDiv.classList.remove("hidden");
  thankYouSection.classList.add("hidden");
}
