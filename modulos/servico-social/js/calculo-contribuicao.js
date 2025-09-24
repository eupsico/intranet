// Arquivo: /modulos/servico-social/js/calculo-contribuicao.js
// Versão: 2.1 - Adiciona lógica de arredondamento customizada.

export function init(db, user, userData) {
    const rendaInput = document.getElementById('renda-input');
    
    // Mapeamento dos elementos de resultado
    const resultados = {
        faixa1: document.getElementById('resultado-faixa1'),
        familia1: document.getElementById('resultado-familia1'),
        faixa2: document.getElementById('resultado-faixa2'),
        familia2: document.getElementById('resultado-familia2'),
        faixa3: document.getElementById('resultado-faixa3'),
        familia3: document.getElementById('resultado-familia3'),
        faixa4: document.getElementById('resultado-faixa4'),
        familia4: document.getElementById('resultado-familia4'),
    };

    // Mapeamento dos percentuais
    const percentuais = {
        faixa1: 0.07,
        faixa2: 0.08,
        faixa3: 0.09,
        faixa4: 0.10,
    };

    // Função para formatar um número como moeda brasileira
    const formatarMoeda = (valor) => valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    /**
     * NOVA FUNÇÃO DE ARREDONDAMENTO
     * Arredonda o valor de acordo com as regras de negócio:
     * - Qualquer centavo arredonda para o próximo inteiro.
     * - Valores terminados em 1-4 viram 5.
     * - Valores terminados em 6-9 viram 0 (da próxima dezena).
     */
    function arredondarValorContribuicao(valor) {
        // 1. Arredonda qualquer centavo para cima, para o próximo real.
        let valorInteiro = Math.ceil(valor);
        
        // 2. Pega o último dígito.
        const ultimoDigito = valorInteiro % 10;

        // 3. Aplica as regras de arredondamento para 5 ou 0.
        if (ultimoDigito >= 1 && ultimoDigito <= 4) {
            valorInteiro = valorInteiro - ultimoDigito + 5; // Ex: 41 -> 41 - 1 + 5 = 45
        } else if (ultimoDigito >= 6 && ultimoDigito <= 9) {
            valorInteiro = valorInteiro - ultimoDigito + 10; // Ex: 46 -> 46 - 6 + 10 = 50
        }
        
        return valorInteiro;
    }

    // Função que recalcula todos os valores e atualiza a tela
    function atualizarResultados() {
        const renda = parseFloat(rendaInput.value) || 0;

        // Calcula o valor para a Faixa 1 e seu valor familiar
        const valorFaixa1 = arredondarValorContribuicao(renda * percentuais.faixa1);
        resultados.faixa1.textContent = formatarMoeda(valorFaixa1);
        resultados.familia1.textContent = formatarMoeda(arredondarValorContribuicao(valorFaixa1 * 1.40));

        // Calcula o valor para a Faixa 2 e seu valor familiar
        const valorFaixa2 = arredondarValorContribuicao(renda * percentuais.faixa2);
        resultados.faixa2.textContent = formatarMoeda(valorFaixa2);
        resultados.familia2.textContent = formatarMoeda(arredondarValorContribuicao(valorFaixa2 * 1.40));
        
        // Calcula o valor para a Faixa 3 e seu valor familiar
        const valorFaixa3 = arredondarValorContribuicao(renda * percentuais.faixa3);
        resultados.faixa3.textContent = formatarMoeda(valorFaixa3);
        resultados.familia3.textContent = formatarMoeda(arredondarValorContribuicao(valorFaixa3 * 1.40));

        // Calcula o valor para a Faixa 4 e seu valor familiar
        const valorFaixa4 = arredondarValorContribuicao(renda * percentuais.faixa4);
        resultados.faixa4.textContent = formatarMoeda(valorFaixa4);
        resultados.familia4.textContent = formatarMoeda(arredondarValorContribuicao(valorFaixa4 * 1.40));
    }

    // Adiciona o listener para o evento 'input'
    if (rendaInput) {
        rendaInput.addEventListener('input', atualizarResultados);
    }
}