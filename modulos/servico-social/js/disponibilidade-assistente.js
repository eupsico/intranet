// Substituir o conteúdo de /modulos/servico-social/js/disponibilidade-assistente.js
export function init(db, user, userData) {
    if (!document.getElementById('disponibilidade-form')) return;

    // Mapeamento de Elementos
    const form = document.getElementById('disponibilidade-form');
    const nomeInput = document.getElementById('assistente-nome');
    const mesTriagemSelect = document.getElementById('mes-triagem');
    const horaInicioSelect = document.getElementById('hora-inicio-triagem');
    const horaFimSelect = document.getElementById('hora-fim-triagem');
    const datasTriagemContainer = document.getElementById('datas-container-triagem');
    const datasReavaliacaoContainer = document.getElementById('datas-container-reavaliacao');

    // Preenche o nome do assistente
    nomeInput.value = userData.nome || 'Não identificado';

    // Popula os seletores de hora
    function popularHoras(selectElement) {
        for (let i = 8; i <= 22; i++) {
            const hora = `${String(i).padStart(2, '0')}:00`;
            selectElement.innerHTML += `<option value="${hora}">${hora}</option>`;
        }
    }
    popularHoras(horaInicioSelect);
    popularHoras(horaFimSelect);

    // Popula o seletor de meses restantes
    function popularMeses() {
        const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
        const mesAtual = new Date().getMonth();
        mesTriagemSelect.innerHTML = '<option value="">Selecione...</option>';
        for (let i = mesAtual; i < 12; i++) {
            mesTriagemSelect.innerHTML += `<option value="${i}">${meses[i]}</option>`;
        }
    }
    popularMeses();

    // Gera os checkboxes de dias para um dado mês e ano
    function gerarDiasDoMes(mes, ano) {
        datasTriagemContainer.innerHTML = '';
        datasReavaliacaoContainer.innerHTML = '';
        if (mes === "") return;

        const diasNoMes = new Date(ano, parseInt(mes) + 1, 0).getDate();
        const diasSemana = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
        let diasHtml = '';
        
        for (let dia = 1; dia <= diasNoMes; dia++) {
            const data = new Date(ano, mes, dia);
            const diaDaSemanaNome = diasSemana[data.getDay()];
            const diaFormatado = `${String(dia).padStart(2, '0')}/${String(parseInt(mes) + 1).padStart(2, '0')}`;
            
            diasHtml += `
                <div class="checkbox-item">
                    <input type="checkbox" id="dia-${dia}" name="dias_disponiveis" value="${data.toISOString()}">
                    <label for="dia-${dia}">${diaFormatado} - ${diaDaSemanaNome}</label>
                </div>`;
        }
        datasTriagemContainer.innerHTML = diasHtml;
        datasReavaliacaoContainer.innerHTML = diasHtml; // Popula ambos inicialmente
    }
    
    // Atualiza a lista de dias quando o mês muda
    mesTriagemSelect.addEventListener('change', () => {
        const anoAtual = new Date().getFullYear();
        gerarDiasDoMes(mesTriagemSelect.value, anoAtual);
    });
    
    // Esconde dias selecionados para triagem da lista de reavaliação
    datasTriagemContainer.addEventListener('change', () => {
        const diasTriagemSelecionados = new Set();
        datasTriagemContainer.querySelectorAll('input:checked').forEach(input => {
            diasTriagemSelecionados.add(input.value);
        });

        datasReavaliacaoContainer.querySelectorAll('.checkbox-item').forEach(item => {
            const input = item.querySelector('input');
            if (diasTriagemSelecionados.has(input.value)) {
                item.style.display = 'none';
            } else {
                item.style.display = 'flex';
            }
        });
    });

    // Salva os dados no Firestore
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        // Lógica de salvamento e a pergunta de confirmação
        alert('Lógica de salvamento e a pergunta de confirmação seriam implementadas aqui.');
    });
}