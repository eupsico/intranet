// Arquivo: /modulos/servico-social/js/calculo-contribuicao.js
// Versão: 2.0 - Lógica da calculadora automática.

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

    // Função que recalcula todos os valores e atualiza a tela
    function atualizarResultados() {
        const renda = parseFloat(rendaInput.value) || 0;

        // Calcula o valor para a Faixa 1 e seu valor familiar
        const valorFaixa1 = renda * percentuais.faixa1;
        resultados.faixa1.textContent = formatarMoeda(valorFaixa1);
        resultados.familia1.textContent = formatarMoeda(valorFaixa1 * 1.40);

        // Calcula o valor para a Faixa 2 e seu valor familiar
        const valorFaixa2 = renda * percentuais.faixa2;
        resultados.faixa2.textContent = formatarMoeda(valorFaixa2);
        resultados.familia2.textContent = formatarMoeda(valorFaixa2 * 1.40);
        
        // Calcula o valor para a Faixa 3 e seu valor familiar
        const valorFaixa3 = renda * percentuais.faixa3;
        resultados.faixa3.textContent = formatarMoeda(valorFaixa3);
        resultados.familia3.textContent = formatarMoeda(valorFaixa3 * 1.40);

        // Calcula o valor para a Faixa 4 e seu valor familiar
        const valorFaixa4 = renda * percentuais.faixa4;
        resultados.faixa4.textContent = formatarMoeda(valorFaixa4);
        resultados.familia4.textContent = formatarMoeda(valorFaixa4 * 1.40);
    }

    // Adiciona o listener para o evento 'input'
    if (rendaInput) {
        rendaInput.addEventListener('input', atualizarResultados);
    }
}