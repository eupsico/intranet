// Arquivo: /modulos/voluntario/js/meus-pacientes/actions.js
// Função interna para carregar imagem como Base64
const loadImageAsBase64 = async (url) => {
  try {
    const response = await fetch(url);
    if (!response.ok)
      throw new Error(`Erro ao buscar imagem: ${response.statusText}`);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error(`Falha ao carregar imagem ${url}:`, error);
    return null; // Retorna null se falhar
  }
};

// --- FUNÇÃO formatCurrency CORRIGIDA ---
const formatCurrency = (value) => {
  // 1. Checa null/undefined/string vazia
  if (value == null || value === "") {
    return "A definir";
  }
  // 2. Converte para string PRIMEIRO
  const stringValue = String(value);
  try {
    // 3. Tenta limpar e converter (agora stringValue é garantido ser string)
    const numericString = stringValue.replace(/[^\d,]/g, "").replace(",", ".");
    const numberValue = parseFloat(numericString);
    // 4. Checa se o resultado é um número válido
    if (isNaN(numberValue)) {
      console.warn(
        "formatCurrency: Valor não pôde ser convertido para número:",
        value
      );
      return "Valor inválido";
    }
    // 5. Formata como moeda
    return numberValue.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  } catch (e) {
    console.error("Erro formatando moeda:", e, "Valor original:", value);
    return "Erro na formatação"; // Retorna algo indicando erro
  }
};

// Função auxiliar para formatar datas (DD/MM/AAAA)
const formatDate = (dateString) => {
  if (!dateString) return "A definir";
  try {
    // Adiciona T03:00:00 para tentar evitar problemas de fuso ao converter só a data
    return new Date(dateString + "T03:00:00").toLocaleDateString("pt-BR");
  } catch (e) {
    console.error("Erro ao formatar data:", dateString, e);
    return "Data inválida";
  }
};

// --- NOVA FUNÇÃO gerarPdfContrato ---

export async function gerarPdfContrato(pacienteData, meuAtendimento) {
  // 1. Verifica se a biblioteca html2pdf foi carregada
  if (typeof html2pdf === "undefined") {
    console.error("Biblioteca html2pdf não carregada.");
    alert(
      "Erro ao gerar PDF: A biblioteca html2pdf não foi encontrada. Verifique o console."
    );
    return;
  }

  try {
    // Mostra um feedback de carregamento (idealmente um modal/spinner)
    // Substitua por seu método de UI preferido
    document.body.style.cursor = "wait";

    // 2. Carrega os recursos necessários (Logo e HTML)
    const logoUrl = "../../../assets/img/logo-eupsico.png";
    const contratoHtmlUrl = "../../../public/contrato-terapeutico.html";

    const [logoBase64, htmlString] = await Promise.all([
      loadImageAsBase64(logoUrl),
      fetch(contratoHtmlUrl).then((res) => {
        if (!res.ok)
          throw new Error(`Não foi possível carregar ${contratoHtmlUrl}`);
        return res.text();
      }),
    ]);

    // 3. Cria um DOM temporário e parseia o HTML
    const parser = new DOMParser();
    const htmlDoc = parser.parseFromString(htmlString, "text/html");

    // 4. Popula os dados dinâmicos no HTML
    const horarioInfo = meuAtendimento?.horarioSessao || {};

    // Dados do Contrato
    htmlDoc.getElementById("data-terapeuta").textContent =
      meuAtendimento?.profissionalNome || "Não informado";
    htmlDoc.getElementById("data-paciente-nome").textContent =
      pacienteData.nomeCompleto || "Não informado";
    htmlDoc.getElementById("data-paciente-nascimento").textContent = formatDate(
      pacienteData.dataNascimento
    );
    htmlDoc.getElementById("data-contribuicao").textContent = formatCurrency(
      pacienteData.valorContribuicao
    );

    // Responsável (se houver)
    if (pacienteData.responsavel?.nome) {
      htmlDoc.getElementById("responsavel-section").classList.remove("hidden");
      htmlDoc.getElementById("data-responsavel-nome").textContent =
        pacienteData.responsavel.nome;
    }

    // Dados da Sessão
    htmlDoc.getElementById("data-dia-sessao").textContent =
      horarioInfo.diaSemana || "A definir";
    htmlDoc.getElementById("data-horario-sessao").textContent =
      horarioInfo.horario || "A definir";
    htmlDoc.getElementById("data-tipo-atendimento").textContent =
      horarioInfo.tipoAtendimento || "A definir";

    // 5. Remove o formulário interativo
    const formSection = htmlDoc.getElementById("acceptance-form-section");
    if (formSection) {
      formSection.remove();
    }

    // 6. Adiciona o bloco de assinatura (se assinado)
    const thankYouSection = htmlDoc.getElementById("thank-you-section");
    const assinatura = meuAtendimento?.contratoAssinado;

    if (assinatura && assinatura.assinadoEm?.toDate) {
      const dataAssinatura = assinatura.assinadoEm.toDate();
      const textoAssinatura = `Assinado digitalmente por ${
        assinatura.nomeSignatario || "N/I"
      } (CPF: ${
        assinatura.cpfSignatario || "N/I"
      }) em ${dataAssinatura.toLocaleDateString(
        "pt-BR"
      )} às ${dataAssinatura.toLocaleTimeString("pt-BR")}.`;

      thankYouSection.classList.remove("hidden");
      thankYouSection.innerHTML = `
        <h2>Contrato Assinado</h2>
        <p style="font-size: 0.9em;">${textoAssinatura}</p>
      `;
    } else {
      // Se não estiver assinado, remove a seção de "Obrigado"
      thankYouSection.remove();
    }

    // 6.5. Manipula a visibilidade dos elementos (Correção do Passo 4)
    const loadingDiv = htmlDoc.getElementById("contract-loading");
    if (loadingDiv) {
      loadingDiv.classList.add("hidden");
    }
    const contentDiv = htmlDoc.getElementById("contract-content");
    if (contentDiv) {
      contentDiv.classList.remove("hidden");
    }
    const internalScript = htmlDoc.querySelector('script[type="module"]');
    if (internalScript) {
      internalScript.remove();
    }

    // --- INÍCIO DA CORREÇÃO (Passo 5: CSS de Margem e Marca D'água) ---

    // 7. Injeta Estilos CSS para impressão (Marca D'água e Reset)
    const style = htmlDoc.createElement("style");
    style.textContent = `
      /* Reseta o body do HTML para impressão */
      body {
        margin: 0 !important;
        padding: 0 !important;
        background-color: #fff !important;
      }
      
      /* Remove estilos do container que conflitam com o PDF */
      .contract-container {
        box-shadow: none !important;
        border: none !important;
        margin: 0 !important;
        border-radius: 0 !important;
        
        /* Define a posição relativa para a marca d'água */
        position: relative !important;
        z-index: 1 !important;
      }
      
      /* Adiciona a Marca D'água */
      /* Aplicamos no container para garantir que seja "fotografado" */
      .contract-container::after {
        content: "" !important;
        background-image: url('${logoBase64}') !important;
        background-repeat: no-repeat !important;
        background-position: center center !important;
        background-size: 90mm !important; /* Tamanho da logo (90mm) */
        opacity: 0.1 !important;
        position: fixed !important; /* Posição fixa para aparecer em todas as páginas */
        top: 50% !important;
        left: 50% !important;
        transform: translate(-50%, -50%) !important;
        width: 100% !important;
        height: 100% !important;
        z-index: -1 !important;
      }
      
      /* Oculta elementos desnecessários da UI do contrato.html */
      #contract-loading, #contract-error {
        display: none !important;
      }
      /* Garante que o conteúdo seja visível para o html2pdf */
      #contract-content {
        display: block !important;
        visibility: visible !important;
      }
    `;
    htmlDoc.head.appendChild(style);

    // 8. Define o elemento que será convertido
    // AGORA vamos usar o 'contract-content' (o recheio)
    const elementToPrint = htmlDoc.querySelector("#contract-content");

    if (!elementToPrint) {
      throw new Error("Elemento '#contract-content' não encontrado no HTML.");
    }

    // 9. Configura e chama o html2pdf
    const fileName = `Contrato_${(
      pacienteData.nomeCompleto || "Paciente"
    ).replace(/ /g, "_")}.pdf`;

    const options = {
      // AQUI ESTÁ A CORREÇÃO DA MARGEM:
      margin: 20, // 20mm de margem (Top, Right, Bottom, Left)

      filename: fileName,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: {
        scale: 2, // Aumenta a resolução da "foto"
        useCORS: true, // Permite carregar imagens externas (se houver)
        logging: true,
      },
      jsPDF: {
        unit: "mm",
        format: "a4",
        orientation: "portrait",
      },
      // Tenta evitar quebras de página ruins
      pagebreak: { mode: ["avoid-all", "css", "legacy"] },
    };

    // --- FIM DA CORREÇÃO (Passo 5) ---

    // Gera o PDF
    await html2pdf().from(elementToPrint).set(options).save();
  } catch (error) {
    console.error("Erro ao gerar PDF do contrato com html2pdf:", error);
    alert(
      "Não foi possível gerar o PDF. Verifique o console para mais detalhes."
    );
  } finally {
    // Restaura o cursor
    document.body.style.cursor = "default";
  }
}
