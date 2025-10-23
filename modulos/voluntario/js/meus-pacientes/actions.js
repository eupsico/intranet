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

    // Cláusula de Menor de Idade (lógica do HTML original)
    // A lógica original do contrato-terapeutico.html já cuida disso,
    // mas vamos garantir que a seção apareça se for menor.
    // (O ideal é que a lógica de idade já esteja no HTML, mas podemos forçar)

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

    // --- INÍCIO DA CORREÇÃO (MANIPULAR VISIBILIDADE) ---
    // 6.5. Manipula a visibilidade dos elementos
    // Esconde o loading (que é o padrão no HTML)
    const loadingDiv = htmlDoc.getElementById("contract-loading");
    if (loadingDiv) {
      loadingDiv.classList.add("hidden");
    }

    // Mostra o conteúdo principal
    const contentDiv = htmlDoc.getElementById("contract-content");
    if (contentDiv) {
      contentDiv.classList.remove("hidden");
    }

    // 6.6. Remove o script interno do HTML
    // Isso previne que ele tente rodar ou cause erros
    const internalScript = htmlDoc.querySelector('script[type="module"]');
    if (internalScript) {
      internalScript.remove();
    }
    // --- FIM DA CORREÇÃO ---

    // 7. Injeta Estilos CSS para impressão (Margens, Tamanho A4, Marca D'água)
    // (O CSS de justificação está no arquivo .html, conforme Passo 3)
    const style = htmlDoc.createElement("style");
    style.textContent = `
      /* Reseta o body do HTML para impressão */
      body {
        margin: 0;
        padding: 0;
        background-color: #fff;
      }
      /* Define o container principal com o tamanho A4 e margens */
      .contract-container {
        width: 210mm; /* Largura A4 */
        min-height: 297mm; /* Altura A4 */
        padding: 20mm; /* Margens de 20mm (Top, Right, Bottom, Left) */
        box-sizing: border-box; /* Garante que padding seja incluído na largura/altura */
        box-shadow: none;
        border: none;
        margin: 0;
        border-radius: 0;
        page-break-after: always; /* Garante quebras de página corretas */
      }
      /* Garante que o conteúdo dentro do container ocupe o espaço */
      #contract-content {
        width: 170mm; /* 210mm - 20mm (esq) - 20mm (dir) */
        display: block;
      }
      
      /* Adiciona a Marca D'água */
      body::after {
        content: "";
        background-image: url('${logoBase64}');
        background-repeat: no-repeat;
        background-position: center;
        background-size: 90mm; /* Tamanho da logo (90mm) */
        opacity: 0.1;
        position: fixed; /* Posição fixa para aparecer em todas as páginas */
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 100%;
        height: 100%;
        z-index: -1;
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
    // Usamos o 'contract-container' que agora tem as dimensões A4
    const elementToPrint = htmlDoc.querySelector(".contract-container");

    if (!elementToPrint) {
      throw new Error("Elemento '.contract-container' não encontrado no HTML.");
    }

    // 9. Configura e chama o html2pdf
    const fileName = `Contrato_${(
      pacienteData.nomeCompleto || "Paciente"
    ).replace(/ /g, "_")}.pdf`;

    const options = {
      margin: 0, // A margem já está no CSS (padding: 20mm)
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
