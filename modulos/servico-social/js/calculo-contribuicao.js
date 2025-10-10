// Arquivo: /modulos/servico-social/js/calculo-contribuicao.js
// Versão: 3.0 (Integrado com as Configurações do Sistema)

import { db, doc, getDoc } from "../../../assets/js/firebase-init.js";

export async function init(user, userData) {
  const rendaInput = document.getElementById("renda-input");
  const tableContainer = document.getElementById("tabela-calculo-container");
  if (!rendaInput || !tableContainer) return;

  let faixasDeContribuicao = [];

  /**
   * Carrega as faixas de contribuição do Firestore.
   */
  async function carregarFaixas() {
    tableContainer.innerHTML = '<div class="loading-spinner"></div>';
    try {
      const configRef = doc(db, "configuracoesSistema", "geral");
      const docSnap = await getDoc(configRef);
      if (docSnap.exists() && docSnap.data().financeiro?.faixasContribuicao) {
        faixasDeContribuicao = docSnap.data().financeiro.faixasContribuicao;
        if (faixasDeContribuicao.length > 0) {
          construirTabela();
          atualizarResultados(); // Atualiza com valor inicial se houver
        } else {
          tableContainer.innerHTML =
            '<p class="alert alert-warning">Nenhuma faixa de contribuição configurada no sistema.</p>';
        }
      } else {
        tableContainer.innerHTML =
          '<p class="alert alert-warning">Faixas de contribuição não encontradas nas configurações.</p>';
      }
    } catch (error) {
      console.error("Erro ao carregar faixas de contribuição:", error);
      tableContainer.innerHTML =
        '<p class="alert alert-error">Erro ao carregar as faixas de cálculo.</p>';
    }
  }

  /**
   * Constrói a tabela de resultados dinamicamente.
   */
  function construirTabela() {
    let tableHtml = `
            <table class="tabela-calculo">
                <thead>
                    <tr>
                        <th>Faixa de Renda (Salários Mínimos)</th>
                        <th>%</th>
                        <th>Valor Sugerido (Individual)</th>
                        <th>Valor Sugerido (Família)</th>
                    </tr>
                </thead>
                <tbody>
        `;
    faixasDeContribuicao.forEach((faixa, index) => {
      const faixaAnterior =
        index > 0 ? faixasDeContribuicao[index - 1].ateSalarios : 0;
      tableHtml += `
                <tr>
                    <td>De ${faixaAnterior.toFixed(
                      1
                    )} a ${faixa.ateSalarios.toFixed(1)}</td>
                    <td>${faixa.percentual}%</td>
                    <td id="resultado-individual-${index}">-</td>
                    <td id="resultado-familia-${index}">-</td>
                </tr>
            `;
    });
    tableHtml += "</tbody></table>";
    tableContainer.innerHTML = tableHtml;
  }

  const formatarMoeda = (valor) =>
    valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  function arredondarValorContribuicao(valor) {
    let valorInteiro = Math.ceil(valor);
    const ultimoDigito = valorInteiro % 10;
    if (ultimoDigito >= 1 && ultimoDigito <= 4) {
      valorInteiro = valorInteiro - ultimoDigito + 5;
    } else if (ultimoDigito >= 6 && ultimoDigito <= 9) {
      valorInteiro = valorInteiro - ultimoDigito + 10;
    }
    return valorInteiro;
  }

  /**
   * Recalcula os valores com base na renda e nas faixas carregadas.
   */
  function atualizarResultados() {
    const renda = parseFloat(rendaInput.value) || 0;
    if (faixasDeContribuicao.length === 0) return;

    faixasDeContribuicao.forEach((faixa, index) => {
      const valorCalculado = renda * (faixa.percentual / 100);
      const valorIndividualArredondado =
        arredondarValorContribuicao(valorCalculado);
      const valorFamiliaArredondado = arredondarValorContribuicao(
        valorIndividualArredondado * 1.4
      );

      const resultadoIndividualEl = document.getElementById(
        `resultado-individual-${index}`
      );
      const resultadoFamiliaEl = document.getElementById(
        `resultado-familia-${index}`
      );

      if (resultadoIndividualEl) {
        resultadoIndividualEl.textContent = formatarMoeda(
          valorIndividualArredondado
        );
      }
      if (resultadoFamiliaEl) {
        resultadoFamiliaEl.textContent = formatarMoeda(valorFamiliaArredondado);
      }
    });
  }

  rendaInput.addEventListener("input", atualizarResultados);

  // Ponto de entrada
  await carregarFaixas();
}
