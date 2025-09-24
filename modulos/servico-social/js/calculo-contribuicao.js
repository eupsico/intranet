// Arquivo: /modulos/servico-social/js/calculo-contribuicao.js
// Descrição: Lógica da calculadora de contribuição.

export function init(db, user, userData) {
    const rendaInput = document.getElementById('renda-input');
    const resultadoEl = document.getElementById('valor-contribuicao-resultado');
    const faixasContainer = document.getElementById('faixas-container');

    if (!rendaInput || !resultadoEl || !faixasContainer) {
        console.error("Elementos da calculadora não encontrados.");
        return;
    }

    // Função que realiza o cálculo e atualiza a interface
    function calcularContribuicao(percentual) {
        const renda = parseFloat(rendaInput.value);
        if (isNaN(renda) || renda <= 0) {
            resultadoEl.textContent = "R$ 0,00";
            alert("Por favor, informe um valor de renda válido.");
            return;
        }

        let valorCalculado = 0;
        
        // Regra especial para o cálculo familiar
        if (percentual === 40) {
            // Assume-se que o valor da renda já é o valor da maior contribuição
            valorCalculado = renda * 1.40; 
        } else {
            valorCalculado = (renda * percentual) / 100;
        }
        
        resultadoEl.textContent = valorCalculado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    // Adiciona o listener de eventos aos botões
    faixasContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('faixa-btn')) {
            const percent = parseFloat(e.target.dataset.percent);
            if (!isNaN(percent)) {
                // Remove a classe 'active' de todos os botões
                faixasContainer.querySelectorAll('.faixa-btn').forEach(btn => btn.classList.remove('active'));
                // Adiciona a classe 'active' ao botão clicado
                e.target.classList.add('active');
                calcularContribuicao(percent);
            }
        }
    });
}