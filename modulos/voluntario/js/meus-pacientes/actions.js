// Arquivo: /modulos/voluntario/js/meus-pacientes/actions.js
// --- VERSÃO HÍBRIDA (html2canvas + jsPDF) ---

// (A função handleEnviarContrato foi removida daqui em versões anteriores)

// --- Funções Auxiliares (Mantidas das versões anteriores) ---

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
  // 1. Verifica se as bibliotecas jsPDF (original) e html2pdf (para canvas) estão carregadas
  if (!window.jspdf || !window.jspdf.jsPDF || typeof html2pdf === "undefined") {
    console.error("Bibliotecas jsPDF ou html2pdf não carregadas.");
    alert(
      "Erro ao gerar PDF: Bibliotecas essenciais não foram encontradas. Verifique o console."
    );
    return;
  }

  try {
    // Mostra um feedback de carregamento
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

    // --- INÍCIO DA SOLUÇÃO HÍBRIDA (Passo 6) ---

    // 7. Define o elemento que será "fotografado"
    // Usamos o #contract-content. (Lembre-se que o .html já tem o text-align: justify;)
    const elementToPrint = htmlDoc.querySelector("#contract-content");

    // 7.1. Injeta CSS para a "foto" (removemos a marca d'água daqui)
    const style = htmlDoc.createElement("style");
    style.textContent = `
      body { margin: 0 !important; padding: 0 !important; background-color: #fff !important; }
      .contract-container { box-shadow: none !important; border: none !important; margin: 0 !important; }
      #contract-content { display: block !important; visibility: visible !important; }
      #contract-loading, #contract-error { display: none !important; }
    `;
    htmlDoc.head.appendChild(style);

    // 8. Usa html2canvas (do html2pdf) para "fotografar" o conteúdo

    // Precisamos definir a largura da "foto" para 170mm (A4 210mm - 20mm margem esq - 20mm margem dir)
    // 170mm em pixels (assumindo 96dpi) é aprox. 642 pixels.
    // Para alta resolução (escala 2), usamos 1284 pixels.
    const contentWidthPx = 170 * (96 / 25.4) * 2; // (mm * (dpi / mm_por_polegada) * escala)

    // Anexa temporariamente o elemento ao DOM para que o html2canvas possa renderizá-lo
    // (Oculto para o usuário)
    const tempContainer = htmlDoc.querySelector(".contract-container");
    tempContainer.style.position = "absolute";
    tempContainer.style.left = "-9999px";
    tempContainer.style.width = "170mm"; // Força a largura para a renderização do texto justificado
    document.body.appendChild(tempContainer);

    const canvas = await html2pdf.html2canvas(elementToPrint, {
      scale: 2, // Alta resolução
      useCORS: true,
      logging: true,
      width: contentWidthPx, // Força a largura da "foto"
    });

    // Remove o elemento temporário
    document.body.removeChild(tempContainer);

    const imgData = canvas.toDataURL("image/jpeg", 0.98);

    // 9. Usa jsPDF (a biblioteca original) para montar o PDF

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "mm", format: "a4" });

    const margin = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const usableWidth = pageWidth - margin * 2; // 170mm
    const usableHeight = pageHeight - margin * 2; // 257mm

    // Calcula a altura da imagem em mm
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const imgRatio = imgHeight / imgWidth;
    const finalImgHeight = usableWidth * imgRatio;

    // 10. Adiciona a Marca D'água (com jsPDF)
    if (logoBase64) {
      doc.setGState(new doc.GState({ opacity: 0.1 })); // Define opacidade
      const logoSize = 90;
      const x = (pageWidth - logoSize) / 2;
      const y = (pageHeight - logoSize) / 2;
      doc.addImage(
        logoBase64,
        "PNG",
        x,
        y,
        logoSize,
        logoSize,
        undefined,
        "FAST"
      );
      doc.setGState(new doc.GState({ opacity: 1 })); // Restaura opacidade
    }

    // 11. Adiciona a "foto" (o conteúdo) por cima
    doc.addImage(
      imgData,
      "JPEG",
      margin, // Posição X (20mm)
      margin, // Posição Y (20mm)
      usableWidth, // Largura (170mm)
      finalImgHeight // Altura calculada
    );

    // 12. Adiciona páginas extras (se a "foto" for muito alta)
    let heightLeft = finalImgHeight - usableHeight;
    let position = -usableHeight; // Posição Y da "fatia" da imagem

    while (heightLeft > 0) {
      doc.addPage();

      // Adiciona marca d'água na nova página
      if (logoBase64) {
        doc.setGState(new doc.GState({ opacity: 0.1 }));
        const logoSize = 90;
        const x = (pageWidth - logoSize) / 2;
        const y = (pageHeight - logoSize) / 2;
        doc.addImage(
          logoBase64,
          "PNG",
          x,
          y,
          logoSize,
          logoSize,
          undefined,
          "FAST"
        );
        doc.setGState(new doc.GState({ opacity: 1 }));
      }

      // Adiciona a próxima "fatia" da imagem
      doc.addImage(
        imgData,
        "JPEG",
        margin,
        position, // Posição Y negativa da "fatia"
        usableWidth,
        finalImgHeight
      );

      heightLeft -= usableHeight;
      position -= usableHeight;
    }

    // 13. Salva o PDF
    const fileName = `Contrato_${(
      pacienteData.nomeCompleto || "Paciente"
    ).replace(/ /g, "_")}.pdf`;

    doc.save(fileName);

    // --- FIM DA SOLUÇÃO HÍBRIDA ---
  } catch (error) {
    console.error("Erro ao gerar PDF do contrato (Método Híbrido):", error);
    alert(
      "Não foi possível gerar o PDF. Verifique o console para mais detalhes."
    );
  } finally {
    // Restaura o cursor
    document.body.style.cursor = "default";
  }
}
